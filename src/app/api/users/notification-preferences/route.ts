import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// Helper function to get user from auth token
async function getUserFromToken(request: NextRequest) {
  const authToken = getAuthTokenFromRequest(request);

  if (!authToken) {
    return { success: false, user: null };
  }

  let userId: string | null = null;
  let accountType: string | null = null;

  // Check if it's a JWT token or old format
  if (authToken.includes('.')) {
    // JWT token format
    const { decodeTokenUnsafe } = await import('@/lib/jwt');
    const payload = decodeTokenUnsafe(authToken);
    userId = payload?.userId || null;
    accountType = payload?.accountType || null;
  } else {
    // Old format fallback
    const parts = authToken.split('_');
    if (parts.length === 2) {
      userId = parts[0];
      accountType = parts[1];
    }
  }

  if (!userId || !accountType) {
    return { success: false, user: null };
  }

  return { success: true, user: { id: userId, accountType } };
}

// GET - Retrieve user's notification preferences
export async function GET(request: NextRequest) {
  try {
    // Get user ID from auth token
    const authResult = await getUserFromToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;

    // Check if notification preference columns exist, if not create them
    await ensureNotificationColumns();

    // Get user's current notification preferences
    const userResult = await query(
      'SELECT sms_notifications, email_notifications FROM users WHERE user_id = ?',
      [userId]
    );

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];

    // Return preferences (default to true if null)
    const preferences = {
      sms_notifications: user.sms_notifications !== null ? Boolean(user.sms_notifications) : true,
      email_notifications: user.email_notifications !== null ? Boolean(user.email_notifications) : true
    };

    return NextResponse.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update user's notification preferences
export async function PUT(request: NextRequest) {
  try {
    // Get user ID from auth token
    const authResult = await getUserFromToken(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;

    // Parse request body
    const body = await request.json();
    const { sms_notifications, email_notifications } = body;

    // Validate input
    if (typeof sms_notifications !== 'boolean' || typeof email_notifications !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid notification preferences. Both sms_notifications and email_notifications must be boolean values.' },
        { status: 400 }
      );
    }

    // Check if notification preference columns exist, if not create them
    await ensureNotificationColumns();

    // Update user's notification preferences
    await query(
      'UPDATE users SET sms_notifications = ?, email_notifications = ?, updated_at = NOW() WHERE user_id = ?',
      [sms_notifications, email_notifications, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: {
        sms_notifications,
        email_notifications
      }
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

// Helper function to ensure notification preference columns exist
async function ensureNotificationColumns() {
  try {
    // Check if columns exist
    const columnsResult = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('sms_notifications', 'email_notifications')
    `);

    const existingColumns = columnsResult.map((row: any) => row.COLUMN_NAME);

    // Add sms_notifications column if it doesn't exist
    if (!existingColumns.includes('sms_notifications')) {
      await query(`
        ALTER TABLE users
        ADD COLUMN sms_notifications BOOLEAN DEFAULT TRUE COMMENT 'User preference for SMS notifications_unified'
      `);
    }

    // Add email_notifications column if it doesn't exist
    if (!existingColumns.includes('email_notifications')) {
      await query(`
        ALTER TABLE users
        ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE COMMENT 'User preference for email notifications_unified'
      `);
    }

  } catch (error) {
    console.error('Error ensuring notification columns exist:', error);
    throw error;
  }
}
