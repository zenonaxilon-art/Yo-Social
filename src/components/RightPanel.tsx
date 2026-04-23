import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, BadgeCheck } from 'lucide-react';
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
            users.map(u => {
              const showGoldBadge = u.role === 'creator' || u.role === 'admin' || u.role === 'seller';
              return (
              <Link to={`/profile/${u.username}`} key={u.id} className="flex gap-3 hover:bg-muted/80 px-2 -mx-2 py-2 rounded-xl transition-colors cursor-pointer items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white overflow-hidden shrink-0 flex items-center justify-center font-bold">
                  {u.profile_picture_url ? <img src={u.profile_picture_url} className="w-full h-full object-cover" alt="" /> : u.display_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px] truncate flex items-center gap-1">
                     {u.display_name}
                     {u.is_verified && (
                       <svg viewBox="0 0 24 24" aria-label="Verified account" className={`w-[14px] h-[14px] fill-current shrink-0 ${showGoldBadge ? "text-yellow-500" : "text-accent"}`}><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.756 2.75 1.88 3.447-.077.387-.12.784-.12 1.18 0 2.21 1.708 3.998 3.917 3.998.47 0 .92-.086 1.336-.252C9.182 21.587 10.49 22.5 12 22.5s2.816-.915 3.336-2.252c.417.166.868.252 1.336.252 2.21 0 3.918-1.79 3.918-4 0-.398-.043-.795-.12-1.182 1.124-.697 1.88-1.986 1.88-3.447zM10.446 16l-3.3-3.03 1.144-1.246 2.155 1.97 5.56-5.56 1.25 1.186-6.81 6.68z"></path></g></svg>
                     )}
                  </div>
                  <div className="text-[12px] text-muted-foreground truncate">@{u.username}</div>
                </div>
              </Link>
            )})
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
