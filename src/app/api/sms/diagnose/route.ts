import { NextResponse } from 'next/server';
import { checkHttpSMSStatus, getSMSHealthStatus, sendSMS, testPhoneNumberFormatting } from '@/lib/httpSmsService';

export async function GET() {
  try {
    console.log('🔍 Starting comprehensive SMS diagnostic...');
    
    // 1. Environment Variables Check
    const envCheck: {
      HTTPSMS_API_KEY: { set: boolean; value: string; length: number };
      HTTPSMS_FROM_NUMBER: { set: boolean; value: string };
      NODE_ENV: string;
      RAILWAY_ENVIRONMENT: string;
      VERCEL_ENV: string;
      usingFallback: boolean;
    } = {
      HTTPSMS_API_KEY: {
        set: !!process.env.HTTPSMS_API_KEY,
        value: process.env.HTTPSMS_API_KEY ? `${process.env.HTTPSMS_API_KEY.substring(0, 8)}...` : 'NOT SET',
        length: process.env.HTTPSMS_API_KEY?.length || 0
      },
      HTTPSMS_FROM_NUMBER: {
        set: !!process.env.HTTPSMS_FROM_NUMBER,
        value: process.env.HTTPSMS_FROM_NUMBER || 'NOT SET'
      },
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'NOT SET',
      VERCEL_ENV: process.env.VERCEL_ENV || 'NOT SET',
      usingFallback: !process.env.HTTPSMS_API_KEY
    };

    // 2. Health Status Check
    const healthStatus = getSMSHealthStatus();
    
    // 3. Service Status Check
    const serviceStatus = await checkHttpSMSStatus();
    
    // 4. Phone Number Formatting Tests
    const testPhoneNumbers = [
      '09123456789',
      '+639123456789', 
      '639123456789',
      '9123456789',
      '+1234567890', // US format
      '1234567890'   // US format
    ];

    const phoneFormatResults = testPhoneNumbers.map(phone => {
      try {
        return testPhoneNumberFormatting(phone);
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          original: phone
        };
      }
    });

    // 5. Test SMS Send (if configured)
    let testSMSResult = null;
    if (healthStatus.configured) {
      try {
        // Use a test number if available, otherwise skip
        const testNumber = process.env.TEST_PHONE_NUMBER || '+639123456789';
        testSMSResult = await sendSMS({
          to: testNumber,
          message: '🔍 SMS Diagnostic Test - RainbowPaws System Check'
        });
      } catch (error) {
        testSMSResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // 6. Network Connectivity Test
    let networkTest = null;
    try {
      const startTime = Date.now();
      const response = await fetch('https://api.httpsms.com/v1/messages', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      const endTime = Date.now();
      
      networkTest = {
        success: true,
        responseTime: `${endTime - startTime}ms`,
        status: response.status,
        statusText: response.statusText,
        reachable: response.status !== 0
      };
    } catch (error) {
      networkTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        reachable: false
      };
    }

    // 7. Configuration Analysis
    const analysis = {
      isConfigured: healthStatus.configured,
      issues: [] as string[],
      recommendations: [] as string[]
    };

    if (!envCheck.HTTPSMS_API_KEY.set) {
      analysis.issues.push('HTTPSMS_API_KEY environment variable is not set');
      if (envCheck.usingFallback) {
        analysis.recommendations.push('Using hardcoded fallback API key - SMS service will work but consider setting environment variables for production');
      } else {
        analysis.recommendations.push('Set HTTPSMS_API_KEY in your production environment variables');
      }
    }

    if (!envCheck.HTTPSMS_FROM_NUMBER.set) {
      analysis.issues.push('HTTPSMS_FROM_NUMBER environment variable is not set');
      if (envCheck.usingFallback) {
        analysis.recommendations.push('Using hardcoded fallback phone number - SMS service will work but consider setting environment variables for production');
      } else {
        analysis.recommendations.push('Set HTTPSMS_FROM_NUMBER in your production environment variables');
      }
    }

    if (envCheck.HTTPSMS_API_KEY.set && envCheck.HTTPSMS_API_KEY.length < 10) {
      analysis.issues.push('HTTPSMS_API_KEY appears to be too short or invalid');
      analysis.recommendations.push('Verify your httpSMS API key is correct and complete');
    }

    if (!serviceStatus.success) {
      analysis.issues.push(`httpSMS service check failed: ${serviceStatus.error}`);
      analysis.recommendations.push('Check if your httpSMS device is online and accessible');
      analysis.recommendations.push('Verify your API key has the correct permissions');
    }

    if (!networkTest.reachable) {
      analysis.issues.push('Cannot reach httpSMS API endpoint');
      analysis.recommendations.push('Check your server\'s internet connectivity');
      analysis.recommendations.push('Verify firewall settings allow outbound HTTPS requests');
    }

    const diagnosticResult = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      health: healthStatus,
      serviceStatus,
      phoneFormatTests: {
        testNumbers: testPhoneNumbers,
        results: phoneFormatResults
      },
      testSMS: testSMSResult,
      networkTest,
      analysis,
      debug: {
        message: 'Comprehensive SMS service diagnostic completed',
        note: 'Check the console logs for detailed SMS service configuration information',
        nextSteps: analysis.issues.length > 0 ? 
          'Fix the identified issues above' : 
          'SMS service appears to be properly configured'
      }
    };

    console.log('✅ SMS diagnostic completed successfully');
    console.log('📊 Diagnostic summary:', JSON.stringify(diagnosticResult, null, 2));

    return NextResponse.json(diagnosticResult);

  } catch (error) {
    console.error('❌ Error in SMS diagnostic endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: `Diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
