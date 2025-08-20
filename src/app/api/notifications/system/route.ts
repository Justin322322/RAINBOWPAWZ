import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { createSystemNotification } from '@/services/NotificationService';
import { createStandardErrorResponse, createStandardSuccessResponse } from '@/utils/rateLimitUtils';

/**
 * API endpoint for creating system-wide notifications
 * Only accessible by admin users
 */

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { type, title, message, targetUsers } = body;

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        createStandardErrorResponse('Type, title, and message are required', 400),
        { status: 400 }
      );
    }

    // Validate notification type
    const validTypes = ['system_maintenance', 'service_update', 'policy_update'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        createStandardErrorResponse(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`, 400),
        { status: 400 }
      );
    }

    // Create system notification
    const result = await createSystemNotification(type, title, message, targetUsers);

    if (result.success) {
      return NextResponse.json(
        createStandardSuccessResponse({
          message: 'System notification created successfully'
        })
      );
    } else {
      return NextResponse.json(
        createStandardErrorResponse(result.error || 'Failed to create system notification', 500),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating system notification:', error);
    return NextResponse.json(
      createStandardErrorResponse('Failed to create system notification', 500, {
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
}

/**
 * Get system notification templates and examples
 */
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

    const templates = {
      system_maintenance: {
        title: 'Scheduled System Maintenance',
        message: 'We will be performing scheduled maintenance on [DATE] from [START_TIME] to [END_TIME]. During this time, some services may be temporarily unavailable. We apologize for any inconvenience.',
        type: 'warning'
      },
      service_update: {
        title: 'Service Update Available',
        message: 'We have updated our services with new features and improvements. Please check out the latest changes in your dashboard.',
        type: 'info'
      },
      policy_update: {
        title: 'Policy Update',
        message: 'We have updated our terms of service and privacy policy. Please review the changes in your account settings.',
        type: 'info'
      }
    };

    return NextResponse.json(
      createStandardSuccessResponse({
        templates,
        validTypes: ['system_maintenance', 'service_update', 'policy_update'],
        message: 'System notification templates retrieved successfully'
      })
    );
  } catch (error) {
    console.error('Error getting system notification templates:', error);
    return NextResponse.json(
      createStandardErrorResponse('Failed to get system notification templates', 500, {
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
}
