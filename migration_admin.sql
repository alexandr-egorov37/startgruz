-- Миграция: добавить поле admin_comment и обновить статусы
-- Выполнить в Supabase SQL Editor

-- 1. Добавить поле admin_comment (если не существует)
ALTER TABLE public.executors
  ADD COLUMN IF NOT EXISTS admin_comment TEXT;

-- 2. Снять старый CHECK-constraint и поставить новый (с revision, approved)
ALTER TABLE public.executors
  DROP CONSTRAINT IF EXISTS executors_status_check;

ALTER TABLE public.executors
  ADD CONSTRAINT executors_status_check
  CHECK (status IN ('pending', 'approved', 'verified', 'rejected', 'revision'));

-- 3. Политики RLS уже открыты (Allow public select/update executors)
-- Дополнительных политик не требуется для MVP
