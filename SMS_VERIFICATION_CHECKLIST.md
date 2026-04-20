# SMS Verification System - Deployment Checklist

## ✅ Pre-deployment

### 1. Database Setup
- [ ] Run `migrations/phone_verification.sql` in Supabase SQL Editor
- [ ] Verify tables created: `phone_verifications`
- [ ] Verify indexes created: `idx_phone_created`
- [ ] Verify functions: `cleanup_expired_verifications`, `check_rate_limit`

### 2. Environment Variables
- [ ] Copy `.env.example` to `.env.local`
- [ ] Set `SMS_PROVIDER` (smsru or twilio)
- [ ] Add SMS provider API keys
- [ ] Verify Supabase keys are present

### 3. Dependencies
- [ ] Install crypto (built-in Node.js)
- [ ] Verify framer-motion is installed (for animations)
- [ ] Verify lucide-react is installed (for icons)

## ✅ Testing

### 4. API Endpoints
- [ ] Test `POST /api/send-code` with valid phone
- [ ] Test rate limiting (2nd request within 60s)
- [ ] Test invalid phone format
- [ ] Test missing parameters
- [ ] Test `POST /api/verify-code` with correct code
- [ ] Test wrong code
- [ ] Test expired code
- [ ] Test brute force (5 attempts)

### 5. Frontend
- [ ] Phone input formatting works
- [ ] Code input auto-focus works
- [ ] Timer countdown works
- [ ] Shake animation on error
- [ ] Success state displays
- [ ] Resend code button respects timer

### 6. SMS Provider
- [ ] SMS.ru API key is valid
- [ ] Test SMS delivery to real phone
- [ ] Verify SMS content format
- [ ] Check delivery logs

## ✅ Security

### 7. Protection Checks
- [ ] Codes are SHA256 hashed in DB
- [ ] Rate limiting enforced (60s)
- [ ] Max attempts enforced (5)
- [ ] Code expiration enforced (5 min)
- [ ] SQL injection protection
- [ ] Input validation on all fields

### 8. Cleanup
- [ ] Set up cron job for `/api/cleanup-verifications`
- [ ] Configure `CRON_SECRET` environment variable
- [ ] Test cleanup endpoint manually

## ✅ Production

### 9. Monitoring
- [ ] Add logging for SMS delivery failures
- [ ] Monitor verification success rates
- [ ] Set up alerts for API errors

### 10. Performance
- [ ] Verify database queries are optimized
- [ ] Check API response times
- [ ] Load test with multiple concurrent requests

## 🚀 Deployment Commands

```bash
# 1. Run database migration
supabase db push migrations/phone_verification.sql

# 2. Set environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# 3. Test locally
npm run dev
node test-sms-verification.js

# 4. Deploy to production
npm run build
npm start
```

## 📱 Example Usage

```tsx
import PhoneVerification from './components/PhoneVerificationNew';

function MyComponent() {
  const [showVerification, setShowVerification] = useState(false);
  
  const handleVerified = (phone: string) => {
    console.log('Phone verified:', phone);
    setShowVerification(false);
  };
  
  return (
    <>
      <button onClick={() => setShowVerification(true)}>
        Verify Phone
      </button>
      
      {showVerification && (
        <PhoneVerification
          onVerified={handleVerified}
          onCancel={() => setShowVerification(false)}
        />
      )}
    </>
  );
}
```

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| SMS not sending | Check API key, provider balance, phone format |
| Rate limit too strict | Adjust `RATE_LIMIT_SECONDS` in lib/sms.ts |
| Codes not matching | Verify SHA256 hashing on both ends |
| Database errors | Check table creation, permissions |
| Frontend errors | Verify framer-motion, lucide-react installed |

## 📊 Metrics to Monitor

- Verification success rate
- SMS delivery rate
- API response times
- Rate limit hits
- Failed attempts per IP
- Database size (phone_verifications table)
