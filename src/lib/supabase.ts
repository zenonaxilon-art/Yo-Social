import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtwargizrhddtambrgzl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0d2FyZ2l6cmhkZHRhbWJyZ3psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MTMxMTEsImV4cCI6MjA5MjQ4OTExMX0.GeRC0EwoZfdAinAVTZ2SZaW7lHAYlWNsPgzPM0rumpM';

export const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
