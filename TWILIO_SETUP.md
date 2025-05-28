# Twilio SMS Integration Setup

This document explains how to set up Twilio SMS notifications for the Rainbow Paws application.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
```

## Getting Twilio Credentials

1. **Sign up for Twilio**: Go to [https://www.twilio.com/](https://www.twilio.com/) and create an account
2. **Get Account SID and Auth Token**:
   - Go to your Twilio Console Dashboard
   - Find your Account SID and Auth Token in the "Account Info" section
3. **Get a Phone Number**:
   - In the Twilio Console, go to Phone Numbers > Manage > Buy a number
   - Purchase a phone number that supports SMS
   - Use this number as your `TWILIO_PHONE_NUMBER`

## Configuration Example

```env
# Example configuration (replace with your actual credentials)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Your Account SID (starts with AC)
TWILIO_AUTH_TOKEN=your_auth_token_here                  # Your Auth Token
TWILIO_PHONE_NUMBER=+1234567890                        # Your purchased Twilio phone number
```

**Note**: Make sure to use your actual Twilio credentials:
- Account SID (starts with AC)
- Auth Token (keep this secret!)
- A purchased Twilio phone number

## Features

The SMS integration includes:

1. **Booking Status Notifications**: Users receive SMS when booking status changes
   - Booking Confirmed
   - Service In Progress
   - Service Completed
   - Booking Cancelled

2. **User Preferences**: Users can enable/disable SMS notifications in their settings

3. **Philippine Phone Number Formatting**: Automatic formatting for Philippine mobile numbers
   - Accepts formats: `09123456789`, `9123456789`, `639123456789`, `+639123456789`
   - Automatically removes leading 0 and adds +63 country code
   - Validates 10-digit mobile numbers starting with 9

4. **Error Handling**: Graceful handling of SMS failures without affecting other notifications

## Testing

### Admin SMS Test Endpoint

Admins can test SMS functionality using:
- `GET /api/sms/test` - Check SMS configuration status
- `POST /api/sms/test` - Send test SMS (requires phone number in request body)

### Manual Testing

1. Ensure environment variables are set
2. User must have a Philippine mobile number in their profile (format: 09XXXXXXXXX or 9XXXXXXXXX)
3. User must have SMS notifications enabled in settings
4. Create a booking and change its status to trigger SMS

### Trial Account Limitations

If you're using a Twilio trial account, be aware of these limitations:

**Verified Numbers Only**: Trial accounts can only send SMS to verified phone numbers.
- Verify numbers at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
- Add the phone number you want to test
- Twilio will send a verification code to that number
- Enter the code to verify the number

**Daily Limits**: Trial accounts have daily SMS sending limits.

**Error Code 21608**: If you see this error, it means you're trying to send to an unverified number on a trial account.

**Upgrade Options**: To send SMS to any number without verification:
- Upgrade to a paid Twilio account
- Add billing information to your Twilio console
- This removes the verified number restriction

### Phone Number Format Examples

Valid Philippine mobile number formats:
- `09123456789` (with leading 0)
- `9123456789` (without leading 0)
- `639123456789` (with country code)
- `+639123456789` (international format)

All formats will be converted to: `+639123456789`

## User Settings

Users can control SMS notifications through:
- Settings page: `/user/furparent_dashboard/settings`
- SMS notifications toggle (already implemented)

## Database

The system uses existing database structure:
- `users.phone` - stores user phone numbers
- `users.sms_notifications` - stores SMS preference (boolean)

## Error Handling

The SMS service includes comprehensive error handling:
- Missing Twilio credentials (logs warning, continues without SMS)
- Invalid phone numbers (logs error, skips SMS)
- Twilio API errors (logs error, continues with other notifications)
- User preferences (respects SMS notification settings)

## Security Notes

1. **Environment Variables**: Keep Twilio credentials secure and never commit them to version control
2. **Phone Number Validation**: Basic validation is implemented, but consider additional validation for production
3. **Rate Limiting**: Consider implementing rate limiting for SMS to prevent abuse
4. **Logging**: SMS sending is logged for debugging, but phone numbers are partially masked in logs

## Troubleshooting

### Common Issues

1. **SMS not sending**: Check Twilio credentials and phone number format
2. **Invalid phone number**: Ensure phone numbers are valid Philippine mobile numbers (10 digits starting with 9)
3. **User not receiving SMS**: Check user's SMS notification preferences
4. **Twilio errors**: Check Twilio console for account status and balance
5. **Error 21608 - Unverified number**: You're using a trial account and the number isn't verified
   - Solution: Verify the number at Twilio console or upgrade to paid account
6. **Error 21614 - Invalid phone number**: The phone number format is incorrect
   - Solution: Use valid Philippine mobile number format (9XXXXXXXXX)
7. **Error 20003 - Authentication failed**: Invalid Twilio credentials
   - Solution: Check your Account SID and Auth Token

### Debug Steps

1. Check environment variables are loaded
2. Use the admin test endpoint to verify configuration
3. Check application logs for SMS-related errors
4. Verify user has phone number and SMS notifications enabled
5. Check Twilio console for message delivery status
