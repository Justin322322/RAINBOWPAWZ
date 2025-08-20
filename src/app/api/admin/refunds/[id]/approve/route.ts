import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import {
  processPayMongoRefund,
  completeRefund,
  hasValidPayMongoTransaction
} from '@/services/refundService';
import { sendEmail } from '@/services/EmailService';
import { createRefundNotificationEmail } from '@/services/EmailTemplates';
import { createUserNotification, createAdminNotification, createBusinessNotification } from '@/services/NotificationService';

/**
 * POST - Approve a refund request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const refundId = parseInt(id);

    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if it's a JWT token or old format
    let _userId = null;
    let accountType = null;

    if (authToken.includes('.')) {
      // JWT token format
      const { decodeTokenUnsafe } = await import('@/lib/jwt');
      const payload = decodeTokenUnsafe(authToken);
      _userId = payload?.userId || null;
      accountType = payload?.accountType || null;
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        _userId = parts[0];
        accountType = parts[1];
      }
    }

    if (accountType !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    if (!refundId || isNaN(refundId)) {
      return NextResponse.json({
        error: 'Invalid refund ID'
      }, { status: 400 });
    }

    // Get refund details with booking and user information
    const refundResult = await query(`
      SELECT
        r.*,
        sb.pet_name,
        sb.booking_date,
        sb.booking_time,
        sb.payment_method,
        sb.user_id,
        sb.provider_id,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email
      FROM refunds r
      JOIN service_bookings sb ON r.booking_id = sb.id
      JOIN users u ON sb.user_id = u.user_id
      WHERE r.id = ? AND r.status = 'pending'
    `, [refundId]) as any[];

    if (!refundResult || refundResult.length === 0) {
      return NextResponse.json({
        error: 'Refund not found or not in pending status'
      }, { status: 404 });
    }

    const refund = refundResult[0];

    // Process the refund based on payment method
    try {
      if (refund.payment_method === 'gcash') {
        // First, try to validate and fix payment data if needed
        const { validatePaymentDataForRefund } = await import('@/services/refundService');
        await validatePaymentDataForRefund(refund.booking_id);

        // Check if there's a valid PayMongo transaction
        const hasPayMongoTransaction = await hasValidPayMongoTransaction(refund.booking_id);

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

                         // Create admin notification for refund processing
             try {
               await createAdminNotification({
                 type: 'refund_processing',
                 title: 'Refund Processing',
                 message: `Refund for booking #${refund.booking_id} (${refund.pet_name}) is being processed via PayMongo.`,
                 entityType: 'refund',
                 entityId: refundId
               });
             } catch (adminNotificationError) {
               console.error('Failed to create admin notification:', adminNotificationError);
             }

            // Notify service provider about refund
            await notifyServiceProviderAboutRefund(refund.provider_id, refund.booking_id, refund.pet_name, refund.amount, 'processing');

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
                 message: `Refund for booking #${refund.booking_id} (${refund.pet_name}) has been processed successfully. Amount: ₱${refund.amount.toFixed(2)}`,
                 entityType: 'refund',
                 entityId: refundId
               });
             } catch (adminNotificationError) {
               console.error('Failed to create admin notification:', adminNotificationError);
             }

            // Notify service provider about refund
            await notifyServiceProviderAboutRefund(refund.provider_id, refund.booking_id, refund.pet_name, refund.amount, 'processed');

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
              message: `Refund for booking #${refund.booking_id} (${refund.pet_name}) has been processed manually. Amount: ₱${refund.amount.toFixed(2)}`,
              entityType: 'refund',
              entityId: refundId
            });
          } catch (adminNotificationError) {
            console.error('Failed to create admin notification:', adminNotificationError);
          }

          // Notify service provider about refund
          await notifyServiceProviderAboutRefund(refund.provider_id, refund.booking_id, refund.pet_name, refund.amount, 'processed');

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
            message: `Cash refund for booking #${refund.booking_id} (${refund.pet_name}) has been processed. Amount: ₱${refund.amount.toFixed(2)}`,
            entityType: 'refund',
            entityId: refundId
          });
        } catch (adminNotificationError) {
          console.error('Failed to create admin notification:', adminNotificationError);
        }

        // Notify service provider about refund
        await notifyServiceProviderAboutRefund(refund.provider_id, refund.booking_id, refund.pet_name, refund.amount, 'processed');

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
    console.error('Refund approval error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Helper function to notify service provider about refund
 */
async function notifyServiceProviderAboutRefund(
  providerId: number,
  bookingId: number,
  petName: string,
  amount: number,
  status: 'processing' | 'processed'
): Promise<void> {
  if (!providerId) return;

  try {
    // Get provider user ID
    let providerResult = await query('SELECT user_id FROM service_providers WHERE provider_id = ?', [providerId]) as any[];
    
    if (!providerResult || providerResult.length === 0) {
      providerResult = await query('SELECT user_id FROM businesses WHERE id = ?', [providerId]) as any[];
    }
    
    if (!providerResult || providerResult.length === 0) {
      providerResult = await query('SELECT user_id FROM users WHERE user_id = ? AND role = "business"', [providerId]) as any[];
    }

    if (providerResult && providerResult.length > 0) {
      const providerUserId = providerResult[0].user_id;
      
      const title = status === 'processing' ? 'Refund Being Processed' : 'Refund Completed';
      const message = status === 'processing' 
        ? `A refund of ₱${amount.toFixed(2)} is being processed for booking #${bookingId} (${petName}).`
        : `A refund of ₱${amount.toFixed(2)} has been completed for booking #${bookingId} (${petName}).`;
      
      await createBusinessNotification({
        userId: providerUserId,
        title,
        message,
        type: 'info',
        link: `/cremation/bookings/${bookingId}`,
        shouldSendEmail: true,
        emailSubject: `Refund ${status === 'processing' ? 'Processing' : 'Completed'} - Rainbow Paws`
      });
    }
  } catch (error) {
    console.error('Failed to notify service provider about refund:', error);
  }
}
