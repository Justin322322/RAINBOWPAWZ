# Rainbow Paws Registration Process Setup

This document provides instructions on how to set up and fix the registration process for Rainbow Paws application.

## Overview of Changes

The following changes have been made to fix the registration process:

1. Added automatic OTP generation after successful user registration
2. Created database setup scripts to ensure OTP tables exist
3. Improved error handling in the registration process
4. Added proper integration between registration and OTP verification

## Setup Instructions

### 1. Set Up the Database

Run the database setup script to ensure all required tables are created:

```bash
node setup-db.js
```

This script will:
- Check if the database exists, create it if needed
- Import the schema from `refactored_rainbow_paws.sql` if tables don't exist
- Ensure OTP tables (`otp_codes` and `otp_attempts`) are created
- Add the `is_otp_verified` column to the users table if it doesn't exist

### 2. Check OTP Tables

You can also run a dedicated script to check and set up just the OTP-related tables:

```bash
node check-otp-tables.js
```

This script focuses specifically on the OTP functionality and ensures that:
- The `otp_codes` table exists with the correct structure
- The `otp_attempts` table exists with the correct structure
- The `users` table has the `is_otp_verified` column

### 3. Verify Environment Variables

Make sure your `.env.local` file includes the following variables:

```
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=rainbow_paws

# Email Configuration (for OTP delivery)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@rainbowpaws.com
```

## How the Registration Process Works

1. User submits registration form (personal or business account)
2. Backend validates the data and creates a new user in the database
3. An OTP is automatically generated and sent to the user's email
4. User is prompted to enter the OTP to verify their account
5. Once verified, the user can access the application

## Troubleshooting

### OTP Not Being Sent

If OTPs are not being sent after registration:

1. Check the server logs for any errors related to email sending
2. Verify that the SMTP configuration is correct
3. Make sure the OTP tables exist in the database
4. Check if the user record was created successfully

### Database Connection Issues

If you encounter database connection issues:

1. Verify that your MySQL server is running
2. Check the database credentials in your `.env.local` file
3. Run the database setup script to ensure the database exists

### Registration Fails

If registration fails:

1. Check the server logs for detailed error messages
2. Verify that all required fields are being submitted
3. Make sure the database schema is up to date

## Manual Database Verification

You can manually verify the database setup by running:

```sql
SHOW TABLES;
DESCRIBE users;
DESCRIBE otp_codes;
DESCRIBE otp_attempts;
```

The `users` table should have an `is_otp_verified` column, and both OTP tables should exist with the correct structure.

## Additional Notes

- The OTP is valid for 10 minutes after generation
- Users are limited to 3 OTP generation attempts in a 10-minute period
- Users are limited to 5 OTP verification attempts in a 10-minute period 