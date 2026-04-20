-- Миграция: Профессиональная система Presence
-- Выполнить в Supabase SQL Editor

-- 1. Таблица presence
CREATE TABLE IF NOT EXISTS public.presence (
  user_id UUID PRIMARY KEY,
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  typing_in UUID NULL
);

-- 2. Индекс для производительности
CREATE INDEX IF NOT EXISTS idx_presence_updated_at ON public.presence(updated_at DESC);

-- 3. Включение Realtime
-- Примечание: Если таблица уже в публикации, команда может вывести предупреждение, это нормально
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.presence;
  END IF;
END $$;

-- 4. RLS (Row Level Security)
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

-- Политика на чтение (все видят всех)
DROP POLICY IF EXISTS "presence_select" ON public.presence;
CREATE POLICY "presence_select" ON public.presence FOR SELECT USING (true);

-- Политика на вставку (любой может создать свой статус)
DROP POLICY IF EXISTS "presence_insert" ON public.presence;
CREATE POLICY "presence_insert" ON public.presence FOR INSERT WITH CHECK (true);

-- Политика на обновление (любой может обновить свой статус)
-- В MVP разрешаем всем, для безопасности можно добавить: (auth.uid() = user_id)
DROP POLICY IF EXISTS "presence_update" ON public.presence;
CREATE POLICY "presence_update" ON public.presence FOR UPDATE USING (true) WITH CHECK (true);
