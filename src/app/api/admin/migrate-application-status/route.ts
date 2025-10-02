import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Simple authentication check (you might want to add proper admin auth)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_MIGRATION_TOKEN || 'admin-migration-token'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Running application_status enum migration...');
    
    // First check current enum values
    const currentSchema = await query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'service_providers' 
      AND COLUMN_NAME = 'application_status'
    `) as any[];
    
    console.log('Current application_status enum:', currentSchema[0]?.COLUMN_TYPE);
    
    // Run the migration SQL to add 'reviewing' status
    await query(`
      ALTER TABLE service_providers 
      MODIFY COLUMN application_status ENUM(
        'pending',
        'reviewing',
        'approved',
        'declined',
        'restricted',
        'documents_required'
      ) DEFAULT 'pending'
    `);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the change
    const result = await query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'service_providers' 
      AND COLUMN_NAME = 'application_status'
    `) as any[];
    
    return NextResponse.json({
      success: true,
      message: 'Application status enum migration completed successfully - added "reviewing" status',
      previousEnum: currentSchema[0]?.COLUMN_TYPE,
      updatedEnum: result[0]?.COLUMN_TYPE
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}