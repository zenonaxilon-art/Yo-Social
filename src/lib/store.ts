import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AppState {
  user: User | null;
  profile: any | null;
  sessionChecked: boolean;
  theme: 'light' | 'dark';
  unreadNotifications: number;
  unreadMessages: number;
  setUser: (user: User | null) => void;
  setProfile: (profile: any | null) => void;
  setSessionChecked: (checked: boolean) => void;
  toggleTheme: () => void;
  fetchProfile: (userId: string) => Promise<void>;
  setUnreadNotifications: (count: number | ((prev: number) => number)) => void;
  setUnreadMessages: (count: number | ((prev: number) => number)) => void;
  gainXp: (amount: number) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  profile: null,
  sessionChecked: false,
  theme: 'dark', // Elegant Dark theme is default
  unreadNotifications: 0,
  unreadMessages: 0,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSessionChecked: (checked) => set({ sessionChecked: checked }),
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { theme: newTheme };
  }),
  gainXp: async (amount: number) => {
     const profile = get().profile;
     if (!profile) return;
     
     const newXp = (profile.xp || 0) + amount;
     const newLevel = Math.floor(newXp / 100) + 1; // 100 XP per level
     
     // Optimistic update
     set({ profile: { ...profile, xp: newXp, level: newLevel }});
     
     // Background sync
     await supabase.from('users').update({ xp: newXp, level: newLevel }).eq('id', profile.id);
  },
  fetchProfile: async (userId) => {
    const { data: profileTemp, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (!error && profileTemp) {
      let finalProfile = { ...profileTemp };
      
      // Daily Streak / Login check
      try {
         const now = new Date();
         const lastLogin = finalProfile.last_login ? new Date(finalProfile.last_login) : null;
         let newStreak = finalProfile.streak || 0;
         let newXp = finalProfile.xp || 0;
         let shouldUpdate = false;
         
         const todayStr = now.toDateString();
         const lastStr = lastLogin?.toDateString();

         if (!lastLogin) {
            newStreak = 1;
            newXp += 20;
            shouldUpdate = true;
         } else if (todayStr !== lastStr) {
            // It's a new day!
            const timeDiff = now.getTime() - lastLogin.getTime();
            const daysDiff = timeDiff / (1000 * 3600 * 24);
            
            if (daysDiff < 2) {
                newStreak += 1; // Consecutive
            } else {
                newStreak = 1; // Broken streak
            }
            newXp += 10; // Daily reward
            shouldUpdate = true;
         }
         
         if (shouldUpdate) {
            const newLevel = Math.floor(newXp / 100) + 1;
            const updatePayload = { 
               streak: newStreak, 
               xp: newXp, 
               level: newLevel,
               last_login: now.toISOString() 
            };
            await supabase.from('users').update(updatePayload).eq('id', userId);
            finalProfile = { ...finalProfile, ...updatePayload };
         }
      } catch(e) {}
      
      set({ profile: finalProfile });
    }
  },
  setUnreadNotifications: (count) => set((state) => ({ 
      unreadNotifications: typeof count === 'function' ? count(state.unreadNotifications) : count 
  })),
  setUnreadMessages: (count) => set((state) => ({ 
      unreadMessages: typeof count === 'function' ? count(state.unreadMessages) : count 
  })),
}));
