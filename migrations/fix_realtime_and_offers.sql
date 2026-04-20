-- 1. Исправление таблицы offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '{}';
ALTER TABLE public.offers DROP COLUMN IF EXISTS conditions;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS unique_order_executor;
ALTER TABLE public.offers ADD CONSTRAINT unique_order_executor UNIQUE(order_id, executor_id);

-- 2. Включение Realtime для нужных таблиц (SAFE — no DROP)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.offers;          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.executor_orders; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.executors;       EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Политики безопасности (упрощенная проверка для MVP)
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on offers" ON public.offers;
CREATE POLICY "Allow all on offers" ON public.offers FOR ALL USING (true) WITH CHECK (true);

-- 4. Обновление статусов заказов
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- Статусы: searching (поиск), offer_received (есть предложения), accepted (принят), CANCELLED (отменен)
