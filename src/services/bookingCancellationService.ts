/**
 * Booking Cancellation Service
 * Handles booking cancellations with automatic refund processing
 */

import { query } from '@/lib/db';
import { processRefund, RefundRequest } from '@/services/refundService';
import { sendRefundProcessedNotification, sendRefundInitiatedNotification } from '@/utils/refundNotificationService';
import { logAdminAction } from '@/utils/adminUtils';

export interface CancellationRequest {
  bookingId: number;
  reason: string;
  cancelledBy: number; // user ID who cancelled
  cancelledByType: 'customer' | 'admin' | 'system' | 'provider';
  notes?: string;
  ipAddress?: string;
  forceRefund?: boolean; // Force refund even if payment not confirmed
}

export interface CancellationResult {
  success: boolean;
  bookingCancelled: boolean;
  refundInitiated: boolean;
  refundId?: number;
  refundType?: 'automatic' | 'manual';
  refundInstructions?: string[];
  message: string;
  error?: string;
}

/**
 * Cancel booking with automatic refund processing
 */
export async function cancelBookingWithRefund(
  request: CancellationRequest
): Promise<CancellationResult> {
  try {
    // Get booking details
    const bookingInfo = await getBookingInfo(request.bookingId);
    if (!bookingInfo) {
      return {
        success: false,
        bookingCancelled: false,
        refundInitiated: false,
        message: 'Booking not found',
        error: 'BOOKING_NOT_FOUND'
      };
    }

    // Check if booking can be cancelled
    if (!canCancelBooking(bookingInfo.status)) {
      return {
        success: false,
        bookingCancelled: false,
        refundInitiated: false,
        message: `Cannot cancel booking with status: ${bookingInfo.status}`,
        error: 'INVALID_STATUS'
      };
    }

    // Cancel the booking first
    const cancellationSuccess = await cancelBooking(
      request.bookingId,
      request.reason,
      request.cancelledBy,
      request.cancelledByType,
      request.notes,
      request.ipAddress
    );

    if (!cancellationSuccess) {
      return {
        success: false,
        bookingCancelled: false,
        refundInitiated: false,
        message: 'Failed to cancel booking',
        error: 'CANCELLATION_FAILED'
      };
    }

    // Determine if refund should be processed
    const shouldProcessRefund = shouldInitiateRefund(
      bookingInfo,
      request.cancelledByType,
      request.forceRefund
    );

    if (!shouldProcessRefund.shouldRefund) {
      return {
        success: true,
        bookingCancelled: true,
        refundInitiated: false,
        message: `Booking cancelled successfully. ${shouldProcessRefund.reason}`,
      };
    }

    // Calculate refund amount
    const refundAmount = calculateRefundAmount(
      bookingInfo,
      request.cancelledByType
    );

    if (refundAmount <= 0) {
      return {
        success: true,
        bookingCancelled: true,
        refundInitiated: false,
        message: 'Booking cancelled successfully. No refund amount calculated.',
      };
    }

    // Process the refund
    const refundRequest: RefundRequest = {
      bookingId: request.bookingId,
      amount: refundAmount,
      reason: `Booking cancellation: ${request.reason}`,
      initiatedBy: request.cancelledBy,
      initiatedByType: request.cancelledByType === 'customer' ? 'system' : 
                      request.cancelledByType === 'admin' ? 'admin' : 'staff',
      notes: request.notes,
      ipAddress: request.ipAddress
    };

    const refundResult = await processRefund(refundRequest);

    // Send refund notifications
    if (refundResult.success && refundResult.refundId) {
      try {
        const notificationData = {
          refundId: refundResult.refundId,
          bookingId: request.bookingId,
          userId: bookingInfo.userId,
          amount: refundAmount,
          refundType: refundResult.refundType,
          paymentMethod: refundResult.paymentMethod,
          status: 'pending',
          reason: refundRequest.reason
        };

        if (refundResult.refundType === 'automatic') {
          await sendRefundProcessedNotification(notificationData);
        } else {
          await sendRefundInitiatedNotification(notificationData, refundResult.instructions);
        }
      } catch (notificationError) {
        console.error('Failed to send refund notifications:', notificationError);
        // Don't fail the cancellation if notifications fail
      }
    }

    return {
      success: true,
      bookingCancelled: true,
      refundInitiated: refundResult.success,
      refundId: refundResult.refundId,
      refundType: refundResult.refundType,
      refundInstructions: refundResult.instructions,
      message: refundResult.success 
        ? `Booking cancelled and refund of ₱${refundAmount.toFixed(2)} ${refundResult.refundType === 'automatic' ? 'processed' : 'initiated'} successfully`
        : `Booking cancelled successfully. Refund failed: ${refundResult.error}`,
      error: refundResult.success ? undefined : refundResult.error
    };

  } catch (error) {
    console.error('Error in booking cancellation with refund:', error);
    return {
      success: false,
      bookingCancelled: false,
      refundInitiated: false,
      message: 'Failed to process booking cancellation',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Get booking information for cancellation processing
 */
async function getBookingInfo(bookingId: number): Promise<any | null> {
  try {
    // Try service_bookings table first
    let results = await query(`
      SELECT 
        sb.id,
        sb.user_id as userId,
        sb.status,
        sb.price,
        sb.payment_status,
        sb.payment_method,
        sb.booking_date,
        sb.created_at,
        u.first_name,
        u.last_name,
        u.email,
        sp.name as service_name
      FROM service_bookings sb
      JOIN users u ON sb.user_id = u.user_id
      LEFT JOIN service_packages sp ON sb.package_id = sp.package_id
      WHERE sb.id = ?
    `, [bookingId]) as any[];

    if (results.length === 0) {
      // Fallback to bookings table
      results = await query(`
        SELECT 
          b.id,
          b.user_id as userId,
          b.status,
          COALESCE(b.price, b.total_price, b.total_amount, b.amount) as price,
          COALESCE(b.payment_status, 'not_paid') as payment_status,
          COALESCE(b.payment_method, 'cash') as payment_method,
          b.booking_date,
          b.created_at,
          u.first_name,
          u.last_name,
          u.email,
          'Cremation Service' as service_name
        FROM bookings b
        JOIN users u ON b.user_id = u.user_id
        WHERE b.id = ?
      `, [bookingId]) as any[];
    }

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting booking info:', error);
    return null;
  }
}

/**
 * Check if booking can be cancelled
 */
function canCancelBooking(status: string): boolean {
  const cancellableStatuses = ['pending', 'confirmed', 'in_progress'];
  return cancellableStatuses.includes(status.toLowerCase());
}

/**
 * Cancel booking in database
 */
async function cancelBooking(
  bookingId: number,
  reason: string,
  cancelledBy: number,
  cancelledByType: string,
  notes?: string,
  ipAddress?: string
): Promise<boolean> {
  try {
    // Try updating service_bookings first
    let result = await query(`
      UPDATE service_bookings 
      SET status = 'cancelled', 
          updated_at = NOW(),
          notes = CASE 
            WHEN notes IS NULL THEN ?
            ELSE CONCAT(notes, '\n\n[CANCELLED] ', ?)
          END
      WHERE id = ? AND status IN ('pending', 'confirmed', 'in_progress')
    `, [
      `Cancelled: ${reason}${notes ? ` - ${notes}` : ''}`,
      `Cancelled: ${reason}${notes ? ` - ${notes}` : ''}`,
      bookingId
    ]) as any;

    if (result.affectedRows === 0) {
      // Fallback to bookings table
      result = await query(`
        UPDATE bookings 
        SET status = 'cancelled', 
            updated_at = NOW()
        WHERE id = ? AND status IN ('pending', 'confirmed', 'in_progress')
      `, [bookingId]) as any;
    }

    // Log the cancellation action
    if (result.affectedRows > 0 && cancelledByType === 'admin') {
      await logAdminAction(
        cancelledBy,
        'cancel_booking',
        'booking',
        bookingId,
        {
          reason,
          cancelled_by_type: cancelledByType,
          notes
        },
        ipAddress
      );
    }

    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return false;
  }
}

/**
 * Determine if refund should be initiated
 */
function shouldInitiateRefund(
  bookingInfo: any,
  cancelledByType: string,
  forceRefund?: boolean
): { shouldRefund: boolean; reason: string } {
  // Force refund if explicitly requested
  if (forceRefund) {
    return { shouldRefund: true, reason: 'Refund forced by request' };
  }

  // No refund for unpaid bookings
  if (!bookingInfo.payment_status || bookingInfo.payment_status === 'not_paid') {
    return { shouldRefund: false, reason: 'No payment made - no refund required' };
  }

  // No refund for cash payments (handled manually)
  if (bookingInfo.payment_method === 'cash') {
    return { shouldRefund: false, reason: 'Cash payment - refund to be handled manually' };
  }

  // Always refund for paid electronic payments
  if (bookingInfo.payment_status === 'paid') {
    return { shouldRefund: true, reason: 'Electronic payment confirmed - processing refund' };
  }

  // No refund for failed or pending payments
  if (['failed', 'pending'].includes(bookingInfo.payment_status)) {
    return { shouldRefund: false, reason: `Payment status is ${bookingInfo.payment_status} - no refund required` };
  }

  // Default to no refund for unknown payment status
  return { shouldRefund: false, reason: 'Payment status unclear - no automatic refund' };
}

/**
 * Calculate refund amount based on cancellation policy
 */
function calculateRefundAmount(
  bookingInfo: any,
  cancelledByType: string
): number {
  const originalAmount = parseFloat(bookingInfo.price || 0);
  
  if (originalAmount <= 0) {
    return 0;
  }

  // Get time difference between booking and cancellation
  const bookingDate = new Date(bookingInfo.created_at);
  const now = new Date();
  const hoursDifference = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60);

  // Refund policy based on who cancelled and when
  switch (cancelledByType) {
    case 'admin':
    case 'system':
      // Full refund for admin/system cancellations
      return originalAmount;
      
    case 'provider':
      // Full refund for provider cancellations
      return originalAmount;
      
    case 'customer':
      // Customer cancellation policy
      if (hoursDifference < 24) {
        // Within 24 hours: 100% refund
        return originalAmount;
      } else if (hoursDifference < 48) {
        // 24-48 hours: 50% refund
        return originalAmount * 0.5;
      } else {
        // More than 48 hours: 25% refund
        return originalAmount * 0.25;
      }
      
    default:
      // Default to full refund
      return originalAmount;
  }
}

/**
 * Get cancellation policy info for display
 */
export function getCancellationPolicy(): {
  policy: string;
  details: string[];
} {
  return {
    policy: "Refund Policy for Cremation Services",
    details: [
      "Customer cancellations within 24 hours: 100% refund",
      "Customer cancellations within 24-48 hours: 50% refund", 
      "Customer cancellations after 48 hours: 25% refund",
      "Provider or admin cancellations: 100% refund",
      "Automatic refunds processed for electronic payments",
      "Manual refunds required for cash or QR code payments",
      "Refunds processed within 3-5 business days"
    ]
  };
}
