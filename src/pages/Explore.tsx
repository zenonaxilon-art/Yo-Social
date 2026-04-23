import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search as SearchIcon, User as UserIcon, Users } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/UIStates';

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      setLoading(true);
      if (query.trim().length > 0) {
        const { data } = await supabase.from('users').select('*').ilike('username', `%${query}%`).limit(20);
        setUsers(data || []);
      } else {
        const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(20);
        setUsers(data || []);
      }
      setLoading(false);
    };
    searchUsers();
  }, [query]);

  return (
    <div className="w-full min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold mb-3">Explore</h1>
        <div className="relative max-w-xl">
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
      
      <div className="p-4 sm:p-8 space-y-4">
         {loading ? (
            <div className="space-y-4 animate-pulse">
               <div className="h-20 bg-card border border-border rounded-2xl"></div>
               <div className="h-20 bg-card border border-border rounded-2xl"></div>
               <div className="h-20 bg-card border border-border rounded-2xl"></div>
            </div>
         ) : users.length === 0 ? (
            <EmptyState 
              icon={<Users size={32} />}
              title="No users found"
              description={`We couldn't find anyone matching "${query}".`}
            />
         ) : (
            users.map(u => (
               <Link to={`/profile/${u.username}`} key={u.id} className="flex gap-4 p-4 border border-border rounded-2xl bg-card hover:border-muted-foreground/30 transition-colors items-center">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {u.profile_picture_url ? <img src={u.profile_picture_url} className="w-full h-full object-cover" /> : <UserIcon size={24} className="text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                     <div className="font-bold text-[16px] truncate">{u.display_name}</div>
                     <div className="text-[14px] text-muted-foreground truncate">@{u.username}</div>
                  </div>
               </Link>
            ))
         )}
      </div>
    </div>
  );
}
