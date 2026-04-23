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
}

export const useAppStore = create<AppState>((set) => ({
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
  fetchProfile: async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      set({ profile: data });
    }
  },
  setUnreadNotifications: (count) => set((state) => ({ 
      unreadNotifications: typeof count === 'function' ? count(state.unreadNotifications) : count 
  })),
  setUnreadMessages: (count) => set((state) => ({ 
      unreadMessages: typeof count === 'function' ? count(state.unreadMessages) : count 
  })),
}));
