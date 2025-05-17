import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Get statistics about business applications
export async function GET() {
  try {
    // First, check if the business_application_stats view exists
    const viewExists = await query(`
      SELECT COUNT(*) AS count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'business_application_stats'
      AND table_type = 'VIEW'
    `) as any[];

    if (viewExists[0]?.count > 0) {
      // Use the view if it exists
      const viewStats = await query('SELECT * FROM business_application_stats') as any[];
      
      if (!viewStats || viewStats.length === 0) {
        return NextResponse.json({
          error: 'Failed to fetch statistics from view'
        }, { status: 500 });
      }
      
      return NextResponse.json(viewStats[0]);
    }

    // If the view doesn't exist, check if service_providers table has application_status
    const hasApplicationStatus = await query(`
      SHOW COLUMNS FROM service_providers LIKE 'application_status'
    `) as any[];

    if (hasApplicationStatus.length > 0) {
      // Use the application_status field
      const stats = await query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN application_status = 'approved' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN application_status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN application_status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing,
          SUM(CASE WHEN application_status = 'declined' THEN 1 ELSE 0 END) AS declined,
          SUM(CASE WHEN application_status = 'documents_required' THEN 1 ELSE 0 END) AS documents_required
        FROM
          service_providers
      `) as any[];

      if (!stats || stats.length === 0) {
        return NextResponse.json({
          error: 'Failed to fetch statistics'
        }, { status: 500 });
      }

      return NextResponse.json(stats[0]);
    } else {
      // Fall back to the old schema using verification_status
      const stats = await query(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE
                WHEN verification_status = 'pending' AND
                    (business_permit_path IS NULL OR government_id_path IS NULL)
                THEN 1 ELSE 0
              END) AS pending,
          SUM(CASE
                WHEN verification_status = 'pending' AND
                    business_permit_path IS NOT NULL AND
                    government_id_path IS NOT NULL
                THEN 1 ELSE 0
              END) AS reviewing,
          SUM(CASE WHEN verification_status = 'rejected' OR verification_status = 'declined' THEN 1 ELSE 0 END) AS declined,
          SUM(CASE WHEN verification_status = 'documents_required' THEN 1 ELSE 0 END) AS documents_required
        FROM
          service_providers
      `) as any[];

      if (!stats || stats.length === 0) {
        return NextResponse.json({
          error: 'Failed to fetch statistics'
        }, { status: 500 });
      }

      const result = {
        total: stats[0].total || 0,
        pending: stats[0].pending || 0,
        reviewing: stats[0].reviewing || 0,
        approved: stats[0].approved || 0,
        declined: stats[0].declined || 0,
        documents_required: stats[0].documents_required || 0
      };

      return NextResponse.json(result);
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}