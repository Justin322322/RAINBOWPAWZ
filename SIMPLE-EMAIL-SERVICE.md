# Simple Email Service for Rainbow Paws

This document provides instructions for using the new Simple Email Service in Rainbow Paws.

## Overview

The Simple Email Service is a reliable, easy-to-use email service that works across all functions in the application. It provides:

- Consistent email sending functionality
- Simulation mode for development
- Automatic extraction of OTP codes and reset tokens for testing
- Simple, clean email templates

## How to Use

### Basic Email Sending

```javascript
const { sendEmail } = require('@/lib/simpleEmailService');

const result = await sendEmail({
  to: 'recipient@example.com',
  subject: 'Email Subject',
  html: '<h1>Email Content</h1><p>This is the email content.</p>'
});

if (result.success) {
  console.log('Email sent successfully. Message ID:', result.messageId);
} else {
  console.error('Failed to send email:', result.error);
}
```

### Specialized Email Functions

The service provides specialized functions for common email types:

#### Welcome Email

```javascript
const { sendWelcomeEmail } = require('@/lib/simpleEmailService');

const result = await sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  'personal' // or 'business'
);
```

#### Password Reset Email

```javascript
const { sendPasswordResetEmail } = require('@/lib/simpleEmailService');

const result = await sendPasswordResetEmail(
  'user@example.com',
  'reset-token-123'
);
```

#### OTP Verification Email

```javascript
const { sendOtpEmail } = require('@/lib/simpleEmailService');

const result = await sendOtpEmail(
  'user@example.com',
  '123456' // 6-digit OTP code
);
```

#### Booking Confirmation Email

```javascript
const { sendBookingConfirmationEmail } = require('@/lib/simpleEmailService');

const result = await sendBookingConfirmationEmail(
  'user@example.com',
  {
    customerName: 'John Doe',
    serviceName: 'Basic Cremation',
    providerName: 'Rainbow Paws Provider',
    bookingDate: 'January 1, 2023',
    bookingTime: '10:00 AM',
    petName: 'Max',
    bookingId: 'BOOK-123'
  }
);
```

#### Business Verification Email

```javascript
const { sendBusinessVerificationEmail } = require('@/lib/simpleEmailService');

const result = await sendBusinessVerificationEmail(
  'business@example.com',
  {
    businessName: 'Pet Services Inc.',
    contactName: 'Jane Smith',
    status: 'approved', // or 'rejected', 'documents_required'
    notes: 'Your business has been approved.' // optional
  }
);
```

## Configuration

The email service uses the following environment variables:

- `SMTP_HOST`: SMTP server hostname (default: smtp.gmail.com)
- `SMTP_PORT`: SMTP server port (default: 587)
- `SMTP_USER`: SMTP username/email
- `SMTP_PASS`: SMTP password or app password
- `SMTP_SECURE`: Whether to use TLS (default: false)
- `SIMULATE_EMAIL_SUCCESS`: Set to 'true' to simulate email sending without actually sending emails

## Development Mode

In development mode (`NODE_ENV=development`), the service provides additional features:

1. When `SIMULATE_EMAIL_SUCCESS=true`:
   - Emails are not actually sent
   - Success is always returned
   - OTP codes and reset tokens are logged to the console
   - Email content is logged to the console

2. Error handling:
   - Even if errors occur, success is returned in development mode
   - Detailed error information is logged to the console

## Testing

You can test the email service using the provided test script:

```bash
node test-simple-email.js [test-type] [recipient-email]
```

Where `test-type` can be:
- `all`: Test all email types (default)
- `basic`: Test basic email sending
- `welcome`: Test welcome email
- `password`: Test password reset email
- `otp`: Test OTP verification email
- `booking`: Test booking confirmation email
- `business`: Test business verification email

If no recipient email is provided, it will use the `SMTP_USER` from your `.env.local` file.

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
   - Look for OTP codes and reset tokens in the console logs

### Gmail App Password Setup

If you're using Gmail, you need to create an app password:

1. Go to your Google Account settings
2. Enable 2-Step Verification if not already enabled
3. Go to "App passwords" (https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Other (Custom name)"
5. Enter "Rainbow Paws" and click "Generate"
6. Copy the generated password and use it as your `SMTP_PASS` in `.env.local`

## Support

If you continue to experience issues with the email service, please check:
1. Your SMTP credentials
2. Your network configuration
3. The server logs for detailed error messages
