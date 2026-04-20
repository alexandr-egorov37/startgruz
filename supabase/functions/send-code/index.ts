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

    if (phone.length !== 11 || !phone.startsWith('7')) {
      return json({ success: false, reason: 'invalid_phone' }, 400)
    }

    // ── Check API key BEFORE any DB work ──────────────────────────────────
    const smsApiKey = Deno.env.get('SMS_RU_API_KEY')
    if (!smsApiKey) {
      console.error('[send-code] FATAL: SMS_RU_API_KEY secret is not set in Edge Function environment')
      return json({ success: false, reason: 'sms_not_configured', error: 'SMS_RU_API_KEY secret missing' }, 500)
    }
    console.log(`[send-code] SMS_RU_API_KEY present, length=${smsApiKey.length}, prefix=${smsApiKey.slice(0, 8)}...`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // ── Cooldown: max 1 code INSERT per 60 s per phone ─────────────────────
    const since = new Date(Date.now() - 60_000).toISOString()
    const { data: recent } = await supabase
      .from('phone_codes')
      .select('created_at')
      .eq('phone', phone)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)

    if (recent && recent.length > 0) {
      const sentAt = new Date(recent[0].created_at).getTime()
      const seconds_left = Math.ceil((sentAt + 60_000 - Date.now()) / 1000)
      console.log(`[send-code] cooldown phone=${phone} seconds_left=${seconds_left}`)
      return json({ success: false, reason: 'cooldown', seconds_left }, 429)
    }

    // ── Generate 4-digit code ──────────────────────────────────────────────
    const code = String(Math.floor(1000 + Math.random() * 9000))
    const expires_at = new Date(Date.now() + 5 * 60_000).toISOString()

    // ── INSERT new code row ────────────────────────────────────────────────
    const { data: inserted, error: dbErr } = await supabase
      .from('phone_codes')
      .insert({ phone, code, attempts: 0, expires_at })
      .select('id')
      .single()

    if (dbErr || !inserted) {
      console.error('[send-code] db insert error:', dbErr?.message)
      return json({ success: false, reason: 'db_error' }, 500)
    }

    // ── Send SMS via sms.ru (POST, application/x-www-form-urlencoded) ─────
    const smsParams = new URLSearchParams({
      api_id: smsApiKey,
      to: phone,
      msg: `Код входа: ${code}`,
      json: '1',
    })

    let smsOk = false
    let smsDetails: unknown = null

    try {
      console.log(`[send-code] → sms.ru POST to=${phone} msg="Код входа: ${code}"`)

      const smsRes = await fetch('https://sms.ru/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: smsParams.toString(),
      })

      // Read raw text first so we log it even if JSON parse fails
      const rawText = await smsRes.text()
      console.log(`[send-code] ← sms.ru HTTP ${smsRes.status} raw: ${rawText}`)

      let smsData: any = {}
      try {
        smsData = JSON.parse(rawText)
      } catch {
        smsData = { parse_error: 'non-json response', raw: rawText }
      }

      smsDetails = smsData

      if (smsData.status === 'OK') {
        smsOk = true
        console.log(`[send-code] sms.ru OK phone=${phone} sms_ids=${JSON.stringify(smsData.sms ?? {})}`)
      } else {
        console.error(
          `[send-code] sms.ru FAILED HTTP=${smsRes.status}` +
          ` status="${smsData.status}"` +
          ` status_code=${smsData.status_code ?? 'n/a'}` +
          ` status_text="${smsData.status_text ?? 'n/a'}"` +
          ` full=${rawText}`
        )
      }
    } catch (fetchErr: any) {
      console.error('[send-code] sms.ru network exception:', fetchErr?.message ?? fetchErr)
      smsDetails = { fetch_exception: fetchErr?.message ?? String(fetchErr) }
    }

    if (!smsOk) {
      // Rollback: remove the code we just inserted so table stays clean
      const { error: delErr } = await supabase.from('phone_codes').delete().eq('id', inserted.id)
      if (delErr) {
        console.error('[send-code] rollback delete failed:', delErr.message)
      } else {
        console.log(`[send-code] rolled back code id=${inserted.id}`)
      }
      return json({ success: false, reason: 'sms_failed', error: 'sms_failed', details: smsDetails }, 500)
    }

    console.log(`[send-code] SMS sent successfully phone=${phone} code_id=${inserted.id}`)
    return json({ success: true })

  } catch (err: any) {
    console.error('[send-code] unhandled exception:', err?.message ?? err)
    return json({ success: false, reason: 'internal_error' }, 500)
  }
})
