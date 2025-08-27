Write-Host "Setting Railway Environment Variables..." -ForegroundColor Green
Write-Host ""

# Set all variables in one command to avoid multiple deployments
railway variables `
  --set "NODE_ENV=production" `
  --set "NEXT_PUBLIC_APP_URL=https://rainbowpaws.up.railway.app" `
  --set "DB_HOST=gondola.proxy.rlwy.net" `
  --set "DB_PORT=31323" `
  --set "DB_USER=root" `
  --set "DB_PASSWORD=ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ" `
  --set "DB_NAME=railway" `
  --set "DATABASE_URL=mysql://root:ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ@gondola.proxy.rlwy.net:31323/railway" `
  --set "JWT_SECRET=mxTnt6NGyQyuveMpPgDLdJYLuQ48YdxsOhuLmsPF83c=" `
  --set "JWT_EXPIRES_IN=7d" `
  --set "SMTP_HOST=smtp.gmail.com" `
  --set "SMTP_PORT=587" `
  --set "SMTP_SECURE=false" `
  --set "SMTP_USER=rainbowpaws2025@gmail.com" `
  --set "SMTP_PASS=iogezckxefymoelr" `
  --set "SMTP_FROM=rainbowpaws2025@gmail.com" `
  --set "DEV_EMAIL_MODE=false" `
  --set "PAYMONGO_SECRET_KEY=sk_test_CJYwkGykjkm57vg8C3cD8to8" `
  --set "PAYMONGO_PUBLIC_KEY=pk_test_CzR4zLDdXhtgjKGJzziM7TCo" `
  --set "PAYMONGO_WEBHOOK_SECRET=whsk_TQ3BwNFgxbRc74jE9R7VKGxk" `
  --set "CRON_SECRET=your-secure-cron-secret-key-here"

Write-Host ""
Write-Host "✅ All environment variables have been set!" -ForegroundColor Green
Write-Host "🚀 Railway will automatically redeploy your application." -ForegroundColor Yellow
Write-Host ""
Write-Host "Test your app at: https://rainbowpaws.up.railway.app" -ForegroundColor Cyan
Write-Host ""