# Railway Deployment Guide for SMTP Fix

## 1. Set Environment Variables in Railway Dashboard

Go to your Railway project dashboard and set these variables:

### Required Environment Variables:
```
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=rainbowpaws2025@gmail.com
SMTP_PASS=iogezckxefymoelr
SMTP_FROM=rainbowpaws2025@gmail.com
DEV_EMAIL_MODE=false
NEXT_PUBLIC_APP_URL=https://rainbowpaw.vercel.app
```

### Database Variables (already set):
```
DB_HOST=gondola.proxy.rlwy.net
DB_PORT=31323
DB_USER=root
DB_PASSWORD=ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ
DB_NAME=railway
DATABASE_URL=mysql://root:ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ@gondola.proxy.rlwy.net:31323/railway
```

### Security Variables:
```
JWT_SECRET=mxTnt6NGyQyuveMpPgDLdJYLuQ48YdxsOhuLmsPF83c=
JWT_EXPIRES_IN=7d
CRON_SECRET=your-secure-cron-secret-key-here
```

## 2. Test SMTP After Deployment

After setting the environment variables and deploying:

1. Test the email endpoint: `POST /api/test-email`
2. Try registering a new account
3. Try password reset functionality

## 3. Troubleshooting

If emails still don't work:

### Option A: Try Gmail with SSL (Port 465)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
```

### Option B: Generate New Gmail App Password
1. Go to Google Account Security
2. 2-Step Verification → App passwords
3. Generate new password for "Mail"
4. Update SMTP_PASS with new password

### Option C: Alternative Email Service
Consider using SendGrid, Mailgun, or AWS SES for production.

## 4. Verification Steps

1. ✅ Environment variables set in Railway dashboard
2. ✅ Gmail app password is valid
3. ✅ NODE_ENV=production
4. ✅ DEV_EMAIL_MODE=false
5. ✅ SMTP credentials match Gmail account