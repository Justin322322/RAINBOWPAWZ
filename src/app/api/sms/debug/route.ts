import { NextResponse } from 'next/server';
import { checkHttpSMSStatus, getSMSHealthStatus } from '@/lib/httpSmsService';

export async function GET() {
  try {
    // Get health status
    const healthStatus = getSMSHealthStatus();
    
    // Check environment variables
    const envCheck = {
      HTTPSMS_API_KEY: process.env.HTTPSMS_API_KEY ? '✅ Set' : '❌ Not Set',
      HTTPSMS_FROM_NUMBER: process.env.HTTPSMS_FROM_NUMBER ? '✅ Set' : '❌ Not Set',
      NODE_ENV: process.env.NODE_ENV || 'Not Set'
    };

    // Check service status
    const serviceStatus = await checkHttpSMSStatus();
    
    // Test phone number formatting
    const testPhoneNumbers = [
      '09123456789',
      '+639123456789',
      '639123456789',
      '9123456789'
    ];

    const phoneFormatResults = testPhoneNumbers.map(phone => {
      try {
        // Import the function dynamically to avoid circular dependencies
        const { testPhoneNumberFormatting } = require('@/lib/httpSmsService');
        return testPhoneNumberFormatting(phone);
      } catch {
        return { success: false, error: 'Function not available' };
      }
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      health: healthStatus,
      environment: envCheck,
      serviceStatus,
      phoneFormatTests: {
        testNumbers: testPhoneNumbers,
        results: phoneFormatResults
      },
      debug: {
        message: 'This endpoint shows SMS service configuration and status for debugging',
        note: 'Check the console logs for detailed SMS service configuration information',
        recommendations: healthStatus.configured ? [] : [
          'Set HTTPSMS_API_KEY environment variable',
          'Set HTTPSMS_FROM_NUMBER environment variable',
          'Ensure environment variables are loaded in production'
        ]
      }
    });

  } catch (error) {
    console.error('Error in SMS debug endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: `Debug endpoint failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
