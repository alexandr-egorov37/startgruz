-- Phone codes table for SMS verification
CREATE TABLE IF NOT EXISTS phone_codes (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 minutes'
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_phone_codes_phone ON phone_codes(phone);
CREATE INDEX IF NOT EXISTS idx_phone_codes_created_at ON phone_codes(created_at);

-- Clean up expired codes (optional, can be done via scheduled job)
-- DELETE FROM phone_codes WHERE expires_at < NOW();
