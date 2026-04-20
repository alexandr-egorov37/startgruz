-- =============================================
-- RLS SECURITY ROADMAP
-- =============================================
-- 
-- CURRENT STATE: App uses anon key + localStorage IDs (NO Supabase Auth).
-- auth.uid() returns NULL for ALL requests.
--
-- ⚠️ ADDING auth.uid()-based RLS POLICIES WILL BREAK THE ENTIRE APP.
--
-- MIGRATION PATH (execute ONLY after implementing Supabase Auth):
-- 1. Implement Supabase Auth (email/phone sign-in)
-- 2. Migrate localStorage IDs to auth.users
-- 3. Run this migration to lock down tables
--
-- Until then, tables use permissive RLS (USING (true)) which is required
-- for the anon key to work without auth.
-- =============================================

-- STEP 1: Ensure RLS is enabled on all critical tables (already done for most)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executor_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- STEP 2 (FUTURE — after Supabase Auth implemented):
-- DROP POLICY IF EXISTS "Allow all on users" ON public.users;
-- CREATE POLICY "Users own data" ON public.users FOR ALL USING (auth.uid() = id);
--
-- DROP POLICY IF EXISTS "Allow all on orders" ON public.orders;
-- CREATE POLICY "Orders own data" ON public.orders FOR SELECT USING (auth.uid() = user_id OR auth.uid() = accepted_by);
-- CREATE POLICY "Orders insert own" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Orders update own" ON public.orders FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = accepted_by);
--
-- DROP POLICY IF EXISTS "Allow all on chats" ON public.chats;
-- CREATE POLICY "Chats own" ON public.chats FOR ALL USING (auth.uid() = user_1 OR auth.uid() = user_2);
--
-- DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;
-- CREATE POLICY "Messages own chat" ON public.messages FOR ALL USING (
--   EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND (chats.user_1 = auth.uid() OR chats.user_2 = auth.uid()))
-- );
--
-- DROP POLICY IF EXISTS "Allow all on presence" ON public.presence;
-- CREATE POLICY "Presence read all" ON public.presence FOR SELECT USING (true);
-- CREATE POLICY "Presence write own" ON public.presence FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Presence update own" ON public.presence FOR UPDATE USING (auth.uid() = user_id);
