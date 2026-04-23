import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { ArrowLeft, Users, Shield, MessageSquareX, Sparkles, Image as ImageIcon, X } from 'lucide-react';
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

  useEffect(() => {
    fetchCommunity();
  }, [id, profile]);

  const fetchCommunity = async () => {
    if (!id) return;
    setLoading(true);

    // Fetch community details
    const { data: commData } = await supabase.from('communities').select('*').eq('id', id).single();
    if (commData) setCommunity(commData);

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
      const { data } = await supabase.from('posts').select(`
        *,
        users:user_id ( username, display_name, profile_picture_url, is_verified, role ),
        original_post:original_post_id ( *, users:user_id ( username, display_name, profile_picture_url, is_verified, role ) )
      `).eq('community_id', id).order('created_at', { ascending: false });
      if (data) setPosts(data);
    } catch(err) {
      console.log('Failed fetching community posts', err);
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
        }
      }

      const { error } = await supabase.from('posts').insert({
        user_id: profile.id,
        community_id: id, // Linking to community
        content: content.trim(),
        image_url
      });

      if (!error) {
        setContent('');
        removeImage();
        fetchPosts();
        
        // Gamification
        const { useAppStore } = await import('../lib/store');
        useAppStore.getState().gainXp(15);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };


  if (loading && !community) {
    return <div className="p-4 flex justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!community) {
    return <div className="p-8 text-center text-xl font-bold">Community not found</div>;
  }

  return (
    <div className="w-full pb-20 relative">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 py-1.5 h-[53px]">
        <Link to="/communities" className="w-9 h-9 rounded-full hover:bg-muted transition-colors flex items-center justify-center mr-6">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold leading-tight truncate">
          {community.name}
        </h1>
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
    </div>
  );
}
