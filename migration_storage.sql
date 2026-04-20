-- Выполнить в Supabase SQL Editor для создания хранилища файлов чата

-- 1. Создание бакета (хранилища)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Политика: Разрешить всем чтение файлов (публичный доступ)
CREATE POLICY "Public Read Chat Files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

-- 3. Политика: Разрешить всем загрузку файлов (для MVP)
-- В будущем можно ограничить только аутентифицированными пользователями
CREATE POLICY "Public Upload Chat Files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-files');

-- 4. Политика: Разрешить удаление своих файлов (опционально)
CREATE POLICY "Public Delete Chat Files"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-files');
