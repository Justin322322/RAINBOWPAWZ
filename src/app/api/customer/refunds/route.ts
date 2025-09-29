/**
 * Customer Refunds API
 * Handles customer refund data and receipt downloads
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { getCustomerRefunds, generateRefundReceipt } from '@/services/refundService';

/**
 * GET /api/customer/refunds - Get customer's refunds
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only customers (fur_parent) can access this endpoint
    if (authResult.accountType !== 'fur_parent') {
      return NextResponse.json({ 
        error: 'Access denied. Customer account required.' 
      }, { status: 403 });
    }

    const refunds = await getCustomerRefunds(parseInt(authResult.userId));

    return NextResponse.json({
      success: true,
      refunds
    });

  } catch (error) {
    console.error('Error fetching customer refunds:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch refunds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/customer/refunds/[id]/receipt - Generate refund receipt
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only customers (fur_parent) can access this endpoint
    if (authResult.accountType !== 'fur_parent') {
      return NextResponse.json({ 
        error: 'Access denied. Customer account required.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { refundId } = body;

    if (!refundId) {
      return NextResponse.json({ 
        error: 'Refund ID is required' 
      }, { status: 400 });
    }

    // Generate receipt
    const result = await generateRefundReceipt(refundId);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to generate receipt' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      receiptPath: result.receiptPath,
      message: 'Receipt generated successfully'
    });

  } catch (error) {
    console.error('Error generating refund receipt:', error);
    return NextResponse.json({ 
      error: 'Failed to generate receipt',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
