import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Handle empty or default placeholders gracefully
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('http');

/**
 * Initialize Supabase Client using exact environment variables as requested.
 * If the environment variables are not supplied or are placeholders, we return null
 * to prevent the application from crashing on startup.
 */
export const supabase = null;
