import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

/**
 * API endpoint to report a review
 * POST /api/reviews/report
 */
export async function POST(request: NextRequest) {
  try {
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Decode token to get user info
    let tokenUserId = null;
    if (authToken.includes('.')) {
      try {
        const { decodeTokenUnsafe } = await import('@/lib/jwt');
        const payload = decodeTokenUnsafe(authToken);
        tokenUserId = payload?.userId?.toString() || null;
      } catch (error) {
        console.error('Error decoding JWT token:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } else {
      const parts = authToken.split('_');
      if (parts.length === 2) {
        tokenUserId = parts[0];
      }
    }

    if (!tokenUserId) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const body = await request.json();
    const { review_id, report_reason } = body;

    if (!review_id || !report_reason) {
      return NextResponse.json({
        error: 'Review ID and report reason are required'
      }, { status: 400 });
    }

    // Check if the review exists
    const reviewResult = await query(
      'SELECT id, service_provider_id FROM reviews WHERE id = ?',
      [review_id]
    ) as any[];

    if (!reviewResult || reviewResult.length === 0) {
      return NextResponse.json({
        error: 'Review not found'
      }, { status: 404 });
    }

    // Check if report_reason and report_status columns exist, if not add them
    try {
      const columnsResult = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reviews'
        AND COLUMN_NAME IN ('report_reason', 'report_status', 'reported_by', 'reported_at')
      `) as any[];

      const existingColumns = new Set(columnsResult.map((row: any) => row.COLUMN_NAME));

      if (!existingColumns.has('report_reason')) {
        await query(`
          ALTER TABLE reviews
          ADD COLUMN report_reason TEXT NULL
        `);
      }

      if (!existingColumns.has('report_status')) {
        await query(`
          ALTER TABLE reviews
          ADD COLUMN report_status ENUM('none', 'pending', 'reviewed', 'dismissed') DEFAULT 'none'
        `);
      }

      if (!existingColumns.has('reported_by')) {
        await query(`
          ALTER TABLE reviews
          ADD COLUMN reported_by INT NULL
        `);
      }

      if (!existingColumns.has('reported_at')) {
        await query(`
          ALTER TABLE reviews
          ADD COLUMN reported_at TIMESTAMP NULL
        `);
      }
    } catch (error) {
      console.error('Error adding report columns:', error);
    }

    // Update the review with the report
    await query(
      `UPDATE reviews 
       SET report_reason = ?, report_status = 'pending', reported_by = ?, reported_at = NOW()
       WHERE id = ?`,
      [report_reason, tokenUserId, review_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Review reported successfully'
    });
  } catch (error) {
    console.error('Error reporting review:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An error occurred while reporting the review'
    }, { status: 500 });
  }
}
