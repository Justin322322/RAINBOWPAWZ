import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Simple authentication check (you might want to add proper admin auth)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_MIGRATION_TOKEN || 'admin-migration-token'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Running payment_status enum migration...');
    
    // Run the migration SQL
    await query(`
      ALTER TABLE bookings 
      MODIFY COLUMN payment_status ENUM(
        'not_paid',
        'partially_paid', 
        'paid',
        'refunded',
        'failed',
        'awaiting_payment_confirmation'
      ) DEFAULT 'not_paid'
    `);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the change
    const result = await query('DESCRIBE bookings') as any[];
    const paymentStatusColumn = result.find((row: any) => row.Field === 'payment_status');
    
    return NextResponse.json({
      success: true,
      message: 'Payment status enum migration completed successfully',
      updatedColumn: paymentStatusColumn
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
