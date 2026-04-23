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
import Admin from './pages/Admin';
import Sidebar from './components/Sidebar';
import RightPanel from './components/RightPanel';
import MobileNav from './components/MobileNav';

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
          <Route path="notifications" element={<Notifications />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="profile/:username" element={<Profile />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
