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

function normalizePhone(raw: string): string {
  let digits = (raw ?? '').replace(/\D/g, '')
  if (digits.startsWith('8') && digits.length === 11) digits = '7' + digits.slice(1)
  if (digits.length === 10) digits = '7' + digits
  return digits
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, reason: 'method_not_allowed' }, 405)

  try {
    const body = await req.json()
    const phone = normalizePhone(body?.phone ?? '')
    const codeStr = String(body?.code ?? '').trim()

    if (!phone || phone.length !== 11 || !phone.startsWith('7')) {
      return json({ success: false, reason: 'invalid_phone' }, 400)
    }
    if (!codeStr) {
      return json({ success: false, reason: 'missing_code' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── Fetch most recent non-expired code ─────────────────────────────────
    const { data: codeRow } = await supabase
      .from('phone_codes')
      .select('id, code, attempts, expires_at')
      .eq('phone', phone)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!codeRow) {
      console.log(`[verify-code] no active code phone=${phone}`)
      return json({ success: false, reason: 'code_expired' }, 400)
    }

    // ── Check attempt limit ────────────────────────────────────────────────
    if (codeRow.attempts >= 5) {
      console.log(`[verify-code] blocked phone=${phone} attempts=${codeRow.attempts}`)
      return json({ success: false, reason: 'blocked' }, 429)
    }

    // ── Compare codes ──────────────────────────────────────────────────────
    if (codeRow.code !== codeStr) {
      const newAttempts = codeRow.attempts + 1
      await supabase
        .from('phone_codes')
        .update({ attempts: newAttempts })
        .eq('id', codeRow.id)

      const attempts_left = Math.max(0, 5 - newAttempts)
      console.log(`[verify-code] wrong code phone=${phone} attempts_left=${attempts_left}`)
      return json({ success: false, reason: 'wrong_code', attempts_left }, 400)
    }

    // ── Code correct: delete immediately (one-time use) ────────────────────
    await supabase.from('phone_codes').delete().eq('id', codeRow.id)
    console.log(`[verify-code] code verified phone=${phone}`)

    // ── Upsert user — UNIQUE on phone prevents duplicates ──────────────────
    const { data: user, error: upsertErr } = await supabase
      .from('users')
      .upsert({ phone }, { onConflict: 'phone' })
      .select('id, phone, role')
      .single()

    if (upsertErr || !user) {
      // Fallback: phone already exists — plain SELECT
      const { data: existing, error: selErr } = await supabase
        .from('users')
        .select('id, phone, role')
        .eq('phone', phone)
        .single()

      if (selErr || !existing) {
        console.error('[verify-code] user upsert+select both failed:', upsertErr?.message, selErr?.message)
        return json({ success: false, reason: 'db_error' }, 500)
      }

      console.log(`[verify-code] existing user id=${existing.id} role=${existing.role}`)
      return json({ success: true, user_id: existing.id, role: existing.role ?? null })
    }

    console.log(`[verify-code] user id=${user.id} role=${user.role}`)
    return json({ success: true, user_id: user.id, role: user.role ?? null })

  } catch (err: any) {
    console.error('[verify-code] exception:', err)
    return json({ success: false, reason: 'internal_error' }, 500)
  }
})
