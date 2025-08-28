import { NextRequest, NextResponse } from 'next/server';
import { sendSMS, testPhoneNumberFormatting } from '@/lib/httpSmsService';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json({
        success: false,
        error: 'Phone number and message are required'
      }, { status: 400 });
    }

    // Test phone number formatting first
    const formatTest = testPhoneNumberFormatting(phoneNumber);
    
    if (!formatTest.success) {
      return NextResponse.json({
        success: false,
        error: `Phone number formatting failed: ${formatTest.error}`,
        formatTest
      }, { status: 400 });
    }

    // Send test SMS
    const result = await sendSMS({ to: phoneNumber, message });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Test SMS sent successfully',
        result,
        formatTest,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending test SMS:', error);
    
    return NextResponse.json({
      success: false,
      error: `Failed to send test SMS: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
