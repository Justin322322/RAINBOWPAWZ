// httpSMS configuration
const apiKey = process.env.HTTPSMS_API_KEY || 'uk_SMVOkSvVaC-rg9-oXlbnOu8_bylIkCTLiceneJIFRClKRwK5mNhcF1YybT9j6Lms';
const fromNumber = process.env.HTTPSMS_FROM_NUMBER || '+639163178412';
const baseUrl = 'https://api.httpsms.com/v1';

// SMS configuration loaded - debug logging removed to prevent log pollution

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
    console.log(`📱 Attempting to send SMS to: ${to}`);
    console.log(`   Message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    
    // Enhanced configuration validation
    if (!apiKey) {
      const error = 'httpSMS API key not configured';
      console.error(`❌ SMS failed: ${error}`);
      console.error(`   Environment check: NODE_ENV=${process.env.NODE_ENV}`);
      console.error(`   Available env vars:`, Object.keys(process.env).filter(key => key.includes('SMS') || key.includes('HTTPSMS')));
      return {
        success: false,
        error,
        code: 500
      };
    }

    if (!fromNumber) {
      const error = 'httpSMS from number not configured';
      console.error(`❌ SMS failed: ${error}`);
      console.error(`   Environment check: NODE_ENV=${process.env.NODE_ENV}`);
      console.error(`   Available env vars:`, Object.keys(process.env).filter(key => key.includes('SMS') || key.includes('HTTPSMS')));
      return {
        success: false,
        error,
        code: 500
      };
    }

    // Enhanced phone number validation
    if (!to || typeof to !== 'string') {
      const error = 'Invalid phone number: must be a non-empty string';
      console.error(`❌ SMS failed: ${error}`);
      console.error(`   Received: ${typeof to} = ${JSON.stringify(to)}`);
      return {
        success: false,
        error,
        code: 400
      };
    }

    if (!to.match(/^\+?[\d\s\-\(\)]+$/)) {
      const error = `Invalid phone number format: ${to}`;
      console.error(`❌ SMS failed: ${error}`);
      console.error(`   Phone number validation failed for: ${to}`);
      return {
        success: false,
        error,
        code: 400
      };
    }

    // Enhanced phone number formatting
    let formattedPhone: string;
    try {
      const trimmed = to.trim();
      console.log(`   Original phone: "${trimmed}"`);
      
      if (/^\+\d{7,15}$/.test(trimmed)) {
        // Already E.164 format
        formattedPhone = trimmed;
        console.log(`   Phone already in E.164 format: ${formattedPhone}`);
      } else {
        // Format Philippine local numbers
        formattedPhone = formatPhilippinePhoneNumber(trimmed);
        console.log(`   Formatted Philippine phone: ${formattedPhone}`);
      }
      
      console.log(`   Final formatted phone: ${formattedPhone}`);
    } catch (formatError) {
      console.error(`❌ SMS failed: Phone number formatting error:`, formatError);
      console.error(`   Original number: ${to}`);
      console.error(`   Format error details:`, formatError);
      return {
        success: false,
        error: formatError instanceof Error ? formatError.message : 'Invalid phone number format',
        code: 400
      };
    }

    // Enhanced SMS sending with better retry logic
    const maxRetries = 1; // Reduced for faster response
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   📤 Attempt ${attempt + 1}/${maxRetries + 1}`);
        console.log(`   Request URL: ${baseUrl}/messages/send`);
        
        const requestBody = {
          content: message,
          from: fromNumber,
          to: formattedPhone,
          encrypted: false
        };
        
        console.log(`   Request body:`, JSON.stringify(requestBody, null, 2));
        console.log(`   Request headers:`, {
          'x-api-key': `${apiKey.substring(0, 8)}...`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        });
        
        const startTime = Date.now();
        const response = await fetch(`${baseUrl}/messages/send`, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        const endTime = Date.now();

        console.log(`   Response time: ${endTime - startTime}ms`);
        console.log(`   Response status: ${response.status} ${response.statusText}`);
        console.log(`   Response headers:`, Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { message: response.statusText };
          }
          
          console.error(`   ❌ HTTP Error Response:`, errorData);
          console.error(`   Status: ${response.status}`);
          console.error(`   Status Text: ${response.statusText}`);
          
          throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
        }

        const data: HttpSMSResponse = await response.json();
        console.log(`   ✅ Success response:`, JSON.stringify(data, null, 2));

        if (data.status === 'success') {
          console.log(`✅ SMS sent successfully! Message ID: ${data.data.id}`);
          console.log(`   To: ${formattedPhone}`);
          console.log(`   From: ${fromNumber}`);
          console.log(`   Message length: ${message.length} characters`);
          console.log(`   Timestamp: ${new Date().toISOString()}`);
          
          return {
            success: true,
            messageId: data.data.id
          };
        } else {
          throw new Error(data.message || 'Failed to send SMS - unknown error');
        }

      } catch (err: any) {
        lastError = err;
        console.error(`   ❌ Attempt ${attempt + 1} failed:`, err.message);
        console.error(`   Error type:`, err.constructor.name);
        console.error(`   Error stack:`, err.stack);
        
        // Enhanced retry logic
        const isTransient = err?.message?.includes('429') || 
                           err?.message?.includes('500') || 
                           err?.message?.includes('502') || 
                           err?.message?.includes('503') || 
                           err?.message?.includes('504') ||
                           err?.message?.includes('timeout') ||
                           err?.message?.includes('network') ||
                           err?.message?.includes('fetch');
        
        if (isTransient && attempt < maxRetries) {
          const backoff = Math.min(500 * Math.pow(2, attempt), 2000); // Faster backoff with max 2s
          console.log(`   ⏳ Retrying in ${backoff}ms... (transient error)`);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        
        // Don't retry on non-transient errors
        console.error(`   🚫 Not retrying - non-transient error`);
        break;
      }
    }
    
    // Should not reach here
    throw lastError;

  } catch (error: any) {
    console.error('❌ Error sending SMS via httpSMS:', error);
    console.error('   Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
      status: error.status
    });

    // Enhanced error handling with specific messages
    let errorMessage = 'Unknown error occurred';
    let errorCode = 500;

    if (error.message?.includes('401')) {
      errorMessage = 'httpSMS authentication failed. Please check your API key.';
      errorCode = 401;
    } else if (error.message?.includes('400')) {
      errorMessage = 'Invalid request parameters. Please check phone numbers and message content.';
      errorCode = 400;
    } else if (error.message?.includes('422')) {
      errorMessage = 'Invalid phone number format or message content.';
      errorCode = 422;
    } else if (error.message?.includes('500')) {
      errorMessage = 'httpSMS service temporarily unavailable. Please try again later.';
      errorCode = 500;
    } else if (error.message?.includes('429')) {
      errorMessage = 'Rate limit exceeded. Please wait before sending more messages.';
      errorCode = 429;
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timeout. httpSMS service may be slow or unavailable.';
      errorCode = 408;
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      errorMessage = 'Network error. Please check your internet connection and firewall settings.';
      errorCode = 503;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error(`   Final error: ${errorMessage} (Code: ${errorCode})`);

    return {
      success: false,
      error: errorMessage,
      code: errorCode
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
 * Create SMS message for booking notifications_unified
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
 * Simple health check for SMS service
 */
export function getSMSHealthStatus(): {
  configured: boolean;
  apiKey: boolean;
  fromNumber: boolean;
  environment: string;
  usingFallback: boolean;
} {
  return {
    configured: !!(apiKey && fromNumber),
    apiKey: !!apiKey,
    fromNumber: !!fromNumber,
    environment: process.env.NODE_ENV || 'unknown',
    usingFallback: !process.env.HTTPSMS_API_KEY
  };
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

/**
 * Send SMS in the background without blocking the response
 * Use this when you want instant API responses
 * 
 * @example
 * // Don't await - returns immediately
 * sendSMSAsync({ to: phone, message: 'Hello!' });
 */
export function sendSMSAsync(params: SendSMSParams): void {
  sendSMS(params)
    .then(result => {
      if (result.success) {
        console.log(`✅ Background SMS sent successfully to ${params.to}`);
      } else {
        console.error(`❌ Background SMS failed to ${params.to}:`, result.error);
      }
    })
    .catch(error => {
      console.error('❌ Background SMS error:', error);
    });
}
