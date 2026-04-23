import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AppState {
  user: User | null;
  profile: any | null;
  sessionChecked: boolean;
  theme: 'light' | 'dark';
  setUser: (user: User | null) => void;
  setProfile: (profile: any | null) => void;
  setSessionChecked: (checked: boolean) => void;
  toggleTheme: () => void;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  profile: null,
  sessionChecked: false,
  theme: 'dark', // Elegant Dark theme is default
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
  }
}));
