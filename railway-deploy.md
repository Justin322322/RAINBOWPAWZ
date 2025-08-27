# Railway Deployment Guide for RainbowPaws

## Environment Variables Required

### Database Configuration (CRITICAL)
```
DATABASE_URL=mysql://root:ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ@gondola.proxy.rlwy.net:31323/railway
DB_HOST=gondola.proxy.rlwy.net
DB_PORT=31323
DB_USER=root
DB_PASSWORD=ieGxToeQbsLLVrrkwaYfpOjSAZEvBGaQ
DB_NAME=railway
```

### Email Configuration (Required for Password Reset)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### App URL Configuration (CRITICAL for Reset Links)
```
NEXT_PUBLIC_APP_URL=https://rainbowpaws.up.railway.app
RAILWAY_STATIC_URL=https://rainbowpaws.up.railway.app
```

### Security Variables
```
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRES_IN=7d
NODE_ENV=production
```

## Important Notes

### Database Connection
- **ALWAYS use DATABASE_URL** - Railway automatically sets this
- **NEVER use localhost** - This will cause connection failures
- The app will automatically detect Railway MySQL and use proper SSL settings

### Port Configuration
- **DO NOT set PORT manually** - Railway sets this automatically
- The app detects Railway's PORT environment variable
- Default fallback is 3000 (not 3001)

### File Uploads
- Profile picture uploads now work correctly on Railway
- Uses local filesystem (Railway supports this for temporary storage)
- No Cloudinary required for basic functionality

## Password Reset Issues and Solutions

### 1. Email Not Sending
- **Problem**: SMTP credentials not configured
- **Solution**: Set all SMTP environment variables in Railway dashboard
- **Check**: Verify SMTP_USER and SMTP_PASS are set correctly

### 2. Reset Links Not Working
- **Problem**: App URL not configured for Railway
- **Solution**: Set NEXT_PUBLIC_APP_URL to your Railway app URL
- **Alternative**: Set RAILWAY_STATIC_URL for server-side URL generation

### 3. Database Table Missing
- **Problem**: password_reset_tokens table doesn't exist
- **Solution**: The app will auto-create this table on first password reset request
- **Check**: Verify database connection is working

### 4. Token Expiration
- **Problem**: Reset tokens expire after 1 hour
- **Solution**: This is by design for security
- **Note**: Users must request new reset links if expired

## Testing Password Reset

1. **Request Reset**: Use forgot password form with valid email
2. **Check Logs**: Monitor Railway logs for email sending attempts
3. **Verify Email**: Check if reset email is received
4. **Test Reset**: Click reset link and set new password

## Common Railway Issues

### Port Configuration
- Railway automatically sets PORT environment variable
- App detects this automatically
- No manual port configuration needed

### Database Connection
- Use DATABASE_URL for Prisma/ORM connections
- Use individual DB_* variables for direct connections
- Connection pooling is handled automatically

### Email Service
- Gmail requires app-specific passwords
- Enable 2FA on Gmail account
- Generate app password for SMTP_PASS

## Monitoring and Debugging

### Check Logs
```bash
# View Railway logs
railway logs

# Filter for password reset
railway logs | grep "password reset"
```

### Health Check
- App includes `/api/health` endpoint
- Railway uses this for health monitoring
- Verify database connectivity

### Database Verification
```sql
-- Check if password_reset_tokens table exists
SHOW TABLES LIKE 'password_reset_tokens';

-- Check table structure
DESCRIBE password_reset_tokens;
```

## Deployment Checklist

- [ ] All environment variables set in Railway
- [ ] Database connection working (check logs)
- [ ] Email service configured
- [ ] App URL set correctly
- [ ] Health check endpoint responding
- [ ] Password reset flow tested
- [ ] Error logging enabled
- [ ] Database tables created
- [ ] Profile picture uploads working

## Support

If password reset continues to fail:
1. Check Railway logs for specific errors
2. Verify all environment variables are set
3. Test database connection manually
4. Verify email service credentials
5. Check app URL configuration
6. Ensure NODE_ENV=production is set