import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Users, Shield, MessageSquareX, Sparkles, Image as ImageIcon, X, Settings, Camera, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import PostCard from '../components/PostCard';
import { PostSkeleton, EmptyState } from '../components/UIStates';

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAppStore();
  const [community, setCommunity] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [memberRole, setMemberRole] = useState<string | null>(null); // 'member', 'moderator', 'admin', or null if not joined
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'feed' | 'rules' | 'members'>('feed');

  // Composer
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [posting, setPosting] = useState(false);

  // Edit Community
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', rules: '' });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCommunity();
  }, [id, profile]);

  const fetchCommunity = async () => {
    if (!id) return;
    setLoading(true);

    // Fetch community details
    const { data: commData } = await supabase.from('communities').select('*').eq('id', id).single();
    if (commData) {
      setCommunity(commData);
      setEditForm({
         name: commData.name || '',
         description: commData.description || '',
         rules: commData.rules || ''
      });
    }

    // Fetch members and my role
    const { data: memberData } = await supabase.from('community_members').select('*, users(*)').eq('community_id', id);
    if (memberData) {
       setMembers(memberData);
       if (profile) {
          const myMembership = memberData.find(m => m.user_id === profile.id);
          if (myMembership) {
             setMemberRole(myMembership.role);
          } else {
             setMemberRole(null);
          }
       }
    }

    // Fetch posts
    await fetchPosts();

    setLoading(false);
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase.from('posts').select(`
        *,
        users:user_id ( username, display_name, profile_picture_url, is_verified, role ),
        original_post:original_post_id ( *, users:user_id ( username, display_name, profile_picture_url, is_verified, role ) )
      `).eq('community_id', id).order('created_at', { ascending: false });
      
      if (error) {
         console.error('Fetch posts error:', error);
         alert(`Failed to load community posts: ${error.message}`);
      } else if (data) {
         setPosts(data);
      }
    } catch(err: any) {
      console.log('Failed fetching community posts', err);
      alert(`Error loading posts: ${err.message}`);
    }
  };

  const joinCommunity = async () => {
    if (!profile || !id) return;
    try {
      await supabase.from('community_members').insert({
        community_id: id,
        user_id: profile.id,
        role: 'member'
      });
      setMemberRole('member');
      fetchCommunity();
    } catch(e) {
      console.error(e);
    }
  };

  const leaveCommunity = async () => {
    if (!profile || !id) return;
    try {
      await supabase.from('community_members').delete().eq('community_id', id).eq('user_id', profile.id);
      setMemberRole(null);
      fetchCommunity();
    } catch(e) {
      console.error(e);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5MB");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveCommunity = async () => {
      if (!profile || !community) return;
      setIsSaving(true);
      
      try {
        let finalIconUrl = community.icon_url;
        let finalBannerUrl = community.banner_url;

        if (iconFile) {
          const fileExt = iconFile.name.split('.').pop();
          const fileName = `comm-${id}-icon-${Date.now()}.${fileExt}`;
          const { data } = await supabase.storage.from('avatars').upload(fileName, iconFile, { upsert: true });
          if (data) {
             const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
             finalIconUrl = publicUrl;
          }
        }

        if (bannerFile) {
          const fileExt = bannerFile.name.split('.').pop();
          const fileName = `comm-${id}-banner-${Date.now()}.${fileExt}`;
          const { data } = await supabase.storage.from('avatars').upload(fileName, bannerFile, { upsert: true });
          if (data) {
             const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
             finalBannerUrl = publicUrl;
          }
        }

        const updates = {
          name: editForm.name.trim() || community.name,
          description: editForm.description.trim(),
          rules: editForm.rules.trim(),
          icon_url: finalIconUrl,
          banner_url: finalBannerUrl
        };

        const { error } = await supabase.from('communities').update(updates).eq('id', id);
        
        if (!error) {
           setCommunity({ ...community, ...updates });
           setIsEditing(false);
           setIconFile(null);
           setBannerFile(null);
        } else {
           console.error('Update error', error);
           alert("Failed to update: " + error.message);
        }
      } catch (err) {
         console.error('Failed to update community', err);
      } finally {
         setIsSaving(false);
      }
  };

  const handlePost = async () => {
    if ((!content.trim() && !imageFile) || !profile || !id) return;
    setPosting(true);

    try {
      let image_url = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${profile.id}/${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('post_images').upload(fileName, imageFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
          image_url = data.publicUrl;
        } else {
             console.error("Image upload error:", uploadError);
             alert("Image upload failed.");
             setPosting(false);
             return;
        }
      }

      const { error, data: d1 } = await supabase.from('posts').insert({
        user_id: profile.id,
        community_id: id,
        content: content.trim(),
        image_url
      });

      if (!error) {
        setContent('');
        removeImage();
        fetchPosts();
        
        // Gamification
        useAppStore.getState().gainXp(15);
      } else {
         console.error("Failed to post:", error);
         alert("Failed to create post. Please check that you've run the 'community_id' column SQL update.");
      }
    } catch (e) {
      console.error(e);
      alert("An unexpected error occurred.");
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };


  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       setIconFile(file);
       setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       setBannerFile(file);
       setBannerPreview(URL.createObjectURL(file));
    }
  };

  if (loading && !community) {
    return <div className="p-4 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!community) {
    return <div className="p-8 text-center text-xl font-bold">Community not found</div>;
  }

  return (
    <div className="w-full pb-20 relative">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 py-1.5 h-[53px]">
        <div className="flex items-center">
          <Link to="/communities" className="w-9 h-9 rounded-full hover:bg-muted transition-colors flex items-center justify-center mr-4">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold leading-tight truncate">
            {community.name}
          </h1>
        </div>
        {memberRole === 'admin' && (
           <button onClick={() => setIsEditing(true)} className="w-9 h-9 rounded-full hover:bg-muted transition-colors flex items-center justify-center">
             <Settings size={20} className="text-muted-foreground" />
           </button>
        )}
      </div>

      {/* Header Banner */}
      <div className="h-32 sm:h-48 bg-primary/20 relative flex items-center justify-center overflow-hidden">
         {community.banner_url && <img src={community.banner_url} className="absolute inset-0 w-full h-full object-cover" />}
         {!community.banner_url && <Shield size={64} className="text-primary/30" />}
      </div>

      {/* Community Info */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-start">
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl border-4 border-background bg-muted -mt-10 sm:-mt-14 overflow-hidden shrink-0 flex items-center justify-center relative shadow-sm z-10 text-primary font-bold text-4xl">
             {community.icon_url ? (
               <img src={community.icon_url} className="w-full h-full object-cover" />
             ) : (
               community.name.charAt(0).toUpperCase()
             )}
          </div>
          <div className="pt-3">
             {memberRole ? (
                <button 
                  onClick={leaveCommunity}
                  className="font-bold rounded-full px-4 py-1.5 transition-colors border bg-transparent border-border text-foreground hover:border-red-500 hover:text-red-500 hover:bg-red-500/10 text-sm"
                >
                  Joined
                </button>
             ) : (
                <button 
                  onClick={joinCommunity}
                  className="bg-primary text-primary-foreground font-bold px-5 py-1.5 rounded-full hover:opacity-90 transition-opacity text-sm"
                >
                  Join
                </button>
             )}
          </div>
        </div>

        <div className="mt-3">
           <h2 className="text-2xl font-extrabold">{community.name}</h2>
           <div className="text-sm font-medium text-muted-foreground flex gap-3 mt-1 items-center">
              <span className="flex items-center gap-1"><Users size={14} /> {members.length} members</span>
              {memberRole === 'admin' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">Admin</span>}
              {memberRole === 'moderator' && <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs">Moderator</span>}
           </div>
           <p className="mt-3 text-[15px]">{community.description || "Welcome to our community!"}</p>
        </div>
      </div>

      <div className="flex border-b border-border mt-2">
        <div onClick={() => setActiveTab('feed')} className={cn("flex-1 text-center py-3 font-medium hover:bg-muted transition-colors cursor-pointer text-[15px] border-b-4", activeTab === 'feed' ? "border-primary font-bold text-foreground" : "border-transparent text-muted-foreground")}>Feed</div>
        <div onClick={() => setActiveTab('rules')} className={cn("flex-1 text-center py-3 font-medium hover:bg-muted transition-colors cursor-pointer text-[15px] border-b-4", activeTab === 'rules' ? "border-primary font-bold text-foreground" : "border-transparent text-muted-foreground")}>Rules</div>
        <div onClick={() => setActiveTab('members')} className={cn("flex-1 text-center py-3 font-medium hover:bg-muted transition-colors cursor-pointer text-[15px] border-b-4", activeTab === 'members' ? "border-primary font-bold text-foreground" : "border-transparent text-muted-foreground")}>Members</div>
      </div>

      <div className="px-4 sm:px-8 py-6 space-y-4">
         {activeTab === 'feed' && (
            <>
               {memberRole ? (
                  <div className="mb-6 p-4 bg-card border border-border rounded-2xl flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground overflow-hidden shrink-0 flex items-center justify-center font-bold">
                      {profile?.profile_picture_url ? (
                        <img src={profile.profile_picture_url} className="w-full h-full object-cover" />
                      ) : profile?.display_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <textarea
                        className="w-full bg-transparent text-base outline-none resize-none pt-2 placeholder-muted-foreground min-h-[40px]"
                        placeholder={`Post in ${community.name}...`}
                        value={content}
                        onChange={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                          setContent(e.target.value);
                        }}
                      />
                      {imagePreview && (
                        <div className="relative mt-2 mb-2 w-fit">
                           <img src={imagePreview} className="rounded-xl max-h-[300px] object-cover border border-border" />
                           <button onClick={removeImage} className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-black transition-colors backdrop-blur-md"><X size={16} /></button>
                        </div>
                      )}
                      <div className="border-t border-border mt-2 pt-3 flex justify-between items-center">
                        <div className="flex gap-4 text-muted-foreground">
                          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect}/>
                          <button onClick={() => fileInputRef.current?.click()} className="hover:text-primary transition-colors cursor-pointer"><ImageIcon size={20} /></button>
                        </div>
                        <button
                          onClick={handlePost} disabled={posting || (!content.trim() && !imageFile)}
                          className="bg-primary text-primary-foreground font-bold px-4 py-1.5 rounded-full text-sm hover:opacity-90 transition-opacity"
                        >
                          {posting ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </div>
                  </div>
               ) : (
                  <div className="p-4 bg-muted/50 rounded-xl text-center text-sm font-medium text-muted-foreground border border-border mb-6">
                     You must join this community to post or interact.
                  </div>
               )}

               {posts.length === 0 ? (
                  <EmptyState icon={<MessageSquareX size={32} />} title="No posts yet" description="Be the first to post in this community!" />
               ) : (
                  posts.map(post => <PostCard key={post.id} post={post} onDelete={handleDeletePost} />)
               )}
            </>
         )}

         {activeTab === 'rules' && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Shield size={20} className="text-primary"/> Rules</h3>
              {community.rules ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{community.rules}</div>
              ) : (
                <p className="text-muted-foreground text-sm">This community has no specific rules yet. Be respectful!</p>
              )}
            </div>
         )}

         {activeTab === 'members' && (
            <div className="space-y-4">
               {members.map(m => (
                 <div key={m.user_id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                   <Link to={`/profile/${m.users?.username}`} className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center font-bold">
                     {m.users?.profile_picture_url ? <img src={m.users.profile_picture_url} className="w-full h-full object-cover" /> : m.users?.display_name?.charAt(0)}
                   </Link>
                   <div className="flex-1 min-w-0">
                     <Link to={`/profile/${m.users?.username}`} className="font-bold text-[15px] hover:underline truncate block">
                        {m.users?.display_name}
                     </Link>
                     <div className="text-[13px] text-muted-foreground truncate">@{m.users?.username}</div>
                   </div>
                   {m.role === 'admin' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium shrink-0">Admin</span>}
                   {m.role === 'moderator' && <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-xs font-medium shrink-0">Mod</span>}
                 </div>
               ))}
            </div>
         )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
         <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card w-full max-w-[500px] max-h-[90vh] overflow-y-auto border border-border rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Edit Community Settings</h2>
                <button onClick={() => { setIsEditing(false); setIconFile(null); setBannerFile(null); }} className="hover:bg-muted p-1 rounded-full"><X size={20}/></button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Banner Image</label>
                  <label className="h-32 w-full border-2 border-dashed border-border rounded-xl flex items-center justify-center cursor-pointer relative overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors">
                     <img src={bannerPreview || community.banner_url} className={cn("absolute inset-0 w-full h-full object-cover", !(bannerPreview || community.banner_url) && "hidden")} />
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={32} />
                     </div>
                     {!bannerPreview && !community.banner_url && <Camera className="text-muted-foreground" size={32} />}
                     <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange}/>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Icon Image</label>
                  <label className="w-24 h-24 border-2 border-dashed border-border rounded-xl flex items-center justify-center cursor-pointer relative overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors">
                     <img src={iconPreview || community.icon_url} className={cn("absolute inset-0 w-full h-full object-cover", !(iconPreview || community.icon_url) && "hidden")} />
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="text-white" size={24} />
                     </div>
                     {!iconPreview && !community.icon_url && <Camera className="text-muted-foreground" size={24} />}
                     <input type="file" accept="image/*" className="hidden" onChange={handleIconChange}/>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Community Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 bg-transparent border border-border rounded text-[15px] focus:outline-none focus:border-primary"/>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Description</label>
                  <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-2 bg-transparent border border-border rounded text-[15px] focus:outline-none focus:border-primary min-h-[80px]"/>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Rules</label>
                  <textarea value={editForm.rules} onChange={e => setEditForm({...editForm, rules: e.target.value})} className="w-full p-2 bg-transparent border border-border rounded text-[15px] focus:outline-none focus:border-primary min-h-[120px]" placeholder="1. Be respectful..."/>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                 <button onClick={() => { setIsEditing(false); setIconFile(null); setBannerFile(null); }} className="px-5 py-2 font-medium hover:bg-muted rounded-full">Cancel</button>
                 <button onClick={handleSaveCommunity} disabled={isSaving} className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-full disabled:opacity-50 flex items-center gap-2">
                   {isSaving && <Loader2 size={16} className="animate-spin" />}
                   {isSaving ? 'Saving...' : 'Save Changes'}
                 </button>
              </div>
            </div>
         </div>
      )}
    </div>
  );
}
