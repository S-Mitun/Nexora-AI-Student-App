import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const hasValidSupabaseConfig = Boolean(
  env.SUPABASE_URL && 
  env.SUPABASE_URL.startsWith('http') && 
  env.SUPABASE_ANON_KEY
);

if (!hasValidSupabaseConfig) {
  console.warn(
    '[NEXORA] Supabase URL or Anon Key is missing in frontend/.env.local. ' +
    'Local development fallback mode is active.'
  );
}

// Initialize real Supabase client with localStorage session persistence
export const supabase: SupabaseClient = createClient(
  hasValidSupabaseConfig ? env.SUPABASE_URL : 'https://placeholder.supabase.co',
  hasValidSupabaseConfig ? env.SUPABASE_ANON_KEY : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);

export const isSupabaseConfigured = hasValidSupabaseConfig;
