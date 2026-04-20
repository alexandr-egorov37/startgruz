-- 1. Ensure messages table has the correct structure as per spec
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    receiver_id UUID,
    text TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    duration INTEGER,
    status TEXT DEFAULT 'sent',
    is_read BOOLEAN DEFAULT false,
    is_from_executor BOOLEAN DEFAULT false,
    order_id UUID, -- Keep for context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. If 'content' column exists and 'text' is missing, rename or copy
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='content') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='text') THEN
            ALTER TABLE public.messages RENAME COLUMN content TO text;
        END IF;
    END IF;
END $$;

-- 3. Ensure Realtime is enabled for messages
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.orders, 
    public.offers, 
    public.executor_orders, 
    public.executors,
    public.messages; -- <--- ADDED
COMMIT;

-- 4. Set up RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can read messages" ON public.messages;
CREATE POLICY "Users can read messages"
ON public.messages
FOR SELECT
USING (
  auth.uid() = sender_id
  OR auth.uid() IN (
    SELECT user_1 FROM chats WHERE id = chat_id
    UNION
    SELECT user_2 FROM chats WHERE id = chat_id
  )
);

-- 5. Add performance index
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
