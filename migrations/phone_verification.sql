-- =============================================
-- PHONE VERIFICATION SYSTEM
-- =============================================

-- Table for SMS verification codes
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by phone and recent codes
CREATE INDEX IF NOT EXISTS idx_phone_created ON public.phone_verifications(phone, created_at DESC);

-- Cleanup function for expired codes (run every 10 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
    DELETE FROM public.phone_verifications
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rate limit status
CREATE OR REPLACE FUNCTION public.check_rate_limit(phone_input TEXT)
RETURNS TABLE(can_send BOOLEAN, last_sent TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (last_sent_at IS NULL OR last_sent_at < NOW() - INTERVAL '60 seconds') AS can_send,
        last_sent_at
    FROM (
        SELECT MAX(created_at) AS last_sent_at
        FROM public.phone_verifications
        WHERE phone = phone_input
            AND created_at > NOW() - INTERVAL '1 hour'
    ) t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
