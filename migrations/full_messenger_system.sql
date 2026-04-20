-- 1. Create chats table if not exists
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_1 UUID NOT NULL,
  user_2 UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_1, user_2)
);

-- 2. Update messages table
-- We keep order_id for context, but add chat_id for grouping
ALTER TABLE messages ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES chats(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent'; -- sent, delivered, read

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_users ON chats(user_1, user_2);

-- 4. RLS for chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own chats" ON chats
FOR SELECT USING (
  auth.uid() = user_1 OR auth.uid() = user_2
);

CREATE POLICY "Users can create chats" ON chats
FOR INSERT WITH CHECK (
  auth.uid() = user_1 OR auth.uid() = user_2
);

CREATE POLICY "Users can update their chats" ON chats
FOR UPDATE USING (
  auth.uid() = user_1 OR auth.uid() = user_2
);
