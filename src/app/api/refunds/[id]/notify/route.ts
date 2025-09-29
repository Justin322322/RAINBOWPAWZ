/**
 * Refund Notification API
 * Handles sending notifications to customers about refund status
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { getRefundById } from '@/lib/db/refunds';
import { sendRefundCompletionNotification } from '@/services/refundService';

/**
 * POST /api/refunds/[id]/notify - Send notification to customer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and business users can send notifications
    if (!['admin', 'business'].includes(authResult.accountType)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to send notifications' 
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const refundId = parseInt(resolvedParams.id);
    if (isNaN(refundId)) {
      return NextResponse.json({ error: 'Invalid refund ID' }, { status: 400 });
    }

    const refund = await getRefundById(refundId);
    if (!refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    // Check if refund is completed
    if (refund.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Can only send notifications for completed refunds' 
      }, { status: 400 });
    }

    // Send notification
    const result = await sendRefundCompletionNotification(refundId);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to send notification' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Customer notification sent successfully'
    });

  } catch (error) {
    console.error('Error sending refund notification:', error);
    return NextResponse.json({ 
      error: 'Failed to send notification',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
