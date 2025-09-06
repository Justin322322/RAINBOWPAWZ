import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import {
  processPayMongoRefund,
  completeRefund,
  hasValidPayMongoTransaction
} from '@/services/refundService';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { createRefundNotificationEmail } from '@/lib/emailTemplates';
import { createUserNotification } from '@/utils/userNotificationService';
import { createAdminNotification } from '@/utils/adminNotificationService';

/**
 * POST - Approve a refund request (Cremation Center)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const refundId = parseInt(id);

    // Verify cremation center authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({
        error: 'Unauthorized - Business access required'
      }, { status: 403 });
    }

    // Get cremation center ID from service_providers table
    const providerResult = await query(
      'SELECT provider_id FROM service_providers WHERE user_id = ? AND provider_type = ?',
      [user.userId, 'cremation']
    ) as any[];

    if (!providerResult || providerResult.length === 0) {
      return NextResponse.json({
        error: 'Cremation center not found for this user'
      }, { status: 400 });
    }

    const cremationCenterId = providerResult[0].provider_id;

    if (!refundId || isNaN(refundId)) {
      return NextResponse.json({
        error: 'Invalid refund ID'
      }, { status: 400 });
    }

    // First, check if the refund exists and belongs to this cremation center
    const basicRefundResult = await query(`
      SELECT r.id, r.status, r.booking_id, r.amount, r.reason
      FROM refunds r
      JOIN service_bookings cb ON r.booking_id = cb.id
      WHERE r.id = ? AND cb.provider_id = ?
    `, [refundId, cremationCenterId]) as any[];

    if (!basicRefundResult || basicRefundResult.length === 0) {
      return NextResponse.json({
        error: 'Refund not found or not accessible'
      }, { status: 404 });
    }

    const basicRefund = basicRefundResult[0];

    if (basicRefund.status !== 'pending') {
      return NextResponse.json({
        error: `Refund is not in pending status. Current status: ${basicRefund.status}`
      }, { status: 400 });
    }

    // Get refund details with booking and user information
    const refundResult = await query(`
      SELECT
        r.*,
        cb.pet_name,
        cb.booking_date,
        cb.booking_time,
        cb.payment_method,
        cb.user_id,
        cb.provider_id,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM refunds r
      JOIN service_bookings cb ON r.booking_id = cb.id
      JOIN users u ON cb.user_id = u.user_id
      WHERE r.id = ? AND r.status = 'pending' AND cb.provider_id = ?
    `, [refundId, cremationCenterId]) as any[];

    if (!refundResult || refundResult.length === 0) {
      return NextResponse.json({
        error: 'Refund not found or not accessible'
      }, { status: 404 });
    }

    const refund = refundResult[0];

    // Process the refund based on payment method
    try {
      if (refund.payment_method === 'gcash') {
        // First, try to validate and fix payment data if needed
        try {
          const { validatePaymentDataForRefund } = await import('@/services/refundService');
          await validatePaymentDataForRefund(refund.booking_id);
        } catch (validationError) {
          console.warn('Payment data validation failed, proceeding with manual processing:', validationError);
        }

        // Check if there's a valid PayMongo transaction
        let hasPayMongoTransaction = false;
        try {
          hasPayMongoTransaction = await hasValidPayMongoTransaction(refund.booking_id);
        } catch (checkError) {
          console.warn('PayMongo transaction check failed:', checkError);
          hasPayMongoTransaction = false;
        }

        if (hasPayMongoTransaction) {
          try {
            // Process PayMongo refund for GCash payments
            await processPayMongoRefund(refund.booking_id, refundId, refund.reason);

            // Update refund status to processing (will be completed via webhook)
            await query(`
              UPDATE refunds
              SET status = 'processing', updated_at = NOW()
              WHERE id = ?
            `, [refundId]);

            // Send approval email for PayMongo processing
            if (refund.user_email) {
              try {
                const refundEmailContent = createRefundNotificationEmail({
                  customerName: refund.user_name,
                  bookingId: refund.booking_id.toString(),
                  petName: refund.pet_name,
                  amount: refund.amount,
                  reason: refund.reason,
                  status: 'processing',
                  paymentMethod: refund.payment_method,
                  estimatedDays: 7
                });

                await sendEmail({
                  to: refund.user_email,
                  subject: refundEmailContent.subject,
                  html: refundEmailContent.html
                });
              } catch (emailError) {
                console.error('Failed to send approval email:', emailError);
              }
            }

            // Create user notification for refund processing
            try {
              await createUserNotification({
                userId: refund.user_id,
                type: 'refund_approved',
                title: 'Refund Approved',
                message: `Your refund request for ${refund.pet_name} has been approved and is being processed. You will receive your refund within 5-10 business days.`,
                entityId: refund.booking_id
              });
            } catch (notificationError) {
              console.error('Failed to create user notification:', notificationError);
            }

            // Admin notifications removed - refunds now managed by cremation centers

            return NextResponse.json({
              success: true,
              message: 'Refund approved and submitted to PayMongo. Processing may take 5-10 business days.',
              refund: {
                id: refundId,
                booking_id: refund.booking_id,
                amount: refund.amount,
                status: 'processing'
              }
            });
          } catch (paymongoError) {
            console.error('PayMongo refund error:', paymongoError);
            // Fall back to manual processing for GCash payments when PayMongo fails
            await completeRefund(refund.booking_id, refundId);

            // Send completion email for manual processing
            if (refund.user_email) {
              try {
                const refundEmailContent = createRefundNotificationEmail({
                  customerName: refund.user_name,
                  bookingId: refund.booking_id.toString(),
                  petName: refund.pet_name,
                  amount: refund.amount,
                  reason: refund.reason,
                  status: 'processed',
                  paymentMethod: refund.payment_method,
                  estimatedDays: undefined,
                  notes: 'Refund processed manually due to PayMongo integration issue.'
                });

                await sendEmail({
                  to: refund.user_email,
                  subject: refundEmailContent.subject,
                  html: refundEmailContent.html
                });
              } catch (emailError) {
                console.error('Failed to send completion email:', emailError);
              }
            }

            // Create user notification for refund completion
            try {
              await createUserNotification({
                userId: refund.user_id,
                type: 'refund_processed',
                title: 'Refund Processed',
                message: `Your refund for ${refund.pet_name} has been processed successfully. The amount of ₱${refund.amount.toFixed(2)} has been refunded.`,
                entityId: refund.booking_id
              });
            } catch (notificationError) {
              console.error('Failed to create user notification:', notificationError);
            }

            // Create admin notification for refund completion
            try {
              await createAdminNotification({
                type: 'refund_processed',
                title: 'Refund Processed',
                message: `Refund for cremation booking #${refund.booking_id} (${refund.pet_name}) has been processed successfully. Amount: ₱${refund.amount.toFixed(2)}`,
                entityType: 'refund',
                entityId: refundId
              });
            } catch (adminNotificationError) {
              console.error('Failed to create admin notification:', adminNotificationError);
            }

            return NextResponse.json({
              success: true,
              message: 'Refund approved and processed manually. PayMongo integration failed.',
              refund: {
                id: refundId,
                booking_id: refund.booking_id,
                amount: refund.amount,
                status: 'processed'
              }
            });
          }
        } else {
          // No PayMongo transaction found, process manually
          await completeRefund(refund.booking_id, refundId);

          // Send completion email for manual processing
          if (refund.user_email) {
            try {
              const refundEmailContent = createRefundNotificationEmail({
                customerName: refund.user_name,
                bookingId: refund.booking_id.toString(),
                petName: refund.pet_name,
                amount: refund.amount,
                reason: refund.reason,
                status: 'processed',
                paymentMethod: refund.payment_method,
                estimatedDays: undefined,
                notes: 'Refund processed manually as no PayMongo transaction was found for this GCash payment.'
              });

              await sendEmail({
                to: refund.user_email,
                subject: refundEmailContent.subject,
                html: refundEmailContent.html
              });
            } catch (emailError) {
              console.error('Failed to send completion email:', emailError);
            }
          }

          // Create user notification for refund completion
          try {
            await createUserNotification({
              userId: refund.user_id,
              type: 'refund_processed',
              title: 'Refund Processed',
              message: `Your refund for ${refund.pet_name} has been processed successfully. The amount of ₱${refund.amount.toFixed(2)} has been refunded.`,
              entityId: refund.booking_id
            });
          } catch (notificationError) {
            console.error('Failed to create user notification:', notificationError);
          }

          // Create admin notification for refund completion
          try {
            await createAdminNotification({
              type: 'refund_processed',
              title: 'Refund Processed (Manual)',
              message: `Refund for cremation booking #${refund.booking_id} (${refund.pet_name}) has been processed manually. Amount: ₱${refund.amount.toFixed(2)}`,
              entityType: 'refund',
              entityId: refundId
            });
          } catch (adminNotificationError) {
            console.error('Failed to create admin notification:', adminNotificationError);
          }

          return NextResponse.json({
            success: true,
            message: 'Refund approved and processed manually. No PayMongo transaction found for this GCash payment.',
            refund: {
              id: refundId,
              booking_id: refund.booking_id,
              amount: refund.amount,
              status: 'processed'
            }
          });
        }
      } else {
        // For cash payments, complete refund immediately
        await completeRefund(refund.booking_id, refundId);

        // Send completion email
        if (refund.user_email) {
          try {
            const refundEmailContent = createRefundNotificationEmail({
              customerName: refund.user_name,
              bookingId: refund.booking_id.toString(),
              petName: refund.pet_name,
              amount: refund.amount,
              reason: refund.reason,
              status: 'processed',
              paymentMethod: refund.payment_method,
              estimatedDays: undefined
            });

            await sendEmail({
              to: refund.user_email,
              subject: refundEmailContent.subject,
              html: refundEmailContent.html
            });
          } catch (emailError) {
            console.error('Failed to send completion email:', emailError);
          }
        }

        // Create user notification for refund completion
        try {
          await createUserNotification({
            userId: refund.user_id,
            type: 'refund_processed',
            title: 'Refund Processed',
            message: `Your refund for ${refund.pet_name} has been processed successfully. The amount of ₱${refund.amount.toFixed(2)} has been refunded.`,
            entityId: refund.booking_id
          });
        } catch (notificationError) {
          console.error('Failed to create user notification:', notificationError);
        }

        // Create admin notification for refund completion
        try {
          await createAdminNotification({
            type: 'refund_processed',
            title: 'Refund Processed (Cash)',
            message: `Cash refund for cremation booking #${refund.booking_id} (${refund.pet_name}) has been processed. Amount: ₱${refund.amount.toFixed(2)}`,
            entityType: 'refund',
            entityId: refundId
          });
        } catch (adminNotificationError) {
          console.error('Failed to create admin notification:', adminNotificationError);
        }

        return NextResponse.json({
          success: true,
          message: 'Refund approved and processed successfully.',
          refund: {
            id: refundId,
            booking_id: refund.booking_id,
            amount: refund.amount,
            status: 'processed'
          }
        });
      }
    } catch (processingError) {
      console.error('Refund processing error:', processingError);
      return NextResponse.json({
        error: 'Failed to process refund',
        details: processingError instanceof Error ? processingError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Cremation refund approval error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}