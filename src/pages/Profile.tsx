import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Calendar, User, MessageSquareOff } from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';
import { PostSkeleton, EmptyState } from '../components/UIStates';

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { profile: currentUser } = useAppStore();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: user } = await supabase.from('users').select('*').eq('username', username).single();
    if (user) {
      setProfile(user);
      
      const { data: userPosts } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (userPosts) setPosts(userPosts);

      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
      setFollowStats({ followers: followers || 0, following: following || 0 });

      if (currentUser) {
        const { data } = await supabase.from('follows').select('*').eq('follower_id', currentUser.id).eq('following_id', user.id).single();
        setIsFollowing(!!data);
      }
    }
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!currentUser || !profile) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id);
      setFollowStats(prev => ({ ...prev, followers: prev.followers - 1 }));
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id });
      setFollowStats(prev => ({ ...prev, followers: prev.followers + 1 }));
    }
    setIsFollowing(!isFollowing);
  };

  if (loading) {
    return <div className="p-4 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-xl font-bold">This account doesn't exist</div>;
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <div className="w-full relative">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 py-1.5 h-[53px]">
        <Link to=".." className="w-9 h-9 rounded-full hover:bg-muted transition-colors flex items-center justify-center mr-6">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold leading-tight">{profile.display_name}</h1>
          <div className="text-[13px] text-muted-foreground">{posts.length} posts</div>
        </div>
      </div>

      {/* Banner */}
      <div className="h-32 sm:h-48 bg-muted-foreground/20"></div>

      {/* Profile info */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-start">
          <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full border-4 border-background bg-muted -mt-12 sm:-mt-16 overflow-hidden shrink-0 flex items-center justify-center">
             {profile.profile_picture_url ? (
               <img src={profile.profile_picture_url} className="w-full h-full object-cover" alt="" />
             ) : (
                <User size={64} className="text-muted-foreground" />
             )}
          </div>
          <div className="pt-3">
             {isOwnProfile ? (
                 <button className="font-bold border border-border rounded-full px-4 py-1.5 hover:bg-muted transition-colors">Edit profile</button>
             ) : (
                 <button 
                   onClick={toggleFollow}
                   className={`font-bold rounded-full px-4 py-1.5 transition-colors border ${isFollowing ? 'bg-transparent border-border text-foreground hover:border-red-500 hover:text-red-500 hover:bg-red-500/10 hover:after:content-["Unfollow"] after:content-["Following"] w-[105px]' : 'bg-foreground text-background w-[85px] hover:bg-foreground/90'}`}
                 >
                   {!isFollowing && 'Follow'}
                 </button>
             )}
          </div>
        </div>

        <div className="mt-2">
           <div className="flex items-center gap-1">
             <h2 className="text-xl font-extrabold">{profile.display_name}</h2>
             {profile.is_verified && (
                <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-5 h-5 text-primary fill-current"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.756 2.75 1.88 3.447-.077.387-.12.784-.12 1.18 0 2.21 1.708 3.998 3.917 3.998.47 0 .92-.086 1.336-.252C9.182 21.587 10.49 22.5 12 22.5s2.816-.915 3.336-2.252c.417.166.868.252 1.336.252 2.21 0 3.918-1.79 3.918-4 0-.398-.043-.795-.12-1.182 1.124-.697 1.88-1.986 1.88-3.447zM10.446 16l-3.3-3.03 1.144-1.246 2.155 1.97 5.56-5.56 1.25 1.186-6.81 6.68z"></path></g></svg>
             )}
           </div>
           <div className="text-[15px] text-muted-foreground">@{profile.username}</div>
        </div>

        <div className="mt-3 text-[15px] whitespace-pre-wrap">{profile.bio || 'Bio goes here.'}</div>

        <div className="mt-3 flex items-center text-muted-foreground text-[15px] gap-1">
          <Calendar size={16} /> Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </div>

        <div className="mt-3 flex gap-4 text-[15px]">
          <div className="hover:underline cursor-pointer"><span className="font-bold text-foreground">{followStats.following}</span> <span className="text-muted-foreground">Following</span></div>
          <div className="hover:underline cursor-pointer"><span className="font-bold text-foreground">{followStats.followers}</span> <span className="text-muted-foreground">Followers</span></div>
        </div>
      </div>

      <div className="flex border-b border-border">
        <div className="flex-1 text-center py-3 font-bold border-b-4 border-primary hover:bg-muted transition-colors cursor-pointer text-[15px]">Posts</div>
        <div className="flex-1 text-center py-3 font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer text-[15px]">Replies</div>
        <div className="flex-1 text-center py-3 font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer text-[15px]">Media</div>
        <div className="flex-1 text-center py-3 font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer text-[15px]">Likes</div>
      </div>
      
      {/* Posts list */}
      <div className="px-4 sm:px-8 py-6 space-y-4">
        {posts.length === 0 ? (
          <EmptyState 
            icon={<MessageSquareOff size={32} />}
            title="No posts yet"
            description={isOwnProfile ? "When you post, they will show up here." : "This user hasn't posted anything yet."}
          />
        ) : (
          posts.map(post => (
             <article key={post.id} className="bg-card border border-border rounded-2xl p-5 hover:border-muted-foreground/30 transition-colors cursor-pointer">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden shrink-0 flex items-center justify-center font-bold text-white">
                    {profile.profile_picture_url ? <img src={profile.profile_picture_url} className="w-full h-full object-cover" alt="" /> : profile.display_name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center text-[15px] gap-1">
                      <span className="font-bold hover:underline truncate">{profile.display_name || profile.username}</span>
                      {profile.is_verified && (
                        <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-[16px] h-[16px] text-accent fill-current"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.756 2.75 1.88 3.447-.077.387-.12.784-.12 1.18 0 2.21 1.708 3.998 3.917 3.998.47 0 .92-.086 1.336-.252C9.182 21.587 10.49 22.5 12 22.5s2.816-.915 3.336-2.252c.417.166.868.252 1.336.252 2.21 0 3.918-1.79 3.918-4 0-.398-.043-.795-.12-1.182 1.124-.697 1.88-1.986 1.88-3.447zM10.446 16l-3.3-3.03 1.144-1.246 2.155 1.97 5.56-5.56 1.25 1.186-6.81 6.68z"></path></g></svg>
                      )}
                      <span className="text-muted-foreground truncate text-sm">@{profile.username}</span>
                      <span className="text-muted-foreground px-1">·</span>
                      <span className="text-muted-foreground text-sm">{formatRelativeTime(post.created_at)}</span>
                    </div>
                    <div className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap break-words">{post.content}</div>
                    {post.image_url && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-border bg-muted">
                        <img src={post.image_url} alt="" className="w-full h-auto max-h-[400px] object-cover" />
                      </div>
                    )}
                    
                    <div className="mt-4 flex gap-6 text-muted-foreground text-sm">
                      <span className="flex items-center gap-1.5 hover:text-accent cursor-pointer transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg> 24
                      </span>
                      <span className="flex items-center gap-1.5 hover:text-red-400 cursor-pointer transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg> 182
                      </span>
                    </div>
                  </div>
                </div>
             </article>
          ))
        )}
      </div>
    </div>
  );
}
