import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';

/**
 * GET - Fetch appeal history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appealId = parseInt(params.id);
    console.log('🔍 [Appeal History] Fetching history for appeal:', appealId, 'User:', user.userId);
    
    if (isNaN(appealId)) {
      return NextResponse.json({ error: 'Invalid appeal ID' }, { status: 400 });
    }

    // Check if appeal exists and user has permission to view it
    const appeals = await query(`
      SELECT user_id FROM appeals WHERE appeal_id = ?
    `, [appealId]) as any[];

    if (!appeals || appeals.length === 0) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 });
    }

    const appeal = appeals[0];

    // Check permissions - users can only see their own appeal history, admins can see all
    if (user.accountType !== 'admin' && appeal.user_id !== parseInt(user.userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch appeal history
    console.log('🔍 [Appeal History] Querying appeal_history table...');
    try {
      const history = await query(`
        SELECT 
          h.*,
          admin.first_name as admin_first_name,
          admin.last_name as admin_last_name,
          admin.email as admin_email
        FROM appeal_history h
        LEFT JOIN users admin ON h.admin_id = admin.user_id
        WHERE h.appeal_id = ?
        ORDER BY h.changed_at ASC
      `, [appealId]) as any[];

      console.log('🔍 [Appeal History] Found history entries:', history.length);

      return NextResponse.json({
        success: true,
        history
      });
    } catch (historyError) {
      console.error('🔍 [Appeal History] Error querying history table:', historyError);
      // If the table doesn't exist or there's an error, return empty history
      return NextResponse.json({
        success: true,
        history: []
      });
    }

  } catch (error) {
    console.error('Error fetching appeal history:', error);
    return NextResponse.json({
      error: 'Failed to fetch appeal history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
