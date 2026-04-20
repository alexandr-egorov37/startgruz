import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, reason: 'method_not_allowed' }, 405)

  try {
    const body = await req.json()
    const { user_id, role } = body ?? {}

    if (!user_id || !role) {
      return json({ success: false, reason: 'missing_fields' }, 400)
    }

    if (!['customer', 'executor'].includes(role)) {
      return json({ success: false, reason: 'invalid_role' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', user_id)

    if (error) {
      console.error('[set-role] db error:', error.message)
      return json({ success: false, reason: 'db_error' }, 500)
    }

    console.log(`[set-role] user_id=${user_id} role=${role}`)
    return json({ success: true })

  } catch (err: any) {
    console.error('[set-role] exception:', err)
    return json({ success: false, reason: 'internal_error' }, 500)
  }
})
