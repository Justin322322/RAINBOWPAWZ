import { NextRequest, NextResponse } from 'next/server';
import { checkHttpSMSStatus } from '@/lib/httpSmsService';

export async function GET(req: NextRequest) {
  try {
    const status = await checkHttpSMSStatus();
    
    return NextResponse.json({
      provider: 'httpSMS',
      status: status.success ? 'operational' : 'error',
      message: status.message || status.error,
      timestamp: new Date().toISOString(),
      details: {
        name: 'httpSMS',
        description: 'Open-source SMS gateway using Android phone',
        website: 'https://docs.httpsms.com/',
        features: [
          'End-to-end encryption',
          'No monthly fees',
          'Full control over SMS gateway',
          'HTTP API integration'
        ]
      }
    });
  } catch (error) {
    console.error('Error checking SMS status:', error);
    
    return NextResponse.json({
      provider: 'httpSMS',
      status: 'error',
      message: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
