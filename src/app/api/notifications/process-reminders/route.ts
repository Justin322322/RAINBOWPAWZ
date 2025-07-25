import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { createStandardErrorResponse, createStandardSuccessResponse } from '@/utils/rateLimitUtils';

/**
 * API endpoint for processing scheduled reminders
 * This can be called by a cron job or manually by admins
 */

export async function POST(request: NextRequest) {
  try {
    // Check if the request is from an admin or a valid cron job
    const authToken = getAuthTokenFromRequest(request);
    const cronSecret = request.headers.get('x-cron-secret');
    
    // Allow access if it's an admin user or has the correct cron secret
    let isAuthorized = false;
    
    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      isAuthorized = true;
    } else if (authToken) {
      const [_userId, accountType] = authToken.split('_');
      if (accountType === 'admin') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        createStandardErrorResponse('Unauthorized - Admin access or valid cron secret required', 401),
        { status: 401 }
      );
    }

    // Process reminders - functionality removed
    const results = { processed: 0, errors: 0 };

    return NextResponse.json(
      createStandardSuccessResponse({
        ...results,
        message: 'Reminder processing service is disabled'
      })
    );
  } catch (error) {
    console.error('Error processing reminders:', error);
    return NextResponse.json(
      createStandardErrorResponse('Failed to process reminders', 500, {
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if the request is from an admin
    const authToken = getAuthTokenFromRequest(request);
    
    if (!authToken) {
      return NextResponse.json(
        createStandardErrorResponse('Unauthorized', 401),
        { status: 401 }
      );
    }

    const [_userId, accountType] = authToken.split('_');
    if (accountType !== 'admin') {
      return NextResponse.json(
        createStandardErrorResponse('Admin access required', 403),
        { status: 403 }
      );
    }

    // Get reminder statistics - functionality removed
    const stats = { total: 0, pending: 0, sent: 0 };

    return NextResponse.json(
      createStandardSuccessResponse({
        stats,
        message: 'Reminder statistics service is disabled'
      })
    );
  } catch (error) {
    console.error('Error getting reminder stats:', error);
    return NextResponse.json(
      createStandardErrorResponse('Failed to get reminder statistics', 500, {
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
}
