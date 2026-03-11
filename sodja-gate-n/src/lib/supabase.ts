import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eubaqvmagzpibkdnssbw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1YmFxdm1hZ3pwaWJrZG5zc2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDY1OTgsImV4cCI6MjA4ODM4MjU5OH0.AemURitN8rwtPKV1Ueeft4sWWk49d1J5Yfjck1dfNbA';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Attention : Les variables d\'environnement Supabase sont manquantes. Le site risque de ne pas fonctionner correctement.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
