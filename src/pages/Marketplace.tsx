import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Store, CheckCircle, Send } from 'lucide-react';
import { EmptyState } from '../components/UIStates';
import { useAppStore } from '../lib/store';

export default function Marketplace() {
  const { profile } = useAppStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase
        .from('marketplace')
        .select(`*, user:user_id(username, display_name)`)
        .order('created_at', { ascending: false });
      if (data) setItems(data);
      setLoading(false);
      
      if (profile) {
         try {
           const { data: requestStatus } = await supabase.from('seller_requests').select('*').eq('user_id', profile.id).maybeSingle();
           if (requestStatus) setApplied(true);
         } catch(e) { } // In case schema missing
      }
    };
    fetchItems();
  }, [profile]);
  
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);
    
    try {
       const { error } = await supabase.from('seller_requests').insert({
          user_id: profile.id,
          business_name: businessName,
          description: description
       });
       if (error) throw error;
       setApplied(true);
       alert("Application submitted! It will take up to 24 hours for review.");
       setShowApplyForm(false);
    } catch(err: any) {
       console.error(err);
       alert("Failed to submit. " + (err.message || 'Make sure the seller_requests SQL table is added.'));
    } finally {
       setSubmitting(false);
    }
  };
  
  const isSeller = profile?.role === 'seller' || profile?.role === 'admin';

  return (
    <div className="w-full min-h-screen pb-20 sm:pb-0 relative">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">Marketplace</h1>
        {profile && !isSeller && !applied && !showApplyForm && (
          <button onClick={() => setShowApplyForm(true)} className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-bold hover:bg-primary/20 transition-colors">Apply to Sell</button>
        )}
        {profile && !isSeller && applied && !showApplyForm && (
          <span className="bg-muted text-muted-foreground px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1"><CheckCircle size={14}/> Under Review</span>
        )}
      </div>
      
      {showApplyForm && (
        <div className="p-4 sm:p-8 border-b border-border bg-muted/20">
          <div className="bg-card border border-border p-5 rounded-2xl max-w-xl mx-auto">
             <h2 className="text-lg font-bold mb-2">Become a Seller</h2>
             <p className="text-muted-foreground text-sm mb-5">Fill out your business details below. A site administrator will review your application within 24 hours.</p>
             
             <form onSubmit={handleApply} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium mb-1">Business / Store Name</label>
                   <input required type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full bg-muted border border-border rounded-lg px-4 py-2 focus:border-primary focus:outline-none placeholder:text-muted-foreground/50" placeholder="e.g. Vintage Kicks" />
                </div>
                <div>
                   <label className="block text-sm font-medium mb-1">What will you sell?</label>
                   <textarea required value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-muted border border-border rounded-lg px-4 py-2 focus:border-primary focus:outline-none min-h-[80px]" placeholder="Briefly describe your products." />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                   <button type="button" onClick={() => setShowApplyForm(false)} className="text-muted-foreground hover:text-foreground font-medium px-4 py-2">Cancel</button>
                   <button type="submit" disabled={submitting || !businessName || !description} className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-full flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
                     {submitting ? 'Submitting...' : <><Send size={16}/> Submit Application</>}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
      
      <div className="p-4 sm:p-8 grid grid-cols-2 gap-4">
        {loading ? (
             <div className="col-span-2 grid grid-cols-2 gap-4">
                <div className="aspect-square bg-card border border-border rounded-2xl animate-pulse"></div>
                <div className="aspect-square bg-card border border-border rounded-2xl animate-pulse"></div>
                <div className="aspect-square bg-card border border-border rounded-2xl animate-pulse"></div>
                <div className="aspect-square bg-card border border-border rounded-2xl animate-pulse"></div>
             </div>
        ) : items.length === 0 ? (
          <div className="col-span-2">
           <EmptyState 
             icon={<Store size={32} />}
             title="Marketplace is empty"
             description="There are no items listed for sale yet. Check back later!"
           />
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
