# Deploy REAL SMS Verification System

## 🚨 CRITICAL - Remove All Test Code

### 1. Replace Files with Fixed Versions

```bash
# Backup old files
mv lib/sms.ts lib/sms-old.ts
mv pages/api/send-code.ts pages/api/send-code-old.ts
mv components/PhoneVerification.tsx components/PhoneVerification-old.tsx

# Use real SMS versions
mv lib/sms-fixed.ts lib/sms.ts
mv pages/api/send-code-fixed.ts pages/api/send-code.ts
mv components/PhoneVerificationReal.tsx components/PhoneVerification.tsx
```

### 2. Environment Configuration

Update `.env.local`:

```bash
# REMOVE SMS_TEST_MODE completely
# SMS_TEST_MODE=true  ← DELETE THIS LINE

# ADD REAL SMS API KEY
SMSRU_API_KEY=your_real_smsru_api_key_here

# Keep existing
SMS_PROVIDER=sms_ru
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Verify No Hardcoded Codes

Search and ensure these are REMOVED:
- ❌ `1234`
- ❌ `TEST_CODE`
- ❌ `mockSms`
- ❌ `fakeSend`
- ❌ `SMS_TEST_MODE`

### 4. Test Real SMS

```bash
# Restart server
npm run dev

# Run test
node test-real-sms.js
```

Expected behavior:
- ✅ SMS sent via SMS.ru
- ✅ Code NOT returned in API
- ✅ Random 4-digit codes
- ✅ Real SMS received on phone

## 📱 SMS.ru Setup

1. Register at [sms.ru](https://sms.ru)
2. Get API key
3. Add balance
4. Set `SMSRU_API_KEY` in `.env.local`

## 🔍 Verification Checklist

- [ ] No `1234` in codebase
- [ ] `SMS_TEST_MODE` removed
- [ ] Real `SMSRU_API_KEY` set
- [ ] SMS function called (check logs)
- [ ] Real SMS received
- [ ] Code verification works
- [ ] Error handling for missing API key

## 🚨 Production Deployment

```bash
# Set production env
SMSRU_API_KEY=production_api_key

# Deploy
npm run build
npm start
```

## 📊 Monitoring

Check logs for:
- `[SMS FUNCTION CALLED]`
- `[SMS SEND]` with phone last 4 digits
- `SMS ERROR:` if delivery fails

## ⚡ Quick Test

```bash
curl -X POST http://localhost:3000/api/send-code \
  -H "Content-Type: application/json" \
  -d '{"phone": "+79991234567"}'
```

Expected response:
```json
{"success":true}
```

NOT:
```json
{"success":true,"code":"1234"}
```

---

**SYSTEM READY FOR REAL SMS** 🚀
