import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Checking service provider data for debugging');

    // First check if the table exists
    const tableCheckResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'service_providers'
    `) as any[];

    if (tableCheckResult.length === 0) {
      return NextResponse.json({ error: 'service_providers table does not exist' });
    }

    // Check column structure
    const columnsResult = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'service_providers'
    `) as any[];
    
    const columnNames = columnsResult.map(col => col.COLUMN_NAME);
    const hasApplicationStatus = columnNames.includes('application_status');
    const hasVerificationStatus = columnNames.includes('verification_status');
    
    // Check data counts for different statuses
    let statusCounts = {};
    
    if (hasApplicationStatus) {
      const appStatusResult = await query(`
        SELECT application_status, COUNT(*) as count
        FROM service_providers
        GROUP BY application_status
      `) as any[];
      
      statusCounts = {
        ...statusCounts,
        applicationStatus: appStatusResult.reduce((acc, row) => {
          acc[row.application_status] = row.count;
          return acc;
        }, {})
      };
    }
    
    if (hasVerificationStatus) {
      const verStatusResult = await query(`
        SELECT verification_status, COUNT(*) as count
        FROM service_providers
        GROUP BY verification_status
      `) as any[];
      
      statusCounts = {
        ...statusCounts,
        verificationStatus: verStatusResult.reduce((acc, row) => {
          acc[row.verification_status] = row.count;
          return acc;
        }, {})
      };
    }
    
    // Get list of approved/verified providers
    const approvedProviders = await query(`
      SELECT id, name, provider_type, 
        ${hasApplicationStatus ? 'application_status' : "NULL as application_status"},
        ${hasVerificationStatus ? 'verification_status' : "NULL as verification_status"}
      FROM service_providers
      WHERE ${hasApplicationStatus ? "application_status IN ('approved', 'verified')" : 
            hasVerificationStatus ? "verification_status = 'verified'" : "1=0"}
    `) as any[];

    return NextResponse.json({
      success: true,
      tableExists: true,
      columns: columnNames,
      hasApplicationStatus,
      hasVerificationStatus,
      statusCounts,
      approvedProviders
    });
  } catch (error) {
    console.error('Error checking service provider data:', error);
    return NextResponse.json(
      { error: 'Failed to check service provider data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
