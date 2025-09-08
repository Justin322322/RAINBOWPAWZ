/**
 * Refund Service
 * Handles comprehensive refund processing with automatic and manual workflows
 */

import { query } from '@/lib/db';
import { 
  createRefund as createPayMongoRefund, 
  listPaymentsBySource,
  phpToCentavos
} from '@/lib/paymongo';
import {
  createRefundRecord,
  updateRefundRecord,
  logRefundAudit,
  getRefundsByBookingId,
  hasExistingRefund,
  initializeRefundTables,
  RefundRecord
} from '@/lib/db/refunds';

export interface RefundRequest {
  bookingId: number;
  amount: number;
  reason: string;
  initiatedBy: number; // user ID who initiated the refund
  initiatedByType: 'system' | 'admin' | 'staff';
  notes?: string;
  ipAddress?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: number;
  refundType: 'automatic' | 'manual';
  paymentMethod: string;
  message: string;
  error?: string;
  requiresManualProcessing?: boolean;
  instructions?: string[];
}

export interface BookingPaymentInfo {
  bookingId: number;
  userId: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  sourceId?: string;
  transactionId?: string;
  paymentId?: string;
}

/**
 * Initialize refund service (ensure database tables exist)
 */
export async function initializeRefundService(): Promise<void> {
  await initializeRefundTables();
}

/**
 * Process a refund request with automatic payment method detection
 */
export async function processRefund(request: RefundRequest): Promise<RefundResult> {
  try {
    // Initialize tables if not exists
    await initializeRefundService();

    // Check if refund already exists for this booking
    const existingRefund = await hasExistingRefund(request.bookingId);
    if (existingRefund) {
      return {
        success: false,
        refundType: 'automatic',
        paymentMethod: 'unknown',
        message: 'Refund already exists for this booking',
        error: 'REFUND_ALREADY_EXISTS'
      };
    }

    // Get booking and payment information
    const bookingInfo = await getBookingPaymentInfo(request.bookingId);
    if (!bookingInfo) {
      return {
        success: false,
        refundType: 'automatic',
        paymentMethod: 'unknown',
        message: 'Booking not found or payment information unavailable',
        error: 'BOOKING_NOT_FOUND'
      };
    }

    // Validate refund amount
    if (request.amount > bookingInfo.amount) {
      return {
        success: false,
        refundType: 'automatic',
        paymentMethod: bookingInfo.paymentMethod,
        message: 'Refund amount cannot exceed original payment amount',
        error: 'INVALID_AMOUNT'
      };
    }

    // Determine payment method and processing type
    const { canAutoProcess } = determineRefundType(bookingInfo.paymentMethod);

    if (canAutoProcess) {
      return await processAutomaticRefund(request, bookingInfo);
    } else {
      return await processManualRefund(request, bookingInfo);
    }

  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      success: false,
      refundType: 'automatic',
      paymentMethod: 'unknown',
      message: 'Failed to process refund due to system error',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Process automatic refund through PayMongo API
 */
async function processAutomaticRefund(
  request: RefundRequest, 
  bookingInfo: BookingPaymentInfo
): Promise<RefundResult> {
  try {
    // Find the PayMongo payment ID
    let paymentId: string | null = null;

    // Prefer payment_intent/payment_id captured in transactions
    if (bookingInfo.paymentId) {
      paymentId = bookingInfo.paymentId;
    } else if (bookingInfo.transactionId) {
      // Some integrations store intent/payment id in provider_transaction_id
      paymentId = bookingInfo.transactionId;
    } else if (bookingInfo.sourceId) {
      // Find payment by source ID
      const payments = await listPaymentsBySource(bookingInfo.sourceId);
      const successfulPayment = payments.find(p => p.attributes.status === 'paid');
      if (successfulPayment) {
        paymentId = successfulPayment.id;
      }
    }

    if (!paymentId) {
      // Fall back to manual processing if no payment ID found
      return await processManualRefund(request, bookingInfo);
    }

    // Create refund record first
    const refundId = await createRefundRecord({
      booking_id: request.bookingId,
      user_id: bookingInfo.userId,
      amount: request.amount,
      reason: request.reason,
      status: 'pending',
      refund_type: 'automatic',
      payment_method: normalizePaymentMethod(bookingInfo.paymentMethod),
      transaction_id: bookingInfo.transactionId || undefined,
      processed_by: request.initiatedBy,
      notes: request.notes || undefined,
      metadata: JSON.stringify({
        paymongo_payment_id: paymentId,
        initiated_by_type: request.initiatedByType,
        original_amount: bookingInfo.amount
      }),
      initiated_at: new Date()
    });

    // Log audit trail
    await logRefundAudit({
      refund_id: refundId,
      action: 'refund_initiated',
      new_status: 'pending',
      performed_by: request.initiatedBy,
      performed_by_type: request.initiatedByType,
      details: `Automatic refund initiated for booking ${request.bookingId}`,
      ip_address: request.ipAddress
    });

    try {
      // Update status to processing
      await updateRefundRecord(refundId, { status: 'processing' });
      await logRefundAudit({
        refund_id: refundId,
        action: 'status_change',
        previous_status: 'pending',
        new_status: 'processing',
        performed_by: request.initiatedBy,
        performed_by_type: 'system',
        details: 'Initiating PayMongo refund API call'
      });

      // Create refund through PayMongo
      const paymongoRefund = await createPayMongoRefund({
        payment_id: paymentId,
        amount: phpToCentavos(request.amount),
        reason: 'requested_by_customer',
        notes: request.reason,
        metadata: {
          booking_id: request.bookingId.toString(),
          refund_id: refundId.toString(),
          initiated_by: request.initiatedBy.toString()
        }
      });

      // Update refund record with PayMongo details
      await updateRefundRecord(refundId, {
        status: 'completed',
        paymongo_refund_id: paymongoRefund.id,
        processed_at: new Date(),
        completed_at: new Date()
      });

      // Log successful completion
      await logRefundAudit({
        refund_id: refundId,
        action: 'refund_completed',
        previous_status: 'processing',
        new_status: 'completed',
        performed_by: request.initiatedBy,
        performed_by_type: 'system',
        details: `PayMongo refund completed: ${paymongoRefund.id}`,
        ip_address: request.ipAddress
      });

      return {
        success: true,
        refundId,
        refundType: 'automatic',
        paymentMethod: bookingInfo.paymentMethod,
        message: `Automatic refund of ₱${request.amount.toFixed(2)} processed successfully`
      };

    } catch (paymongoError) {
      console.error('PayMongo refund failed:', paymongoError);
      
      // Update status to failed
      await updateRefundRecord(refundId, { 
        status: 'failed',
        notes: `PayMongo API error: ${paymongoError instanceof Error ? paymongoError.message : 'Unknown error'}`
      });

      await logRefundAudit({
        refund_id: refundId,
        action: 'refund_failed',
        previous_status: 'processing',
        new_status: 'failed',
        performed_by: request.initiatedBy,
        performed_by_type: 'system',
        details: `PayMongo API error: ${paymongoError instanceof Error ? paymongoError.message : 'Unknown error'}`,
        ip_address: request.ipAddress
      });

      // Fall back to manual processing
      return await processManualRefund(request, bookingInfo);
    }

  } catch (error) {
    console.error('Error in automatic refund processing:', error);
    throw error;
  }
}

/**
 * Process manual refund (for QR codes or when automatic fails)
 */
async function processManualRefund(
  request: RefundRequest, 
  bookingInfo: BookingPaymentInfo
): Promise<RefundResult> {
  try {
    // Create refund record for manual processing
    const refundId = await createRefundRecord({
      booking_id: request.bookingId,
      user_id: bookingInfo.userId,
      amount: request.amount,
      reason: request.reason,
      status: 'pending',
      refund_type: 'manual',
      payment_method: normalizePaymentMethod(bookingInfo.paymentMethod),
      transaction_id: bookingInfo.transactionId || undefined,
      processed_by: request.initiatedBy,
      notes: request.notes || undefined,
      metadata: JSON.stringify({
        initiated_by_type: request.initiatedByType,
        original_amount: bookingInfo.amount,
        requires_receipt_upload: isQRCodePayment(bookingInfo.paymentMethod)
      }),
      initiated_at: new Date()
    });

    // Log audit trail
    await logRefundAudit({
      refund_id: refundId,
      action: 'manual_refund_initiated',
      new_status: 'pending',
      performed_by: request.initiatedBy,
      performed_by_type: request.initiatedByType,
      details: `Manual refund initiated for booking ${request.bookingId}`,
      ip_address: request.ipAddress
    });

    const instructions = generateManualRefundInstructions(bookingInfo.paymentMethod, request.amount);

    return {
      success: true,
      refundId,
      refundType: 'manual',
      paymentMethod: bookingInfo.paymentMethod,
      message: 'Manual refund initiated. Please follow the instructions to complete the process.',
      requiresManualProcessing: true,
      instructions
    };

  } catch (error) {
    console.error('Error in manual refund processing:', error);
    throw error;
  }
}

/**
 * Get booking and payment information
 */
async function getBookingPaymentInfo(bookingId: number): Promise<BookingPaymentInfo | null> {
  try {
    // Try bookings table first (map to existing transaction columns)
    let bookingResults = await query(`
      SELECT 
        sb.id AS booking_id,
        sb.user_id,
        sb.total_price AS amount,
        sb.payment_method,
        sb.payment_status,
        pt.source_id,
        pt.payment_intent_id AS payment_id,
        pt.provider_transaction_id AS transaction_id
      FROM bookings sb
      LEFT JOIN payment_transactions pt ON sb.id = pt.booking_id
      WHERE sb.id = ?
      ORDER BY pt.id DESC
      LIMIT 1
    `, [bookingId]) as any[];

    if (bookingResults.length === 0) {
      // Fallback to bookings table
      bookingResults = await query(`
        SELECT 
          b.id AS booking_id,
          b.user_id,
          COALESCE(b.price, b.total_price, b.total_amount, b.amount) AS amount,
          COALESCE(b.payment_method, 'cash') AS payment_method,
          COALESCE(b.payment_status, 'not_paid') AS payment_status,
          pt.source_id,
          pt.payment_intent_id AS payment_id,
          pt.provider_transaction_id AS transaction_id
        FROM bookings b
        LEFT JOIN payment_transactions pt ON b.id = pt.booking_id
        WHERE b.id = ?
        ORDER BY pt.id DESC
        LIMIT 1
      `, [bookingId]) as any[];
    }

    if (bookingResults.length === 0) {
      return null;
    }

    const booking = bookingResults[0];
    return {
      bookingId: booking.booking_id,
      userId: booking.user_id,
      amount: parseFloat(booking.amount || 0),
      paymentMethod: booking.payment_method || 'cash',
      paymentStatus: booking.payment_status || 'not_paid',
      sourceId: booking.source_id,
      transactionId: booking.transaction_id,
      paymentId: booking.payment_id
    };

  } catch (error) {
    console.error('Error getting booking payment info:', error);
    return null;
  }
}

/**
 * Determine refund type based on payment method
 */
function determineRefundType(paymentMethod: string): { refundType: 'automatic' | 'manual', canAutoProcess: boolean } {
  const normalizedMethod = normalizePaymentMethod(paymentMethod);
  
  // QR code payments require manual processing
  if (isQRCodePayment(paymentMethod)) {
    return { refundType: 'manual', canAutoProcess: false };
  }

  // Cash payments require manual processing
  if (normalizedMethod === 'cash') {
    return { refundType: 'manual', canAutoProcess: false };
  }

  // PayMongo electronic payments can be auto-processed
  if (['gcash', 'card', 'paymaya'].includes(normalizedMethod)) {
    return { refundType: 'automatic', canAutoProcess: true };
  }

  // Default to manual for unknown payment methods
  return { refundType: 'manual', canAutoProcess: false };
}

/**
 * Check if payment method is QR code based
 */
function isQRCodePayment(paymentMethod: string): boolean {
  const method = paymentMethod.toLowerCase();
  return method.includes('qr') || method.includes('scan') || method === 'qr_code';
}

/**
 * Normalize payment method names
 */
function normalizePaymentMethod(paymentMethod: string): 'gcash' | 'card' | 'paymaya' | 'cash' | 'qr_code' {
  const method = paymentMethod.toLowerCase();
  
  if (method.includes('gcash')) return 'gcash';
  if (method.includes('card') || method.includes('credit') || method.includes('debit')) return 'card';
  if (method.includes('paymaya') || method.includes('maya')) return 'paymaya';
  if (method.includes('cash')) return 'cash';
  if (method.includes('qr') || method.includes('scan')) return 'qr_code';
  
  return 'cash'; // Default fallback
}

/**
 * Generate manual refund instructions for cremation business centers
 */
function generateManualRefundInstructions(paymentMethod: string, amount: number): string[] {
  const instructions: string[] = [];
  
  if (isQRCodePayment(paymentMethod)) {
    instructions.push(
      'INSTRUCTIONS FOR CREMATION CENTER:',
      'Please process the refund manually via PayMongo dashboard:',
      '1. Log into your cremation center\'s PayMongo account',
      '2. Navigate to the Payments section',
      '3. Find the original payment transaction',
      `4. Process a refund of ₱${amount.toFixed(2)}`,
      '5. Download the official refund receipt from PayMongo',
      '6. Upload the receipt to the system using the "Upload Receipt" button',
      '7. The system will verify and complete the refund process',
      '',
      'NOTE: This is a QR code payment that requires manual processing by the cremation center.'
    );
  } else if (normalizePaymentMethod(paymentMethod) === 'cash') {
    instructions.push(
      'INSTRUCTIONS FOR CREMATION CENTER:',
      'Please process the cash refund manually:',
      `1. Prepare cash amount of ₱${amount.toFixed(2)}`,
      '2. Contact the customer to arrange refund collection',
      '3. Have customer sign a refund receipt',
      '4. Take a photo or scan the signed receipt',
      '5. Upload the receipt image to the system',
      '6. Mark the refund as completed in the system',
      '',
      'NOTE: Cash refunds must be handled directly by the cremation center.'
    );
  } else {
    instructions.push(
      'INSTRUCTIONS FOR CREMATION CENTER:',
      'Please process the refund manually:',
      `1. Process refund of ₱${amount.toFixed(2)} through the original payment method`,
      '2. Use your cremation center\'s payment processing system',
      '3. Obtain official receipt or confirmation',
      '4. Upload the receipt/confirmation to the system',
      '5. Update the refund status to completed',
      '',
      'NOTE: Manual processing required by the cremation center.'
    );
  }
  
  return instructions;
}

/**
 * Upload refund receipt for manual refunds
 */
export async function uploadRefundReceipt(
  refundId: number,
  receiptPath: string,
  uploadedBy: number,
  uploadedByType: 'admin' | 'staff',
  ipAddress?: string
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Update refund record with receipt path
    await updateRefundRecord(refundId, {
      receipt_path: receiptPath,
      processed_at: new Date()
    });

    // Log audit trail
    await logRefundAudit({
      refund_id: refundId,
      action: 'receipt_uploaded',
      new_status: 'processing',
      performed_by: uploadedBy,
      performed_by_type: uploadedByType,
      details: `Refund receipt uploaded: ${receiptPath}`,
      ip_address: ipAddress
    });

    return {
      success: true,
      message: 'Refund receipt uploaded successfully. Awaiting verification.'
    };

  } catch (error) {
    console.error('Error uploading refund receipt:', error);
    return {
      success: false,
      message: 'Failed to upload refund receipt',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Verify and complete manual refund
 */
export async function verifyAndCompleteRefund(
  refundId: number,
  verifiedBy: number,
  verifiedByType: 'admin' | 'staff',
  approved: boolean,
  rejectionReason?: string,
  ipAddress?: string
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    if (approved) {
      // Approve and complete the refund
      await updateRefundRecord(refundId, {
        status: 'completed',
        receipt_verified: true,
        receipt_verified_by: verifiedBy,
        completed_at: new Date()
      });

      await logRefundAudit({
        refund_id: refundId,
        action: 'refund_approved',
        previous_status: 'processing',
        new_status: 'completed',
        performed_by: verifiedBy,
        performed_by_type: verifiedByType,
        details: 'Manual refund approved and completed',
        ip_address: ipAddress
      });

      return {
        success: true,
        message: 'Refund verified and completed successfully'
      };
    } else {
      // Reject the refund
      await updateRefundRecord(refundId, {
        status: 'failed',
        receipt_verified: false,
        receipt_verified_by: verifiedBy,
        notes: rejectionReason || 'Refund rejected during verification'
      });

      await logRefundAudit({
        refund_id: refundId,
        action: 'refund_rejected',
        previous_status: 'processing',
        new_status: 'failed',
        performed_by: verifiedBy,
        performed_by_type: verifiedByType,
        details: rejectionReason || 'Refund rejected during verification',
        ip_address: ipAddress
      });

      return {
        success: true,
        message: 'Refund rejected successfully'
      };
    }

  } catch (error) {
    console.error('Error verifying refund:', error);
    return {
      success: false,
      message: 'Failed to verify refund',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get refund status and details
 */
export async function getRefundStatus(bookingId: number): Promise<RefundRecord[]> {
  return await getRefundsByBookingId(bookingId);
}
