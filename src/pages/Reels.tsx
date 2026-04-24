import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { Heart, MessageCircle, Share2, MoreVertical, BadgeCheck, User, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { EmptyState } from '../components/UIStates';

export default function Reels() {
  const { profile } = useAppStore();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    setLoading(true);
    // Ideally order by random or trending, for now date
    const { data } = await supabase.from('reels').select('*, users:user_id(username, display_name, profile_picture_url, is_verified, role)').order('created_at', { ascending: false });
    if (data) setReels(data);
    setLoading(false);
  };

  if (loading) {
     return <div className="w-full min-h-screen flex items-center justify-center bg-black"><div className="w-8 h-8 rounded-full border-4 border-t-white border-white/20 animate-spin"></div></div>;
  }

  if (reels.length === 0) {
    return (
       <div className="w-full min-h-screen bg-black flex flex-col justify-center text-white pb-20">
         <EmptyState icon={<Heart size={32} />} title="No Reels Yet" description="Be the first to share a reel!" />
       </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black overflow-y-scroll snap-y snap-mandatory hide-scrollbar pb-[env(safe-area-inset-bottom)] sm:pb-0">
       <div className="fixed top-0 left-0 right-0 z-10 px-4 py-4 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-center text-white sm:hidden pointer-events-none">
          <h1 className="text-xl font-bold">Reels</h1>
       </div>
       {reels.map((reel) => (
          <ReelItem key={reel.id} reel={reel} profile={profile} />
       ))}
    </div>
  );
}

function ReelItem({ reel, profile }: { reel: any, profile: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count || 0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
          setIsPlaying(true);
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
  }, []);

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
     // fake like for now
     setLiked(!liked);
     setLikesCount(prev => liked ? prev - 1 : prev + 1);
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
                     <button className="ml-2 px-3 py-1 rounded-full border border-white/80 text-sm font-medium hover:bg-white/20 transition-colors backdrop-blur-sm">Follow</button>
                   )}
                </Link>
                {reel.caption && (
                   <div className="text-sm drop-shadow-md line-clamp-3">
                      {reel.caption}
                   </div>
                )}
             </div>

             {/* Right Sidebar Actions */}
             <div className="flex flex-col items-center gap-6 pb-4 shrink-0">
                <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                   <div className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-active:scale-90">
                      <Heart size={26} className={cn("transition-colors drop-shadow-md", liked ? "text-red-500 fill-red-500" : "text-white")} />
                   </div>
                   <span className="text-white text-xs font-medium drop-shadow-md">{likesCount}</span>
                </button>
                <button className="flex flex-col items-center gap-1 group">
                   <div className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-active:scale-90">
                      <MessageCircle size={26} className="text-white drop-shadow-md" />
                   </div>
                   <span className="text-white text-xs font-medium drop-shadow-md">0</span>
                </button>
                <button className="flex flex-col items-center gap-1 group">
                   <div className="w-12 h-12 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center transition-transform group-active:scale-90">
                      <Share2 size={26} className="text-white drop-shadow-md" />
                   </div>
                   <span className="text-white text-xs font-medium drop-shadow-md">Share</span>
                </button>
             </div>
          </div>
       </div>

    </div>
  );
}
