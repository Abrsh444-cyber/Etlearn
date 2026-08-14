-- ====================================================================
-- ETHIOLEARN PRO - COMPLETE DATABASE SCHEMA (POSTGRESQL 14+ / SUPABASE)
-- Single Source of Truth for Courses, Lessons, Users, Payments & Admin
-- ====================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('free', 'pro_monthly', 'exam_season_pass', 'subject_bundle');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'pending', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_provider AS ENUM ('telebirr', 'cbe_birr', 'chapa', 'santim_pay', 'manual');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. STUDENT PROFILES TABLE (Single Source of Truth for Users)
CREATE TABLE IF NOT EXISTS public.student_profiles (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    university TEXT DEFAULT 'Wolkite University',
    year TEXT DEFAULT 'Freshman',
    subjects JSONB DEFAULT '[]'::jsonb,
    is_pro BOOLEAN NOT NULL DEFAULT FALSE,
    user_role TEXT NOT NULL DEFAULT 'student' CHECK (user_role IN ('student', 'instructor', 'admin', 'super_admin')),
    referral_code TEXT,
    profile_data JSONB,
    notes_data JSONB,
    study_sessions JSONB,
    performance_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. COURSES TABLE (Single Source of Truth for Published & Draft Courses)
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LESSONS TABLE (Unique lessons per course)
CREATE TABLE IF NOT EXISTS public.lessons (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    chapter_number INT NOT NULL DEFAULT 1,
    content TEXT,
    duration TEXT DEFAULT '15m',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_course_lesson_chapter UNIQUE (course_id, chapter_number)
);

-- 5. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
    code TEXT PRIMARY KEY,
    discount_percentage INT NOT NULL DEFAULT 20,
    fixed_discount_etb NUMERIC(10, 2) DEFAULT 0,
    max_uses INT NOT NULL DEFAULT 100,
    used_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    badge_text TEXT DEFAULT 'Notice',
    is_important BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. BOOKS TABLE (Digital Textbook Catalog)
CREATE TABLE IF NOT EXISTS public.books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade TEXT NOT NULL DEFAULT 'Grade 12',
    description TEXT,
    pdf_url TEXT,
    chapters JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ETHIOLEARN SYNC (Backup Snapshot Table)
CREATE TABLE IF NOT EXISTS public.ethiolearn_sync (
    email TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT,
    tier subscription_tier NOT NULL DEFAULT 'free',
    status subscription_status NOT NULL DEFAULT 'active',
    subject_bundle_id TEXT,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    payment_method payment_provider DEFAULT 'telebirr',
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'ETB',
    provider payment_provider NOT NULL DEFAULT 'telebirr',
    provider_transaction_id TEXT UNIQUE NOT NULL,
    sender_name TEXT NOT NULL,
    sender_phone TEXT,
    status payment_status NOT NULL DEFAULT 'pending',
    receipt_url TEXT,
    raw_webhook_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. FEATURE USAGE TRACKER TABLE
CREATE TABLE IF NOT EXISTS public.feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    feature_type TEXT NOT NULL,
    count INT NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_feature UNIQUE (user_id, feature_type)
);

-- 12. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_txn ON public.payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_role ON public.student_profiles(user_role);

-- 13. AUTOMATED UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON public.lessons;
CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON public.lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON public.student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Courses RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
    ON public.courses FOR SELECT
    USING (status = 'published' OR auth.role() = 'service_role');

CREATE POLICY "Admins full access to courses"
    ON public.courses FOR ALL
    USING (true)
    WITH CHECK (true);

-- Lessons RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published lessons"
    ON public.lessons FOR SELECT
    USING (status = 'published' OR auth.role() = 'service_role');

CREATE POLICY "Admins full access to lessons"
    ON public.lessons FOR ALL
    USING (true)
    WITH CHECK (true);

-- Student Profiles RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of student profiles"
    ON public.student_profiles FOR SELECT
    USING (true);

CREATE POLICY "Allow profile upserts"
    ON public.student_profiles FOR ALL
    USING (true)
    WITH CHECK (true);

-- Payments RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow payments access"
    ON public.payments FOR ALL
    USING (true)
    WITH CHECK (true);

-- Coupons RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow coupons access"
    ON public.coupons FOR ALL
    USING (true)
    WITH CHECK (true);

-- Announcements RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view announcements"
    ON public.announcements FOR SELECT
    USING (true);

CREATE POLICY "Admins manage announcements"
    ON public.announcements FOR ALL
    USING (true)
    WITH CHECK (true);

-- Books RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read and write books"
    ON public.books FOR ALL
    USING (true)
    WITH CHECK (true);

-- Ethiolearn Sync RLS
ALTER TABLE public.ethiolearn_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public sync access"
    ON public.ethiolearn_sync FOR ALL
    USING (true)
    WITH CHECK (true);
