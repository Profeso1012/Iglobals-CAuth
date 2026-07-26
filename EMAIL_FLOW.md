# Email Delivery Flow

## Architecture: Brevo API Primary + SMTP Fallback

```
┌─────────────────────────────────────────────────────────────┐
│                   Email Request                              │
│  (Password Reset, Email Verification, etc.)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Check BREVO_API_KEY   │
              │        exists?          │
              └─────────┬───────────────┘
                        │
           ┌────────────┴────────────┐
           │ YES                     │ NO
           ▼                         ▼
┌──────────────────────┐   ┌─────────────────────┐
│  Try Brevo API       │   │  Skip to SMTP       │
│  POST /v3/smtp/email │   └──────────┬──────────┘
└──────────┬───────────┘              │
           │                          │
     ┌─────┴─────┐                    │
     │ Success?  │                    │
     └─────┬─────┘                    │
           │                          │
    ┌──────┴──────┐                   │
    │ YES         │ NO                │
    ▼             ▼                   │
┌────────┐   ┌─────────┐             │
│ DONE ✓ │   │ Log API │             │
│        │   │ Error   │             │
└────────┘   └────┬────┘             │
                  │                  │
                  └──────────┬───────┘
                             │
                             ▼
              ┌──────────────────────────┐
              │ Check SMTP credentials   │
              │ (SMTP_USER, SMTP_PASS)   │
              └──────────┬───────────────┘
                         │
            ┌────────────┴────────────┐
            │ YES                     │ NO
            ▼                         ▼
┌───────────────────────┐   ┌─────────────────────┐
│  Try SMTP             │   │  ALL METHODS FAILED │
│  (Nodemailer)         │   │  Log Error          │
│  10s timeout          │   │  Return false*      │
└──────────┬────────────┘   └─────────────────────┘
           │
     ┌─────┴─────┐
     │ Success?  │
     └─────┬─────┘
           │
    ┌──────┴──────┐
    │ YES         │ NO
    ▼             ▼
┌────────┐   ┌────────────┐
│ DONE ✓ │   │ Log SMTP   │
│        │   │ Error      │
└────────┘   │ Return false│
             └────────────┘

* In development mode, returns true to not break app
```

## Configuration Examples

### Option 1: API Only (Recommended)
```env
BREVO_API_KEY=xkeysib-abc123...
```
- ✅ Fastest
- ✅ No SMTP authentication needed
- ⚠️ Single point of failure

### Option 2: API + SMTP Fallback (Best)
```env
BREVO_API_KEY=xkeysib-abc123...
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-key
SMTP_FROM=noreply@yourdomain.com
```
- ✅ Maximum reliability
- ✅ Automatic fallback
- ✅ Same pattern as Varanda app

### Option 3: SMTP Only
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-key
SMTP_FROM=noreply@yourdomain.com
```
- ✅ Works without API key
- ⚠️ Slower than API
- ⚠️ Requires SMTP authentication

## Email Templates

All emails use clean, simple HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;...">
    <!-- Blue header with "iGlobals Auth" -->
    <div style="background:#2563eb;padding:24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;">iGlobals Auth</h1>
    </div>
    
    <!-- Content area -->
    <div style="padding:32px;color:#333333;line-height:1.6;">
      <!-- Email-specific content here -->
    </div>
    
    <!-- Footer -->
    <div style="background:#f5f5f5;padding:16px;text-align:center;...">
      <p>© 2024 iGlobals Auth. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

### Email Types

1. **Email Verification** - `sendEmailVerificationOTP()`
   - Random 6-digit OTP
   - Blue border box with large OTP display
   - 10 minute expiry notice

2. **Password Reset** - `sendPasswordResetOTP()`
   - Random 6-digit OTP
   - Blue button link to reset page
   - Token-based URL: `/reset-password?token=xxx`
   - 10 minute expiry (1 hour for link)

## Benefits of This Approach

1. **Resilience**: If API rate limit hit, SMTP takes over
2. **Speed**: API is faster than SMTP (no authentication handshake)
3. **Flexibility**: Works with or without API key
4. **Proven**: Same pattern used in your Varanda production app
5. **Free Tier Friendly**: 300 emails/day on Brevo free tier

## Brevo Free Tier Limits

- **API**: 300 emails/day
- **SMTP**: 300 emails/day
- **Combined**: You get 300 total (not 600)
- **Good for**: Development, staging, small production apps
- **Upgrade**: When you need more volume

## Testing

### Development Mode
```typescript
NODE_ENV=development  // Logs to console, doesn't send
```

### Production Mode
```typescript
NODE_ENV=production   // Actually sends emails via Brevo
```

### Test Commands
```bash
# Test email verification
curl -X POST http://localhost:3000/api/auth/send-email-verification \
  -H "Content-Type: application/json" \
  -H "Cookie: ica_session=your-session-cookie"

# Test forgot password
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

## Troubleshooting

### "ALL SEND METHODS FAILED"
- Check `BREVO_API_KEY` is set correctly
- Check `SMTP_USER` and `SMTP_PASS` are set
- Verify Brevo account is active
- Check console for specific error messages

### API returns 400/401
- Invalid API key
- Check key at: https://app.brevo.com/settings/keys/api
- Make sure key starts with `xkeysib-`

### SMTP fails after API
- Check SMTP credentials match Brevo account
- Verify SMTP is enabled in Brevo settings
- Try telnet test: `telnet smtp-relay.brevo.com 587`

### Emails not received
- Check spam folder
- Verify sender email is verified in Brevo
- Check Brevo dashboard for delivery logs
- Look at server console for error messages
