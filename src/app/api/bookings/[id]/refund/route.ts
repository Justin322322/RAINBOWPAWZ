import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest } from '@/utils/auth';
import {
  checkRefundEligibility,
  createRefundRecord
} from '@/services/refundService';
import { REFUND_REASONS } from '@/types/refund';
import { query } from '@/lib/db';
import { createAdminNotification } from '@/services/NotificationService';
import { sendEmail } from '@/services/EmailService';
import { createRefundNotificationEmail } from '@/services/EmailTemplates';

/**
 * POST - Request a refund for a booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id);

    // Verify user authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    if (!userId || accountType !== 'user') {
      return NextResponse.json({
        error: 'Unauthorized - User access required'
      }, { status: 403 });
    }

    if (!bookingId || isNaN(bookingId)) {
      return NextResponse.json({
        error: 'Invalid booking ID'
      }, { status: 400 });
    }

    // Verify booking ownership
    const bookingResult = await query(`
      SELECT * FROM service_bookings WHERE id = ? AND user_id = ?
    `, [bookingId, userId]) as any[];

    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json({
        error: 'Booking not found or access denied'
      }, { status: 404 });
    }

    const booking = bookingResult[0];

    // Get refund request data
    const body = await request.json();
    const { reason = REFUND_REASONS.USER_REQUESTED, notes } = body;

    // Check refund eligibility
    const eligibilityCheck = await checkRefundEligibility(bookingId);
    if (!eligibilityCheck.eligible) {
      return NextResponse.json({
        error: eligibilityCheck.reason || 'Booking is not eligible for refund'
      }, { status: 400 });
    }

    // Create refund request (not automatic processing)
    const refundId = await createRefundRecord({
      booking_id: bookingId,
      reason: reason,
      amount: parseFloat(booking.price),
      notes: notes
    });

    // Create admin notification for refund request
    try {
      const result = await createAdminNotification({
        type: 'refund_request',
        title: 'New Refund Request',
        message: `Refund request for booking #${bookingId} (${booking.pet_name}) - Amount: ₱${parseFloat(booking.price).toFixed(2)}`,
        entityType: 'refund',
        entityId: refundId
      });
      
      if (!result.success) {
        console.error('Failed to create admin notification:', result.error);
      } else {
      }
    } catch (notificationError) {
      console.error('Failed to create admin notification:', notificationError);
    }

    // Send email confirmation to user
    try {
      // Get user details
      const userResult = await query(`
        SELECT email, name FROM users WHERE id = ?
      `, [userId]) as any[];

      if (userResult && userResult.length > 0) {
        const user = userResult[0];

        const refundEmailContent = createRefundNotificationEmail({
          customerName: user.name,
          bookingId: bookingId.toString(),
          petName: booking.pet_name,
          amount: parseFloat(booking.price),
          reason: reason,
          status: 'pending',
          paymentMethod: booking.payment_method || 'GCash',
          estimatedDays: 2,
          notes: 'Your refund request has been submitted and is pending admin approval.'
        });

        await sendEmail({
          to: user.email,
          subject: refundEmailContent.subject,
          html: refundEmailContent.html
        });
      }
    } catch (emailError) {
      console.error('Failed to send refund confirmation email:', emailError);
    }

    // Return success with pending status (awaiting admin approval)
    return NextResponse.json({
      success: true,
      message: 'Refund request submitted successfully. Our team will review your request and process it within 1-2 business days.',
      refund: {
        id: refundId,
        booking_id: bookingId,
        amount: parseFloat(booking.price),
        reason: reason,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Refund request error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Check refund eligibility for a booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const bookingId = parseInt(id);

    // Verify user authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    if (!userId || accountType !== 'user') {
      return NextResponse.json({
        error: 'Unauthorized - User access required'
      }, { status: 403 });
    }

    if (!bookingId || isNaN(bookingId)) {
      return NextResponse.json({
        error: 'Invalid booking ID'
      }, { status: 400 });
    }

    // Verify booking ownership
    const bookingResult = await query(`
      SELECT * FROM service_bookings WHERE id = ? AND user_id = ?
    `, [bookingId, userId]) as any[];

    if (!bookingResult || bookingResult.length === 0) {
      return NextResponse.json({
        error: 'Booking not found or access denied'
      }, { status: 404 });
    }

    // Check refund eligibility
    const eligibilityCheck = await checkRefundEligibility(bookingId);

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      eligible: eligibilityCheck.eligible,
      reason: eligibilityCheck.reason,
      booking_status: eligibilityCheck.booking_status,
      payment_status: eligibilityCheck.payment_status,
      amount: eligibilityCheck.amount,
      refund_policy: eligibilityCheck.refund_policy
    });

  } catch (error) {
    console.error('Refund eligibility check error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
