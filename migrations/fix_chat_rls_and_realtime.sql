-- =============================================
-- FIX: Chat & Messages RLS + Realtime
-- =============================================
-- Problem: RLS policies on chats use auth.uid() but app uses anonymous access.
-- Messages don't sync because realtime publication is missing.

-- 1. Drop restrictive RLS policies on chats
DROP POLICY IF EXISTS "Users can see their own chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can update their chats" ON chats;

-- 2. Create open RLS policies (matching schema.sql pattern for anonymous access)
CREATE POLICY "Allow public select chats" ON chats FOR SELECT USING (true);
CREATE POLICY "Allow public insert chats" ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update chats" ON chats FOR UPDATE USING (true);

-- 3. Ensure messages table has RLS enabled with open policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select messages" ON messages;
DROP POLICY IF EXISTS "Allow public insert messages" ON messages;
DROP POLICY IF EXISTS "Allow public update messages" ON messages;

CREATE POLICY "Allow public select messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update messages" ON messages FOR UPDATE USING (true);

-- 4. Add tables to realtime publication (critical for postgres_changes to work)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;

-- 5. Ensure messages table has all required columns
ALTER TABLE messages ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES chats(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chats_users ON chats(user_1, user_2);
