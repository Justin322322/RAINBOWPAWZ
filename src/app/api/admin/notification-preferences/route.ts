import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

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
        ADD COLUMN sms_notifications BOOLEAN DEFAULT TRUE COMMENT 'User preference for SMS notifications'
      `);
    }

    // Add email_notifications column if it doesn't exist
    if (!existingColumns.includes('email_notifications')) {
      await query(`
        ALTER TABLE users
        ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE COMMENT 'User preference for email notifications'
      `);
    }

  } catch (error) {
    console.error('Error ensuring notification columns exist:', error);
    throw error;
  }
}

// GET - Retrieve admin's notification preferences
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Check if notification preference columns exist, if not create them
    await ensureNotificationColumns();

    // Get admin's current notification preferences
    const adminResult = await query(
      'SELECT sms_notifications, email_notifications FROM users WHERE user_id = ? AND role = ?',
      [user.userId, 'admin']
    );

    if (!adminResult || adminResult.length === 0) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const admin = adminResult[0];

    // Return preferences (default to true if null)
    const preferences = {
      sms_notifications: admin.sms_notifications !== null ? Boolean(admin.sms_notifications) : true,
      email_notifications: admin.email_notifications !== null ? Boolean(admin.email_notifications) : true
    };

    return NextResponse.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error fetching admin notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update admin's notification preferences
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

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

    // Update admin's notification preferences
    await query(
      'UPDATE users SET sms_notifications = ?, email_notifications = ?, updated_at = NOW() WHERE user_id = ? AND role = ?',
      [sms_notifications, email_notifications, user.userId, 'admin']
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
    console.error('Error updating admin notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

