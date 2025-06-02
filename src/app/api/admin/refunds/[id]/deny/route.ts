import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { sendEmail } from '@/lib/consolidatedEmailService';

/**
 * POST - Deny a refund request
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

    const [, accountType] = authToken.split('_');
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

    // Update refund status to cancelled
    await query(`
      UPDATE refunds
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = ?
    `, [refundId]);

    // Send denial notification email
    if (refund.user_email) {
      try {
        const emailContent = {
          subject: `Refund Request Denied - Booking #${refund.booking_id}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #dc3545; margin: 0;">Refund Request Denied</h2>
              </div>

              <p>Dear ${refund.user_name},</p>

              <p>We regret to inform you that your refund request for booking #${refund.booking_id} has been denied after careful review.</p>

              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #495057;">Booking Details:</h3>
                <p><strong>Pet:</strong> ${refund.pet_name}</p>
                <p><strong>Date:</strong> ${refund.booking_date}</p>
                <p><strong>Time:</strong> ${refund.booking_time}</p>
                <p><strong>Amount:</strong> ₱${parseFloat(refund.amount.toString()).toFixed(2)}</p>
                <p><strong>Reason for Request:</strong> ${refund.reason}</p>
              </div>

              <p>If you have any questions or would like to discuss this decision, please contact our customer support team.</p>

              <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Customer Support:</strong></p>
                <p style="margin: 5px 0;">Email: support@rainbowpaws.com</p>
                <p style="margin: 5px 0;">Phone: (02) 8123-4567</p>
              </div>

              <p>Thank you for your understanding.</p>

              <p>Best regards,<br>
              The Rainbow Paws Team</p>

              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
              <p style="font-size: 12px; color: #6c757d; text-align: center;">
                This is an automated message. Please do not reply to this email.
              </p>
            </div>
          `
        };

        await sendEmail({
          to: refund.user_email,
          subject: emailContent.subject,
          html: emailContent.html
        });
      } catch (emailError) {
        console.error('Failed to send denial email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Refund request denied successfully.',
      refund: {
        id: refundId,
        booking_id: refund.booking_id,
        amount: refund.amount,
        status: 'cancelled'
      }
    });

  } catch (error) {
    console.error('Refund denial error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
