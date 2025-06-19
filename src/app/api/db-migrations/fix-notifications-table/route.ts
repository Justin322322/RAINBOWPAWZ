import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function POST(request: NextRequest) {
  try {
    // Get auth token to verify user is authenticated and is admin
    const authToken = getAuthTokenFromRequest(request);
    
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [_userId, accountType] = authToken.split('_');
    
    // Only allow admins to run migrations
    if (accountType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('Starting notifications table migration...');

    // Check current table structure
    const tableInfo = await query(`
      DESCRIBE notifications
    `) as any[];

    console.log('Current table structure:', tableInfo);

    // Check if we need to migrate from notification_id to id
    const hasNotificationId = tableInfo.some(col => col.Field === 'notification_id');
    const hasId = tableInfo.some(col => col.Field === 'id');

    if (hasNotificationId && !hasId) {
      console.log('Migrating from notification_id to id...');
      
      // Rename notification_id to id
      await query(`
        ALTER TABLE notifications 
        CHANGE COLUMN notification_id id INT AUTO_INCREMENT PRIMARY KEY
      `);
      
      console.log('Successfully renamed notification_id to id');
    } else if (hasId) {
      console.log('Table already has id column, no migration needed');
    } else {
      console.log('Table structure is unexpected, creating new table...');
      
      // Drop and recreate table with correct structure
      await query(`DROP TABLE IF EXISTS notifications_backup`);
      
      // Create backup if there's data
      const dataCount = await query(`SELECT COUNT(*) as count FROM notifications`) as any[];
      if (dataCount[0].count > 0) {
        await query(`CREATE TABLE notifications_backup AS SELECT * FROM notifications`);
        console.log(`Backed up ${dataCount[0].count} notifications`);
      }
      
      // Drop and recreate with correct structure
      await query(`DROP TABLE notifications`);
      
      await query(`
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
          is_read BOOLEAN DEFAULT FALSE,
          link VARCHAR(255) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      
      // Restore data if backup exists
      if (dataCount[0].count > 0) {
        await query(`
          INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
          SELECT user_id, title, message, type, 
                 CASE WHEN is_read = 1 THEN TRUE ELSE FALSE END,
                 link, created_at
          FROM notifications_backup
        `);
        
        console.log(`Restored ${dataCount[0].count} notifications`);
        
        // Drop backup table
        await query(`DROP TABLE notifications_backup`);
      }
    }

    // Verify the final structure
    const finalTableInfo = await query(`DESCRIBE notifications`) as any[];
    console.log('Final table structure:', finalTableInfo);

    // Test the table by counting records
    const recordCount = await query(`SELECT COUNT(*) as count FROM notifications`) as any[];
    console.log(`Table has ${recordCount[0].count} notifications`);

    return NextResponse.json({
      success: true,
      message: 'Notifications table migration completed successfully',
      details: {
        hadNotificationId: hasNotificationId,
        hadId: hasId,
        finalStructure: finalTableInfo,
        recordCount: recordCount[0].count
      }
    });

  } catch (error) {
    console.error('Error during notifications table migration:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 