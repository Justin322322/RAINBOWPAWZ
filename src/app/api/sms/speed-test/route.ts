import { NextRequest, NextResponse } from 'next/server';
import { sendSMS, sendSMSAsync } from '@/lib/httpSmsService';

/**
 * SMS Speed Test API Endpoint
 * 
 * Tests both synchronous and asynchronous SMS sending
 * 
 * Usage:
 * POST /api/sms/speed-test
 * Body: { "phone": "+639123456789", "mode": "sync" | "async" | "both" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, mode = 'both' } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const results: any = {
      phone,
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Synchronous (if requested)
    if (mode === 'sync' || mode === 'both') {
      const syncStart = Date.now();
      
      try {
        const syncResult = await sendSMS({
          to: phone,
          message: '🧪 Speed Test (SYNC) - RainbowPaws'
        });
        
        const syncDuration = Date.now() - syncStart;
        
        results.tests.push({
          type: 'synchronous',
          duration_ms: syncDuration,
          duration_seconds: (syncDuration / 1000).toFixed(2),
          success: syncResult.success,
          messageId: syncResult.messageId,
          error: syncResult.error,
          description: 'Blocks API response until SMS is sent'
        });
      } catch (error) {
        const syncDuration = Date.now() - syncStart;
        results.tests.push({
          type: 'synchronous',
          duration_ms: syncDuration,
          duration_seconds: (syncDuration / 1000).toFixed(2),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Test 2: Asynchronous (if requested)
    if (mode === 'async' || mode === 'both') {
      const asyncStart = Date.now();
      
      try {
        // This should return immediately
        sendSMSAsync({
          to: phone,
          message: '🧪 Speed Test (ASYNC) - RainbowPaws'
        });
        
        const asyncDuration = Date.now() - asyncStart;
        
        results.tests.push({
          type: 'asynchronous',
          duration_ms: asyncDuration,
          duration_seconds: (asyncDuration / 1000).toFixed(2),
          success: true,
          description: 'Returns immediately, SMS sends in background',
          note: 'Check server logs for actual SMS delivery status'
        });
      } catch (error) {
        const asyncDuration = Date.now() - asyncStart;
        results.tests.push({
          type: 'asynchronous',
          duration_ms: asyncDuration,
          duration_seconds: (asyncDuration / 1000).toFixed(2),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Calculate improvement if both tests were run
    if (mode === 'both' && results.tests.length === 2) {
      const syncDuration = results.tests[0].duration_ms;
      const asyncDuration = results.tests[1].duration_ms;
      const improvement = syncDuration - asyncDuration;
      const improvementPercent = ((improvement / syncDuration) * 100).toFixed(1);
      
      results.summary = {
        improvement_ms: improvement,
        improvement_percent: `${improvementPercent}%`,
        recommendation: asyncDuration < 100 
          ? 'INSTANT - Excellent user experience ✨' 
          : asyncDuration < 500 
          ? 'FAST - Good user experience ⚡' 
          : 'ACCEPTABLE - Consider optimization ✓'
      };
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Speed test error:', error);
    return NextResponse.json(
      {
        error: 'Speed test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for quick test with default number
 */
export async function GET() {
  const testPhone = process.env.TEST_PHONE_NUMBER || '+639163178412';
  
  return NextResponse.json({
    message: 'SMS Speed Test Endpoint',
    usage: {
      method: 'POST',
      endpoint: '/api/sms/speed-test',
      body: {
        phone: 'string (required) - Phone number in E.164 format',
        mode: 'string (optional) - "sync", "async", or "both" (default: "both")'
      },
      example: {
        phone: testPhone,
        mode: 'both'
      }
    },
    curl_example: `curl -X POST http://localhost:3000/api/sms/speed-test \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"${testPhone}","mode":"both"}'`
  });
}
