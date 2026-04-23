import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { Image as ImageIcon, Sparkles, Search, MessageSquareX, X } from 'lucide-react';
import { cn, formatRelativeTime } from '../lib/utils';
import { Link } from 'react-router-dom';
import { PostSkeleton, EmptyState } from '../components/UIStates';
import PostCard from '../components/PostCard';

export default function Home() {
  const { profile } = useAppStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [feedType, setFeedType] = useState<'for_you' | 'following'>('for_you');
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFollowingIds();
  }, [profile?.id]);

  useEffect(() => {
    fetchPosts();

    const channel = supabase.channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeQuery, feedType, followingIds]);

  const fetchFollowingIds = async () => {
    if (!profile) return;
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id);
    if (data) {
      setFollowingIds(data.map(f => f.following_id));
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    let query = supabase
      .from('posts')
      .select(`
        *,
        users:user_id ( username, display_name, profile_picture_url, is_verified, role ),
        original_post:original_post_id ( *, users:user_id ( username, display_name, profile_picture_url, is_verified, role ) )
      `)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (activeQuery.trim()) {
      query = query.ilike('content', `%${activeQuery}%`);
    }

    if (feedType === 'following' && followingIds.length > 0) {
      query = query.in('user_id', followingIds);
    } else if (feedType === 'following' && followingIds.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Wrap in try catch incase they didn't run the SQL schema yet
    try {
       const { data } = await query;
       if (data) setPosts(data);
    } catch(err) {
       console.log('Failed fetching posts because of missing schema elements', err);
       // Fallback without original_post
       query = supabase.from('posts').select(`*, users:user_id ( username, display_name, profile_picture_url, is_verified, role )`).order('created_at', { ascending: false }).limit(50);
       const { data } = await query;
       if (data) setPosts(data);
    }
    setLoading(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5MB");
        return;
      }
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    if ((!content.trim() && !imageFile) || !profile) return;
    setPosting(true);

    try {
      let image_url = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;
        
        const { error: uploadError, data } = await supabase.storage.from('post_images').upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('post_images').getPublicUrl(filePath);
        image_url = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase.from('posts').insert({
        user_id: profile.id,
        content: content.trim(),
        image_url
      });

      if (insertError) {
         console.error("Supabase insert error:", insertError);
         throw insertError;
      }

      setContent('');
      removeImage();
    } catch (e: any) {
      console.error("Error posting:", e);
      alert("Failed to create post: " + (e.message || "Unknown error"));
    } finally {
      setPosting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchQuery);
  };

  const handleDeletePost = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="w-full relative">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex justify-between items-center px-4 py-3 gap-4">
          <h1 className="text-xl font-bold hidden sm:block shrink-0">Home</h1>
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search posts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-full py-2 pl-9 pr-4 text-[14px] focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
          </form>
          <Sparkles className="text-primary w-5 h-5 shrink-0" />
        </div>
        <div className="flex">
          <div onClick={() => setFeedType('for_you')} className={cn("flex-1 text-center py-3 font-medium hover:bg-muted transition-colors cursor-pointer border-b-4", feedType === 'for_you' ? "border-primary font-bold text-foreground" : "border-transparent text-muted-foreground")}>For you</div>
          <div onClick={() => setFeedType('following')} className={cn("flex-1 text-center py-3 font-medium hover:bg-muted transition-colors cursor-pointer border-b-4", feedType === 'following' ? "border-primary font-bold text-foreground" : "border-transparent text-muted-foreground")}>Following</div>
        </div>
      </div>

      {/* Composer */}
      <div className="mx-4 sm:mx-8 mt-6 mb-6 p-4 sm:p-5 bg-muted/30 border border-border rounded-2xl flex gap-4">
        <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground overflow-hidden shrink-0 flex items-center justify-center font-bold">
          {profile?.profile_picture_url ? (
            <img src={profile.profile_picture_url} className="w-full h-full object-cover" alt="" />
          ) : profile?.display_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            className="w-full bg-transparent text-lg outline-none resize-none pt-1 placeholder-muted-foreground min-h-[40px]"
            placeholder="What's happening?"
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
               <button onClick={removeImage} className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-black transition-colors backdrop-blur-md">
                 <X size={16} />
               </button>
            </div>
          )}

          <div className="border-t border-border mt-2 pt-3 flex justify-between items-center">
            <div className="flex gap-4 text-muted-foreground">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageSelect}
              />
              <button onClick={() => fileInputRef.current?.click()} className="hover:text-primary transition-colors cursor-pointer"><ImageIcon size={20} /></button>
            </div>
            <button
              onClick={handlePost}
              disabled={posting || (!content.trim() && !imageFile)}
              className="bg-primary text-primary-foreground font-medium px-5 py-1.5 rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 sm:px-8 pb-8 space-y-4">
        {loading ? (
          <div>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState 
             icon={<MessageSquareX size={32} />} 
             title={activeQuery ? "No matching posts" : "No posts yet"} 
             description={activeQuery ? `We couldn't find any posts matching "${activeQuery}".` : "Be the first to share your thoughts!"}
          />
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
          ))
        )}
      </div>
    </div>
  );
}
