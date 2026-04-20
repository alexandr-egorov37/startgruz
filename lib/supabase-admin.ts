import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client with service role key.
 * NEVER import this in client-side code or pages — API routes only.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
