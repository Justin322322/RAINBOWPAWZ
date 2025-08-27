# Email Setup Guide for Rainbow Paws

## Step 1: Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Gmail account if not already enabled
2. Go to [Google Account Security](https://myaccount.google.com/security)
3. Click "2-Step Verification"
4. Scroll down to "App passwords"
5. Click "Generate app password"
6. Select "Mail" as the app
7. Copy the generated 16-character password (no spaces)

## Step 2: Update Environment Variables

Replace these values in your Railway dashboard:

```
SMTP_USER=your-actual-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=your-actual-email@gmail.com
```

## Step 3: Test Configuration

After updating Railway environment variables:

1. Deploy your changes
2. Test with: `POST /api/test-email`
3. Try registering a new account
4. Try password reset

## Common Issues & Solutions

### Issue: "Invalid login" error
- **Solution**: Generate a new Gmail app password
- Make sure 2FA is enabled on your Gmail account

### Issue: "Connection timeout" 
- **Solution**: Try the SSL configuration (port 465):
```
SMTP_PORT=465
SMTP_SECURE=true
```

### Issue: Emails go to spam
- **Solution**: 
  - Use your actual domain email if available
  - Add SPF/DKIM records to your domain
  - Or use a dedicated email service like SendGrid

## Alternative: SendGrid Setup (Recommended for Production)

If Gmail continues to have issues:

1. Sign up for [SendGrid](https://sendgrid.com/) (free tier: 100 emails/day)
2. Get your API key
3. Update environment variables:
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=your-verified-sender@yourdomain.com
```