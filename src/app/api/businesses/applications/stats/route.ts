import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Get statistics about business applications
export async function GET() {
  try {
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
        SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) AS declined
      FROM
        business_profiles
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
      declined: stats[0].declined || 0
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching business application statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}