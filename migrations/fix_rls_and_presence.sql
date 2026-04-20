-- 1. FIX RLS FOR executor_orders
-- Allow executors to see only their assigned orders
DROP POLICY IF EXISTS "Executors can view their own orders" ON public.executor_orders;
DROP POLICY IF EXISTS "executor_orders_select" ON public.executor_orders;

CREATE POLICY "executor_orders_select"
ON public.executor_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.executors e
    WHERE e.id = executor_orders.executor_id
    AND e.user_id = auth.uid()
  )
);

-- Allow system to insert assignments (usually service_role or authenticated with proper logic)
-- For now, if client is inserting, we might need a broader insert policy or handle it via RPC
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.executor_orders;
CREATE POLICY "Enable insert for authenticated users"
ON public.executor_orders
FOR INSERT
WITH CHECK (true); 

-- 2. FIX upsert_presence FUNCTION
-- Ensuring it exists and is robust for Realtime
CREATE OR REPLACE FUNCTION public.upsert_presence(
  p_user_id UUID,
  p_status TEXT DEFAULT 'online',
  p_typing_in UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.presence (user_id, status, typing_in, updated_at, last_seen)
  VALUES (p_user_id, p_status, p_typing_in, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    typing_in = EXCLUDED.typing_in,
    updated_at = NOW(),
    last_seen = NOW();
END;
$$;

-- Grant access to all authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_presence TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_presence TO anon;
