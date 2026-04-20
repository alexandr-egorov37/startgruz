-- Миграция для улучшения чата и Realtime
-- 1. Таблица сообщений (если еще не создана с нужными полями)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID, -- user_id или executor_id
  content TEXT NOT NULL,
  is_from_executor BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Индексы для скорости
CREATE INDEX IF NOT EXISTS idx_messages_order ON public.messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

-- 3. Включение Realtime для сообщений
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.orders, 
    public.offers, 
    public.executor_orders, 
    public.executors,
    public.messages;
COMMIT;

-- 4. RLS для сообщений
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;
CREATE POLICY "Allow all on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- 5. Добавление колонок для статуса в executors если нет (для Presence)
ALTER TABLE public.executors ADD COLUMN IF NOT EXISTS is_typing BOOLEAN DEFAULT false;
