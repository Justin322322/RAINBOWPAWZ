/**
 * Refunds API Routes
 * Handles refund creation, management, and status tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { processRefund, initializeRefundService } from '@/services/refundService';
import { getRefundsByBookingId } from '@/lib/db/refunds';
import { sendRefundProcessedNotification, sendRefundInitiatedNotification } from '@/utils/refundNotificationService';
import { logAdminAction } from '@/utils/adminUtils';

/**
 * GET /api/refunds - Get refunds by booking ID or user ID
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize refund service and ensure tables exist
    await initializeRefundService();

    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('booking_id');
    const userId = searchParams.get('user_id');

    if (!bookingId && !userId) {
      return NextResponse.json({ 
        error: 'Either booking_id or user_id parameter is required' 
      }, { status: 400 });
    }

    // Initialize refund service
    await initializeRefundService();

    let refunds: any[] = [];

    if (bookingId) {
      // Get refunds for specific booking
      refunds = await getRefundsByBookingId(parseInt(bookingId));
      
      // Check if user has access to this booking
      if (authResult.accountType !== 'admin' && authResult.accountType !== 'business') {
        // For regular users, verify they own the booking
        const userOwnedRefunds = refunds.filter(refund => refund.user_id === parseInt(authResult.userId));
        refunds = userOwnedRefunds;
      }
    } else if (userId && authResult.accountType === 'admin') {
      // Only admins can query by user ID
      // This would require a new function to get refunds by user ID
      return NextResponse.json({ 
        error: 'Query by user_id not yet implemented' 
      }, { status: 501 });
    }

    return NextResponse.json({ 
      success: true, 
      refunds 
    });

  } catch (error) {
    console.error('Error fetching refunds:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch refunds',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/refunds - Create a new refund
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and business users can initiate refunds
    if (!['admin', 'business'].includes(authResult.accountType)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to initiate refunds' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { bookingId, amount, reason, notes } = body;

    // Validate required fields
    if (!bookingId || !amount || !reason) {
      return NextResponse.json({ 
        error: 'Missing required fields: bookingId, amount, and reason are required' 
      }, { status: 400 });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be a positive number' 
      }, { status: 400 });
    }

    // Get client IP for audit trail
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Process the refund
    const refundResult = await processRefund({
      bookingId: parseInt(bookingId),
      amount: amount,
      reason: reason.toString(),
      initiatedBy: parseInt(authResult.userId),
      initiatedByType: authResult.accountType === 'admin' ? 'admin' : 'staff',
      notes: notes ? notes.toString() : undefined,
      ipAddress: clientIp
    });

    // Log admin action for audit trail
    if (authResult.accountType === 'admin') {
      await logAdminAction(
        parseInt(authResult.userId),
        'initiate_refund',
        'booking',
        parseInt(bookingId),
        {
          refund_id: refundResult.refundId,
          amount: amount,
          reason: reason.toString(),
          refund_type: refundResult.refundType
        },
        clientIp
      );
    }

    // Send notifications based on refund result
    if (refundResult.success && refundResult.refundId) {
      try {
        // Get additional booking details for notifications
        const notificationData = {
          refundId: refundResult.refundId,
          bookingId: parseInt(bookingId),
          userId: 0, // Will be populated by notification service
          amount: amount,
          refundType: refundResult.refundType,
          paymentMethod: refundResult.paymentMethod,
          status: 'pending',
          reason: reason.toString()
        };

        if (refundResult.refundType === 'automatic') {
          await sendRefundProcessedNotification(notificationData);
        } else {
          await sendRefundInitiatedNotification(notificationData, refundResult.instructions);
        }
      } catch (notificationError) {
        console.error('Failed to send refund notifications:', notificationError);
        // Don't fail the refund if notifications fail
      }
    }

    return NextResponse.json({
      success: refundResult.success,
      refund_id: refundResult.refundId,
      refund_type: refundResult.refundType,
      payment_method: refundResult.paymentMethod,
      message: refundResult.message,
      requires_manual_processing: refundResult.requiresManualProcessing,
      instructions: refundResult.instructions,
      error: refundResult.error
    }, { status: refundResult.success ? 200 : 400 });

  } catch (error) {
    console.error('Error creating refund:', error);
    return NextResponse.json({ 
      error: 'Failed to create refund',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
