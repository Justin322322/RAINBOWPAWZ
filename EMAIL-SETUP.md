# Email Service Setup and Troubleshooting

This document provides instructions for setting up and troubleshooting the email service in Rainbow Paws.

## Quick Fix

If you're experiencing issues with email functionality, run the following script to automatically fix common problems:

```bash
node fix-email-service.js
```

This script will:
1. Check your environment variables
2. Enable simulation mode for development
3. Create necessary database tables
4. Provide testing instructions

## Manual Setup

### 1. Environment Variables

Create or update your `.env.local` file with the following email-related settings:

```
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Simulation for Development
SIMULATE_EMAIL_SUCCESS=true
```

### 2. Gmail App Password Setup

If you're using Gmail, you need to create an app password:

1. Go to your Google Account settings
2. Enable 2-Step Verification if not already enabled
3. Go to "App passwords" (https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Other (Custom name)"
5. Enter "Rainbow Paws" and click "Generate"
6. Copy the generated password and use it as your `SMTP_PASS` in `.env.local`

### 3. Database Tables

The email service requires two database tables:

- `email_queue`: For storing emails to be sent later
- `email_log`: For tracking sent emails

These tables will be created automatically when needed, but you can also create them manually:

```sql
CREATE TABLE IF NOT EXISTS email_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html TEXT NOT NULL,
  text TEXT,
  from_email VARCHAR(255),
  cc VARCHAR(255),
  bcc VARCHAR(255),
  attachments TEXT,
  status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  INDEX (status, attempts, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message_id VARCHAR(255),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (recipient),
  INDEX (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Development Mode

In development mode, you can use the following environment variables to control email behavior:

- `SIMULATE_EMAIL_SUCCESS=true`: Simulates successful email sending without actually sending emails
- `DISABLE_EMAILS=true`: Disables email sending completely
- `ALWAYS_SUCCEED_EMAILS=true`: Always returns success even if email sending fails

When `SIMULATE_EMAIL_SUCCESS=true` is set, the system will:
- Log OTP codes to the console for testing
- Log password reset tokens to the console for testing
- Return success responses for all email operations

## Testing Email Functionality

You can test your email configuration with:

```bash
node test-email-service.js [recipient-email]
```

If no recipient is provided, it will use the `SMTP_USER` from your `.env.local` file.

## Troubleshooting

### Common Issues

1. **"Email service not properly configured"**
   - Check that `SMTP_USER` and `SMTP_PASS` are set correctly in `.env.local`
   - For Gmail, make sure you're using an app password, not your regular password

2. **"Authentication failed"**
   - For Gmail, make sure 2-Step Verification is enabled
   - Make sure you're using an app password, not your regular password
   - Check that your email and password are correct

3. **"Connection refused"**
   - Check that `SMTP_HOST` and `SMTP_PORT` are correct
   - Make sure your network allows outgoing connections on the specified port

4. **Emails not being sent in development**
   - Check if `SIMULATE_EMAIL_SUCCESS=true` is set
   - Check if `DISABLE_EMAILS=true` is set
   - Look for OTP codes and reset tokens in the console logs

### Checking Logs

Email sending attempts are logged to:
- The console (check your terminal output)
- The `email_log` table in the database

### Email Queue

If emails fail to send immediately, they are queued for later delivery. You can process the queue manually by visiting:

```
/api/email/queue/process
```

Or by making a GET request to that endpoint.

## Email Templates

Email templates are defined in `src/lib/emailTemplates.ts`. The following templates are available:

- Welcome email: `createWelcomeEmail(firstName, accountType)`
- Password reset: `createPasswordResetEmail(resetToken)`
- OTP verification: `createOTPEmail(otp)`
- Booking confirmation: `createBookingConfirmationEmail(bookingDetails)`
- Booking status update: `createBookingStatusUpdateEmail(bookingDetails)`
- Business verification: `createBusinessVerificationEmail(businessDetails)`

## Support

If you continue to experience issues with the email service, please check:
1. Your SMTP credentials
2. Your network configuration
3. The server logs for detailed error messages
