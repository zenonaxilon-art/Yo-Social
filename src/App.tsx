import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from './lib/store';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import Marketplace from './pages/Marketplace';
import Inbox from './pages/Inbox';
import Admin from './pages/Admin';
import Sidebar from './components/Sidebar';
import RightPanel from './components/RightPanel';
import MobileNav from './components/MobileNav';

import Communities from './pages/Communities';
import CommunityDetail from './pages/CommunityDetail';
import Reels from './pages/Reels';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, sessionChecked } = useAppStore();

  if (!sessionChecked) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function Layout() {
  const { user, setUnreadNotifications, setUnreadMessages } = useAppStore();

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const fetchCounts = async () => {
      const { count: notifCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false);
      const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id).eq('seen', false);
      
      setUnreadNotifications(notifCount || 0);
      setUnreadMessages(msgCount || 0);
    };
    fetchCounts();

    // Subscribe to realtime channels
    const notifChannel = supabase.channel('notifCount')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchCounts)
      .subscribe();

    const msgChannel = supabase.channel('msgCount')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, fetchCounts)
      .subscribe();

    return () => {
      notifChannel.unsubscribe();
      msgChannel.unsubscribe();
    };
  }, [user]);

  return (
    <div className="max-w-[1280px] mx-auto flex sm:min-h-screen justify-center">
      <Sidebar />
      <main className="w-full sm:w-[600px] border-x border-border/50 min-h-screen pb-16 sm:pb-0 relative">
        <Outlet />
      </main>
      <RightPanel />
      <MobileNav />
    </div>
  );
}

export default function App() {
  const { setUser, setSessionChecked, fetchProfile } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    // Only try to use supabase if it's actually configured
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setSessionChecked(true); // Stop loading layout
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="explore" element={<Explore />} />
          <Route path="reels" element={<Reels />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="messages" element={<Inbox />} />
          <Route path="messages/:userId" element={<Inbox />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="communities" element={<Communities />} />
          <Route path="communities/:id" element={<CommunityDetail />} />
          <Route path="profile/:username" element={<Profile />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
