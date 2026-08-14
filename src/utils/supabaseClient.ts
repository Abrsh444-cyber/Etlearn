import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { safeStorage } from './safeStorage';

let supabaseInstance: SupabaseClient | null = null;

export const ETHIOLEARN_SUPABASE_SQL_SCRIPT = `-- EthioLearn 1-Click Supabase Database Setup Script
-- Copy and paste this directly into your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create ethiolearn_sync table for full cloud study backup
CREATE TABLE IF NOT EXISTS public.ethiolearn_sync (
  email TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create student_profiles table for profile metrics
CREATE TABLE IF NOT EXISTS public.student_profiles (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  university TEXT DEFAULT 'Wolkite University',
  year TEXT DEFAULT 'Freshman',
  subjects JSONB DEFAULT '[]'::jsonb,
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  user_role TEXT NOT NULL DEFAULT 'student',
  referral_code TEXT,
  profile_data JSONB,
  notes_data JSONB,
  study_sessions JSONB,
  performance_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create courses table (Single Source of Truth for Published & Draft Courses)
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'University',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  lessons_count INT NOT NULL DEFAULT 0,
  goal_days INT NOT NULL DEFAULT 14,
  instructor_id TEXT,
  instructor_name TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create lessons table (Unique lessons per course)
CREATE TABLE IF NOT EXISTS public.lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  chapter_number INT NOT NULL DEFAULT 1,
  content TEXT,
  duration TEXT DEFAULT '15m',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_course_lesson_chapter UNIQUE (course_id, chapter_number)
);

-- 5. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  code TEXT PRIMARY KEY,
  discount_percentage INT NOT NULL DEFAULT 20,
  fixed_discount_etb NUMERIC(10, 2) DEFAULT 0,
  max_uses INT NOT NULL DEFAULT 100,
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  badge_text TEXT DEFAULT 'Notice',
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
  provider TEXT NOT NULL DEFAULT 'telebirr',
  provider_transaction_id TEXT UNIQUE NOT NULL,
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  receipt_url TEXT,
  raw_webhook_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create books table for dynamic digital textbooks
CREATE TABLE IF NOT EXISTS public.books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'Grade 12',
  description TEXT,
  pdf_url TEXT,
  chapters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Enable public read/write access for anonymous & authenticated key
ALTER TABLE public.ethiolearn_sync DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.ethiolearn_sync TO anon, authenticated;
GRANT ALL ON public.student_profiles TO anon, authenticated;
GRANT ALL ON public.courses TO anon, authenticated;
GRANT ALL ON public.lessons TO anon, authenticated;
GRANT ALL ON public.coupons TO anon, authenticated;
GRANT ALL ON public.announcements TO anon, authenticated;
GRANT ALL ON public.payments TO anon, authenticated;
GRANT ALL ON public.books TO anon, authenticated;
`;

/**
 * Clean and normalize header strings to ensure strict ISO-8859-1 / ASCII compatibility.
 * Removes smart quotes, zero-width spaces, and any non-ASCII characters that break fetch Request headers.
 */
export function cleanAsciiHeader(str?: string): string {
  if (!str) return '';
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces & BOM
    .replace(/[^\x20-\x7E]/g, '') // Strict ASCII printable chars (32-126)
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

/**
 * Clean and normalize Supabase URL & Key string inputs
 */
export function sanitizeCredentials(rawUrl?: string, rawKey?: string): { url: string; key: string; isValid: boolean } {
  let url = cleanAsciiHeader(rawUrl);
  let key = cleanAsciiHeader(rawKey);

  if (!url || !key) {
    return { url: '', key: '', isValid: false };
  }

  const isPlaceholder = (val: string) => {
    const l = val.toLowerCase();
    return (
      l.includes('your-project') ||
      l.includes('your-anon-key') ||
      l.includes('abcdefghijklmnopqrst') ||
      l === 'undefined' ||
      l === 'null' ||
      l === 'none' ||
      l.length < 5
    );
  };

  if (isPlaceholder(url) || isPlaceholder(key)) {
    return { url: '', key: '', isValid: false };
  }

  // Ensure url has valid protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Strip trailing slashes
  url = url.replace(/\/+$/, '');

  return { url, key, isValid: true };
}

/**
 * Save Supabase credentials to localStorage for in-app pairing
 */
export function saveSupabaseCredentials(url: string, key: string) {
  const sanitized = sanitizeCredentials(url, key);
  if (sanitized.isValid) {
    safeStorage.setItem('ethiolearn_supabase_url', sanitized.url);
    safeStorage.setItem('ethiolearn_supabase_key', sanitized.key);
  } else {
    safeStorage.setItem('ethiolearn_supabase_url', url.trim());
    safeStorage.setItem('ethiolearn_supabase_key', key.trim());
  }
  supabaseInstance = null; // Reset instance to force recreation with new keys
}

/**
 * Clear stored Supabase credentials
 */
export function clearSupabaseCredentials() {
  safeStorage.removeItem('ethiolearn_supabase_url');
  safeStorage.removeItem('ethiolearn_supabase_key');
  supabaseInstance = null;
}

/**
 * Verifies if candidate credentials create valid HTTP headers without throwing ISO-8859-1 errors.
 */
function isValidHeaderCredential(url: string, key: string): boolean {
  try {
    const cleanUrl = cleanAsciiHeader(url);
    const cleanKey = cleanAsciiHeader(key);
    if (!cleanUrl || !cleanKey) return false;
    new Request(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: cleanKey,
        Authorization: `Bearer ${cleanKey}`
      }
    });
    return true;
  } catch (e) {
    console.warn('[Supabase Client] Rejecting credentials due to invalid header format:', e);
    return false;
  }
}

/**
 * Lazily configures and retrieves the Supabase client instance.
 * Gracefully returns null if keys are not set or invalid, preventing crashes.
 */
export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  // 1. First check user's explicitly saved credentials in browser local storage
  const storedUrl = safeStorage.getItem('ethiolearn_supabase_url');
  const storedKey = safeStorage.getItem('ethiolearn_supabase_key');
  const storedClean = sanitizeCredentials(storedUrl || '', storedKey || '');

  if (storedClean.isValid && isValidHeaderCredential(storedClean.url, storedClean.key)) {
    try {
      supabaseInstance = createClient(storedClean.url, storedClean.key, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      return supabaseInstance;
    } catch (err) {
      console.warn('Failed to initialize saved Supabase client:', err);
    }
  }

  // 2. Fall back to environment variables
  const metaEnv = (import.meta as any).env || {};
  const envUrl = metaEnv.VITE_SUPABASE_URL || '';
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';
  const envClean = sanitizeCredentials(envUrl, envKey);

  if (envClean.isValid && isValidHeaderCredential(envClean.url, envClean.key)) {
    try {
      supabaseInstance = createClient(envClean.url, envClean.key, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      return supabaseInstance;
    } catch (err) {
      console.warn('Failed to initialize env Supabase client:', err);
    }
  }

  return null;
}

/**
 * Comprehensive diagnostic check for Supabase connection
 */
export async function testSupabaseConnection(overrideUrl?: string, overrideKey?: string): Promise<{
  success: boolean;
  message: string;
  details?: string;
  tablesFound: string[];
  needsSqlSetup: boolean;
}> {
  let client: SupabaseClient | null = null;
  let targetUrl = overrideUrl;
  let targetKey = overrideKey;

  if (overrideUrl && overrideKey) {
    const clean = sanitizeCredentials(overrideUrl, overrideKey);
    if (!clean.isValid || !isValidHeaderCredential(clean.url, clean.key)) {
      return {
        success: false,
        message: 'Invalid URL or Anon Key format. Please check for placeholders or non-ASCII characters.',
        tablesFound: [],
        needsSqlSetup: false
      };
    }
    try {
      client = createClient(clean.url, clean.key);
    } catch (err: any) {
      return {
        success: false,
        message: `Client initialization failed: ${err.message || err}`,
        tablesFound: [],
        needsSqlSetup: false
      };
    }
  } else {
    client = getSupabase();
    targetUrl = safeStorage.getItem('ethiolearn_supabase_url') || '';
    targetKey = safeStorage.getItem('ethiolearn_supabase_key') || '';
  }

  if (!client) {
    return {
      success: false,
      message: 'No valid Supabase credentials found. Please enter your project URL and Anon key.',
      tablesFound: [],
      needsSqlSetup: false
    };
  }

  const tablesFound: string[] = [];

  // Check table courses
  try {
    const { error: coursesErr } = await client.from('courses').select('id').limit(1);
    if (!coursesErr) tablesFound.push('courses');
  } catch (e) {}

  // Check table lessons
  try {
    const { error: lessonsErr } = await client.from('lessons').select('id').limit(1);
    if (!lessonsErr) tablesFound.push('lessons');
  } catch (e) {}

  // Check table student_profiles
  try {
    const { error: profErr } = await client.from('student_profiles').select('email').limit(1);
    if (!profErr) tablesFound.push('student_profiles');
  } catch (e) {}

  // Check table payments
  try {
    const { error: payErr } = await client.from('payments').select('id').limit(1);
    if (!payErr) tablesFound.push('payments');
  } catch (e) {}

  // Check table announcements
  try {
    const { error: annErr } = await client.from('announcements').select('id').limit(1);
    if (!annErr) tablesFound.push('announcements');
  } catch (e) {}

  // Check table coupons
  try {
    const { error: coupErr } = await client.from('coupons').select('code').limit(1);
    if (!coupErr) tablesFound.push('coupons');
  } catch (e) {}

  // Check table ethiolearn_sync
  try {
    const { error: syncErr } = await client.from('ethiolearn_sync').select('email').limit(1);
    if (!syncErr) tablesFound.push('ethiolearn_sync');
  } catch (e) {}

  // Check table books
  try {
    const { error: booksErr } = await client.from('books').select('id').limit(1);
    if (!booksErr) tablesFound.push('books');
  } catch (e) {}

  if (tablesFound.length > 0) {
    return {
      success: true,
      message: `Connected successfully! Found database tables: [${tablesFound.join(', ')}].`,
      tablesFound,
      needsSqlSetup: false
    };
  }

  // If no tables found, verify if host is reachable via REST ping
  try {
    const { url, key } = sanitizeCredentials(targetUrl || '', targetKey || '');
    if (url && key && isValidHeaderCredential(url, key)) {
      const pingRes = await fetch(`${url}/rest/v1/`, { method: 'GET', headers: { apikey: key } });
      if (pingRes.ok || pingRes.status === 200 || pingRes.status === 401 || pingRes.status === 404) {
        return {
          success: true,
          message: 'Connected to Supabase project REST API! Note: Database tables are not created yet.',
          details: 'Your credentials are valid! Please copy and run the 1-click SQL setup script in your Supabase SQL Editor to create tables.',
          tablesFound: [],
          needsSqlSetup: true
        };
      }
    }
  } catch (err) {}

  return {
    success: false,
    message: 'Could not connect to Supabase. Please verify your Project URL and Anon Key.',
    details: 'Make sure your project URL starts with https://, your database status is active, and Row Level Security or CORS settings allow requests.',
    tablesFound: [],
    needsSqlSetup: true
  };
}

/**
 * Fetch Grade 12 books from Supabase if connected
 */
export async function fetchSupabaseBooks(): Promise<any[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    // Attempt to select from "books"
    const { data, error } = await client
      .from('books')
      .select('*')
      .order('title', { ascending: true });

    if (error) {
      // Try fallback table alternative "grade12_books"
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
export function initSupabaseConfig(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const savedUrl = safeStorage.getItem('ethiolearn_supabase_url');
      const savedKey = safeStorage.getItem('ethiolearn_supabase_key');
      const cleanSaved = sanitizeCredentials(savedUrl || '', savedKey || '');
      if (cleanSaved.isValid) {
        resolve();
        return; // Already configured locally
      }

      fetch('/api/supabase-config')
        .then((res) => (res.ok ? res.json() : null))
        .then((config) => {
          if (config && config.url && config.anonKey) {
            const cleanConfig = sanitizeCredentials(config.url, config.anonKey);
            if (cleanConfig.isValid) {
              safeStorage.setItem('ethiolearn_supabase_url', cleanConfig.url);
              safeStorage.setItem('ethiolearn_supabase_key', cleanConfig.key);
              supabaseInstance = null; // force reload with server-synced credentials
              console.log('[Supabase Client] Successfully fetched and auto-configured Supabase credentials from server.');
            }
          }
          resolve();
        })
        .catch((err) => {
          console.warn('[Supabase Client] Failed to fetch server-side Supabase credentials:', err);
          resolve();
        });
    } catch (err) {
      console.warn('[Supabase Client] Init error:', err);
      resolve();
    }
  });
}



