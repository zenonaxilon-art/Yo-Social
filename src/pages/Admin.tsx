import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { Navigate } from 'react-router-dom';
import { Search, ShieldAlert, Trash2, Ban, Check, X } from 'lucide-react';

export default function Admin() {
  const { profile } = useAppStore();
  const [users, setUsers] = useState<any[]>([]);
  const [sellerRequests, setSellerRequests] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Check admin status early based on profile properties
  if (!profile || !profile.is_admin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchUsers();
    fetchSellerRequests();
    fetchReports();
  }, [search]);

  const fetchUsers = async () => {
    let query = supabase.from('users').select('*').limit(20);
    if (search.trim()) {
      query = query.ilike('username', `%${search}%`);
    }
    const { data } = await query;
    if (data) setUsers(data);
  };
  
  const fetchSellerRequests = async () => {
     try {
       const { data } = await supabase.from('seller_requests').select('*, user:user_id(*)').eq('status', 'pending');
       if (data) setSellerRequests(data);
     } catch(e) {}
  };

  const fetchReports = async () => {
    try {
      const { data } = await supabase.from('reports').select('*, reporter:reporter_id(username, display_name), post:posts(*)').eq('type', 'post').order('created_at', { ascending: false });
      if (data) setReports(data);
    } catch(e) {}
  };

  const toggleVerified = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('users').update({ is_verified: !currentStatus }).eq('id', userId);
    if (error) {
       console.error("Error updating user:", error);
       alert("Failed to assign badge. Please make sure you have run the Admin RLS policy in your Supabase SQL Editor!");
    } else {
       setUsers(users.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
    }
  };
  
  const handleSellerRequest = async (requestId: string, userId: string, action: 'approved' | 'rejected') => {
      try {
         await supabase.from('seller_requests').update({ status: action }).eq('id', requestId);
         if (action === 'approved') {
            await supabase.from('users').update({ role: 'seller' }).eq('id', userId);
         }
         
         // Dispatch success visual
         setSellerRequests(prev => prev.filter(r => r.id !== requestId));
      } catch(err) {
         console.error(err);
         alert("Failed to process request.");
      }
  };

  const handleDismissReport = async (reportId: string) => {
    await supabase.from('reports').delete().eq('id', reportId);
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  const handleDeletePost = async (postId: string, reportId: string) => {
     if (window.confirm('Delete this post and dismiss the report?')) {
        await supabase.from('posts').delete().eq('id', postId);
        // The report might cascade delete if we set up foreign keys, but just in case:
        await supabase.from('reports').delete().eq('id', reportId);
        setReports(prev => prev.filter(r => r.id !== reportId));
     }
  };

  return (
    <div className="w-full min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-2">
        <ShieldAlert className="text-red-500" />
        <h1 className="text-xl font-bold">Admin Hub</h1>
      </div>
      
      <div className="p-4">
        {sellerRequests.length > 0 && (
           <div className="mb-8">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">Pending Seller Applications <span className="bg-red-500 text-white rounded-full px-2 text-xs">{sellerRequests.length}</span></h2>
              <div className="grid gap-3">
                 {sellerRequests.map(req => (
                    <div key={req.id} className="bg-card border border-border p-4 rounded-xl flex justify-between items-center gap-4">
                       <div>
                          <div className="font-bold">{req.business_name}</div>
                          <div className="text-sm text-foreground/80 mb-2">{req.description}</div>
                          <div className="text-xs text-muted-foreground">Requested by @{req.user?.username} ({req.user?.display_name})</div>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => handleSellerRequest(req.id, req.user_id, 'approved')} className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"><Check size={20}/></button>
                          <button onClick={() => handleSellerRequest(req.id, req.user_id, 'rejected')} className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><X size={20}/></button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {reports.length > 0 && (
           <div className="mb-8">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">Post Reports <span className="bg-red-500 text-white rounded-full px-2 text-xs">{reports.length}</span></h2>
              <div className="grid gap-3">
                 {reports.map(report => (
                    <div key={report.id} className="bg-card border border-border p-4 rounded-xl">
                       <div className="flex justify-between items-start mb-3">
                          <div>
                             <div className="font-bold text-red-500">{report.reason}</div>
                             <div className="text-xs text-muted-foreground mt-1">Reported by @{report.reporter?.username}</div>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => handleDismissReport(report.id)} className="px-3 py-1 bg-muted hover:bg-muted/80 rounded font-medium text-xs transition-colors">Dismiss</button>
                             <button onClick={() => handleDeletePost(report.target_id, report.id)} className="px-3 py-1 bg-red-500 text-white hover:bg-red-600 rounded font-medium text-xs transition-colors flex items-center gap-1"><Trash2 size={12}/> Delete Post</button>
                          </div>
                       </div>
                       {report.post ? (
                          <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-sm">
                             {report.post.content}
                             {report.post.image_url && <img src={report.post.image_url} className="mt-2 h-20 object-cover rounded" />}
                          </div>
                       ) : (
                          <div className="text-sm text-muted-foreground italic">Post has been deleted.</div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Search users to verify or ban..."
            className="w-full bg-muted border border-transparent rounded-full py-2.5 pl-10 pr-4 text-[15px] focus:outline-none focus:bg-background focus:border-primary transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <h2 className="font-bold text-lg mb-4">Users</h2>
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="flex justify-between items-center p-4 border border-border rounded-xl bg-card">
              <div>
                <div className="font-bold flex items-center gap-1">
                  {user.display_name}
                  {user.is_verified && <span className="text-primary text-xs bg-primary/10 px-1 py-0.5 rounded">VERIFIED</span>}
                  {user.is_admin && <span className="text-red-500 text-xs bg-red-500/10 px-1 py-0.5 rounded">ADMIN</span>}
                </div>
                <div className="text-muted-foreground text-[14px]">@{user.username}</div>
              </div>
              <div className="flex gap-2">
                 <button 
                   onClick={() => toggleVerified(user.id, user.is_verified)}
                   className="text-[13px] font-medium border border-border px-3 py-1.5 rounded hover:bg-muted"
                 >
                   {user.is_verified ? 'Remove Badge' : 'Verify'}
                 </button>
                 <button className="text-[13px] font-medium border border-red-500/20 text-red-500 px-3 py-1.5 rounded hover:bg-red-500/10 flex items-center gap-1">
                   <Ban size={14} /> Ban
                 </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <div className="text-muted-foreground text-center">No users found.</div>}
        </div>
      </div>
    </div>
  );
}
