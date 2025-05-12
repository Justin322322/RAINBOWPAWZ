import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

type SetupResults = {
  notificationsTableExists?: boolean;
  notificationsTableCreated?: boolean;
};

export async function GET() {
  try {
    // Check if the notifications table exists
    const notificationsTableExists = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'notifications'`
    ) as any[];

    const results: SetupResults = {
      notificationsTableExists: notificationsTableExists[0].count > 0
    };

    // Create the table if it doesn't exist
    if (!results.notificationsTableExists) {
      await query(`
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
          is_read TINYINT(1) NOT NULL DEFAULT 0,
          link VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_is_read (is_read),
          INDEX idx_created_at (created_at),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      results.notificationsTableCreated = true;
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications table setup completed',
      results
    });
  } catch (error) {
    console.error('Error setting up notifications table:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to setup notifications table',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
