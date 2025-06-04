# Rainbow Paws - Production Deployment Guide

This guide covers deploying the Rainbow Paws application to production using standard Next.js commands.

## 🚀 Quick Deployment

### Prerequisites
- Node.js 18+ installed
- MySQL database set up
- Environment variables configured

### Standard Next.js Deployment

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your production values
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Start the production server**:
   ```bash
   npm start
   ```

5. **Optional: Run on custom port**:
   ```bash
   npx next start -p 8080
   ```

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database (NEVER expose these to client-side)
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
DB_NAME=rainbow_paws
DB_PORT=3306

# JWT Security (CRITICAL - Generate strong secret)
JWT_SECRET=your-super-long-random-jwt-secret-at-least-32-characters
JWT_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
SMTP_FROM=no-reply@your-domain.com
DEV_EMAIL_MODE=false

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Payment (PayMongo)
PAYMONGO_SECRET_KEY=your-paymongo-secret
PAYMONGO_PUBLIC_KEY=your-paymongo-public
PAYMONGO_WEBHOOK_SECRET=your-webhook-secret

# Cron Jobs
CRON_SECRET=your-cron-secret-key
```

## 🔒 Security Checklist

### ✅ Critical Security Items (COMPLETED)
- [x] Database credentials removed from client-side
- [x] Hardcoded admin credentials removed
- [x] JWT authentication implemented
- [x] CORS configuration secured

### ⚠️ Additional Security Recommendations
- [ ] Set up HTTPS with SSL certificates
- [ ] Configure firewall rules
- [ ] Set up database with restricted access
- [ ] Enable database SSL connections
- [ ] Configure rate limiting (recommended)
- [ ] Set up monitoring and logging
- [ ] Regular security audits

## 🌐 Deployment Platforms

### Vercel (Recommended for Next.js)
```bash
npm install -g vercel
vercel
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start npm --name "rainbow-paws" -- start
pm2 startup
pm2 save
```

## 📊 Health Checks

### Application Health
- Check: `GET /api/health` (if implemented)
- Database connectivity test
- File upload directory permissions

### Performance Monitoring
- Response times
- Memory usage
- Database query performance
- Error rates

## 🔄 Maintenance

### Regular Tasks
- Database backups
- Log rotation
- Security updates
- Dependency updates

### Monitoring Commands
```bash
# Check application status
pm2 status

# View logs
pm2 logs rainbow-paws

# Restart application
pm2 restart rainbow-paws

# Update dependencies
npm audit
npm update
```

## 🆘 Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   npx next start -p 8080
   ```

2. **Database connection failed**:
   - Check DB credentials in .env.local
   - Verify database server is running
   - Check firewall rules

3. **JWT errors**:
   - Ensure JWT_SECRET is set and secure
   - Check token expiration settings

4. **File upload issues**:
   - Verify uploads directory permissions
   - Check disk space

### Logs Location
- Application logs: Check PM2 logs or console output
- Database logs: Check MySQL error logs
- Web server logs: Check Nginx/Apache logs

## 📞 Support

For deployment issues:
1. Check the ISSUES.MD file for known issues
2. Review application logs
3. Verify environment configuration
4. Test database connectivity

---

**Note**: This application now uses standard Next.js commands only. All custom build scripts have been removed for simplicity and maintainability.
