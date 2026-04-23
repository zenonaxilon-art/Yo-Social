import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/store';

export default function RightPanel() {
  const { profile } = useAppStore();
  const [marketItem, setMarketItem] = useState<any>(null);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      // Marketplace
      setLoadingMarket(true);
      const { data: mData } = await supabase.from('marketplace').select('*, user:user_id(username, display_name)').order('created_at', { ascending: false }).limit(1);
      if (mData && mData.length > 0) setMarketItem(mData[0]);
      setLoadingMarket(false);

      // Users
      setLoadingUsers(true);
      let query = supabase.from('users').select('*').order('created_at', { ascending: false }).limit(3);
      if (profile) query = query.neq('id', profile.id);
      const { data: uData } = await query;
      if (uData) setUsers(uData);
      setLoadingUsers(false);
    }
    fetchData();
  }, [profile]);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/explore?q=${searchQuery.trim()}`);
    }
  };

  return (
    <div className="hidden lg:block w-[350px] pl-8 pt-2 h-screen sticky top-0 flex-shrink-0">
      <div className="sticky top-0 bg-background/80 backdrop-blur-md pt-1 pb-2 z-10">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-accent">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search Yo Social"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            className="w-full bg-muted/50 border border-border rounded-full py-3 pr-4 pl-12 text-[15px] focus:outline-none focus:bg-card focus:border-border transition-colors placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-2xl p-4 mt-2">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Who to follow</h2>
        <div className="space-y-4">
          {loadingUsers ? (
            <div className="animate-pulse space-y-3">
              <div className="h-10 bg-muted/50 rounded-xl w-full"></div>
              <div className="h-10 bg-muted/50 rounded-xl w-full"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-sm text-muted-foreground">No users found.</div>
          ) : (
            users.map(u => (
              <Link to={`/profile/${u.username}`} key={u.id} className="flex gap-3 hover:bg-muted/80 px-2 -mx-2 py-2 rounded-xl transition-colors cursor-pointer items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden shrink-0 flex items-center justify-center font-bold">
                  {u.profile_picture_url ? <img src={u.profile_picture_url} className="w-full h-full object-cover" alt="" /> : u.display_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px] truncate">{u.display_name}</div>
                  <div className="text-[12px] text-muted-foreground truncate">@{u.username}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-4 border border-border mt-6">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Marketplace Highlight</h2>
        {loadingMarket ? (
           <div className="animate-pulse">
             <div className="h-32 bg-muted/50 rounded-xl mb-3"></div>
             <div className="h-4 bg-muted/50 rounded w-1/2 mb-2"></div>
             <div className="h-3 bg-muted/50 rounded w-1/3"></div>
           </div>
        ) : marketItem ? (
          <div>
            <div className="relative rounded-xl overflow-hidden mb-3">
              <div className="h-32 bg-muted flex items-center justify-center">
                {marketItem.image_url ? (
                  <img src={marketItem.image_url} alt="" className="w-full h-full object-cover outline outline-1 outline-border" />
                ) : (
                  <Search className="w-12 h-12 text-muted-foreground/50" />
                )}
              </div>
              <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">${marketItem.price}</div>
            </div>
            <p className="font-medium text-sm truncate">{marketItem.title}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">By @{marketItem.user?.username}</p>
            <Link to="/marketplace" className="w-full mt-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 block text-center transition-opacity">View Marketplace</Link>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Nothing currently checking.</div>
        )}
      </div>
      
      <div className="text-[13px] text-muted-foreground px-4 mt-4 flex flex-wrap gap-x-3 gap-y-1">
        <span>Terms of Service</span>
        <span>Privacy Policy</span>
        <span>Cookie Policy</span>
        <span>Accessibility</span>
        <span>© 2026 Yo Social!</span>
      </div>
    </div>
  );
}
