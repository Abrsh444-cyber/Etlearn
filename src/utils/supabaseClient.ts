import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Save Supabase credentials to localStorage for in-app pairing
 */
export function saveSupabaseCredentials(url: string, key: string) {
  localStorage.setItem('ethiolearn_supabase_url', url.trim());
  localStorage.setItem('ethiolearn_supabase_key', key.trim());
  supabaseInstance = null; // Reset instance to force recreation with new keys
}

/**
 * Clear stored Supabase credentials
 */
export function clearSupabaseCredentials() {
  localStorage.removeItem('ethiolearn_supabase_url');
  localStorage.removeItem('ethiolearn_supabase_key');
  supabaseInstance = null;
}

/**
 * Lazily configures and retrieves the Supabase client instance.
 * Gracefully returns null if keys are not set, preventing startup crashes.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  // 1. Try to get from localStorage (client-side pairing)
  let url = typeof window !== 'undefined' ? localStorage.getItem('ethiolearn_supabase_url') : null;
  let key = typeof window !== 'undefined' ? localStorage.getItem('ethiolearn_supabase_key') : null;

  // 2. If not in localStorage, try process.env or import.meta.env
  if (!url || !key) {
    url = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  }

  if (url && key && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return supabaseInstance;
    } catch (e) {
      console.error('[Supabase Client Initialization Error]:', e);
      return null;
    }
  }

  return null;
}

/**
 * Fetch Grade 12 books from Supabase if connected
 */
export async function fetchSupabaseBooks(): Promise<any[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    // Attempt to select from "grade12_books" or "books"
    const { data, error } = await client
      .from('books')
      .select('*')
      .order('title', { ascending: true });

    if (error) {
      // Try fallback table alternative
      const { data: fallbackData, error: fallbackError } = await client
        .from('grade12_books')
        .select('*');
      
      if (fallbackError) {
        console.warn('Supabase connected, but tables "books" or "grade12_books" were not found. Falling back to local catalog.');
        return [];
      }
      return fallbackData || [];
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
    return [];
  }
}

/**
 * Asynchronously loads Supabase config from server if not already stored in localStorage.
 */
export async function initSupabaseConfig(): Promise<void> {
  try {
    const savedUrl = localStorage.getItem('ethiolearn_supabase_url');
    const savedKey = localStorage.getItem('ethiolearn_supabase_key');
    if (savedUrl && savedKey) return; // Already configured locally

    const res = await fetch('/api/supabase-config');
    if (res.ok) {
      const config = await res.json();
      if (config.url && config.anonKey) {
        localStorage.setItem('ethiolearn_supabase_url', config.url);
        localStorage.setItem('ethiolearn_supabase_key', config.anonKey);
        supabaseInstance = null; // force reload with server-synced credentials
        console.log('[Supabase Client] Successfully fetched and auto-configured Supabase credentials from server.');
      }
    }
  } catch (err) {
    console.warn('[Supabase Client] Failed to fetch server-side Supabase credentials:', err);
  }
}


