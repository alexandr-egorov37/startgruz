-- =============================================
-- PRESENCE UNIFIED — Single source of truth
-- Replaces: chat_system_v2 presence + migration_presence_final
-- =============================================

-- 1. Ensure presence table exists with correct schema
CREATE TABLE IF NOT EXISTS public.presence (
  user_id UUID PRIMARY KEY,
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  typing_in UUID NULL
);

-- 2. Add missing columns if table existed with old schema (chat_system_v2 had is_online BOOLEAN)
ALTER TABLE public.presence ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';
ALTER TABLE public.presence ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.presence ADD COLUMN IF NOT EXISTS typing_in UUID;

-- 3. Migrate is_online → status (if is_online column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'presence' AND column_name = 'is_online') THEN
    UPDATE public.presence SET status = CASE WHEN is_online = true THEN 'online' ELSE 'offline' END WHERE status IS NULL;
    ALTER TABLE public.presence DROP COLUMN is_online;
  END IF;
END $$;

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_presence_status ON public.presence(status);
CREATE INDEX IF NOT EXISTS idx_presence_updated_at ON public.presence(updated_at DESC);

-- 5. RLS
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_select" ON public.presence;
DROP POLICY IF EXISTS "presence_insert" ON public.presence;
DROP POLICY IF EXISTS "presence_update" ON public.presence;
DROP POLICY IF EXISTS "public_select_presence" ON public.presence;
DROP POLICY IF EXISTS "public_insert_presence" ON public.presence;
DROP POLICY IF EXISTS "public_update_presence" ON public.presence;

CREATE POLICY "presence_all_select" ON public.presence FOR SELECT USING (true);
CREATE POLICY "presence_all_insert" ON public.presence FOR INSERT WITH CHECK (true);
CREATE POLICY "presence_all_update" ON public.presence FOR UPDATE USING (true);

-- 6. Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Server-side auto-offline function (marks stale users offline)
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE public.presence
  SET status = 'offline', last_seen = updated_at
  WHERE status = 'online'
    AND updated_at < NOW() - INTERVAL '30 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Expose as RPC for frontend to call
-- Usage: await supabase.rpc('cleanup_stale_presence')
