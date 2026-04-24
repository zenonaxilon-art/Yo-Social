import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Calendar, User, MessageSquareOff, Link as LinkIcon, BadgeCheck, X, Camera, Loader2, Trophy, Target, Zap, Heart, Video } from 'lucide-react';
import { formatRelativeTime, cn } from '../lib/utils';
import { PostSkeleton, EmptyState } from '../components/UIStates';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { profile: currentUser, setProfile: setGlobalProfile } = useAppStore();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');
  const [requestSent, setRequestSent] = useState(false);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    website_url: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [reels, setReels] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: user } = await supabase.from('users').select('*').eq('username', username).single();
    if (user) {
      setProfile(user);
      setEditForm({
         display_name: user.display_name || '',
         bio: user.bio || '',
         website_url: user.website_url || ''
      });
      
      const fetchProfileData = async (uid: string) => {
        let query = supabase.from('posts').select(`
          *, 
          users:user_id ( username, display_name, profile_picture_url, is_verified, role ),
          original_post:original_post_id ( *, users:user_id ( username, display_name, profile_picture_url, is_verified, role ) )
        `).eq('user_id', uid).order('created_at', { ascending: false });
        
        try {
           const { data: userPosts } = await query;
           if (userPosts) setPosts(userPosts);
        } catch(err) {
           const { data: userPostsFb } = await supabase.from('posts').select(`*, users:user_id ( username, display_name, profile_picture_url, is_verified, role )`).eq('user_id', uid).order('created_at', { ascending: false });
           if (userPostsFb) setPosts(userPostsFb);
        }

        const { data: userReels } = await supabase.from('reels').select('*, users:user_id(username, display_name, profile_picture_url, is_verified, role)').eq('user_id', uid).order('created_at', { ascending: false });
        if (userReels) setReels(userReels);
      };
      
      fetchProfileData(user.id);

      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id);
      setFollowStats({ followers: followers || 0, following: following || 0 });

      if (currentUser) {
        const { data } = await supabase.from('follows').select('*').eq('follower_id', currentUser.id).eq('following_id', user.id).single();
        setIsFollowing(!!data);

        // Check if pending request exists
        if (currentUser.id === user.id) {
           const { data: reqData } = await supabase.from('verification_requests').select('*').eq('user_id', currentUser.id).eq('status', 'pending');
           if (reqData && reqData.length > 0) {
              setRequestSent(true);
           }
        }
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
      
      // Send notification
      supabase.from('notifications').insert({
         user_id: profile.id,
         actor_id: currentUser.id,
         type: 'follow'
      }).then();
    }
    setIsFollowing(!isFollowing);
  };
  
  const handleDeletePost = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const requestVerification = async () => {
    if (!currentUser) return;
    try {
      // Just simulate inserting to database even if not fully applied yet to supabase-schema explicitly
      await supabase.from('verification_requests').insert({ user_id: currentUser.id, status: 'pending' });
      setRequestSent(true);
    } catch(e) {
      console.log(e);
      // Fallback optimistic
      setRequestSent(true);
    }
  };

  const handleSaveProfile = async () => {
      if (!currentUser || !profile) return;
      setIsSaving(true);
      
      try {
        let finalAvatarUrl = profile.profile_picture_url;
        let finalBannerUrl = profile.banner_url;

        // Upload Avatar
        if (avatarFile) {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${currentUser.id}-avatar-${Date.now()}.${fileExt}`;
          const { data, error } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true });
          if (data) {
             const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
             finalAvatarUrl = publicUrl;
          }
        }

        // Upload Banner
        if (bannerFile) {
          const fileExt = bannerFile.name.split('.').pop();
          const fileName = `${currentUser.id}-banner-${Date.now()}.${fileExt}`;
          const { data } = await supabase.storage.from('avatars').upload(fileName, bannerFile, { upsert: true });
          if (data) {
             const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
             finalBannerUrl = publicUrl;
          }
        }

        // Update User records
        const updates = {
          display_name: editForm.display_name.trim() || profile.display_name,
          bio: editForm.bio.trim(),
          website_url: editForm.website_url.trim(),
          profile_picture_url: finalAvatarUrl,
          banner_url: finalBannerUrl
        };

        const { error } = await supabase.from('users').update(updates).eq('id', currentUser.id);
        
        if (!error) {
           const updatedProfile = { ...profile, ...updates };
           setProfile(updatedProfile);
           setGlobalProfile({ ...currentUser, ...updates });
           setIsEditing(false);
           setAvatarFile(null);
           setBannerFile(null);
        }
      } catch (err) {
         console.error('Failed to update profile', err);
      } finally {
         setIsSaving(false);
      }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       setAvatarFile(file);
       setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       setBannerFile(file);
       setBannerPreview(URL.createObjectURL(file));
    }
  };

  if (loading) {
    return <div className="p-4 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-xl font-bold">This account doesn't exist</div>;
  }

  const isOwnProfile = currentUser?.id === profile.id;
  const showGoldBadge = profile.role === 'creator' || profile.role === 'admin';
  const displayXp = profile.xp || 0;
  const displayLevel = profile.level || 1;
  const displayStreak = profile.streak || 0;

  return (
    <div className="w-full relative">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 py-1.5 h-[53px]">
        <Link to=".." className="w-9 h-9 rounded-full hover:bg-muted transition-colors flex items-center justify-center mr-6">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold leading-tight flex items-center gap-1">
            {profile.display_name}
            {profile.is_verified && <BadgeCheck size={16} className={showGoldBadge ? "text-yellow-500" : "text-primary"} />}
          </h1>
          <div className="text-[13px] text-muted-foreground">{posts.length} posts</div>
        </div>
      </div>

      {/* Banner */}
      <div className="h-32 sm:h-48 bg-muted overflow-hidden relative">
        {profile.banner_url ? (
            <img src={profile.banner_url} className="w-full h-full object-cover" />
        ) : (
            <div className="w-full h-full bg-gradient-to-tr from-muted-foreground/30 to-muted/10"></div>
        )}
      </div>

      {/* Profile info */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-start">
          <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-full border-4 border-background bg-muted -mt-12 sm:-mt-16 overflow-hidden shrink-0 flex items-center justify-center relative">
             {profile.profile_picture_url ? (
               <img src={profile.profile_picture_url} className="w-full h-full object-cover" alt="" />
             ) : (
                <User size={64} className="text-muted-foreground" />
             )}
          </div>
          <div className="pt-3 flex gap-2">
             {isOwnProfile && currentUser && !currentUser.is_verified && (
                 <button 
                  onClick={requestVerification} 
                  disabled={requestSent}
                  className="font-bold border border-border rounded-full px-4 py-1.5 hover:bg-muted transition-colors text-sm disabled:opacity-50"
                 >
                   {requestSent ? 'Verification Pending' : 'Request Verification'}
                 </button>
             )}
             {isOwnProfile ? (
                 <button onClick={() => setIsEditing(true)} className="font-bold border border-border rounded-full px-4 py-1.5 hover:bg-muted transition-colors">Edit profile</button>
             ) : (
                <div className="flex gap-2">
                 <Link to={`/messages/${profile.id}`} className="font-bold rounded-full p-1.5 transition-colors border border-border flex items-center justify-center w-9 h-9 hover:bg-muted">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z"></path></svg>
                 </Link>
                 <button 
                   onClick={toggleFollow}
                   className={`font-bold rounded-full px-4 py-1.5 transition-colors border ${isFollowing ? 'bg-transparent border-border text-foreground hover:border-red-500 hover:text-red-500 hover:bg-red-500/10 hover:after:content-["Unfollow"] after:content-["Following"] w-[105px]' : 'bg-foreground text-background w-[85px] hover:bg-foreground/90'}`}
                 >
                   {!isFollowing && 'Follow'}
                 </button>
                </div>
             )}
          </div>
        </div>

        <div className="mt-2">
           <div className="flex items-center gap-1">
             <h2 className="text-xl font-extrabold">{profile.display_name}</h2>
             {profile.is_verified && (
                <svg viewBox="0 0 24 24" aria-label="Verified account" className={cn("w-5 h-5 fill-current", showGoldBadge ? "text-yellow-500" : "text-primary")}><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.756 2.75 1.88 3.447-.077.387-.12.784-.12 1.18 0 2.21 1.708 3.998 3.917 3.998.47 0 .92-.086 1.336-.252C9.182 21.587 10.49 22.5 12 22.5s2.816-.915 3.336-2.252c.417.166.868.252 1.336.252 2.21 0 3.918-1.79 3.918-4 0-.398-.043-.795-.12-1.182 1.124-.697 1.88-1.986 1.88-3.447zM10.446 16l-3.3-3.03 1.144-1.246 2.155 1.97 5.56-5.56 1.25 1.186-6.81 6.68z"></path></g></svg>
             )}
           </div>
           <div className="text-[15px] text-muted-foreground">@{profile.username}</div>
        </div>

        {/* Gamification Stats */}
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
           <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 text-orange-600 border border-orange-500/20 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
             <Trophy size={14} /> Level {displayLevel}
           </div>
           <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-500 border border-blue-500/20 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
             <Target size={14} /> {displayXp} XP Base
           </div>
           {displayStreak > 0 && (
              <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                <Zap size={14} className="fill-red-500" /> {displayStreak} Day Streak!
              </div>
           )}
        </div>

        <div className="mt-3 text-[15px] whitespace-pre-wrap">{profile.bio || 'Bio goes here.'}</div>

        <div className="mt-3 flex flex-wrap items-center text-muted-foreground text-[15px] gap-x-4 gap-y-2">
          {profile.website_url && (
            <a href={profile.website_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline text-primary">
              <LinkIcon size={16} className="text-muted-foreground" /> {profile.website_url.replace(/^https?:\/\//, '')}
            </a>
          )}
          <div className="flex items-center gap-1">
            <Calendar size={16} /> Joined {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div className="mt-3 flex gap-4 text-[15px]">
          <div className="hover:underline cursor-pointer"><span className="font-bold text-foreground">{followStats.following}</span> <span className="text-muted-foreground">Following</span></div>
          <div className="hover:underline cursor-pointer"><span className="font-bold text-foreground">{followStats.followers}</span> <span className="text-muted-foreground">Followers</span></div>
        </div>
      </div>

      <div className="flex border-b border-border">
        {['posts', 'replies', 'media', 'likes'].map((t) => (
          <div key={t} onClick={() => setActiveTab(t as any)} className={cn("flex-1 text-center py-3 font-medium hover:bg-muted transition-colors cursor-pointer text-[15px] capitalize border-b-4", activeTab === t ? "border-primary font-bold text-foreground" : "border-transparent text-muted-foreground")}>{t}</div>
        ))}
      </div>
      
      {/* Posts list */}
      <div className="px-4 sm:px-8 py-6 space-y-4">
        {activeTab === 'media' ? (
           <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {reels.map(reel => (
                 <Link to={`/reels`} key={`reel-${reel.id}`} className="aspect-[9/16] bg-muted relative rounded-xl overflow-hidden group">
                    <video src={reel.video_url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-white font-bold flex items-center justify-center gap-2 mb-2"><Heart size={16}/> {reel.likes_count || 0}</span>
                       <span className="text-white font-bold flex items-center justify-center gap-2 mb-2"><Video size={16}/> {reel.views_count || 0}</span>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white">
                       <Camera size={14} />
                    </div>
                 </Link>
              ))}
              {posts.filter(p => !!p.image_url).map(post => (
                 <div key={`post-${post.id}`} className="aspect-square bg-muted relative rounded-xl overflow-hidden">
                    <img src={post.image_url} className="w-full h-full object-cover" />
                 </div>
              ))}
              {reels.length === 0 && posts.filter(p => !!p.image_url).length === 0 && (
                 <div className="col-span-full">
                    <EmptyState 
                       icon={<Camera size={32} />}
                       title="No media yet"
                       description="This user hasn't posted any photos or reels."
                    />
                 </div>
              )}
           </div>
        ) : activeTab !== 'posts' ? (
           <EmptyState 
             icon={<MessageSquareOff size={32} />}
             title={`No ${activeTab} yet`}
             description={`This user doesn't have any ${activeTab} to show at the moment.`}
           />
        ) : posts.length === 0 ? (
          <EmptyState 
            icon={<MessageSquareOff size={32} />}
            title="No posts yet"
            description={isOwnProfile ? "When you post, they will show up here." : "This user hasn't posted anything yet."}
          />
        ) : (
          posts.map(post => (
             <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
          ))
        )}
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-[600px] border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
             <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10 rounded-t-2xl">
               <div className="flex items-center gap-6">
                 <button onClick={() => setIsEditing(false)} className="hover:bg-muted p-2 rounded-full transition-colors"><X size={20} /></button>
                 <h2 className="text-xl font-bold">Edit profile</h2>
               </div>
               <button onClick={handleSaveProfile} disabled={isSaving} className="bg-foreground text-background font-bold px-4 py-1.5 rounded-full hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2">
                 {isSaving && <Loader2 size={16} className="animate-spin" />}
                 Save
               </button>
             </div>
             
             <div className="overflow-y-auto overflow-x-hidden flex-1 relative pb-8">
                <div className="h-48 bg-muted relative group">
                  {(bannerPreview || profile.banner_url) ? (
                    <img src={bannerPreview || profile.banner_url} className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full bg-gradient-to-tr from-muted-foreground/30 to-muted/10"></div>}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-black/80 transition-colors">
                      <Camera size={20} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                    </label>
                  </div>
                </div>

                <div className="px-4">
                  <div className="w-28 h-28 rounded-full border-4 border-background bg-muted -mt-14 relative group overflow-hidden shrink-0">
                    {(avatarPreview || profile.profile_picture_url) ? (
                      <img src={avatarPreview || profile.profile_picture_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><User size={48} className="text-muted-foreground" /></div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <label className="w-10 h-10 bg-black/60 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors">
                        <Camera size={20} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </label>
                    </div>
                  </div>

                  <div className="space-y-5 mt-4">
                    <div className="space-y-1 relative border border-border rounded bg-transparent p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary flex flex-col transition-all">
                      <label className="text-xs text-muted-foreground font-medium px-1">Name</label>
                      <input 
                        type="text" 
                        value={editForm.display_name}
                        onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                        className="bg-transparent border-none outline-none px-1 text-[15px] text-foreground w-full placeholder:text-muted-foreground/50"
                        placeholder="Add your name"
                      />
                    </div>
                    
                    <div className="space-y-1 relative border border-border rounded bg-transparent p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary flex flex-col transition-all">
                      <label className="text-xs text-muted-foreground font-medium px-1">Bio</label>
                      <textarea 
                        value={editForm.bio}
                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                        className="bg-transparent border-none outline-none px-1 text-[15px] text-foreground w-full resize-none min-h-[80px] placeholder:text-muted-foreground/50"
                        placeholder="Add your bio"
                      />
                    </div>
                    
                    <div className="space-y-1 relative border border-border rounded bg-transparent p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary flex flex-col transition-all">
                      <label className="text-xs text-muted-foreground font-medium px-1">Website</label>
                      <input 
                        type="text" 
                        value={editForm.website_url}
                        onChange={(e) => setEditForm({...editForm, website_url: e.target.value})}
                        className="bg-transparent border-none outline-none px-1 text-[15px] text-foreground w-full placeholder:text-muted-foreground/50"
                        placeholder="Add a website"
                      />
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
