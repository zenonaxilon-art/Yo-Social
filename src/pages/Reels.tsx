import React, { useState, useEffect, useRef } from 'react';
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
  const [uploadProgress, setUploadProgress] = useState(0);
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
     setUploadProgress(0);
     
     // Simulate progress for UI since supabase js doesn't support progress events natively on simple uploads
     const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
           if (prev >= 95) return 95;
           return prev + Math.floor(Math.random() * 10);
        });
     }, 500);

     try {
       const fileExt = videoFile.name.split('.').pop();
       const fileName = `${Math.random()}.${fileExt}`;
       // Reusing post_images bucket for simplicity, you can create a 'reels' bucket
       const { error: uploadError, data } = await supabase.storage.from('post_images').upload(fileName, videoFile);
       
       if (uploadError) {
          console.error("Upload error:", uploadError);
          alert("Failed to upload video. Ensure 'post_images' bucket accepts mp4 or create a 'reels' bucket.");
          setUploading(false);
          clearInterval(progressInterval);
          return;
       }

       setUploadProgress(100);

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
          setUploadProgress(0);
          fetchReels(); // Refresh
       } else {
          console.error(error);
          alert("Failed to save reel to database.");
       }
     } catch (e) {
       console.error(e);
     } finally {
       clearInterval(progressInterval);
       setUploading(false);
     }
  };

  if (loading) {
     return <div className="w-full min-h-screen flex items-center justify-center bg-black"><div className="w-8 h-8 rounded-full border-4 border-t-white border-white/20 animate-spin"></div></div>;
  }

  return (
    <div className="w-full h-[100dvh] bg-black overflow-y-scroll overscroll-y-none snap-y snap-mandatory hide-scrollbar relative z-0" style={{ WebkitOverflowScrolling: 'touch' }}>
       
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
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors flex justify-center items-center gap-2 relative overflow-hidden"
                >
                  {uploading && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-primary-foreground/20 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  )}
                  {uploading && <Loader2 size={18} className="animate-spin z-10" />}
                  <span className="z-10">{uploading ? `Uploading... ${uploadProgress}%` : 'Post Reel'}</span>
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
  const [commentsCount, setCommentsCount] = useState(reel.comments_count || 0);
  const [hasViewed, setHasViewed] = useState(false);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    if (profile && profile.id !== reel.user_id) {
       supabase.from('follows').select('*').eq('follower_id', profile.id).eq('following_id', reel.user_id).single().then(({data}) => {
          if (data) setIsFollowing(true);
       });
    }
  }, [profile, reel.user_id]);

  useEffect(() => {
     if (profile) {
        supabase.from('likes').select('*').eq('reel_id', reel.id).eq('user_id', profile.id).single().then(({data}) => {
           if (data) setLiked(true);
        });
     }
  }, [profile, reel.id]);

  const fetchComments = async () => {
    const { data } = await supabase.from('comments')
      .select('*, users:user_id(username, display_name, profile_picture_url, is_verified, role)')
      .eq('reel_id', reel.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  };

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

  const [isVisible, setIsVisible] = useState(false);
  const [isNear, setIsNear] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Observer for lazy loading (near viewport)
    const nearObserver = new IntersectionObserver(
      ([entry]) => {
         setIsNear(entry.isIntersecting);
      },
      { rootMargin: '100% 0px' } // 1 viewport boundary above/below
    );

    // Observer for playing (in viewport)
    const playObserver = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
          setIsPlaying(true);
          
          if (!hasViewed) {
             setHasViewed(true);
             setViewsCount(prev => prev + 1);
             supabase.from('reels').update({ views_count: (reel.views_count || 0) + 1 }).eq('id', reel.id).then();
          }
        } else {
          if (videoRef.current) {
             videoRef.current.pause();
             videoRef.current.currentTime = 0;
          }
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );

    if (containerRef.current) {
      nearObserver.observe(containerRef.current);
      playObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        nearObserver.unobserve(containerRef.current);
        playObserver.unobserve(containerRef.current);
      }
    };
  }, [hasViewed, reel.id, reel.views_count]);

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

  const handleLike = async () => {
     if (!profile) return;
     if (liked) {
       await supabase.from('likes').delete().eq('reel_id', reel.id).eq('user_id', profile.id);
       const newCount = Math.max(0, likesCount - 1);
       setLikesCount(newCount);
       setLiked(false);
       supabase.from('reels').update({ likes_count: newCount }).eq('id', reel.id).then();
     } else {
       await supabase.from('likes').insert({ reel_id: reel.id, user_id: profile.id });
       const newCount = likesCount + 1;
       setLikesCount(newCount);
       setLiked(true);
       supabase.from('reels').update({ likes_count: newCount }).eq('id', reel.id).then();
     }
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

  const handleToggleComments = () => {
     if (!showComments) {
        fetchComments();
     }
     setShowComments(!showComments);
  };

  const submitComment = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!newComment.trim() || !profile) return;
     setPostingComment(true);
     try {
       const { data, error } = await supabase.from('comments').insert({
          reel_id: reel.id,
          user_id: profile.id,
          content: newComment.trim()
       }).select('*, users:user_id(username, display_name, profile_picture_url, is_verified, role)').single();
       
       if (error) {
          console.error("Comment insert error:", error);
          alert("Failed to post comment. Ensure the database schema is updated to support reel comments.");
          return;
       }

       if (data) {
          setComments(prev => [...prev, data]);
       }

       const newCount = commentsCount + 1;
       setCommentsCount(newCount);
       supabase.from('reels').update({ comments_count: newCount }).eq('id', reel.id).then();
       setNewComment('');
     } catch (err) {
       console.error(err);
     } finally {
       setPostingComment(false);
     }
  };

  return (
    <div ref={containerRef} className="w-full h-[100dvh] snap-start relative bg-black flex justify-center overflow-hidden">
       {/* Video */}
       {isNear && (
         <video 
           ref={videoRef}
           src={reel.video_url}
           className="w-full h-full object-contain sm:max-w-md relative z-0 bg-black"
           loop
           playsInline
           preload="metadata"
           onClick={togglePlay}
         />
       )}

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
                <button onClick={handleToggleComments} className="flex flex-col items-center gap-1 group">
                   <div className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-active:scale-90">
                      <MessageCircle size={26} className="text-white drop-shadow-md" />
                   </div>
                   <span className="text-white text-xs font-medium drop-shadow-md">{commentsCount}</span>
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
       
       {showComments && (
         <div className="absolute inset-x-0 bottom-0 top-[30%] bg-card z-50 rounded-t-2xl sm:max-w-md sm:mx-auto flex flex-col shadow-2xl border-t border-border animate-in slide-in-from-bottom-full">
            <div className="p-4 border-b border-border flex justify-between items-center shrink-0">
               <h3 className="font-bold text-lg">{commentsCount} Comments</h3>
               <button onClick={() => setShowComments(false)} className="p-2 bg-muted/50 rounded-full hover:bg-muted transition-colors">
                  <X size={20} className="text-foreground" />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {comments.length === 0 && (
                  <div className="text-center text-muted-foreground mt-10">No comments yet. Start the conversation!</div>
               )}
               {comments.map(c => (
                  <div key={c.id} className="flex gap-2">
                     <Link to={`/profile/${c.users?.username}`} className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0 mt-1">
                        {c.users?.profile_picture_url ? <img src={c.users.profile_picture_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{c.users?.display_name?.charAt(0)}</div>}
                     </Link>
                     <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                           <Link to={`/profile/${c.users?.username}`} className="font-bold text-sm hover:underline">{c.users?.display_name}</Link>
                           <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-foreground mt-0.5">{c.content}</p>
                     </div>
                  </div>
               ))}
            </div>

            <form onSubmit={submitComment} className="p-4 border-t border-border bg-card shrink-0 px-4 sm:px-6 mb-[env(safe-area-inset-bottom)] pb-safe relative">
               <div className="flex gap-2 relative bg-muted/30 border border-border rounded-full p-1 pl-4">
                  <input 
                    type="text" 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Add comment..." 
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <button disabled={!newComment.trim() || postingComment} type="submit" className="bg-primary text-primary-foreground disabled:opacity-50 p-2 rounded-full transition-colors">
                    <MessageCircle size={18} className="rotate-90 fill-current" />
                  </button>
               </div>
            </form>
         </div>
       )}

    </div>
  );
}
