import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getWorkshopSettings } from './dexie';

let cachedClient: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (cachedClient) return cachedClient;

  // First try localStorage/IndexedDB settings, then fallback to Vite env
  const settings = await getWorkshopSettings();
  const url = settings.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
  const anonKey = settings.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to init Supabase client:', err);
    return null;
  }
}

export function resetSupabaseClient() {
  cachedClient = null;
}
