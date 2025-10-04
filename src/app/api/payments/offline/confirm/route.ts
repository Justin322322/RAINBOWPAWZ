import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { query } from '@/lib/db';
import { processRefund } from '@/services/refundService';
import { createNotification } from '@/utils/notificationService';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { sendSMSAsync } from '@/lib/httpSmsService';

async function ensureReceiptTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS payment_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      user_id INT NOT NULL,
      receipt_path VARCHAR(500),
      notes TEXT,
      status ENUM('awaiting', 'confirmed', 'rejected') DEFAULT 'awaiting',
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      confirmed_by INT NULL,
      confirmed_at TIMESTAMP NULL,
      rejection_reason TEXT,
      INDEX idx_booking_id (booking_id),
      INDEX idx_user_id (user_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [confirm] Starting payment confirmation process');

    const user = await verifySecureAuth(request);
    console.log('👤 [confirm] Auth result:', { userId: user?.userId, accountType: user?.accountType });

    if (!user || user.accountType !== 'business') {
      console.log('❌ [confirm] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const bookingId = Number(body?.bookingId);
    const action = body?.action as 'confirm' | 'reject';
    const reason = (body?.reason as string | undefined) || null;

    console.log('📝 [confirm] Request params:', { bookingId, action, reason });

    if (!bookingId || !action || !['confirm','reject'].includes(action)) {
      console.log('❌ [confirm] Invalid parameters:', { bookingId, action });
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Try to ensure table exists, but don't fail if DDL is blocked
    try {
      await ensureReceiptTable();
    } catch {
      // Continue gracefully; we'll fallback to updating booking only
    }

    // Check if table exists; if not, we will operate directly on bookings as a fallback
    let tableExists = false;
    try {
      const t = await query("SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payment_receipts'") as any[];
      tableExists = (t?.[0]?.c || 0) > 0;
      console.log('📊 [confirm] Payment receipts table exists:', tableExists);
    } catch (tableCheckError) {
      console.warn('⚠️ [confirm] Could not check payment_receipts table existence:', tableCheckError);
    }

    if (tableExists) {
      // Ensure receipt exists in payment_receipts
      console.log('🔍 [confirm] Checking for existing receipt');
      const rows = await query('SELECT id FROM payment_receipts WHERE booking_id = ? LIMIT 1', [bookingId]) as any[];
      console.log('📄 [confirm] Receipt lookup result:', { found: rows && rows.length > 0, count: rows?.length });
      if (!rows || rows.length === 0) {
        console.log('❌ [confirm] No receipt found for booking:', bookingId);
        return NextResponse.json({ error: 'No receipt to confirm' }, { status: 404 });
      }
    }

    if (action === 'confirm') {
      if (tableExists) {
        console.log('✅ [confirm] Updating payment_receipts table');
        await query(
          'UPDATE payment_receipts SET status = \"confirmed\", confirmed_by = ?, confirmed_at = NOW(), rejection_reason = NULL WHERE booking_id = ?',
          [parseInt(user.userId), bookingId]
        );
      }
      // Update booking payment_status regardless of receipts table existence
      console.log('✅ [confirm] Updating bookings table');
      try {
        await query('UPDATE bookings SET payment_status = \"paid\" WHERE id = ?', [bookingId]);
        console.log('✅ [confirm] Payment confirmed successfully');
      } catch (updateError) {
        console.error('❌ [confirm] Failed to UPDATE bookings:', updateError);
        throw updateError;
      }
      return NextResponse.json({ success: true });
    } else {
      // Capture current booking info before changing status
      let bookingInfo: any | null = null;
      try {
        const rows = await query(
          `SELECT id, user_id, COALESCE(total_price, base_price, 0) AS amount, 
                  COALESCE(payment_method, 'cash') AS payment_method,
                  COALESCE(payment_status, 'not_paid') AS payment_status
           FROM bookings WHERE id = ? LIMIT 1`,
          [bookingId]
        ) as any[];
        bookingInfo = rows && rows.length > 0 ? rows[0] : null;
      } catch {}

      if (tableExists) {
        console.log('❌ [confirm] Rejecting receipt in payment_receipts table');
        await query(
          'UPDATE payment_receipts SET status = \"rejected\", confirmed_by = ?, confirmed_at = NOW(), rejection_reason = ? WHERE booking_id = ?',
          [parseInt(user.userId), reason, bookingId]
        );
      }
      console.log('🔄 [confirm] Cancelling booking due to receipt rejection');
      try {
        await query('UPDATE bookings SET status = \"cancelled\", payment_status = \"awaiting_payment_confirmation\", cancellation_reason = ? WHERE id = ?', [reason, bookingId]);
        console.log('✅ [confirm] Booking cancelled due to receipt rejection');
        
        // Send notification to user about receipt rejection
        try {
          await sendReceiptRejectionNotification(bookingId, reason || 'Receipt rejected');
        } catch (notificationError) {
          console.error('❌ [confirm] Failed to send receipt rejection notification:', notificationError);
          // Don't fail the main operation if notification fails
        }
      } catch (updateError) {
        console.error('❌ [confirm] Failed to UPDATE bookings:', updateError);
        throw updateError;
      }
      // If this booking had been marked paid via QR/manual, create a manual refund record for review
      try {
        const wasPaid = (bookingInfo?.payment_status || '').toLowerCase() === 'paid';
        const method = (bookingInfo?.payment_method || '').toLowerCase();
        const isQR = method.includes('qr') || method.includes('scan') || method.includes('manual');
        if (bookingInfo && wasPaid && isQR) {
          await processRefund({
            bookingId: bookingId,
            amount: Number(bookingInfo.amount || 0),
            reason: 'Receipt rejected - reversing QR payment',
            initiatedBy: parseInt(user.userId),
            initiatedByType: 'staff',
            notes: reason || undefined,
          });
        }
      } catch (refundErr) {
        console.warn('⚠️ [confirm] Failed to create refund after receipt rejection (non-fatal):', refundErr);
      }
      return NextResponse.json({ success: true });
    }
  } catch (e) {
    console.error('❌ [confirm] Critical error in payment confirmation:', e);
    console.error('❌ [confirm] Error stack:', e instanceof Error ? e.stack : 'No stack trace');

    // Check for specific database errors
    if (e && typeof e === 'object' && 'code' in e) {
      console.error('❌ [confirm] Database error code:', (e as any).code);
      console.error('❌ [confirm] Database error sqlMessage:', (e as any).sqlMessage);
    }

    const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
    return NextResponse.json({
      error: 'Failed to update payment status',
      details: errorMessage,
      timestamp: new Date().toISOString(),
      debug: process.env.NODE_ENV === 'development' ? {
        errorType: e instanceof Error ? e.constructor.name : typeof e,
        hasCode: e && typeof e === 'object' && 'code' in e,
        hasSqlMessage: e && typeof e === 'object' && 'sqlMessage' in e
      } : undefined
    }, { status: 500 });
  }
}

// Function to send receipt rejection notifications
async function sendReceiptRejectionNotification(bookingId: number, rejectionReason: string) {
  try {
    // Get booking and user details
    const bookingResult = await query(`
      SELECT b.*, u.first_name, u.last_name, u.email, u.phone, u.sms_notifications,
             p.name as pet_name, s.service_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.user_id
      LEFT JOIN pets p ON b.pet_id = p.pet_id
      LEFT JOIN service_packages s ON b.service_package_id = s.package_id
      WHERE b.id = ?
    `, [bookingId]) as any[];

    if (!bookingResult || bookingResult.length === 0) {
      console.error('Booking not found for receipt rejection notification:', bookingId);
      return;
    }

    const booking = bookingResult[0];

    // Create in-app notification
    try {
      await createNotification({
        userId: booking.user_id,
        title: 'Payment Receipt Rejected',
        message: `Your payment receipt for ${booking.pet_name || 'your pet'}'s ${booking.service_name || 'service'} has been rejected. Reason: ${rejectionReason}. Please upload a clear receipt or contact support.`,
        type: 'error',
        link: '/user/furparent_dashboard/bookings'
      });
    } catch (notificationError) {
      console.error('Failed to create in-app notification:', notificationError);
    }

    // Send email notification
    try {
      const emailTemplate = createReceiptRejectionEmail({
        userName: `${booking.first_name} ${booking.last_name}`,
        petName: booking.pet_name || 'your pet',
        serviceName: booking.service_name || 'service',
        rejectionReason,
        bookingId
      });

      await sendEmail({
        to: booking.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    // Send SMS notification if enabled
    if (booking.phone && (booking.sms_notifications === 1 || booking.sms_notifications === true)) {
      try {
        const smsMessage = `❌ Your payment receipt for ${booking.pet_name || 'your pet'}'s ${booking.service_name || 'service'} has been rejected. Reason: ${rejectionReason}. Please upload a clear receipt or contact support.`;
        
        sendSMSAsync({
          to: booking.phone,
          message: smsMessage
        });
      } catch (smsError) {
        console.error('Failed to send SMS notification:', smsError);
      }
    }

  } catch (error) {
    console.error('Error sending receipt rejection notification:', error);
  }
}

// Email template for receipt rejection
function createReceiptRejectionEmail({
  userName,
  petName,
  serviceName,
  rejectionReason,
  bookingId
}: {
  userName: string;
  petName: string;
  serviceName: string;
  rejectionReason: string;
  bookingId: number;
}) {
  const subject = '❌ Payment Receipt Rejected - Action Required';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt Rejected</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #EF4444, #DC2626); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 30px; background-color: #fff; border: 1px solid #e5e7eb; }
        .alert-box { background-color: #fef2f2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .booking-info { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Payment Receipt Rejected</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>
          
          <div class="alert-box">
            <strong>⚠️ Action Required</strong><br>
            Your payment receipt has been rejected and requires immediate attention.
          </div>

          <div class="booking-info">
            <h3>Booking Details</h3>
            <p><strong>Pet:</strong> ${petName}</p>
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>Booking ID:</strong> #${bookingId}</p>
            <p><strong>Rejection Reason:</strong> ${rejectionReason}</p>
          </div>

          <h3>What you need to do:</h3>
          <ul>
            <li>Upload a new, clear receipt image</li>
            <li>Ensure the receipt is not blurry or unclear</li>
            <li>Make sure all text and numbers are clearly visible</li>
            <li>Contact support if you need assistance</li>
          </ul>

          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/user/furparent_dashboard/bookings" class="button">
            Upload New Receipt
          </a>

          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from RainbowPaws. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}


