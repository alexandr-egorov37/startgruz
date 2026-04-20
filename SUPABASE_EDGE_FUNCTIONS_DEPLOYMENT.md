# Supabase Edge Functions Deployment Guide

## Overview
This guide explains how to deploy SMS authorization Edge Functions for the static frontend on Cloudflare Pages.

## Architecture
- **Frontend**: Cloudflare Pages (static export)
- **Backend**: Supabase Edge Functions
- **SMS Provider**: sms.ru

## Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Supabase project created
- SMS.ru API key

## Step 1: Add Environment Variables to Supabase

Go to your Supabase Dashboard:
1. Navigate to: Settings → Edge Functions
2. Add the following environment variable:
   - `SMS_API_KEY`: Your sms.ru API key (e.g., `9DFBBD46-1BDD-0A6F-02B8-8B6E9BDDF865`)

## Step 2: Deploy Edge Functions

From the project root:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all Edge Functions
supabase functions deploy

# Or deploy specific functions:
supabase functions deploy send-code
supabase functions deploy verify-code
```

## Step 3: Verify Deployment

Check that the functions are deployed:
- Go to Supabase Dashboard → Edge Functions
- You should see `send-code` and `verify-code` functions listed

## Step 4: Test the Functions

### Test send-code:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-code' \
  -H 'Content-Type: application/json' \
  -d '{"phone": "+79001234567"}'
```

Expected response:
```json
{
  "success": true,
  "code": "1234"
}
```

### Test verify-code:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/verify-code' \
  -H 'Content-Type: application/json' \
  -d '{"phone": "+79001234567", "code": "1234"}'
```

## Edge Function Details

### send-code
- **Endpoint**: `/functions/v1/send-code`
- **Method**: POST
- **Body**: `{ "phone": "string" }`
- **Response**: `{ "success": true, "code": "1234" }`

### verify-code
- **Endpoint**: `/functions/v1/verify-code`
- **Method**: POST
- **Body**: `{ "phone": "string", "code": "string" }`
- **Response**: `{ "success": true, "message": "Phone number verified successfully" }`

## Frontend Configuration

The frontend is already configured to use the Edge Functions. The URL is constructed from:
- `process.env.NEXT_PUBLIC_SUPABASE_URL` or fallback to `https://phqkzwdlzyumlsdlodor.supabase.co`

## Important Notes

1. **Remove code in production**: The `send-code` function currently returns the code in the response for testing. Remove the `code` field from the response in production.

2. **Rate limiting**: Consider adding rate limiting to the Edge Functions to prevent abuse.

3. **Security**: Ensure SMS_API_KEY is kept secret in Supabase environment variables.

4. **Database**: The `verify-code` function expects a `phone_verifications` table in Supabase. Make sure it exists with the following schema:
   - `phone` (text)
   - `code_hash` (text)
   - `expires_at` (timestamp)
   - `attempts` (integer)

## Troubleshooting

### Function not found
- Ensure the Edge Functions are deployed
- Check the project reference is correct

### SMS not sending
- Verify SMS_API_KEY is set in Supabase
- Check sms.ru API is working
- Check Edge Function logs in Supabase Dashboard

### CORS errors
- The Edge Functions include CORS headers
- Ensure the frontend URL is allowed (currently set to `*` for all origins)
