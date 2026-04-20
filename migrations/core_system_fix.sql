-- =============================================
-- CORE SYSTEM FIX — All critical fixes in one migration
-- Execute in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. FIX: users.name column does not exist
-- =============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;

-- =============================================
-- 2. FIX: orders.updated_at column + auto-update trigger
-- =============================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill: set updated_at = created_at for existing rows where updated_at is null
UPDATE public.orders SET updated_at = created_at WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.orders;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. FIX: Realtime publication — SAFE ADD (no DROP)
-- Ensures ALL required tables are in realtime
-- =============================================
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.executor_orders; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.executors;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =============================================
-- 4. FIX: executor_portfolio — add order_id + unique constraint + rename photo→photo_url
-- =============================================
ALTER TABLE public.executor_portfolio ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE public.executor_portfolio RENAME COLUMN photo TO photo_url;

-- Unique constraint: one portfolio entry per order per executor
DO $$
BEGIN
  ALTER TABLE public.executor_portfolio
    ADD CONSTRAINT unique_portfolio_order_executor UNIQUE (order_id, executor_id);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 5. FIX: Presence cleanup function (already exists, ensure up to date)
-- =============================================
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE public.presence
  SET status = 'offline', last_seen = updated_at
  WHERE status = 'online'
    AND updated_at < NOW() - INTERVAL '60 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. PERFORMANCE INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_city_status ON public.orders(city, status);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON public.orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_accepted_by ON public.orders(accepted_by);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_status ON public.messages(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_chat_receiver_status ON public.messages(chat_id, receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_presence_user_id ON public.presence(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_status_updated ON public.presence(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_offers_order_id ON public.offers(order_id);
CREATE INDEX IF NOT EXISTS idx_offers_executor_id ON public.offers(executor_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_executor ON public.executor_portfolio(executor_id);
CREATE INDEX IF NOT EXISTS idx_chats_user1 ON public.chats(user_1);
CREATE INDEX IF NOT EXISTS idx_chats_user2 ON public.chats(user_2);
CREATE INDEX IF NOT EXISTS idx_reviews_executor ON public.reviews(executor_id);

-- =============================================
-- VERIFICATION QUERIES (run after migration)
-- =============================================
-- SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='name';
-- SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name='updated_at';
-- SELECT column_name FROM information_schema.columns WHERE table_name='executor_portfolio' AND column_name='photo_url';
-- SELECT column_name FROM information_schema.columns WHERE table_name='executor_portfolio' AND column_name='order_id';
-- SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' ORDER BY tablename;
