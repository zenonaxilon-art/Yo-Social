import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { Users, Plus, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/UIStates';

export default function Communities() {
  const { profile } = useAppStore();
  const navigate = useNavigate();
  const [myCommunities, setMyCommunities] = useState<any[]>([]);
  const [exploreCommunities, setExploreCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCommunities();
  }, [profile]);

  const fetchCommunities = async () => {
    if (!profile) return;
    setLoading(true);

    // Fetch communities I am a member of
    const { data: myMemberships } = await supabase
      .from('community_members')
      .select('community_id, communities(*)')
      .eq('user_id', profile.id);
      
    if (myMemberships) {
      setMyCommunities(myMemberships.map(m => m.communities));
    }

    // Fetch popular/all communities (excluding ones I'm in for simplicity, or just all)
    const myIds = myMemberships ? myMemberships.map(m => m.community_id) : [];
    
    let query = supabase.from('communities').select('*').order('created_at', { ascending: false }).limit(20);
    
    if (myIds.length > 0) {
      // Supabase trick to exclude UUIDs isn't perfectly supported via simple not.in but let's just fetch and filter
    }

    const { data: allComms } = await query;
    if (allComms) {
       setExploreCommunities(allComms.filter(c => !myIds.includes(c.id)));
    }

    setLoading(false);
  };

  const handleCreate = async () => {
    if (!name.trim() || !profile) return;
    setCreating(true);
    
    // Convert to URL-safe name for uniqueness roughly
    const cleanName = name.trim();

    try {
       const { data, error } = await supabase.from('communities').insert({
         creator_id: profile.id,
         name: cleanName,
         description: description.trim()
       }).select().single();

       if (error) {
         alert("Failed to create community: " + error.message);
         setCreating(false);
         return;
       }

       if (data) {
          // Immediately make them admin
          await supabase.from('community_members').insert({
            community_id: data.id,
            user_id: profile.id,
            role: 'admin'
          });
          
          setShowCreate(false);
          setName('');
          setDescription('');
          navigate(`/communities/${data.id}`);
       }
    } catch(e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full pb-20">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">Communities</h1>
        <button 
          onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground p-2 rounded-full hover:opacity-90 transition-opacity"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="px-4 mt-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
           <ShieldCheck size={20} className="text-primary" /> My Communities
        </h2>
        {loading ? (
           <div className="animate-pulse space-y-4">
             <div className="h-20 bg-muted rounded-xl w-full"></div>
             <div className="h-20 bg-muted rounded-xl w-full"></div>
           </div>
        ) : myCommunities.length === 0 ? (
           <div className="text-muted-foreground p-4 bg-muted/30 rounded-xl text-center text-sm">
             You haven't joined any communities yet.
           </div>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {myCommunities.map(c => (
               <Link to={`/communities/${c.id}`} key={c.id} className="p-4 border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors flex items-center gap-4">
                 <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                    {c.icon_url ? <img src={c.icon_url} className="w-full h-full object-cover rounded-lg" /> : c.name.charAt(0).toUpperCase()}
                 </div>
                 <div className="overflow-hidden">
                    <h3 className="font-bold text-base truncate">{c.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{c.description || 'No description'}</p>
                 </div>
               </Link>
             ))}
           </div>
        )}

        <h2 className="font-bold text-lg mt-8 mb-4 flex items-center gap-2">
           <Users size={20} className="text-primary" /> Explore Communities
        </h2>
        
        {loading ? (
             <div className="animate-pulse space-y-4 mt-4">
               <div className="h-20 bg-muted rounded-xl w-full"></div>
               <div className="h-20 bg-muted rounded-xl w-full"></div>
             </div>
        ) : exploreCommunities.length === 0 ? (
           <div className="text-muted-foreground p-4 bg-muted/30 rounded-xl text-center text-sm">
             No more communities to explore right now.
           </div>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {exploreCommunities.map(c => (
               <Link to={`/communities/${c.id}`} key={c.id} className="p-4 border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors flex items-center gap-4">
                 <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                    {c.icon_url ? <img src={c.icon_url} className="w-full h-full object-cover rounded-lg" /> : c.name.charAt(0).toUpperCase()}
                 </div>
                 <div className="overflow-hidden">
                    <h3 className="font-bold text-base truncate">{c.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{c.description || 'No description'}</p>
                 </div>
               </Link>
             ))}
           </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-[400px] border border-border rounded-2xl shadow-xl flex flex-col p-5">
            <h2 className="text-xl font-bold mb-4">Create a Community</h2>
            
            <div className="space-y-4">
               <div>
                 <label className="text-sm font-medium text-muted-foreground mb-1 block">Community Name</label>
                 <input 
                   type="text" 
                   value={name} 
                   onChange={e => setName(e.target.value)} 
                   placeholder="e.g., Tech Enthusiasts"
                   className="w-full p-2 bg-transparent border border-border rounded focus:outline-none focus:border-primary"
                 />
               </div>
               <div>
                 <label className="text-sm font-medium text-muted-foreground mb-1 block">Description</label>
                 <textarea 
                   value={description} 
                   onChange={e => setDescription(e.target.value)} 
                   placeholder="What is this community about?"
                   className="w-full p-2 bg-transparent border border-border rounded focus:outline-none focus:border-primary min-h-[80px]"
                 />
               </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 hover:bg-muted rounded-full font-medium transition-colors">Cancel</button>
              <button 
                onClick={handleCreate} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-full font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={creating || !name.trim()}
              >
                 {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
