import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../lib/store';
import { Navigate } from 'react-router-dom';
import { Search, ShieldAlert, Trash2, Ban } from 'lucide-react';

export default function Admin() {
  const { profile } = useAppStore();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Check admin status early based on profile properties
  // Pre-created admin info should trigger this, we rely on DB `is_admin` true.
  if (!profile || !profile.is_admin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    let query = supabase.from('users').select('*').limit(20);
    if (search.trim()) {
      query = query.ilike('username', `%${search}%`);
    }
    const { data } = await query;
    if (data) setUsers(data);
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

  return (
    <div className="w-full min-h-screen">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-2">
        <ShieldAlert className="text-red-500" />
        <h1 className="text-xl font-bold">Admin Hub</h1>
      </div>
      
      <div className="p-4">
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
