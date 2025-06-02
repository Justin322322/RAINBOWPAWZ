import twilio from 'twilio';

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
let twilioClient: twilio.Twilio | null = null;

function getTwilioClient(): twilio.Twilio | null {
  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured. SMS notifications will be disabled.');
    return null;
  }

  if (!twilioClient) {
    try {
      twilioClient = twilio(accountSid, authToken);
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error);
      return null;
    }
  }

  return twilioClient;
}

interface SendSMSParams {
  to: string;
  message: string;
}

interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: number;
}

/**
 * Send SMS notification using Twilio
 */
export async function sendSMS({ to, message }: SendSMSParams): Promise<SendSMSResult> {
  try {
    const client = getTwilioClient();

    if (!client) {
      return {
        success: false,
        error: 'Twilio client not available'
      };
    }

    if (!fromNumber) {
      return {
        success: false,
        error: 'Twilio phone number not configured'
      };
    }

    // Validate phone number format (basic validation)
    if (!to || !to.match(/^\+?[\d\s\-\(\)]+$/)) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    // Format Philippine phone number
    let formattedPhone: string;
    try {
      formattedPhone = formatPhilippinePhoneNumber(to.trim());
    } catch (formatError) {
      return {
        success: false,
        error: formatError instanceof Error ? formatError.message : 'Invalid phone number format'
      };
    }

    // Send SMS
    const messageResponse = await client.messages.create({
      body: message,
      from: fromNumber,
      to: formattedPhone
    });

    console.log(`SMS sent successfully to ${formattedPhone}, SID: ${messageResponse.sid}`);

    return {
      success: true,
      messageId: messageResponse.sid
    };

  } catch (error: any) {
    console.error('Error sending SMS:', error);

    // Handle specific Twilio errors
    let errorMessage = 'Unknown error occurred';

    if (error.code === 21608) {
      // Unverified number on trial account
      errorMessage = `Trial Account Limitation: The number ${to} is unverified. ` +
        `Trial accounts can only send SMS to verified numbers. ` +
        `Please verify this number at twilio.com/console/phone-numbers/verified or upgrade to a paid account.`;
    } else if (error.code === 21614) {
      // Invalid phone number
      errorMessage = `Invalid phone number: ${to}. Please check the number format.`;
    } else if (error.code === 21211) {
      // Invalid 'To' phone number
      errorMessage = `Invalid destination number: ${to}. Please use a valid Philippine mobile number.`;
    } else if (error.code === 20003) {
      // Authentication error
      errorMessage = 'Twilio authentication failed. Please check your Account SID and Auth Token.';
    } else if (error.code === 20404) {
      // Invalid from number
      errorMessage = 'Invalid Twilio phone number. Please check your TWILIO_PHONE_NUMBER configuration.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
      code: error.code
    };
  }
}

/**
 * Format Philippine phone number to international format
 * Handles various input formats and converts to +63XXXXXXXXXX
 */
function formatPhilippinePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleanNumber = phoneNumber.replace(/\D/g, '');

  // Handle different input formats
  if (cleanNumber.startsWith('63')) {
    // Already has country code 63
    cleanNumber = cleanNumber.substring(2);
  } else if (cleanNumber.startsWith('0')) {
    // Remove leading 0 (common in Philippine mobile numbers)
    cleanNumber = cleanNumber.substring(1);
  }

  // Validate that we have exactly 10 digits after country code
  if (cleanNumber.length !== 10) {
    throw new Error(`Invalid Philippine phone number: expected 10 digits, got ${cleanNumber.length}`);
  }

  // Validate that it starts with 9 (Philippine mobile numbers)
  if (!cleanNumber.startsWith('9')) {
    throw new Error('Invalid Philippine mobile number: must start with 9');
  }

  // Return formatted number with +63 country code
  return `+63${cleanNumber}`;
}

/**
 * Create SMS message for booking notifications
 */
export function createBookingSMSMessage(
  customerName: string,
  petName: string,
  serviceName: string,
  status: string,
  bookingId: string
): string {
  const baseMessage = `Hi ${customerName}, `;

  switch (status) {
    case 'confirmed':
      return `${baseMessage}your booking for ${petName}'s ${serviceName} has been confirmed. Booking ID: ${bookingId}. Thank you for choosing Rainbow Paws.`;

    case 'in_progress':
      return `${baseMessage}your ${serviceName} service for ${petName} is now in progress. We'll keep you updated. Booking ID: ${bookingId}.`;

    case 'completed':
      return `${baseMessage}your ${serviceName} service for ${petName} has been completed. Thank you for trusting us with your beloved pet. Booking ID: ${bookingId}.`;

    case 'cancelled':
      return `${baseMessage}your booking for ${petName}'s ${serviceName} has been cancelled. If you have questions, please contact us. Booking ID: ${bookingId}.`;

    default:
      return `${baseMessage}there's an update on your booking for ${petName}'s ${serviceName}. Booking ID: ${bookingId}. Please check your account for details.`;
  }
}

/**
 * Validate Twilio configuration
 */
export function validateTwilioConfig(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = [
    { name: 'TWILIO_ACCOUNT_SID', value: accountSid },
    { name: 'TWILIO_AUTH_TOKEN', value: authToken },
    { name: 'TWILIO_PHONE_NUMBER', value: fromNumber }
  ];

  const missingVars = requiredVars
    .filter(variable => !variable.value)
    .map(variable => variable.name);

  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

/**
 * Test phone number formatting (for development/testing)
 */
export function testPhoneNumberFormatting(phoneNumber: string): {
  success: boolean;
  formatted?: string;
  error?: string
} {
  try {
    const formatted = formatPhilippinePhoneNumber(phoneNumber);
    return { success: true, formatted };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test SMS functionality (for development/testing)
 */
export async function testSMS(testPhoneNumber: string): Promise<SendSMSResult> {
  const testMessage = 'This is a test message from Rainbow Paws SMS service.';

  return await sendSMS({
    to: testPhoneNumber,
    message: testMessage
  });
}
