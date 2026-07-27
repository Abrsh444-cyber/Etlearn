-- ====================================================================
-- ETHIOLEARN PRO - MONETIZATION & SUBSCRIPTION SUPABASE SCHEMA
-- Environment: Supabase / PostgreSQL 14+
-- ====================================================================

-- 1. ENUM TYPES
CREATE TYPE subscription_tier AS ENUM ('free', 'pro_monthly', 'exam_season_pass', 'subject_bundle');
CREATE TYPE subscription_status AS ENUM ('active', 'pending', 'expired', 'cancelled');
CREATE TYPE payment_provider AS ENUM ('telebirr', 'cbe_birr', 'chapa', 'santim_pay', 'manual');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- 2. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL DEFAULT 'free',
    status subscription_status NOT NULL DEFAULT 'active',
    subject_bundle_id TEXT, -- Optional ID for subject-specific pack purchases
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ, -- NULL for lifetime/unlimited free, set date for PRO/Pass
    payment_method payment_provider DEFAULT 'telebirr',
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE, -- Exam season passes & manual transfers NEVER silently renew
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_active_user_subscription UNIQUE (user_id)
);

-- 3. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 4. FEATURE USAGE TRACKER TABLE (For Free Tier Daily Limits)
CREATE TABLE IF NOT EXISTS public.feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_type TEXT NOT NULL, -- e.g., 'ai_tutor_queries', 'quiz_attempts', 'pdf_downloads'
    count INT NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL, -- Resets daily at 00:00 EAT / UTC
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_feature UNIQUE (user_id, feature_type)
);

-- 5. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_txn ON public.payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_feature ON public.feature_usage(user_id, feature_type);

-- 6. AUTOMATED UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_usage_updated_at
    BEFORE UPDATE ON public.feature_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Subscriptions RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their initial subscription"
    ON public.subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own non-sensitive subscription preferences"
    ON public.subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- Payments RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment history"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can submit payment verification requests"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Feature Usage RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feature usage limits"
    ON public.feature_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can track their own feature usage"
    ON public.feature_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can increment their own feature usage"
    ON public.feature_usage FOR UPDATE
    USING (auth.uid() = user_id);

-- Service Role / Admin Overrides (for Webhooks & Approval Dashboard)
CREATE POLICY "Service Role full access to subscriptions"
    ON public.subscriptions FOR ALL
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service Role full access to payments"
    ON public.payments FOR ALL
    TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service Role full access to feature usage"
    ON public.feature_usage FOR ALL
    TO service_role USING (true) WITH CHECK (true);
