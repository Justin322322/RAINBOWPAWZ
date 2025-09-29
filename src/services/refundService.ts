/**
 * Refund Service
 * Handles comprehensive refund processing with automatic and manual workflows
 */

import { query } from '@/lib/db/query';
import { 
  createRefund as createPayMongoRefund, 
  phpToCentavos
} from '@/lib/paymongo';
import {
  createRefundRecord,
  updateRefundRecord,
  logRefundAudit,
  getRefundsByBookingId,
  getRefundById,
  hasExistingRefund,
  initializeRefundTables,
  RefundRecord
} from '@/lib/db/refunds';
import {
  sendRefundFailedNotification
} from '@/utils/refundNotificationService';

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
    const { canAutoProcess } = determineRefundType(bookingInfo.paymentMethod, request.initiatedByType);

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
    // Handle QR code payments differently - they don't have PayMongo payment IDs
    if (isQRCodePayment(bookingInfo.paymentMethod)) {
      return await processQRCodeRefund(request, bookingInfo);
    }

    // Find the PayMongo payment ID
    let paymentId: string | null = null;

    // Prefer payment_intent/payment_id captured in transactions
    if (bookingInfo.paymentId) {
      paymentId = bookingInfo.paymentId;
    } else if (bookingInfo.transactionId) {
      // Some integrations store intent/payment id in provider_transaction_id
      paymentId = bookingInfo.transactionId;
    } else if (bookingInfo.sourceId) {
      // Listing payments by source is no longer supported by PayMongo.
      // Leave paymentId null and allow reconciliation via webhook or later jobs.
    }

    if (!paymentId) {
      // If we cannot locate a PayMongo payment ID, convert to manual refund
      // This ensures the refund appears in the approval workflow
      const refundId = await createRefundRecord({
        booking_id: request.bookingId,
        user_id: bookingInfo.userId,
        amount: request.amount,
        reason: request.reason,
        status: 'pending_approval',
        refund_type: 'manual',
        payment_method: normalizePaymentMethod(bookingInfo.paymentMethod),
        transaction_id: bookingInfo.transactionId || undefined,
        processed_by: request.initiatedBy,
        notes: request.notes || undefined,
        metadata: JSON.stringify({
          initiated_by_type: request.initiatedByType,
          original_amount: bookingInfo.amount,
          missing_payment_id: true,
          source_id: bookingInfo.sourceId || null,
          converted_from_automatic: true
        }),
        initiated_at: new Date()
      });

      await logRefundAudit({
        refund_id: refundId,
        action: 'refund_queued',
        new_status: 'pending_approval',
        performed_by: request.initiatedBy,
        performed_by_type: request.initiatedByType,
        details: 'Automatic refund converted to manual: payment id not available. Requires manual processing.',
        ip_address: request.ipAddress
      });

      return {
        success: true,
        refundId,
        refundType: 'manual',
        paymentMethod: bookingInfo.paymentMethod,
        message: 'Refund converted to manual processing due to missing payment ID. Please approve and process manually.'
      };
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
        message: `Automatic refund of ₱${Number(request.amount).toFixed(2)} processed successfully`
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

      // Do not fall back to manual for electronic methods; keep as automatic failed
      return {
        success: false,
        refundId,
        refundType: 'automatic',
        paymentMethod: bookingInfo.paymentMethod,
        message: 'Automatic refund attempt failed. Please retry later or handle via dashboard.',
        error: paymongoError instanceof Error ? paymongoError.message : 'PAYMONGO_ERROR'
      };
    }

  } catch (error) {
    console.error('Error in automatic refund processing:', error);
    throw error;
  }
}

/**
 * Process QR code refund (automatic when initiated by business)
 */
async function processQRCodeRefund(
  request: RefundRequest, 
  bookingInfo: BookingPaymentInfo
): Promise<RefundResult> {
  try {
    // Create refund record for QR code payment
    const refundId = await createRefundRecord({
      booking_id: request.bookingId,
      user_id: bookingInfo.userId,
      amount: request.amount,
      reason: request.reason,
      status: 'completed', // QR refunds are automatically completed when initiated by business
      refund_type: 'automatic',
      payment_method: normalizePaymentMethod(bookingInfo.paymentMethod),
      transaction_id: bookingInfo.transactionId || undefined,
      processed_by: request.initiatedBy,
      notes: request.notes || undefined,
      metadata: JSON.stringify({
        initiated_by_type: request.initiatedByType,
        original_amount: bookingInfo.amount,
        qr_refund_type: 'business_initiated',
        auto_completed: true
      }),
      initiated_at: new Date(),
      processed_at: new Date(),
      completed_at: new Date()
    });

    // Log audit trail
    await logRefundAudit({
      refund_id: refundId,
      action: 'qr_refund_completed',
      new_status: 'completed',
      performed_by: request.initiatedBy,
      performed_by_type: request.initiatedByType,
      details: `QR code refund automatically completed for booking ${request.bookingId}`,
      ip_address: request.ipAddress
    });

    // Send completion notification to customer
    try {
      await sendRefundCompletionNotification(refundId);
    } catch (notificationError) {
      console.error('Error sending QR refund completion notification:', notificationError);
      // Continue with the process even if notifications fail
    }

    return {
      success: true,
      refundId: refundId,
      refundType: 'automatic',
      paymentMethod: normalizePaymentMethod(bookingInfo.paymentMethod),
      message: 'QR code refund has been automatically processed and completed',
      instructions: generateQRRefundInstructions(request.amount)
    };

  } catch (error) {
    console.error('Error processing QR code refund:', error);
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
    // Create refund record for manual processing with approval workflow
    const refundId = await createRefundRecord({
      booking_id: request.bookingId,
      user_id: bookingInfo.userId,
      amount: request.amount,
      reason: request.reason,
      status: 'pending_approval', // Changed from 'pending' to require approval
      refund_type: 'manual',
      payment_method: normalizePaymentMethod(bookingInfo.paymentMethod),
      transaction_id: bookingInfo.transactionId || undefined,
      processed_by: request.initiatedBy,
      notes: request.notes || undefined,
      metadata: JSON.stringify({
        initiated_by_type: request.initiatedByType,
        original_amount: bookingInfo.amount,
        requires_receipt_upload: isQRCodePayment(bookingInfo.paymentMethod),
        requires_approval: true,
        approval_workflow: 'business_review'
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
 * Determine refund type based on payment method and who initiated the refund
 */
function determineRefundType(paymentMethod: string, initiatedByType: string): { refundType: 'automatic' | 'manual', canAutoProcess: boolean } {
  const normalizedMethod = normalizePaymentMethod(paymentMethod);
  
  console.log('Determining refund type:', { paymentMethod, normalizedMethod, initiatedByType });
  
  // QR code payments: automatic when initiated by business, manual when initiated by customer
  if (isQRCodePayment(paymentMethod)) {
    const isBusinessInitiated = initiatedByType === 'provider' || initiatedByType === 'admin' || initiatedByType === 'staff';
    console.log('QR payment detected:', { isBusinessInitiated, result: isBusinessInitiated ? 'automatic' : 'manual' });
    
    if (isBusinessInitiated) {
      return { refundType: 'automatic', canAutoProcess: true };
    } else {
      return { refundType: 'manual', canAutoProcess: false };
    }
  }

  // Cash payments: automatic when initiated by business, manual when initiated by customer
  if (normalizedMethod === 'cash') {
    if (initiatedByType === 'provider' || initiatedByType === 'admin' || initiatedByType === 'staff') {
      return { refundType: 'automatic', canAutoProcess: true };
    } else {
      return { refundType: 'manual', canAutoProcess: false };
    }
  }

  // PayMongo electronic payments can always be auto-processed
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
  const isQR = method.includes('qr') || 
               method.includes('scan') || 
               method.includes('manual') ||
               method.includes('qr_manual') ||
               method === 'qr_code' ||
               method === 'qr';
  
  console.log('Checking if QR payment:', { paymentMethod, method, isQR });
  return isQR;
}

/**
 * Normalize payment method names
 */
function normalizePaymentMethod(paymentMethod: string): 'gcash' | 'card' | 'paymaya' | 'cash' | 'qr_code' | 'qr_manual' {
  const method = paymentMethod.toLowerCase();
  
  console.log('Normalizing payment method:', { original: paymentMethod, normalized: method });
  
  if (method.includes('gcash')) return 'gcash';
  if (method.includes('card') || method.includes('credit') || method.includes('debit')) return 'card';
  if (method.includes('paymaya') || method.includes('maya')) return 'paymaya';
  if (method.includes('cash')) return 'cash';
  if (method.includes('qr') || method.includes('scan')) {
    // Keep the original if it's qr_manual, otherwise normalize to qr_code
    if (method.includes('manual')) return 'qr_manual';
    return 'qr_code';
  }
  
  console.log('Payment method not recognized, defaulting to cash:', paymentMethod);
  return 'cash'; // Default fallback
}

/**
 * Generate manual refund instructions for cremation business centers
 */
function generateManualRefundInstructions(paymentMethod: string, amount: number): string[] {
  const instructions: string[] = [];
  
  if (isQRCodePayment(paymentMethod)) {
    instructions.push(
      'QR CODE REFUND WORKFLOW:',
      'This refund requires your approval before processing:',
      '',
      'STEP 1 - REVIEW & APPROVE:',
      '1. Review the refund request details',
      '2. Verify the original QR payment was received',
      '3. Approve or deny the refund request',
      '',
      'STEP 2 - PROCESS REFUND (if approved):',
      '4. Log into your cremation center\'s PayMongo account',
      '5. Navigate to the Payments section',
      '6. Find the original payment transaction',
      `7. Process a refund of ₱${Number(amount).toFixed(2)}`,
      '8. Download the official refund receipt from PayMongo',
      '',
      'STEP 3 - UPLOAD RECEIPT:',
      '9. Upload the refund receipt to the system',
      '10. The system will automatically notify the customer',
      '11. Customer will receive email/SMS confirmation',
      '',
      'NOTE: This QR code payment requires your approval before processing.',
      'The customer will be automatically notified once the refund is completed.'
    );
  } else if (normalizePaymentMethod(paymentMethod) === 'cash') {
    instructions.push(
      'INSTRUCTIONS FOR CREMATION CENTER:',
      'Please process the cash refund manually:',
      `1. Prepare cash amount of ₱${Number(amount).toFixed(2)}`,
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
      `1. Process refund of ₱${Number(amount).toFixed(2)} through the original payment method`,
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
 * Generate QR refund instructions for business-initiated refunds
 */
function generateQRRefundInstructions(amount: number): string[] {
  return [
    'QR CODE REFUND COMPLETED:',
    'This refund has been automatically processed by the cremation business.',
    '',
    'REFUND DETAILS:',
    `• Amount: ₱${Number(amount).toFixed(2)}`,
    '• Status: Completed',
    '• Method: QR Code Payment',
    '',
    'CUSTOMER NOTIFICATION:',
    '• Email confirmation sent to customer',
    '• SMS notification sent to customer',
    '• Refund receipt available in system',
    '',
    'NOTE: This QR code refund was automatically completed because it was initiated by the cremation business.'
  ];
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
    // Get current refund to capture previous status
    const refund = await getRefundById(refundId);
    if (!refund) {
      return {
        success: false,
        message: 'Refund not found',
        error: 'REFUND_NOT_FOUND'
      };
    }

    // Update refund record with receipt path and status
    await updateRefundRecord(refundId, {
      receipt_path: receiptPath,
      status: 'processing',
      processed_at: new Date()
    });

    // Log audit trail
    await logRefundAudit({
      refund_id: refundId,
      action: 'receipt_uploaded',
      previous_status: refund.status,
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
    // Get current refund to capture previous status
    const refund = await getRefundById(refundId);
    if (!refund) {
      return {
        success: false,
        message: 'Refund not found',
        error: 'REFUND_NOT_FOUND'
      };
    }

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
        previous_status: refund.status,
        new_status: 'completed',
        performed_by: verifiedBy,
        performed_by_type: verifiedByType,
        details: 'Manual refund approved and completed',
        ip_address: ipAddress
      });

      // Generate refund receipt for customer
      try {
        const receiptResult = await generateRefundReceipt(refundId);
        if (receiptResult.success) {
          console.log('Refund receipt generated:', receiptResult.receiptPath);
        }
      } catch (receiptError) {
        console.error('Failed to generate refund receipt:', receiptError);
        // Don't fail the refund if receipt generation fails
      }

      // Send notification about successful refund completion
      try {
        await sendRefundCompletionNotification(refundId);
      } catch (notificationError) {
        console.error('Failed to send refund completion notification:', notificationError);
        // Don't fail the refund if notification fails
      }

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
        previous_status: refund.status,
        new_status: 'failed',
        performed_by: verifiedBy,
        performed_by_type: verifiedByType,
        details: rejectionReason || 'Refund rejected during verification',
        ip_address: ipAddress
      });

      // Send notification about refund rejection
      try {
        await sendRefundFailedNotification({
          refundId: refundId,
          bookingId: refund.booking_id,
          userId: refund.user_id,
          amount: parseFloat(refund.amount.toString()),
          refundType: 'manual',
          paymentMethod: refund.payment_method,
          status: 'failed',
          reason: refund.reason,
          transactionId: refund.transaction_id,
          receiptPath: refund.receipt_path
        }, rejectionReason);
      } catch (notificationError) {
        console.error('Failed to send refund rejection notification:', notificationError);
        // Don't fail the refund if notification fails
      }

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

/**
 * Reconcile a previously queued automatic refund once payment_id is known
 */
export async function reconcileQueuedAutomaticRefund(bookingId: number, paymongoPaymentId: string): Promise<void> {
  try {
    const { findLatestQueuedAutoRefundByBooking, updateRefundRecord, logRefundAudit } = await import('@/lib/db/refunds');
    const pending = await findLatestQueuedAutoRefundByBooking(bookingId);
    if (!pending) return;

    // Mark processing
    await updateRefundRecord(pending.id as number, {
      status: 'processing',
      metadata: JSON.stringify({
        ...(pending.metadata ? JSON.parse(pending.metadata) : {}),
        paymongo_payment_id: paymongoPaymentId,
        missing_payment_id: false
      })
    });
    await logRefundAudit({
      refund_id: pending.id as number,
      action: 'status_change',
      previous_status: 'pending',
      new_status: 'processing',
      performed_by_type: 'system',
      details: 'Reconciliation: attempting PayMongo refund now that payment id is known'
    });

    // Execute refund via PayMongo
    const paymongoRefund = await createPayMongoRefund({
      payment_id: paymongoPaymentId,
      amount: phpToCentavos(pending.amount),
      reason: 'requested_by_customer',
      notes: pending.reason,
      metadata: {
        booking_id: bookingId.toString(),
        refund_id: (pending.id as number).toString(),
        initiated_by: (pending.processed_by || 0).toString()
      }
    });

    await updateRefundRecord(pending.id as number, {
      status: 'completed',
      paymongo_refund_id: paymongoRefund.id,
      processed_at: new Date(),
      completed_at: new Date()
    });

    await logRefundAudit({
      refund_id: pending.id as number,
      action: 'refund_completed',
      previous_status: 'processing',
      new_status: 'completed',
      performed_by_type: 'system',
      details: `Reconciliation refund completed via PayMongo: ${paymongoRefund.id}`
    });
  } catch (error) {
    console.error('Error reconciling queued automatic refund:', error);
  }
}

/**
 * Generate refund receipt for customer download
 */
export async function generateRefundReceipt(refundId: number): Promise<{ success: boolean; receiptPath?: string; error?: string }> {
  try {
    const refund = await getRefundById(refundId);
    if (!refund) {
      return { success: false, error: 'Refund not found' };
    }

    if (refund.status !== 'completed') {
      return { success: false, error: 'Refund must be completed to generate receipt' };
    }

    // Generate receipt content
    const receiptContent = generateReceiptContent(refund);
    
    // Save receipt to file system
    const receiptPath = await saveRefundReceipt(refundId, receiptContent);
    
    // Update refund record with receipt path
    await updateRefundRecord(refundId, {
      receipt_path: receiptPath
    });

    return { success: true, receiptPath };

  } catch (error) {
    console.error('Error generating refund receipt:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate receipt' 
    };
  }
}

/**
 * Generate receipt content as HTML/PDF
 */
function generateReceiptContent(refund: any): string {
  const receiptDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Refund Receipt #${refund.id}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .content { margin: 20px 0; }
        .row { display: flex; justify-content: space-between; margin: 10px 0; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>RainbowPaws</h1>
        <h2>REFUND RECEIPT</h2>
        <p>Receipt #${refund.id}</p>
        <p>Date: ${receiptDate}</p>
      </div>
      
      <div class="content">
        <div class="row">
          <strong>Refund Amount:</strong>
          <span>₱${Number(refund.amount).toFixed(2)}</span>
        </div>
        <div class="row">
          <strong>Original Payment Method:</strong>
          <span>${refund.payment_method.toUpperCase()}</span>
        </div>
        <div class="row">
          <strong>Refund Type:</strong>
          <span>${refund.refund_type.toUpperCase()}</span>
        </div>
        <div class="row">
          <strong>Booking ID:</strong>
          <span>#${refund.booking_id}</span>
        </div>
        <div class="row">
          <strong>Reason:</strong>
          <span>${refund.reason}</span>
        </div>
        <div class="row">
          <strong>Status:</strong>
          <span>COMPLETED</span>
        </div>
      </div>
      
      <div class="footer">
        <p>This receipt confirms that your refund has been processed successfully.</p>
        <p>For any questions, please contact RainbowPaws support.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Save refund receipt to file system
 */
async function saveRefundReceipt(refundId: number, content: string): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  // Create receipts directory
  const receiptsDir = path.join(process.cwd(), 'public', 'uploads', 'refund-receipts');
  try {
    await fs.access(receiptsDir);
  } catch {
    await fs.mkdir(receiptsDir, { recursive: true });
  }
  
  // Generate filename
  const filename = `refund_receipt_${refundId}_${Date.now()}.html`;
  const filePath = path.join(receiptsDir, filename);
  
  // Save file
  await fs.writeFile(filePath, content, 'utf8');
  
  return `/uploads/refund-receipts/${filename}`;
}

/**
 * Send refund completion notification to customer
 */
export async function sendRefundCompletionNotification(refundId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const refund = await getRefundById(refundId);
    if (!refund) {
      return { success: false, error: 'Refund not found' };
    }

    // Get customer information
    const customerQuery = `
      SELECT u.first_name, u.last_name, u.email, u.sms_notifications, u.email_notifications
      FROM users u
      WHERE u.user_id = ?
    `;
    const customerResult = await query(customerQuery, [refund.user_id]) as any[];
    
    if (customerResult.length === 0) {
      return { success: false, error: 'Customer not found' };
    }

    const customer = customerResult[0];
    const customerName = `${customer.first_name} ${customer.last_name}`.trim();

    // Send email notification if enabled
    if (customer.email_notifications) {
      try {
        const { sendEmail } = await import('@/lib/consolidatedEmailService');
        const { refundCompletedTemplate } = await import('@/lib/refundEmailTemplates');
        
        const emailTemplate = refundCompletedTemplate({
          customerName,
          refundAmount: refund.amount,
          refundId: refund.id || 0,
          paymentMethod: refund.payment_method,
          bookingId: refund.booking_id
        });
        
        await sendEmail({
          to: customer.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });
      } catch (emailError) {
        console.error('Failed to send refund completion email:', emailError);
      }
    }

    // Send SMS notification if enabled
    if (customer.sms_notifications) {
      try {
        const { sendSMS } = await import('@/lib/httpSmsService');
        await sendSMS({
          to: customer.email, // Assuming email is used as phone number identifier
          message: `Your refund of ₱${Number(refund.amount).toFixed(2)} has been completed. Refund ID: #${refund.id}. Thank you for choosing RainbowPaws.`
        });
      } catch (smsError) {
        console.error('Failed to send refund completion SMS:', smsError);
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Error sending refund completion notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send notification' 
    };
  }
}

/**
 * Get customer refunds for dashboard
 */
export async function getCustomerRefunds(userId: number): Promise<any[]> {
  try {
    const refundsQuery = `
      SELECT 
        r.*,
        b.pet_name,
        b.booking_date,
        sp.business_name as provider_name
      FROM refunds r
      LEFT JOIN bookings b ON r.booking_id = b.id
      LEFT JOIN service_providers sp ON b.provider_id = sp.provider_id
      WHERE r.user_id = ?
      ORDER BY r.initiated_at DESC
    `;
    
    const refunds = await query(refundsQuery, [userId]) as any[];
    
    return refunds.map(refund => ({
      id: refund.id,
      booking_id: refund.booking_id,
      amount: parseFloat(refund.amount),
      reason: refund.reason,
      status: refund.status,
      refund_type: refund.refund_type,
      payment_method: refund.payment_method,
      receipt_path: refund.receipt_path,
      notes: refund.notes,
      initiated_at: refund.initiated_at,
      processed_at: refund.processed_at,
      completed_at: refund.completed_at,
      pet_name: refund.pet_name,
      booking_date: refund.booking_date,
      provider_name: refund.provider_name
    }));

  } catch (error) {
    console.error('Error fetching customer refunds:', error);
    return [];
  }
}