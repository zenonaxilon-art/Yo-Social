import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { Heart, MessageCircle, Share2, MoreVertical, BadgeCheck, User, Plus, Upload, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { EmptyState } from '../components/UIStates';

export default function Reels() {
  const { profile } = useAppStore();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    setLoading(true);
    const { data } = await supabase.from('reels').select('*, users:user_id(username, display_name, profile_picture_url, is_verified, role)').order('created_at', { ascending: false });
    if (data) setReels(data);
    setLoading(false);
  };

  const handleUpload = async () => {
     if (!videoFile || !profile) return;
     setUploading(true);
     try {
       const fileExt = videoFile.name.split('.').pop();
       const fileName = `${Math.random()}.${fileExt}`;
       // Reusing post_images bucket for simplicity, you can create a 'reels' bucket
       const { error: uploadError, data } = await supabase.storage.from('post_images').upload(fileName, videoFile);
       
       if (uploadError) {
          console.error("Upload error:", uploadError);
          alert("Failed to upload video. Ensure 'post_images' bucket accepts mp4 or create a 'reels' bucket.");
          setUploading(false);
          return;
       }

       const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(fileName);
       
       const { error } = await supabase.from('reels').insert({
          user_id: profile.id,
          video_url: urlData.publicUrl,
          caption: caption.trim(),
          likes_count: 0,
          views_count: 0,
          comments_count: 0,
          shares_count: 0
       });

       if (!error) {
          setShowUpload(false);
          setVideoFile(null);
          setCaption('');
          fetchReels(); // Refresh
       } else {
          console.error(error);
          alert("Failed to save reel to database.");
       }
     } catch (e) {
       console.error(e);
     } finally {
       setUploading(false);
     }
  };

  if (loading) {
     return <div className="w-full min-h-screen flex items-center justify-center bg-black"><div className="w-8 h-8 rounded-full border-4 border-t-white border-white/20 animate-spin"></div></div>;
  }

  return (
    <div className="w-full h-screen bg-black overflow-y-scroll snap-y snap-mandatory hide-scrollbar pb-[env(safe-area-inset-bottom)] sm:pb-0 relative">
       
       {/* Top Nav for Mobile */}
       <div className="fixed top-0 left-0 right-0 z-20 px-4 py-4 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-center text-white sm:hidden pointer-events-none">
          <h1 className="text-xl font-bold">Reels</h1>
       </div>

       {/* Floating Action Button for Upload */}
       <button 
         onClick={() => setShowUpload(true)}
         className="fixed top-4 sm:top-6 right-4 sm:right-6 z-30 bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:bg-primary/90 transition-transform active:scale-95"
         aria-label="Upload Reel"
       >
         <Upload size={24} />
       </button>

       {/* Upload Modal */}
       {showUpload && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-card w-full max-w-md rounded-2xl p-6 relative border border-border">
                <button onClick={() => setShowUpload(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                   <X size={24} />
                </button>
                <h2 className="text-xl font-bold mb-4">Upload Reel</h2>
                
                <input 
                  type="file" 
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full mb-4 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                
                <textarea 
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-lg p-3 min-h-[100px] mb-4 focus:outline-none focus:border-primary resize-none"
                />

                <button 
                  onClick={handleUpload}
                  disabled={!videoFile || uploading}
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors flex justify-center items-center gap-2"
                >
                  {uploading && <Loader2 size={18} className="animate-spin" />}
                  {uploading ? 'Uploading...' : 'Post Reel'}
                </button>
             </div>
          </div>
       )}

       {reels.length === 0 ? (
         <div className="w-full h-full flex flex-col justify-center text-white pb-20">
           <EmptyState icon={<Heart size={32} className="text-white/50" />} title="No Reels Yet" description="Be the first to share a reel!" />
         </div>
       ) : (
         reels.map((reel) => (
            <ReelItem key={reel.id} reel={reel} profile={profile} />
         ))
       )}
    </div>
  );
}

function ReelItem({ reel, profile }: { reel: any, profile: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count || 0);
  const [viewsCount, setViewsCount] = useState(reel.views_count || 0);
  const [sharesCount, setSharesCount] = useState(reel.shares_count || 0);
  const [hasViewed, setHasViewed] = useState(false);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  useEffect(() => {
    if (profile && profile.id !== reel.user_id) {
       supabase.from('follows').select('*').eq('follower_id', profile.id).eq('following_id', reel.user_id).single().then(({data}) => {
          if (data) setIsFollowing(true);
       });
    }
  }, [profile, reel.user_id]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoadingFollow(true);
    if (isFollowing) {
       await supabase.from('follows').delete().eq('follower_id', profile.id).eq('following_id', reel.user_id);
       setIsFollowing(false);
    } else {
       await supabase.from('follows').insert({ follower_id: profile.id, following_id: reel.user_id });
       setIsFollowing(true);
    }
    setLoadingFollow(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          setIsPlaying(true);
          
          if (!hasViewed) {
             setHasViewed(true);
             setViewsCount(prev => prev + 1);
             // Increment view count in DB
             supabase.from('reels').update({ views_count: (reel.views_count || 0) + 1 }).eq('id', reel.id).then();
          }
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) observer.unobserve(videoRef.current);
    };
  }, [hasViewed]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = () => {
     setLiked(!liked);
     const newCount = liked ? likesCount - 1 : likesCount + 1;
     setLikesCount(newCount);
     supabase.from('reels').update({ likes_count: newCount }).eq('id', reel.id).then();
  };

  const handleShare = () => {
     setSharesCount(prev => prev + 1);
     supabase.from('reels').update({ shares_count: (reel.shares_count || 0) + 1 }).eq('id', reel.id).then();
     if (navigator.share) {
        navigator.share({
           title: 'Yo Social Reel',
           text: reel.caption || 'Check out this reel!',
           url: window.location.href
        }).catch(console.error);
     } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
     }
  };

  return (
    <div className="w-full h-[100dvh] snap-start relative bg-black flex justify-center overflow-hidden">
       {/* Video */}
       <video 
         ref={videoRef}
         src={reel.video_url}
         className="w-full h-full object-cover sm:max-w-md relative z-0"
         loop
         playsInline
         onClick={togglePlay}
       />

       {/* Overlay Controls */}
       <div className="absolute inset-0 z-10 sm:max-w-md mx-auto pointer-events-none flex flex-col justify-end pb-24 sm:pb-8 px-4">
          
          <div className="flex justify-between items-end w-full pointer-events-auto">
             
             {/* Bottom Info */}
             <div className="flex-1 pr-12 text-white pb-4">
                <Link to={`/profile/${reel.users?.username}`} className="flex items-center gap-2 mb-3">
                   <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden border border-white/50">
                      {reel.users?.profile_picture_url ? <img src={reel.users?.profile_picture_url} className="w-full h-full object-cover"/> : <User className="w-full h-full p-2" />}
                   </div>
                   <div className="font-bold flex items-center gap-1 drop-shadow-md">
                      {reel.users?.username}
                      {reel.users?.is_verified && <BadgeCheck size={16} className={reel.users?.role === 'admin' ? "text-yellow-400" : "text-blue-400"} />}
                   </div>
                   {profile?.id !== reel.user_id && (
                     <button 
                       onClick={handleFollow}
                       disabled={loadingFollow}
                       className={cn(
                          "ml-2 px-3 py-1 rounded-full border text-sm font-medium transition-colors backdrop-blur-sm disabled:opacity-50",
                          isFollowing 
                             ? "bg-white/20 border-white/30 hover:bg-white/30 text-white" 
                             : "bg-primary border-primary text-primary-foreground hover:bg-primary/90"
                       )}
                     >
                        {isFollowing ? 'Following' : 'Follow'}
                     </button>
                   )}
                </Link>
                {reel.caption && (
                   <div className="text-sm drop-shadow-md line-clamp-3">
                      {reel.caption}
                   </div>
                )}
                <div className="text-xs text-white/70 mt-2 flex items-center gap-2 drop-shadow-md">
                   <span>{viewsCount} views</span>
                </div>
             </div>

             {/* Right Sidebar Actions */}
             <div className="flex flex-col items-center gap-6 pb-4 shrink-0">
                <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                   <div className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-active:scale-90">
                      <Heart size={26} className={cn("transition-colors drop-shadow-md", liked ? "text-red-500 fill-red-500" : "text-white")} />
                   </div>
                   <span className="text-white text-xs font-medium drop-shadow-md">{likesCount}</span>
                </button>
                <button onClick={() => alert("Comments feature coming soon!")} className="flex flex-col items-center gap-1 group">
                   <div className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-active:scale-90">
                      <MessageCircle size={26} className="text-white drop-shadow-md" />
                   </div>
                   <span className="text-white text-xs font-medium drop-shadow-md">{reel.comments_count || 0}</span>
                </button>
                <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                   <div className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-active:scale-90">
                      <Share2 size={26} className="text-white drop-shadow-md" />
                   </div>
                   <span className="text-white text-xs font-medium drop-shadow-md">{sharesCount}</span>
                </button>
             </div>
          </div>
       </div>

    </div>
  );
}
