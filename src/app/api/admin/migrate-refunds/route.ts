import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

/**
 * POST - Run refunds table migration
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [, accountType] = authToken.split('_');
    if (accountType !== 'admin') {
      return NextResponse.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 403 });
    }

    // Create refunds table
    const createRefundsTable = `
      CREATE TABLE IF NOT EXISTS refunds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reason TEXT,
        status ENUM('pending', 'processing', 'processed', 'failed', 'cancelled') DEFAULT 'pending',
        processed_by INT NULL,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_booking_id (booking_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      )
    `;

    await query(createRefundsTable);

    // Add refund_id column to service_bookings table if it doesn't exist
    try {
      const addRefundIdColumn = `
        ALTER TABLE service_bookings 
        ADD COLUMN refund_id INT NULL AFTER payment_status,
        ADD INDEX idx_refund_id (refund_id)
      `;
      await query(addRefundIdColumn);
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Refund_id column might already exist in service_bookings');
    }

    // Add refund tracking to payment_transactions if it doesn't exist
    try {
      const addRefundTrackingColumns = `
        ALTER TABLE payment_transactions 
        ADD COLUMN refund_id INT NULL AFTER status,
        ADD COLUMN refunded_at TIMESTAMP NULL AFTER refund_id,
        ADD INDEX idx_refund_id (refund_id)
      `;
      await query(addRefundTrackingColumns);
    } catch (error) {
      // Columns might already exist, ignore error
      console.log('Refund tracking columns might already exist in payment_transactions');
    }

    return NextResponse.json({
      success: true,
      message: 'Refunds table migration completed successfully'
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
