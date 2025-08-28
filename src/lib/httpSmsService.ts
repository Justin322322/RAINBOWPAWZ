// httpSMS configuration
const apiKey = process.env.HTTPSMS_API_KEY;
const fromNumber = process.env.HTTPSMS_FROM_NUMBER;
const baseUrl = 'https://api.httpsms.com/v1';

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

interface HttpSMSResponse {
  data: {
    id: string;
    status: string;
    contact: string;
    content: string;
    created_at: string;
    owner: string;
    type: string;
  };
  message: string;
  status: string;
}

/**
 * Send SMS notification using httpSMS
 */
export async function sendSMS({ to, message }: SendSMSParams): Promise<SendSMSResult> {
  try {
    if (!apiKey) {
      return {
        success: false,
        error: 'httpSMS API key not configured'
      };
    }

    if (!fromNumber) {
      return {
        success: false,
        error: 'httpSMS from number not configured'
      };
    }

    // Validate phone number format (basic validation)
    if (!to || !to.match(/^\+?[\d\s\-\(\)]+$/)) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    // Format destination phone number
    let formattedPhone: string;
    try {
      const trimmed = to.trim();
      if (/^\+\d{7,15}$/.test(trimmed)) {
        // Already E.164
        formattedPhone = trimmed;
      } else {
        // Assume Philippine local formats if not E.164
        formattedPhone = formatPhilippinePhoneNumber(trimmed);
      }
    } catch (formatError) {
      return {
        success: false,
        error: formatError instanceof Error ? formatError.message : 'Invalid phone number format'
      };
    }

    // Send SMS with limited retries for transient errors
    const maxRetries = 2;
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${baseUrl}/messages/send`, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: message,
            from: fromNumber,
            to: formattedPhone,
            encrypted: false
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
        }

        const data: HttpSMSResponse = await response.json();

        if (data.status === 'success') {
          return {
            success: true,
            messageId: data.data.id
          };
        } else {
          throw new Error(data.message || 'Failed to send SMS');
        }

      } catch (err: any) {
        lastError = err;
        const transient = err?.message?.includes('429') || 
                         err?.message?.includes('500') || 
                         err?.message?.includes('502') || 
                         err?.message?.includes('503') || 
                         err?.message?.includes('504');
        
        if (transient && attempt < maxRetries) {
          const backoff = 500 * (attempt + 1);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        throw err;
      }
    }
    
    // Should not reach here
    throw lastError;

  } catch (error: any) {
    console.error('Error sending SMS via httpSMS:', error);

    // Handle specific httpSMS errors
    let errorMessage = 'Unknown error occurred';

    if (error.message?.includes('401')) {
      errorMessage = 'httpSMS authentication failed. Please check your API key.';
    } else if (error.message?.includes('400')) {
      errorMessage = 'Invalid request parameters. Please check phone numbers and message content.';
    } else if (error.message?.includes('422')) {
      errorMessage = 'Invalid phone number format or message content.';
    } else if (error.message?.includes('500')) {
      errorMessage = 'httpSMS service temporarily unavailable. Please try again later.';
    } else if (error.message?.includes('429')) {
      errorMessage = 'Rate limit exceeded. Please wait before sending more messages.';
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
      code: error.status || 500
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

  // After removing prefixes, valid PH mobile should be 10 or 11 digits (some inputs may include leading 9 incorrectly)
  if (cleanNumber.length === 11 && cleanNumber.startsWith('9')) {
    // Handle accidental extra leading 9 (rare); trim to last 10
    cleanNumber = cleanNumber.slice(-10);
  }
  if (cleanNumber.length !== 10) {
    throw new Error(`Invalid Philippine phone number: expected 10 digits, got ${cleanNumber.length}`);
  }
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
 * Check httpSMS service status
 */
export async function checkHttpSMSStatus(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    if (!apiKey) {
      return {
        success: false,
        error: 'httpSMS API key not configured'
      };
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      return {
        success: true,
        message: 'httpSMS service is operational'
      };
    } else {
      return {
        success: false,
        error: `Service check failed: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}
