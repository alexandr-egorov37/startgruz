-- 1. Расширение таблицы messages для медиа и дополнительных типов
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS duration INTEGER;

-- 2. Таблица блокировок пользователей
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL, -- executor_id или user_id
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select user_blocks" ON public.user_blocks FOR SELECT USING (true);
CREATE POLICY "Allow public insert user_blocks" ON public.user_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete user_blocks" ON public.user_blocks FOR DELETE USING (true);

-- 3. Таблица жалоб на сообщения (Модерация)
CREATE TABLE IF NOT EXISTS public.message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  reporter_id UUID,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public report insert" ON public.message_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public report select" ON public.message_reports FOR SELECT USING (true);

-- 4. Включение Realtime для новых таблиц (Обновление публикации)
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.orders, 
    public.offers, 
    public.executor_orders, 
    public.executors,
    public.messages,
    public.user_blocks;
COMMIT;
