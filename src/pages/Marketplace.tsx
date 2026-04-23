import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Marketplace() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from('marketplace')
        .select(`*, user:user_id(username, display_name)`)
        .order('created_at', { ascending: false });
      if (data) setItems(data);
      setLoading(false);
    };
    fetchItems();
  }, []);

  return (
    <div className="w-full min-h-screen pb-20 sm:pb-0">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <h1 className="text-xl font-bold">Marketplace</h1>
      </div>
      
      <div className="p-4 sm:p-8 grid grid-cols-2 gap-4">
        {loading ? (
             <div className="col-span-2 text-center text-muted-foreground p-10">Loading marketplace...</div>
        ) : items.length === 0 ? (
          <div className="col-span-2 text-center text-muted-foreground mt-10">
            No items for sale yet.
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="bg-card rounded-2xl overflow-hidden border border-border flex flex-col group p-2">
              <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-3 relative">
                 {item.image_url ? <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">No Image</div>}
              </div>
              <div className="px-2 pb-2">
                <div className="font-bold text-lg leading-tight mb-1">${item.price}</div>
                <div className="text-[15px] leading-tight truncate font-medium">{item.title}</div>
                <div className="text-[13px] text-muted-foreground mt-0.5 truncate">{item.user?.display_name || item.user?.username}</div>
                <button className="w-full mt-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">View Item</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
