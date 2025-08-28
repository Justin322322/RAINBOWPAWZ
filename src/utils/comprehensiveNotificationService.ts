import { query } from '@/lib/db';
import { createNotification } from '@/utils/notificationService';
import { createBusinessNotification } from '@/utils/businessNotificationService';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { createBookingConfirmationEmail, createBookingStatusUpdateEmail } from '@/lib/emailTemplates';
import { sendSMS, createBookingSMSMessage } from '@/lib/httpSmsService';

/**
 * Comprehensive notification service for all booking lifecycle events
 */

// Booking lifecycle notification types
export type BookingNotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_pending'
  | 'booking_in_progress'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'payment_confirmed'
  | 'review_request'
  | 'reminder_24h'
  | 'reminder_1h';

// Payment notification types
type PaymentNotificationType =
  | 'payment_pending'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'payment_refunded';

// System notification types
type SystemNotificationType =
  | 'system_maintenance'
  | 'service_update'
  | 'policy_update';

// Import SSE broadcasting functions
let broadcastToUser: ((userId: string, accountType: string, notification: any) => void) | null = null;

// Dynamically import SSE functions to avoid SSR issues
if (typeof window === 'undefined') {
  import('../app/api/notifications/sse/route').then(module => {
    broadcastToUser = module.broadcastToUser;
  }).catch(err => {
    console.warn('SSE broadcasting not available:', err.message);
  });
}

/**
 * Create booking lifecycle notifications
 */
export async function createBookingNotification(
  bookingId: number,
  notificationType: BookingNotificationType,
  additionalData?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get booking details
    const bookingDetails = await getBookingDetails(bookingId);
    if (!bookingDetails) {
      return { success: false, error: 'Booking not found' };
    }

    const { user_id, provider_id, pet_name, service_name, provider_name, booking_date, booking_time } = bookingDetails;

    // Determine notification content based on type
    let title: string;
    let message: string;
    let type: 'info' | 'success' | 'warning' | 'error' = 'info';
    let link: string;
    let sendEmailNotification = false;

    switch (notificationType) {
      case 'booking_created':
        title = 'Booking Created Successfully';
        message = `Your booking for ${pet_name}'s ${service_name} with ${provider_name} has been created and is pending confirmation.`;
        type = 'success';
        link = `/user/furparent_dashboard/bookings?bookingId=${bookingId}`;
        sendEmailNotification = true;
        break;

      case 'booking_confirmed':
        title = 'Booking Confirmed';
        message = `Your booking for ${pet_name}'s ${service_name} on ${formatDate(booking_date)} at ${booking_time} has been confirmed.`;
        type = 'success';
        link = `/user/furparent_dashboard/bookings?bookingId=${bookingId}`;
        sendEmailNotification = true;
        break;

      case 'booking_pending':
        title = 'Booking Pending Review';
        message = `Your booking for ${pet_name}'s ${service_name} is pending review by ${provider_name}. You will be notified once it's confirmed.`;
        type = 'warning';
        link = `/user/furparent_dashboard/bookings?bookingId=${bookingId}`;
        break;

      case 'booking_in_progress':
        title = 'Service In Progress';
        message = `The ${service_name} for ${pet_name} is now in progress. You will be notified when it's completed.`;
        type = 'info';
        link = `/user/furparent_dashboard/bookings?bookingId=${bookingId}`;
        sendEmailNotification = true;
        break;

      case 'booking_completed':
        title = 'Service Completed';
        message = `The ${service_name} for ${pet_name} has been completed. Thank you for choosing our services.`;
        type = 'success';
        link = `/user/furparent_dashboard/bookings?bookingId=${bookingId}`;
        sendEmailNotification = true;
        break;

      case 'booking_cancelled':
        title = 'Booking Cancelled';
        message = `Your booking for ${pet_name}'s ${service_name} has been cancelled.`;
        type = 'warning';
        link = `/user/furparent_dashboard/bookings?bookingId=${bookingId}`;
        sendEmailNotification = true;
        break;

      default:
        return { success: false, error: 'Invalid notification type' };
    }

    // Create in-app notification
    const notificationResult = await createNotification({
      userId: user_id,
      title,
      message,
      type,
      link,
      shouldSendEmail: false // We'll handle email separately for better control
    });

    // Send email notification if required
    if (sendEmailNotification && notificationResult.success) {
      await sendBookingEmailNotification(bookingDetails, notificationType, additionalData);
    }

    // Send SMS notification if required
    if (sendEmailNotification && notificationResult.success) {
      await sendBookingSMSNotification(bookingDetails, notificationType);
    }

    // Create provider notification for certain events
    if (['booking_created', 'booking_pending', 'booking_cancelled'].includes(notificationType) && provider_id) {
      await createProviderNotification(bookingDetails, notificationType);
    }

    // Broadcast instant notification via SSE if available
    if (broadcastToUser && user_id) {
      // Determine user account type (assume 'user' for most bookings, 'business' for providers)
      const accountType = 'user'; // Most booking notifications go to fur parents
      
      broadcastToUser(user_id.toString(), accountType, {
        id: Date.now(), // Temporary ID for instant display
        title,
        message,
        type,
        is_read: 0,
        link: null,
        created_at: new Date().toISOString()
      });
    }

    return notificationResult;
  } catch (error) {
    console.error('Error creating booking notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Create payment notifications
 */
export async function createPaymentNotification(
  bookingId: number,
  paymentStatus: PaymentNotificationType,
  paymentDetails?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const bookingDetails = await getBookingDetails(bookingId);
    if (!bookingDetails) {
      return { success: false, error: 'Booking not found' };
    }

    const { user_id, pet_name, service_name, total_amount } = bookingDetails;

    let title: string;
    let message: string;
    let type: 'info' | 'success' | 'warning' | 'error' = 'info';
    let link = `/user/furparent_dashboard/bookings?bookingId=${bookingId}`;

    switch (paymentStatus) {
      case 'payment_pending':
        title = 'Payment Pending';
        message = `Your payment of ₱${total_amount} for ${pet_name}'s ${service_name} is being processed.`;
        type = 'info';
        break;

      case 'payment_confirmed':
        title = 'Payment Confirmed';
        message = `Your payment of ₱${total_amount} for ${pet_name}'s ${service_name} has been confirmed.`;
        type = 'success';
        break;

      case 'payment_failed':
        title = 'Payment Failed';
        message = `Your payment for ${pet_name}'s ${service_name} could not be processed. Please try again or contact support.`;
        type = 'error';
        break;

      case 'payment_refunded':
        title = 'Payment Refunded';
        message = `Your payment of ₱${total_amount} for ${pet_name}'s ${service_name} has been refunded.`;
        type = 'info';
        break;

      default:
        return { success: false, error: 'Invalid payment notification type' };
    }

    // Create in-app notification
    const notificationResult = await createNotification({
      userId: user_id,
      title,
      message,
      type,
      link,
      shouldSendEmail: ['payment_confirmed', 'payment_failed', 'payment_refunded'].includes(paymentStatus)
    });

    // Send SMS notification for important payment events
    if (['payment_confirmed', 'payment_failed'].includes(paymentStatus)) {
      await sendPaymentSMSNotification(bookingDetails, paymentStatus, paymentDetails);
    }

    // Broadcast instant notification via SSE if available
    if (broadcastToUser && user_id) {
      // Determine user account type (assume 'user' for most bookings, 'business' for providers)
      const accountType = 'user'; // Most booking notifications go to fur parents
      
      broadcastToUser(user_id.toString(), accountType, {
        id: Date.now(), // Temporary ID for instant display
        title,
        message,
        type,
        is_read: 0,
        link: null,
        created_at: new Date().toISOString()
      });
    }

    return notificationResult;
  } catch (error) {
    console.error('Error creating payment notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Create system maintenance notifications
 */
export async function createSystemNotification(
  notificationType: SystemNotificationType,
  title: string,
  message: string,
  targetUsers?: number[] // If not provided, sends to all users
): Promise<{ success: boolean; error?: string }> {
  try {
    let users: number[] = [];

    if (targetUsers) {
      users = targetUsers;
    } else {
      // Get all active users
      const allUsers = await query('SELECT user_id FROM users WHERE status = "active"') as any[];
      users = allUsers.map(user => user.user_id);
    }

    const type = notificationType === 'system_maintenance' ? 'warning' : 'info';
    const link = '/user/furparent_dashboard';

    // Create notifications for all target users
    const results = await Promise.allSettled(
      users.map(userId =>
        createNotification({
          userId,
          title,
          message,
          type,
          link,
          shouldSendEmail: notificationType === 'system_maintenance'
        })
      )
    );

    const successCount = results.filter(result => result.status === 'fulfilled').length;

    return {
      success: successCount > 0,
      error: successCount === 0 ? 'Failed to create any notifications' : undefined
    };
  } catch (error) {
    console.error('Error creating system notification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Helper function to get booking details
 */
async function getBookingDetails(bookingId: number): Promise<any> {
  try {
    // Try service_bookings table first
    let bookingQuery = `
      SELECT
        sb.id,
        sb.user_id,
        sb.provider_id,
        sb.pet_name,
        sb.booking_date,
        sb.booking_time,
        sb.price as total_amount,
        sp.name as service_name,
        COALESCE(spr.name, CONCAT(u.first_name, ' ', u.last_name)) as provider_name
      FROM service_bookings sb
      LEFT JOIN service_packages sp ON sb.package_id = sp.package_id
      LEFT JOIN service_providers spr ON sb.provider_id = spr.provider_id
      LEFT JOIN users u ON sb.provider_id = u.user_id
      WHERE sb.id = ?
    `;

    let result = await query(bookingQuery, [bookingId]) as any[];

    if (!result || result.length === 0) {
      // Try bookings table as fallback
      bookingQuery = `
        SELECT
          b.booking_id as id,
          b.user_id,
          b.provider_id,
          b.pet_name,
          b.booking_date,
          b.booking_time,
          b.total_price as total_amount,
          'Cremation Service' as service_name,
          COALESCE(spr.name, CONCAT(u.first_name, ' ', u.last_name)) as provider_name
        FROM bookings b
        LEFT JOIN service_providers spr ON b.provider_id = spr.provider_id
        LEFT JOIN users u ON b.provider_id = u.user_id
        WHERE b.booking_id = ?
      `;

      result = await query(bookingQuery, [bookingId]) as any[];
    }

    return result && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting booking details:', error);
    return null;
  }
}

/**
 * Helper function to send booking email notifications
 */
async function sendBookingEmailNotification(
  bookingDetails: any,
  notificationType: BookingNotificationType,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    // Get user email and preferences
    const userResult = await query('SELECT email, first_name, email_notifications FROM users WHERE user_id = ?', [bookingDetails.user_id]) as any[];

    if (!userResult || userResult.length === 0) {
      console.warn('User email not found for booking notification');
      return;
    }

    const { email, first_name, email_notifications } = userResult[0];

    // Respect user email notification preferences (default true if null)
    const emailOptIn = email_notifications !== null ? Boolean(email_notifications) : true;
    if (!emailOptIn) {
      return;
    }
    let emailTemplate;

    switch (notificationType) {
      case 'booking_created':
        emailTemplate = createBookingConfirmationEmail({
          customerName: first_name,
          serviceName: bookingDetails.service_name,
          providerName: bookingDetails.provider_name,
          bookingDate: formatDate(bookingDetails.booking_date),
          bookingTime: bookingDetails.booking_time,
          petName: bookingDetails.pet_name,
          bookingId: bookingDetails.id
        });
        break;

      case 'booking_pending':
      case 'booking_confirmed':
      case 'booking_in_progress':
      case 'booking_completed':
      case 'booking_cancelled':
        emailTemplate = createBookingStatusUpdateEmail({
          customerName: first_name,
          serviceName: bookingDetails.service_name,
          providerName: bookingDetails.provider_name,
          bookingDate: formatDate(bookingDetails.booking_date),
          bookingTime: bookingDetails.booking_time,
          petName: bookingDetails.pet_name,
          bookingId: bookingDetails.id,
          status: notificationType.replace('booking_', '') as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
          notes: additionalData?.reason
        });
        break;

      default:
        return; // No email template for this notification type
    }

    if (emailTemplate) {
      await sendEmail({
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html
      });
    }
  } catch (error) {
    console.error('Error sending booking email notification:', error);
  }
}

/**
 * Helper function to send payment SMS notifications
 */
async function sendPaymentSMSNotification(
  bookingDetails: any,
  paymentStatus: PaymentNotificationType,
  _paymentDetails?: Record<string, any>
): Promise<void> {
  try {
    // Get user phone number and SMS preferences
    const userResult = await query(
      'SELECT phone, first_name, sms_notifications FROM users WHERE user_id = ?',
      [bookingDetails.user_id]
    ) as any[];

    if (!userResult || userResult.length === 0) {
      return;
    }

    const { phone, first_name, sms_notifications } = userResult[0];

    // Check if user has SMS notifications enabled
    if (!sms_notifications) {
      return;
    }

    // Check if user has a phone number
    if (!phone) {
      return;
    }

    let smsMessage = '';

    switch (paymentStatus) {
      case 'payment_confirmed':
        smsMessage = `Hi ${first_name}! Your payment of ₱${bookingDetails.total_amount || bookingDetails.price} for ${bookingDetails.pet_name}'s ${bookingDetails.service_name} has been confirmed. Booking ID: #${bookingDetails.id}. Thank you for choosing Rainbow Paws!`;
        break;

      case 'payment_failed':
        smsMessage = `Hi ${first_name}, your payment for ${bookingDetails.pet_name}'s ${bookingDetails.service_name} could not be processed. Please retry payment or contact support. Booking ID: #${bookingDetails.id}. Rainbow Paws`;
        break;

      case 'payment_refunded':
        smsMessage = `Hi ${first_name}, your payment of ₱${bookingDetails.total_amount || bookingDetails.price} for booking #${bookingDetails.id} has been refunded. Please allow 3-5 business days for processing. Rainbow Paws`;
        break;

      default:
        return; // No SMS for other payment statuses
    }

    if (smsMessage) {
      const smsResult = await sendSMS({
        to: phone,
        message: smsMessage
      });

      // Log SMS result for debugging
      if (smsResult.success) {
        console.log(`✅ Payment SMS sent successfully to ${phone} for booking #${bookingDetails.id}`);
      } else {
        console.error(`❌ Payment SMS failed for booking #${bookingDetails.id}:`, smsResult.error);
      }
    }
  } catch (error) {
    console.error('Error sending payment SMS notification:', error);
    // Don't throw error to avoid breaking the main notification flow
  }
}

/**
 * Helper function to send booking SMS notifications
 */
async function sendBookingSMSNotification(
  bookingDetails: any,
  notificationType: BookingNotificationType
): Promise<void> {
  try {
    // Get user phone number and SMS preferences
    const userResult = await query(
      'SELECT phone, first_name, sms_notifications FROM users WHERE user_id = ?',
      [bookingDetails.user_id]
    ) as any[];

    if (!userResult || userResult.length === 0) {
      return;
    }

    const { phone, first_name, sms_notifications } = userResult[0];

    // Check if user has SMS notifications enabled
    if (!sms_notifications) {
      return;
    }

    // Check if user has a phone number
    if (!phone) {
      return;
    }

    // Only send SMS for certain notification types
    const smsEnabledTypes = ['booking_confirmed', 'booking_in_progress', 'booking_completed', 'booking_cancelled'];
    if (!smsEnabledTypes.includes(notificationType)) {
      return;
    }

    // Create SMS message
    const status = notificationType.replace('booking_', '');
    const smsMessage = createBookingSMSMessage(
      first_name,
      bookingDetails.pet_name,
      bookingDetails.service_name,
      status,
      bookingDetails.id.toString()
    );

    // Send SMS
    const smsResult = await sendSMS({
      to: phone,
      message: smsMessage
    });

    // Log SMS result for debugging
    if (smsResult.success) {
      console.log(`✅ Booking SMS sent successfully to ${phone} for booking #${bookingDetails.id}`);
    } else {
      console.error(`❌ Booking SMS failed for booking #${bookingDetails.id}:`, smsResult.error);
    }

  } catch (error) {
    console.error('Error sending booking SMS notification:', error);
  }
}

/**
 * Helper function to create provider notifications
 */
async function createProviderNotification(
  bookingDetails: any,
  notificationType: BookingNotificationType
): Promise<void> {
  try {
    if (!bookingDetails.provider_id) return;

    // Get provider user ID from service_providers table first
    let providerResult = await query('SELECT user_id FROM service_providers WHERE provider_id = ?', [bookingDetails.provider_id]) as any[];

    // If not found in service_providers, try businesses table for cremation businesses
    if (!providerResult || providerResult.length === 0) {
      providerResult = await query('SELECT user_id FROM businesses WHERE id = ?', [bookingDetails.provider_id]) as any[];
    }

    // If still not found, try direct user lookup (provider_id might be user_id)
    if (!providerResult || providerResult.length === 0) {
      providerResult = await query('SELECT user_id FROM users WHERE user_id = ? AND role = "business"', [bookingDetails.provider_id]) as any[];
    }

    if (!providerResult || providerResult.length === 0) {
      return;
    }

    const providerUserId = providerResult[0].user_id;

    let title: string;
    let message: string;
    let link: string;

    switch (notificationType) {
      case 'booking_created':
        title = 'New Booking Received';
        message = `You have received a new booking for ${bookingDetails.pet_name}'s ${bookingDetails.service_name}.`;
        link = `/cremation/bookings/${bookingDetails.id}`;
        break;

      case 'booking_pending':
        title = 'Pending Booking Alert';
        message = `You have a pending booking for ${bookingDetails.pet_name} that requires your attention.`;
        link = `/cremation/bookings?status=pending`;
        break;

      case 'booking_cancelled':
        title = 'Booking Cancelled';
        message = `The booking for ${bookingDetails.pet_name}'s ${bookingDetails.service_name} has been cancelled by the customer.`;
        link = `/cremation/bookings/${bookingDetails.id}`;
        break;

      default:
        return; // No provider notification for this type
    }

    await createBusinessNotification({
      userId: providerUserId,
      title,
      message,
      type: notificationType === 'booking_cancelled' ? 'warning' : 'info',
      link,
      shouldSendEmail: true
    });

    // Broadcast instant notification to provider via SSE if available
    if (broadcastToUser) {
      broadcastToUser(providerUserId.toString(), 'business', {
        id: Date.now(), // Temporary ID for instant display
        title,
        message,
        type: notificationType === 'booking_cancelled' ? 'warning' : 'info',
        is_read: 0,
        link,
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error creating provider notification:', error);
  }
}

/**
 * Helper function to format date
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Schedule reminder notifications
 */
export async function scheduleBookingReminders(bookingId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const bookingDetails = await getBookingDetails(bookingId);
    if (!bookingDetails) {
      return { success: false, error: 'Booking not found' };
    }

    const bookingDateTime = new Date(`${bookingDetails.booking_date} ${bookingDetails.booking_time}`);
    const now = new Date();

    // Schedule 24-hour reminder
    const reminder24h = new Date(bookingDateTime.getTime() - 24 * 60 * 60 * 1000);
    if (reminder24h > now) {
      // In a real implementation, you would use a job queue like Bull or Agenda
      // For now, we'll store the reminder in a reminders table
      await scheduleReminder(bookingId, '24h', reminder24h);
    }

    // Schedule 1-hour reminder
    const reminder1h = new Date(bookingDateTime.getTime() - 60 * 60 * 1000);
    if (reminder1h > now) {
      await scheduleReminder(bookingId, '1h', reminder1h);
    }

    return { success: true };
  } catch (error) {
    console.error('Error scheduling booking reminders:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Helper function to schedule a reminder
 */
async function scheduleReminder(bookingId: number, reminderType: string, scheduledTime: Date): Promise<void> {
  try {
    // Ensure reminders table exists
    await query(`
      CREATE TABLE IF NOT EXISTS booking_reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        reminder_type VARCHAR(10) NOT NULL,
        scheduled_time DATETIME NOT NULL,
        sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_scheduled_time (scheduled_time),
        INDEX idx_sent (sent)
      )
    `);

    // Insert the reminder
    await query(
      'INSERT INTO booking_reminders (booking_id, reminder_type, scheduled_time) VALUES (?, ?, ?)',
      [bookingId, reminderType, scheduledTime.toISOString().slice(0, 19).replace('T', ' ')]
    );
  } catch (error) {
    console.error('Error scheduling reminder:', error);
  }
}
