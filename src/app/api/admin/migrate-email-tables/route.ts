import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/admin/migrate-email-tables
 * Create email_queue and email_log tables if they don't exist
 */
export async function POST(_request: NextRequest) {
  try {
    console.log('Starting email tables migration...');

    // Create email_queue table
    await query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html TEXT NOT NULL,
        text TEXT,
        from_email VARCHAR(255),
        cc VARCHAR(255),
        bcc VARCHAR(255),
        attachments TEXT,
        status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        sent_at TIMESTAMP NULL,
        INDEX idx_email_queue_status (status, attempts, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('email_queue table created/verified');

    // Create email_log table
    await query(`
      CREATE TABLE IF NOT EXISTS email_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message_id VARCHAR(255),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email_log_recipient (recipient),
        INDEX idx_email_log_sent_at (sent_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('email_log table created/verified');

    // Verify tables exist
    const emailQueueCheck = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'email_queue'
    `) as any[];

    const emailLogCheck = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'email_log'
    `) as any[];

    const emailQueueExists = emailQueueCheck[0]?.count > 0;
    const emailLogExists = emailLogCheck[0]?.count > 0;

    console.log('Migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Email tables migration completed successfully',
      details: {
        email_queue_created: emailQueueExists,
        email_log_created: emailLogExists,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Email tables migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/migrate-email-tables
 * Check if email tables exist
 */
export async function GET() {
  try {
    // Check if email_queue table exists
    const emailQueueCheck = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'email_queue'
    `) as any[];

    // Check if email_log table exists
    const emailLogCheck = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'email_log'
    `) as any[];

    const emailQueueExists = emailQueueCheck[0]?.count > 0;
    const emailLogExists = emailLogCheck[0]?.count > 0;

    return NextResponse.json({
      success: true,
      tables: {
        email_queue: {
          exists: emailQueueExists,
          status: emailQueueExists ? 'exists' : 'missing'
        },
        email_log: {
          exists: emailLogExists,
          status: emailLogExists ? 'exists' : 'missing'
        }
      },
      migration_needed: !emailQueueExists || !emailLogExists
    });

  } catch (error) {
    console.error('Error checking email tables:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check email tables',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
