/**
 * Booking Cancellation Service
 * Handles booking cancellations with automatic refund processing
 */

import { query } from '@/lib/db';
import { processRefund, RefundRequest } from '@/services/refundService';
import { createRefundRecord, logRefundAudit } from '@/lib/db/refunds';
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

    // Restore availability: re-open the booked slot and mark day available
    try {
      const providerId: number | undefined = bookingInfo.providerId || bookingInfo.provider_id;
      const bookingDate: string | undefined = bookingInfo.booking_date;
      const bookingTime: string | undefined = bookingInfo.booking_time;
      if (providerId && bookingDate && bookingTime) {
        // Compute end time as +1 hour window
        const [hh, mm] = String(bookingTime).substring(0,5).split(':');
        const startH = Math.max(0, Math.min(23, parseInt(hh || '0', 10)));
        const endH = (startH + 1) % 24;
        const endTime = `${String(endH).padStart(2,'0')}:${mm || '00'}`;

        // Insert slot if missing
        await query(
          `INSERT INTO availability_time_slots (provider_id, availability_date, start_time, end_time)
           SELECT ?, ?, STR_TO_DATE(?, '%H:%i'), STR_TO_DATE(?, '%H:%i')
           WHERE NOT EXISTS (
             SELECT 1 FROM availability_time_slots 
             WHERE provider_id = ? AND availability_date = ? AND start_time = STR_TO_DATE(?, '%H:%i')
           )`,
          [providerId, bookingDate, bookingTime.substring(0,5), endTime, providerId, bookingDate, bookingTime.substring(0,5)]
        );

        // Ensure the day is marked available
        await query(
          `INSERT INTO provider_availability (provider_id, availability_date, is_available)
           VALUES (?, ?, 1)
           ON DUPLICATE KEY UPDATE is_available = 1, updated_at = NOW()`,
          [providerId, bookingDate]
        );
      }
    } catch (availError) {
      console.warn('Cancellation: failed to restore availability slot (non-fatal):', availError);
    }

    // Calculate refund amount first
    const refundAmount = calculateRefundAmount(
      bookingInfo,
      request.cancelledByType
    );

    // Determine if refund should be processed (enhanced for GCASH/e-payments)
    const shouldProcessRefund = await shouldInitiateRefundAsync(
      bookingInfo,
      request.cancelledByType,
      request.forceRefund
    );

    console.log('Cancellation refund check:', {
      bookingId: request.bookingId,
      paymentMethod: bookingInfo.payment_method,
      paymentStatus: bookingInfo.payment_status,
      refundAmount: refundAmount,
      shouldRefund: shouldProcessRefund.shouldRefund,
      reason: shouldProcessRefund.reason
    });

    // Always create a refund record for cancelled bookings (for tracking)
    // Even if payment wasn't made, create a $0 refund record
    const actualRefundAmount = shouldProcessRefund.shouldRefund && refundAmount > 0 
      ? refundAmount 
      : 0;

    // If no refund needed, still create a record with status 'cancelled' for tracking
    if (!shouldProcessRefund.shouldRefund || actualRefundAmount <= 0) {
      try {
        const trackingRefundId = await createRefundRecord({
          booking_id: request.bookingId,
          user_id: bookingInfo.userId,
          amount: actualRefundAmount,
          reason: `Booking cancellation: ${request.reason}${!shouldProcessRefund.shouldRefund ? ` (${shouldProcessRefund.reason})` : ''}`,
          status: actualRefundAmount > 0 ? 'pending' : 'cancelled',
          refund_type: 'manual',
          payment_method: (bookingInfo.payment_method || 'cash') as any,
          initiated_at: new Date()
        });

        await logRefundAudit({
          refund_id: trackingRefundId,
          action: 'created',
          new_status: actualRefundAmount > 0 ? 'pending' : 'cancelled',
          performed_by: request.cancelledBy,
          performed_by_type: request.cancelledByType === 'admin' ? 'admin' : 'system',
          details: `Tracking refund created for cancelled booking ${request.bookingId}`,
          ip_address: request.ipAddress
        });

        return {
          success: true,
          bookingCancelled: true,
          refundInitiated: actualRefundAmount > 0,
          refundId: trackingRefundId,
          refundType: 'manual',
          message: actualRefundAmount > 0 
            ? `Booking cancelled successfully. Refund of ₱${actualRefundAmount.toFixed(2)} pending approval.`
            : `Booking cancelled successfully. ${shouldProcessRefund.reason}`,
        };
      } catch (trackingError) {
        console.error('Failed to create tracking refund:', trackingError);
        return {
          success: true,
          bookingCancelled: true,
          refundInitiated: false,
          message: `Booking cancelled successfully. ${shouldProcessRefund.reason}`,
        };
      }
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

    console.log('Refund processing result:', {
      bookingId: request.bookingId,
      refundResult: refundResult,
      refundRequest: refundRequest
    });

    // If refund processing failed (e.g., PayMongo not executed), create a manual pending refund so it appears in reports
    if (!refundResult.success) {
      try {
        const createdRefundId = await createRefundRecord({
          booking_id: request.bookingId,
          user_id: bookingInfo.userId,
          amount: refundAmount,
          reason: refundRequest.reason,
          status: 'pending',
          refund_type: 'manual',
          payment_method: (bookingInfo.payment_method || 'cash') as any,
          initiated_at: new Date()
        });

        await logRefundAudit({
          refund_id: createdRefundId,
          action: 'created',
          new_status: 'pending',
          performed_by: request.cancelledBy,
          performed_by_type: request.cancelledByType === 'admin' ? 'admin' : request.cancelledByType === 'customer' ? 'system' : 'staff',
          details: `Refund created via cancellation fallback for booking ${request.bookingId}`,
          ip_address: request.ipAddress
        });
      } catch (fallbackErr) {
        console.warn('Cancellation: refund fallback creation failed (non-fatal):', fallbackErr);
      }
    }

    // Send refund notifications_unified
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
        console.error('Failed to send refund notifications_unified:', notificationError);
        // Don't fail the cancellation if notifications_unified fail
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
    // Try bookings table first
    let results = await query(`
      SELECT 
        sb.id,
        sb.user_id as userId,
        sb.provider_id as providerId,
        sb.status,
        COALESCE(sb.total_price, sb.base_price, 0) as price,
        sb.booking_time,
        sb.payment_status,
        sb.payment_method,
        sb.booking_date,
        sb.created_at,
        u.first_name,
        u.last_name,
        u.email,
        sp.name as service_name
      FROM bookings sb
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
          b.provider_id as providerId,
          b.status,
          COALESCE(b.total_price, b.base_price, 0) as price,
          b.booking_time,
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
    // Try updating bookings first
    let result = await query(`
      UPDATE bookings 
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
 * Async variant: ensures that cancelled/expired GCASH (or other e-payments) are treated as refundable
 */
async function shouldInitiateRefundAsync(
  bookingInfo: any,
  cancelledByType: string,
  forceRefund?: boolean
): Promise<{ shouldRefund: boolean; reason: string }> {
  // Honor explicit force
  if (forceRefund) {
    return { shouldRefund: true, reason: 'Refund forced by request' };
  }

  const paymentMethod = (bookingInfo.payment_method || '').toLowerCase();
  const normalizedMethod = paymentMethod.includes('gcash') ? 'gcash'
                        : paymentMethod.includes('card') ? 'card'
                        : paymentMethod.includes('maya') ? 'paymaya'
                        : paymentMethod.includes('qr') ? 'qr'
                        : paymentMethod.includes('cash') ? 'cash'
                        : paymentMethod;

  const status = (bookingInfo.payment_status || 'not_paid').toLowerCase();

  // If electronic payment succeeded -> refund
  if (status === 'paid' || status === 'succeeded') {
    return { shouldRefund: true, reason: 'Electronic payment confirmed - processing refund' };
  }

  // If GCASH/PayMongo source or intent exists and is cancelled/expired/failed, still auto-refund the booking amount to clear the ledger
  if (['gcash', 'card', 'paymaya'].includes(normalizedMethod)) {
    if (['cancelled', 'failed', 'expired'].includes(status)) {
      return { shouldRefund: true, reason: 'Payment session cancelled/failed - issuing automatic refund record' };
    }
  }

  // For QR and cash payments, create pending refund for approval
  if (normalizedMethod === 'cash' || normalizedMethod === 'qr') {
    return { shouldRefund: true, reason: `${normalizedMethod.toUpperCase()} payment - creating pending refund for approval` };
  }

  // Default to existing logic
  return shouldInitiateRefund(bookingInfo, cancelledByType, forceRefund);
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
