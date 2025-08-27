# Railway Environment Variables Setup

## CRITICAL: Set These Variables in Railway Dashboard

Go to your Railway project dashboard → Variables tab and set these **EXACT** variables:

### Core Application
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://rainbowpaws.up.railway.app
```

### Database Configuration
```
DB_HOST=gondola.proxy.rlwy.net
DB_PORT=31323
DB_USER=root
DB_PASSWORD=ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ
DB_NAME=railway
DATABASE_URL=mysql://root:ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ@gondola.proxy.rlwy.net:31323/railway
```

### JWT Security
```
JWT_SECRET=mxTnt6NGyQyuveMpPgDLdJYLuQ48YdxsOhuLmsPF83c=
JWT_EXPIRES_IN=7d
```

### Email Configuration (SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=rainbowpaws2025@gmail.com
SMTP_PASS=iogezckxefymoelr
SMTP_FROM=rainbowpaws2025@gmail.com
DEV_EMAIL_MODE=false
```

### Payment Configuration
```
PAYMONGO_SECRET_KEY=sk_test_CJYwkGykjkm57vg8C3cD8to8
PAYMONGO_PUBLIC_KEY=pk_test_CzR4zLDdXhtgjKGJzziM7TCo
PAYMONGO_WEBHOOK_SECRET=whsk_TQ3BwNFgxbRc74jE9R7VKGxk
```

### Security
```
CRON_SECRET=your-secure-cron-secret-key-here
```

## Steps to Set Variables:

1. **Go to Railway Dashboard**: https://railway.com/project/a9236b27-591e-4486-bead-e80eca90e264
2. **Click on your service** (the one running your app)
3. **Go to Variables tab**
4. **Add each variable** one by one using the format: `VARIABLE_NAME=value`
5. **Deploy** after adding all variables

## Important Notes:

- ⚠️ **Railway does NOT read .env.production files automatically**
- ✅ **You MUST set these in the Railway dashboard**
- 🔄 **Railway will redeploy automatically when you add variables**
- 📧 **Make sure Gmail app password is still valid**

## Test After Setup:

1. Wait for Railway to redeploy
2. Test registration: Try creating a new account
3. Test password reset: Use forgot password feature
4. Test business approval: Try approving a business application
5. Check health: Visit `/api/db-health` endpoint