-- =============================================
-- CHAT SYSTEM V2 — Production-level Telegram-like
-- =============================================

-- 1. Ensure chats table has order_id
ALTER TABLE chats ADD COLUMN IF NOT EXISTS order_id UUID;

-- 2. Chat participants (for last_read tracking + flexible membership)
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT '1970-01-01',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- 3. Presence (online status tracking)
CREATE TABLE IF NOT EXISTS presence (
  user_id UUID PRIMARY KEY,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ensure messages has all required columns
ALTER TABLE messages ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES chats(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5. RLS — Open policies (app uses anonymous access via anon key)
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can see their own chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can update their chats" ON chats;
DROP POLICY IF EXISTS "Allow public select chats" ON chats;
DROP POLICY IF EXISTS "Allow public insert chats" ON chats;
DROP POLICY IF EXISTS "Allow public update chats" ON chats;
DROP POLICY IF EXISTS "Allow public select messages" ON messages;
DROP POLICY IF EXISTS "Allow public insert messages" ON messages;
DROP POLICY IF EXISTS "Allow public update messages" ON messages;

CREATE POLICY "public_select_chats" ON chats FOR SELECT USING (true);
CREATE POLICY "public_insert_chats" ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_chats" ON chats FOR UPDATE USING (true);

CREATE POLICY "public_select_messages" ON messages FOR SELECT USING (true);
CREATE POLICY "public_insert_messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_messages" ON messages FOR UPDATE USING (true);

CREATE POLICY "public_select_participants" ON chat_participants FOR SELECT USING (true);
CREATE POLICY "public_insert_participants" ON chat_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_participants" ON chat_participants FOR UPDATE USING (true);
CREATE POLICY "public_delete_participants" ON chat_participants FOR DELETE USING (true);

CREATE POLICY "public_select_presence" ON presence FOR SELECT USING (true);
CREATE POLICY "public_insert_presence" ON presence FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_presence" ON presence FOR UPDATE USING (true);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat_status ON messages(chat_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_status ON messages(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_participants_chat ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_users ON chats(user_1, user_2);
CREATE INDEX IF NOT EXISTS idx_presence_online ON presence(is_online);

-- 7. Realtime publication (required for postgres_changes events)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chats;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE presence;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Function to auto-populate chat_participants on chat creation
CREATE OR REPLACE FUNCTION populate_chat_participants()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_participants (chat_id, user_id) VALUES (NEW.id, NEW.user_1) ON CONFLICT DO NOTHING;
  INSERT INTO chat_participants (chat_id, user_id) VALUES (NEW.id, NEW.user_2) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_participants ON chats;
CREATE TRIGGER trg_chat_participants AFTER INSERT ON chats
FOR EACH ROW EXECUTE FUNCTION populate_chat_participants();

-- 9. Backfill participants for existing chats
INSERT INTO chat_participants (chat_id, user_id)
SELECT id, user_1 FROM chats WHERE user_1 IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO chat_participants (chat_id, user_id)
SELECT id, user_2 FROM chats WHERE user_2 IS NOT NULL
ON CONFLICT DO NOTHING;
