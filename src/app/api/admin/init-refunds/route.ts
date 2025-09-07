/**
 * Initialize Refunds Tables API
 * One-time endpoint to create refund tables in the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { initializeRefundTables } from '@/lib/db/refunds';

/**
 * POST /api/admin/init-refunds - Initialize refund tables
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin users can access this endpoint
    if (authResult.accountType !== 'admin') {
      return NextResponse.json({ 
        error: 'Access denied. Admin privileges required.' 
      }, { status: 403 });
    }

    // Initialize refund tables
    await initializeRefundTables();

    return NextResponse.json({ 
      success: true,
      message: 'Refund tables initialized successfully' 
    });

  } catch (error) {
    console.error('Error initializing refund tables:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize refund tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
