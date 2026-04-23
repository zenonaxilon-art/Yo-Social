import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { cn, formatRelativeTime } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function Home() {
  const { profile } = useAppStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);

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
  }, []);

  const fetchPosts = async () => {
    // In a real app we'd join with users, likes, comments. 
    // Here we simulate the join or rely on Supabase foreign keys if set up correctly.
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id ( username, display_name, profile_picture_url, is_verified )
      `)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (data) setPosts(data);
    setLoading(false);
  };

  const handlePost = async () => {
    if (!content.trim() || !profile) return;
    setPosting(true);

    try {
      await supabase.from('posts').insert({
        user_id: profile.id,
        content: content.trim()
      });
      setContent('');
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="w-full relative">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex justify-between items-center px-4 py-3 cursor-pointer">
          <h1 className="text-xl font-bold">Home</h1>
          <Sparkles className="text-primary w-5 h-5" />
        </div>
        <div className="flex">
          <div className="flex-1 text-center py-3 font-bold border-b-4 border-primary hover:bg-muted transition-colors cursor-pointer">For you</div>
          <div className="flex-1 text-center py-3 font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer">Following</div>
        </div>
      </div>

      {/* Composer */}
      <div className="mx-4 sm:mx-8 mt-6 mb-6 p-4 sm:p-5 bg-muted/30 border border-border rounded-2xl flex gap-4">
        <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground overflow-hidden shrink-0 flex items-center justify-center font-bold">
          {profile?.profile_picture_url ? (
            <img src={profile.profile_picture_url} className="w-full h-full object-cover" alt="" />
          ) : profile?.display_name?.charAt(0)}
        </div>
        <div className="flex-1">
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
          <div className="border-t border-border mt-2 pt-3 flex justify-between items-center">
            <div className="flex gap-4 text-muted-foreground">
              <button className="hover:text-primary transition-colors"><ImageIcon size={20} /></button>
            </div>
            <button
              onClick={handlePost}
              disabled={posting || !content.trim()}
              className="bg-primary text-primary-foreground font-medium px-5 py-1.5 rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Post
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 sm:px-8 pb-8 space-y-6">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-muted shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: any }) {
  const user = post.users || {};
  return (
    <article className="bg-card border border-border rounded-2xl p-5 hover:border-muted-foreground/30 transition-colors cursor-pointer">
      <div className="flex gap-3">
        <Link to={`/profile/${user.username}`} onClick={(e) => e.stopPropagation()} className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden shrink-0 flex items-center justify-center font-bold">
          {user.profile_picture_url ? <img src={user.profile_picture_url} className="w-full h-full object-cover" alt="" /> : user.display_name?.charAt(0)}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center text-[15px] gap-1">
            <Link to={`/profile/${user.username}`} onClick={(e) => e.stopPropagation()} className="font-bold hover:underline truncate">
              {user.display_name || user.username}
            </Link>
            {user.is_verified && (
              <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-[16px] h-[16px] text-accent fill-current"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.756 2.75 1.88 3.447-.077.387-.12.784-.12 1.18 0 2.21 1.708 3.998 3.917 3.998.47 0 .92-.086 1.336-.252C9.182 21.587 10.49 22.5 12 22.5s2.816-.915 3.336-2.252c.417.166.868.252 1.336.252 2.21 0 3.918-1.79 3.918-4 0-.398-.043-.795-.12-1.182 1.124-.697 1.88-1.986 1.88-3.447zM10.446 16l-3.3-3.03 1.144-1.246 2.155 1.97 5.56-5.56 1.25 1.186-6.81 6.68z"></path></g></svg>
            )}
            <span className="text-muted-foreground truncate text-sm">@{user.username}</span>
            <span className="text-muted-foreground px-1">·</span>
            <span className="text-muted-foreground hover:underline text-sm">{formatRelativeTime(post.created_at)}</span>
          </div>
          <div className="mt-1 text-foreground leading-relaxed whitespace-pre-wrap break-words">{post.content}</div>
          {post.image_url && (
            <div className="mt-3 rounded-xl bg-muted overflow-hidden border border-border">
              <img src={post.image_url} alt="Post media" className="w-full h-auto max-h-[400px] object-cover" />
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
  );
}
