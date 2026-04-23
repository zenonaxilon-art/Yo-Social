import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rtshrshtfmfowollahpj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0c2hyc2h0Zm1mb3dvbGxhaHBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDgyNjQsImV4cCI6MjA5MjQ4NDI2NH0.WotwLCtoTPlJs-tcUs2Lki0OpyneUk1-t4RjH6syyog';

export const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
