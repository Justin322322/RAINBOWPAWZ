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
      // Listing payments by source is no longer supported by PayMongo.
      // Leave paymentId null and allow reconciliation via webhook or later jobs.
    }

    if (!paymentId) {
      // If we cannot locate a PayMongo payment ID yet, keep this as AUTOMATIC
      // Create a pending automatic refund record and exit gracefully.
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
          initiated_by_type: request.initiatedByType,
          original_amount: bookingInfo.amount,
          missing_payment_id: true,
          source_id: bookingInfo.sourceId || null
        }),
        initiated_at: new Date()
      });

      await logRefundAudit({
        refund_id: refundId,
        action: 'refund_queued',
        new_status: 'pending',
        performed_by: request.initiatedBy,
        performed_by_type: request.initiatedByType,
        details: 'Automatic refund queued: payment id not yet available. Will retry via reconciliation.',
        ip_address: request.ipAddress
      });

      return {
        success: true,
        refundId,
        refundType: 'automatic',
        paymentMethod: bookingInfo.paymentMethod,
        message: 'Automatic refund scheduled. The system will complete it once the payment is located.'
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
  return method.includes('qr') || 
         method.includes('scan') || 
         method.includes('manual') ||
         method.includes('qr_manual') ||
         method === 'qr_code' ||
         method === 'qr';
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
      '7. The system will automatically notify the customer',
      '8. Customer will receive email/SMS confirmation',
      '9. Customer can download their refund receipt',
      '',
      'NOTE: This is a QR code payment that requires manual processing by the cremation center.',
      'The customer will be automatically notified once the refund is completed.'
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
          <span>₱${refund.amount.toFixed(2)}</span>
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
          message: `Your refund of ₱${refund.amount.toFixed(2)} has been completed. Refund ID: #${refund.id}. Thank you for choosing RainbowPaws.`
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