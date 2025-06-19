import { NextRequest, NextResponse } from 'next/server';
import { processEmailQueue } from '@/lib/consolidatedEmailService';

export async function POST(request: NextRequest) {
  try {
    // Get limit from request body
    const body = await request.json();
    const limit = body.limit || 10;

    // Process the email queue
    const result = await processEmailQueue(limit);

    return NextResponse.json({
      status: 'success',
      ...result
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process email queue',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Also allow GET requests for easier testing
export async function GET(_request: NextRequest) {
  try {
    // Use a default limit of 10
    const limit = 10;

    // Process the email queue
    const result = await processEmailQueue(limit);

    return NextResponse.json({
      status: 'success',
      ...result
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process email queue',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
