import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search as SearchIcon, User as UserIcon, Users, BadgeCheck, TrendingUp } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState, PostSkeleton } from '../components/UIStates';
import PostCard from '../components/PostCard';

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [users, setUsers] = useState<any[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExploreContent = async () => {
      setLoading(true);
      if (query.trim().length > 0) {
        const { data } = await supabase.from('users').select('*').ilike('username', `%${query}%`).limit(20);
        setUsers(data || []);
        setTrendingPosts([]); // hide posts when searching specifically
      } else {
        // Fetch suggested users
        const { data: userData } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(5);
        setUsers(userData || []);

        // Fetch trending posts (by likes_count maybe, or just latest)
        const { data: postData } = await supabase.from('posts').select(`
          *,
          users:user_id ( username, display_name, profile_picture_url, is_verified, role ),
          original_post:original_post_id ( *, users:user_id ( username, display_name, profile_picture_url, is_verified, role ) )
        `).order('created_at', { ascending: false }).limit(10);
        
        setTrendingPosts(postData || []);
      }
      setLoading(false);
    };
    fetchExploreContent();
  }, [query]);

  return (
    <div className="w-full pb-20">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold mb-3">Explore</h1>
        <div className="relative w-full">
          <SearchIcon className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={query}
            onChange={(e) => setSearchParams(e.target.value ? { q: e.target.value } : {})}
            className="w-full bg-muted/50 border border-border rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground text-[15px]"
          />
        </div>
      </div>
      
      <div className="p-4 space-y-6">
         {loading ? (
            <div className="space-y-4 animate-pulse">
               <div className="h-20 bg-card border border-border rounded-2xl"></div>
               <div className="h-20 bg-card border border-border rounded-2xl"></div>
               <PostSkeleton />
            </div>
         ) : query && users.length === 0 ? (
            <EmptyState 
              icon={<Users size={32} />}
              title="No users found"
              description={`We couldn't find anyone matching "${query}".`}
            />
         ) : (
            <>
               {users.length > 0 && (
                 <div>
                    <h2 className="font-bold text-lg mb-3 mt-1 flex items-center gap-2">
                      <Users size={18} className="text-muted-foreground"/> {query ? 'Search Results' : 'Suggested Users'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {users.map(u => (
                         <Link to={`/profile/${u.username}`} key={u.id} className="flex gap-4 p-4 border border-border rounded-2xl bg-card hover:bg-muted/30 transition-colors items-center">
                            <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                              {u.profile_picture_url ? <img src={u.profile_picture_url} className="w-full h-full object-cover" /> : <UserIcon size={24} className="text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="font-bold text-[15px] truncate flex items-center gap-1">
                                 {u.display_name} 
                                 {u.is_verified && <BadgeCheck size={16} className={u.role === 'admin' ? "text-yellow-500" : "text-accent"} />}
                               </div>
                               <div className="text-[14px] text-muted-foreground truncate">@{u.username}</div>
                            </div>
                         </Link>
                      ))}
                    </div>
                 </div>
               )}

               {!query && trendingPosts.length > 0 && (
                 <div className="mt-8">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <TrendingUp size={18} className="text-primary"/> Trending Posts
                    </h2>
                    <div className="space-y-4">
                      {trendingPosts.map(post => <PostCard key={post.id} post={post} />)}
                    </div>
                 </div>
               )}
            </>
         )}
      </div>
    </div>
  );
}
