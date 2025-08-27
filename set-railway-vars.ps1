Write-Host "Setting Railway Environment Variables..." -ForegroundColor Green
Write-Host ""

# Core Application
railway variables set NODE_ENV=production
railway variables set NEXT_PUBLIC_APP_URL=https://rainbowpaws.up.railway.app

# Database Configuration
railway variables set DB_HOST=gondola.proxy.rlwy.net
railway variables set DB_PORT=31323
railway variables set DB_USER=root
railway variables set "DB_PASSWORD=ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ"
railway variables set DB_NAME=railway
railway variables set "DATABASE_URL=mysql://root:ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ@gondola.proxy.rlwy.net:31323/railway"

# JWT Security
railway variables set "JWT_SECRET=mxTnt6NGyQyuveMpPgDLdJYLuQ48YdxsOhuLmsPF83c="
railway variables set JWT_EXPIRES_IN=7d

# Email Configuration
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_SECURE=false
railway variables set SMTP_USER=rainbowpaws2025@gmail.com
railway variables set SMTP_PASS=iogezckxefymoelr
railway variables set SMTP_FROM=rainbowpaws2025@gmail.com
railway variables set DEV_EMAIL_MODE=false

# Payment Configuration
railway variables set PAYMONGO_SECRET_KEY=sk_test_CJYwkGykjkm57vg8C3cD8to8
railway variables set PAYMONGO_PUBLIC_KEY=pk_test_CzR4zLDdXhtgjKGJzziM7TCo
railway variables set PAYMONGO_WEBHOOK_SECRET=whsk_TQ3BwNFgxbRc74jE9R7VKGxk

# Security
railway variables set CRON_SECRET=your-secure-cron-secret-key-here

Write-Host ""
Write-Host "✅ All environment variables have been set!" -ForegroundColor Green
Write-Host "🚀 Railway will automatically redeploy your application." -ForegroundColor Yellow
Write-Host ""
Write-Host "Test your app at: https://rainbowpaws.up.railway.app" -ForegroundColor Cyan
Write-Host ""