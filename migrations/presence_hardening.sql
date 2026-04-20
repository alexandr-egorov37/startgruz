-- =============================================
-- PRESENCE SYSTEM HARDENING (Production-grade)
-- Fixes: upsert_presence, flickering, redundancy
-- =============================================

-- 1. Create robust upsert_presence function
CREATE OR REPLACE FUNCTION public.upsert_presence(
  p_user_id UUID,
  p_status TEXT DEFAULT 'online'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.presence (user_id, status, updated_at, last_seen)
  VALUES (p_user_id, p_status, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = NOW(),
    last_seen = CASE WHEN EXCLUDED.status = 'online' THEN NOW() ELSE presence.last_seen END;
END;
$$;

-- 2. Synchronize cleanup interval (3 minutes to allow heartbeat of 1 minute)
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.presence
  SET status = 'offline'
  WHERE status = 'online'
    AND updated_at < NOW() - INTERVAL '3 minutes';
END;
$$;

-- 3. Cleanup redundant fields and columns
-- Note: executors.is_online is deprecated, presence table is the single source of truth
ALTER TABLE public.executors DROP COLUMN IF EXISTS is_online;
DROP INDEX IF EXISTS idx_executors_online;

ALTER TABLE public.presence DROP COLUMN IF EXISTS typing_in;

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_presence_updated_at ON public.presence(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_presence_status ON public.presence(status);

-- 5. Verification Test (Optional but recommended to run in SQL editor)
-- SELECT upsert_presence('00000000-0000-0000-0000-000000000000'::UUID, 'online');
