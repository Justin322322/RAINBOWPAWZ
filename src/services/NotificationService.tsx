import { query } from '@/lib/db';
import { sendEmail } from '@/services/EmailService';
import { getServerAppUrl } from '@/utils/appUrl';

// SSE broadcaster (server-side dynamic import to avoid SSR issues)
let broadcastToUser: ((userId: string, accountType: string, notification: any) => void) | null = null;
if (typeof window === 'undefined') {
  import('@/app/api/notifications/sse/route').then(module => {
    broadcastToUser = module.broadcastToUser;
  }).catch(() => {});
}

type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

interface CreateNotificationParams {
  userId: number;
  title: string;
  message: string;
  type?: NotificationSeverity;
  link?: string | null;
  shouldSendEmail?: boolean;
  emailSubject?: string;
}

interface NotificationRecord {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationSeverity;
  is_read: number | boolean;
  link: string | null;
  created_at: string;
}

// Cache for table existence check
let notificationsTableExists: boolean | null = null;

async function ensureNotificationsTable(): Promise<void> {
  if (notificationsTableExists === true) return;
  const tableExists = await query(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'notifications'`
  ) as Array<{ count: number }>;

  if (tableExists[0].count === 0) {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        link VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }
  notificationsTableExists = true;
}

export async function createNotification(params: CreateNotificationParams): Promise<{ success: boolean; notificationId?: number; error?: string }>{
  try {
    const { userId, title, message, type = 'info', link = null, shouldSendEmail = false, emailSubject } = params;
    await ensureNotificationsTable();
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as any;

    if (shouldSendEmail) {
      await sendEmailNotification(userId, title, message, type, link, emailSubject);
    }

    if (broadcastToUser) {
      broadcastToUser(userId.toString(), 'user', {
        id: result.insertId,
        title,
        message,
        type,
        is_read: 0,
        link,
        created_at: new Date().toISOString()
      });
    }

    return { success: true, notificationId: result.insertId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Backward-compatible fast creation method used by a few legacy endpoints
export async function createNotificationFast({
  userId,
  title,
  message,
  type = 'info',
  link = null
}: {
  userId: number;
  title: string;
  message: string;
  type?: NotificationSeverity;
  link?: string | null;
}): Promise<{ success: boolean; notificationId?: number; error?: string }>{
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as any;
    return { success: true, notificationId: result.insertId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendEmailNotification(
  userId: number,
  title: string,
  message: string,
  _type: NotificationSeverity,
  link: string | null,
  emailSubject?: string
): Promise<void> {
  const user = await getUserEmailData(userId);
  if (!user || !user.email) return;
  const emailNotificationsEnabled = user.email_notifications !== null ? Boolean(user.email_notifications) : true;
  if (!emailNotificationsEnabled) return;
  await sendEmail({
    to: user.email,
    subject: emailSubject || title,
    html: createStandardEmailHtml(user.first_name, title, message, link),
    text: createStandardEmailText(user.first_name, title, message, link)
  });
}

async function getUserEmailData(userId: number): Promise<{ email: string; first_name: string; email_notifications: number } | null> {
  try {
    const res = await query(`
      SELECT email, first_name, COALESCE(email_notifications, 1) as email_notifications
      FROM users WHERE user_id = ?
    `, [userId]) as any[];
    return res.length > 0 ? res[0] : null;
  } catch {
    try {
      const res = await query(`
        SELECT email, first_name, 1 as email_notifications FROM users WHERE user_id = ?
      `, [userId]) as any[];
      return res.length > 0 ? res[0] : null;
    } catch {
      return null;
    }
  }
}

function createStandardEmailHtml(firstName: string, title: string, message: string, link: string | null): string {
  const appUrl = getServerAppUrl();
  const base = (content: string) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>RainbowPaws Notification</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}.container{max-width:600px;margin:0 auto;padding:20px}.header{background-color:#10B981;padding:20px;text-align:center}.header h1{color:#fff;margin:0;font-size:24px}.content{padding:20px;background-color:#fff}.footer{background-color:#f5f5f5;padding:15px;text-align:center;font-size:12px;color:#666}.button{display:inline-block;background-color:#10B981;color:#fff;padding:12px 24px;text-decoration:none;border-radius:25px;margin:20px 0;font-weight:normal}</style></head><body><div class="container"><div class="header"><h1>RainbowPaws</h1></div><div class="content">${content}</div><div class="footer"><p>&copy; ${new Date().getFullYear()} RainbowPaws - Pet Memorial Services</p><p>This is an automated message, please do not reply to this email.</p></div></div></body></html>`;
  const content = `
    <h2>Notification</h2>
    <p>Hello ${firstName},</p>
    <h3>${title}</h3>
    <p>${message}</p>
    ${link ? `<div style="text-align:center"><a href="${appUrl}${link}" class="button">View Details</a></div>` : ''}
  `;
  return base(content);
}

function createStandardEmailText(firstName: string, title: string, message: string, link: string | null): string {
  const appUrl = getServerAppUrl();
  return `Rainbow Paws Notification\n\nHello ${firstName},\n\n${title}\n\n${message}\n\n${link ? `View details: ${appUrl}${link}` : ''}`.trim();
}

// ADMIN NOTIFICATIONS
export async function createAdminNotification(params: {
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: number | null;
  shouldSendEmail?: boolean;
  emailSubject?: string;
}): Promise<{ success: boolean; notificationId?: number; error?: string }>{
  try {
    const { type, title, message, entityType = null, entityId = null, shouldSendEmail = true, emailSubject } = params;
    await ensureAdminNotificationsTable();

    let link: string | null = null;
    if (type === 'new_cremation_center' || type === 'pending_application') {
      link = entityId ? `/admin/applications/${entityId}` : '/admin/applications';
    } else if (type === 'refund_request') {
      link = entityId ? `/admin/refunds?refundId=${entityId}` : '/admin/refunds';
    } else if (type === 'new_appeal' || type === 'appeal_submitted') {
      if (entityType === 'furparent' || entityType === 'user') link = '/admin/users/furparents';
      else if (entityType === 'cremation' || entityType === 'business') link = '/admin/users/cremation';
      else link = '/admin/users/furparents';
      if (entityId) link += `?appealId=${entityId}&userId=${entityId}`;
    }

    const result = await query(
      `INSERT INTO admin_notifications (type, title, message, entity_type, entity_id, link) VALUES (?, ?, ?, ?, ?, ?)`,
      [type, title, message, entityType, entityId, link]
    ) as any;

    if (shouldSendEmail) {
      await sendAdminEmailNotifications(title, message, type, link, emailSubject);
    }

    return { success: true, notificationId: result.insertId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error creating notification' };
  }
}

async function ensureAdminNotificationsTable(): Promise<void> {
  const exists = await query(`
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'admin_notifications'
  `) as any[];
  if (exists[0].count === 0) {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        entity_type VARCHAR(50) DEFAULT NULL,
        entity_id INT DEFAULT NULL,
        link VARCHAR(255) DEFAULT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT current_timestamp()
      )
    `);
  }
}

async function sendAdminEmailNotifications(
  title: string,
  message: string,
  type: string,
  link: string | null,
  emailSubject?: string
): Promise<void> {
  const admins = await query(`
    SELECT user_id, email, first_name, email_notifications
    FROM users
    WHERE role = 'admin' AND (email_notifications IS NULL OR email_notifications = 1) AND email IS NOT NULL
  `) as any[];
  if (!admins || admins.length === 0) return;
  const appUrl = getServerAppUrl();
  const base = (content: string) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>RainbowPaws Notification</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}.container{max-width:600px;margin:0 auto;padding:20px}.header{background-color:#10B981;padding:20px;text-align:center}.header h1{color:#fff;margin:0;font-size:24px}.content{padding:20px;background-color:#fff}.button{display:inline-block;background-color:#10B981;color:#fff;padding:12px 24px;text-decoration:none;border-radius:25px;margin:20px 0;font-weight:normal}</style></head><body><div class="container"><div class="header"><h1>RainbowPaws</h1></div><div class="content">${content}</div></div></body></html>`;
  const htmlFor = (firstName: string) => base(`
    <h2>Admin Notification</h2>
    <p>Hello ${firstName},</p>
    <h3>${title}</h3>
    <p>${message}</p>
    ${link ? `<div style="text-align:center"><a href="${appUrl}${link}" class="button">${type === 'refund_request' ? 'Review Refund' : 'View Details'}</a></div>` : ''}
  `);
  await Promise.allSettled(admins.map(async a => {
    try {
      await sendEmail({
        to: a.email,
        subject: emailSubject || `[Rainbow Paws Admin] ${title}`,
        html: htmlFor(a.first_name),
        text: `Hello ${a.first_name},\n\n${title}\n\n${message}\n\n${link ? `Admin Panel Link: ${appUrl}${link}` : ''}`
      });
    } catch {}
  }));
}

// BUSINESS NOTIFICATIONS
export async function createBusinessNotification(params: {
  userId: number;
  title: string;
  message: string;
  type?: NotificationSeverity;
  link?: string | null;
  shouldSendEmail?: boolean;
  emailSubject?: string;
}): Promise<{ success: boolean; notificationId?: number; error?: string }>{
  try {
    const { userId, title, message, type = 'info', link = null, shouldSendEmail = true, emailSubject } = params;
    await ensureNotificationsTable();
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as any;

    if (shouldSendEmail) {
      await sendBusinessEmailNotification(userId, title, message, type, link, emailSubject);
    }

    if (broadcastToUser) {
      broadcastToUser(userId.toString(), 'business', {
        id: result.insertId,
        title,
        message,
        type,
        is_read: 0,
        link,
        created_at: new Date().toISOString()
      });
    }
    return { success: true, notificationId: result.insertId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendBusinessEmailNotification(
  userId: number,
  title: string,
  message: string,
  _type: string,
  link: string | null,
  emailSubject?: string
): Promise<void> {
  let userResult: any[];
  try {
    userResult = await query(`
      SELECT email, first_name, sp.name AS business_name, COALESCE(email_notifications, 1) as email_notifications
      FROM users u LEFT JOIN service_providers sp ON u.user_id = sp.user_id
      WHERE u.user_id = ? AND u.role = 'business'`, [userId]) as any[];
  } catch {
    userResult = await query(`
      SELECT email, first_name, sp.name AS business_name, 1 as email_notifications
      FROM users u LEFT JOIN service_providers sp ON u.user_id = sp.user_id
      WHERE u.user_id = ? AND u.role = 'business'`, [userId]) as any[];
  }
  if (!userResult || userResult.length === 0) return;
  const user = userResult[0];
  const emailNotificationsEnabled = user.email_notifications !== null ? Boolean(user.email_notifications) : true;
  if (!emailNotificationsEnabled || !user.email) return;
  const appUrl = getServerAppUrl();
  const base = (content: string) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>RainbowPaws Notification</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0}.container{max-width:600px;margin:0 auto;padding:20px}.header{background-color:#10B981;padding:20px;text-align:center}.header h1{color:#fff;margin:0;font-size:24px}.content{padding:20px;background-color:#fff}.button{display:inline-block;background-color:#10B981;color:#fff;padding:12px 24px;text-decoration:none;border-radius:25px;margin:20px 0;font-weight:normal}</style></head><body><div class="container"><div class="header"><h1>RainbowPaws</h1></div><div class="content">${content}</div></div></body></html>`;
  const html = base(`
    <h2>Business Notification</h2>
    <p>Hello ${user.first_name},</p>
    ${user.business_name ? `<span style="background:#10B981;color:#fff;padding:6px 12px;border-radius:15px;font-size:12px;font-weight:600;display:inline-block;margin-bottom:15px">${user.business_name}</span>` : ''}
    <h3>${title}</h3>
    <p>${message}</p>
    ${link ? `<div style="text-align:center"><a href="${appUrl}${link}" class="button">View Details</a></div>` : ''}
  `);
  await sendEmail({
    to: user.email,
    subject: emailSubject || `[Rainbow Paws] ${title}`,
    html,
    text: `Hello ${user.first_name},\n\n${title}\n\n${message}\n\n${link ? `Business Portal Link: ${appUrl}${link}` : ''}`
  });
}

// USER NOTIFICATION APIS (fetch/update)
export async function getUserNotifications(userId: number, limit: number = 10): Promise<NotificationRecord[]> {
  await ensureNotificationsTable();
  const described = await query(`DESCRIBE notifications`) as Array<{ Field: string }>;
  const hasNotificationId = described.some(col => col.Field === 'notification_id');
  const selectQuery = hasNotificationId
    ? `SELECT notification_id as id, user_id, title, message, type, is_read, link, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    : `SELECT id, user_id, title, message, type, is_read, link, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;
  const notifications = await query(selectQuery, [userId, limit]) as NotificationRecord[];
  return notifications || [];
}

export async function markNotificationAsRead(notificationId: number, userId: number): Promise<boolean> {
  const described = await query(`DESCRIBE notifications`) as Array<{ Field: string }>;
  const hasNotificationId = described.some(col => col.Field === 'notification_id');
  const updateQuery = hasNotificationId
    ? 'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?'
    : 'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?';
  await query(updateQuery, [notificationId, userId]);
  return true;
}

export async function markAllNotificationsAsRead(userId: number): Promise<boolean> {
  await query('UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE', [userId]);
  return true;
}

// BOOKING/PAYMENT/SYSTEM NOTIFICATIONS (formerly comprehensive service)
export type BookingNotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_pending'
  | 'booking_in_progress'
  | 'booking_completed'
  | 'booking_cancelled'
  | 'review_request'
  | 'reminder_24h'
  | 'reminder_1h';

type PaymentNotificationType = 'payment_pending' | 'payment_confirmed' | 'payment_failed' | 'payment_refunded';

export async function createBookingNotification(
  bookingId: number,
  notificationType: BookingNotificationType,
  additionalData?: Record<string, any>
): Promise<{ success: boolean; error?: string }>{
  try {
    const booking = await getBookingDetails(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    const { user_id, provider_id, pet_name, service_name, provider_name, booking_date, booking_time } = booking;
    let title = '';
    let message = '';
    let type: NotificationSeverity = 'info';
    let link = `/user/furparent_dashboard/bookings?bookingId=${bookingId}`;
    let email = false;
    switch (notificationType) {
      case 'booking_created':
        title = 'Booking Created Successfully';
        message = `Your booking for ${pet_name}'s ${service_name} with ${provider_name} has been created and is pending confirmation.`;
        type = 'success';
        email = true;
        break;
      case 'booking_confirmed':
        title = 'Booking Confirmed';
        message = `Your booking for ${pet_name}'s ${service_name} on ${formatDate(booking_date)} at ${booking_time} has been confirmed.`;
        type = 'success';
        email = true;
        break;
      case 'booking_pending':
        title = 'Booking Pending Review';
        message = `Your booking for ${pet_name}'s ${service_name} is pending review by ${provider_name}.`;
        type = 'warning';
        break;
      case 'booking_in_progress':
        title = 'Service In Progress';
        message = `The ${service_name} for ${pet_name} is now in progress.`;
        type = 'info';
        email = true;
        break;
      case 'booking_completed':
        title = 'Service Completed';
        message = `The ${service_name} for ${pet_name} has been completed. Thank you for choosing our services.`;
        type = 'success';
        email = true;
        break;
      case 'booking_cancelled':
        title = 'Booking Cancelled';
        const cancelledByProvider = additionalData?.cancelledBy === 'provider' || additionalData?.source === 'provider';
        message = cancelledByProvider
          ? `Your booking for ${pet_name}'s ${service_name} has been cancelled by the service provider. ${additionalData?.reason ? `Reason: ${additionalData.reason}` : 'Please contact them for more details.'}`
          : `Your booking for ${pet_name}'s ${service_name} has been cancelled. ${additionalData?.reason ? `Reason: ${additionalData.reason}` : ''}`;
        type = 'warning';
        email = true;
        break;
      case 'review_request':
        title = 'Please Review Your Experience';
        message = `How was your experience with ${provider_name}? Your feedback helps us improve our services.`;
        type = 'info';
        link = `/user/furparent_dashboard/bookings?bookingId=${bookingId}&showReview=true`;
        break;
      case 'reminder_24h':
        title = 'Booking Reminder - 24 Hours';
        message = `Reminder: Your appointment for ${pet_name}'s ${service_name} is scheduled for tomorrow at ${booking_time}.`;
        type = 'info';
        email = true;
        break;
      case 'reminder_1h':
        title = 'Booking Reminder - 1 Hour';
        message = `Reminder: Your appointment for ${pet_name}'s ${service_name} is in 1 hour. Please prepare for the service.`;
        type = 'warning';
        break;
    }

    const created = await createNotification({ userId: booking.user_id, title, message, type, link, shouldSendEmail: false });
    if (!created.success) return created;

    if (email) {
      const { createBookingConfirmationEmail, createBookingStatusUpdateEmail } = await import('@/services/EmailTemplates');
      const userRes = await query('SELECT email, first_name FROM users WHERE user_id = ?', [user_id]) as any[];
      if (userRes && userRes.length) {
        const { email: to, first_name } = userRes[0];
        let template: { subject: string; html: string } | null = null;
        if (notificationType === 'booking_created') {
          template = createBookingConfirmationEmail({
            customerName: first_name,
            serviceName: service_name,
            providerName: provider_name,
            bookingDate: formatDate(booking_date),
            bookingTime: booking_time,
            petName: pet_name,
            bookingId: booking.id
          });
        } else {
          template = createBookingStatusUpdateEmail({
            customerName: first_name,
            serviceName: service_name,
            providerName: provider_name,
            bookingDate: formatDate(booking_date),
            bookingTime: booking_time,
            petName: pet_name,
            bookingId: booking.id,
            status: notificationType.replace('booking_', '') as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
            notes: additionalData?.reason
          });
        }
        if (template) {
          await sendEmail({ to, subject: template.subject, html: template.html });
        }
      }
    }

    if (['booking_created', 'booking_pending', 'booking_cancelled'].includes(notificationType) && provider_id) {
      await createProviderNotification(booking, notificationType);
    }

    return created;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function createPaymentNotification(
  bookingId: number,
  paymentStatus: PaymentNotificationType,
  _paymentDetails?: Record<string, any>
): Promise<{ success: boolean; error?: string }>{
  try {
    const booking = await getBookingDetails(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };

    const { user_id, pet_name, service_name, total_amount } = booking;
    let title = '';
    let message = '';
    let type: NotificationSeverity = 'info';
    const link = `/user/furparent_dashboard/bookings?bookingId=${bookingId}`;
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
    }

    const result = await createNotification({ userId: user_id, title, message, type, link, shouldSendEmail: ['payment_confirmed', 'payment_failed', 'payment_refunded'].includes(paymentStatus) });

    // Send SMS for important payment events if possible
    if (['payment_confirmed', 'payment_failed'].includes(paymentStatus)) {
      try {
        const { sendSMS, createBookingSMSMessage } = await import('@/lib/smsService');
        const userResult = await query('SELECT phone, first_name, sms_notifications FROM users WHERE user_id = ?', [booking.user_id]) as any[];
        if (userResult && userResult.length && userResult[0].sms_notifications && userResult[0].phone) {
          const smsMessage = paymentStatus === 'payment_confirmed'
            ? `Hi ${userResult[0].first_name}! Your payment of ₱${booking.total_amount || booking.price} for ${booking.pet_name}'s ${booking.service_name} has been confirmed. Booking ID: #${booking.id}. Thank you for choosing Rainbow Paws!`
            : `Hi ${userResult[0].first_name}, your payment for ${booking.pet_name}'s ${booking.service_name} could not be processed. Please retry payment or contact support. Booking ID: #${booking.id}. Rainbow Paws`;
          await sendSMS({ to: userResult[0].phone, message: smsMessage || createBookingSMSMessage(userResult[0].first_name, booking.pet_name, booking.service_name, paymentStatus, booking.id.toString()) });
        }
      } catch {}
    }

    return result;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function createSystemNotification(
  notificationType: 'system_maintenance' | 'service_update' | 'policy_update',
  title: string,
  message: string,
  targetUsers?: number[]
): Promise<{ success: boolean; error?: string }>{
  try {
    const users = targetUsers ? targetUsers : (await query('SELECT user_id FROM users WHERE status = "active"') as any[]).map(u => u.user_id);
    const type: NotificationSeverity = notificationType === 'system_maintenance' ? 'warning' : 'info';
    const link = '/user/furparent_dashboard';
    const results = await Promise.allSettled(users.map(uid => createNotification({ userId: uid, title, message, type, link, shouldSendEmail: notificationType === 'system_maintenance' })));
    const success = results.filter(r => r.status === 'fulfilled').length;
    return { success: success > 0, error: success === 0 ? 'Failed to create any notifications' : undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Create user notification (compatibility with previous API)
export async function createUserNotification({
  userId,
  type,
  title,
  message,
  entityId,
  shouldSendEmail = false,
  emailSubject
}: {
  userId: number;
  type: string;
  title: string;
  message: string;
  entityId?: number;
  shouldSendEmail?: boolean;
  emailSubject?: string;
}): Promise<boolean> {
  const link = determineUserNotificationLink(type, entityId);
  const result = await createNotification({ userId, title, message, type: (type as NotificationSeverity) || 'info', link, shouldSendEmail, emailSubject });
  return result.success;
}

function determineUserNotificationLink(type: string, entityId?: number): string | null {
  if (type === 'refund_processed' || type === 'refund_approved') {
    return entityId ? `/user/furparent_dashboard/bookings?bookingId=${entityId}` : '/user/furparent_dashboard/bookings';
  }
  return null;
}

// Reminder scheduling (migrated from comprehensive service)
export async function scheduleBookingReminders(bookingId: number): Promise<{ success: boolean; error?: string }>{
  try {
    const booking = await getBookingDetails(bookingId);
    if (!booking) return { success: false, error: 'Booking not found' };
    const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`);
    const now = new Date();
    const reminder24h = new Date(bookingDateTime.getTime() - 24 * 60 * 60 * 1000);
    if (reminder24h > now) {
      await scheduleReminder(bookingId, '24h', reminder24h);
    }
    const reminder1h = new Date(bookingDateTime.getTime() - 60 * 60 * 1000);
    if (reminder1h > now) {
      await scheduleReminder(bookingId, '1h', reminder1h);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function scheduleReminder(bookingId: number, reminderType: string, scheduledTime: Date): Promise<void> {
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
  await query(
    'INSERT INTO booking_reminders (booking_id, reminder_type, scheduled_time) VALUES (?, ?, ?)',
    [bookingId, reminderType, scheduledTime.toISOString().slice(0, 19).replace('T', ' ')]
  );
}

async function createProviderNotification(booking: any, notificationType: BookingNotificationType): Promise<void> {
  if (!booking.provider_id) return;
  let providerResult = await query('SELECT user_id FROM service_providers WHERE provider_id = ?', [booking.provider_id]) as any[];
  if (!providerResult || providerResult.length === 0) {
    providerResult = await query('SELECT user_id FROM businesses WHERE id = ?', [booking.provider_id]) as any[];
  }
  if (!providerResult || providerResult.length === 0) {
    providerResult = await query('SELECT user_id FROM users WHERE user_id = ? AND role = "business"', [booking.provider_id]) as any[];
  }
  if (!providerResult || providerResult.length === 0) return;
  const providerUserId = providerResult[0].user_id;
  let title = '';
  let message = '';
  let link = '';
  switch (notificationType) {
    case 'booking_created':
      title = 'New Booking Received';
      message = `You have received a new booking for ${booking.pet_name}'s ${booking.service_name}.`;
      link = `/cremation/bookings/${booking.id}`;
      break;
    case 'booking_pending':
      title = 'Pending Booking Alert';
      message = `You have a pending booking for ${booking.pet_name} that requires your attention.`;
      link = `/cremation/bookings?status=pending`;
      break;
    case 'booking_cancelled':
      title = 'Booking Cancelled';
      message = `The booking for ${booking.pet_name}'s ${booking.service_name} has been cancelled by the customer.`;
      link = `/cremation/bookings/${booking.id}`;
      break;
  }
  await createBusinessNotification({ userId: providerUserId, title, message, type: notificationType === 'booking_cancelled' ? 'warning' : 'info', link, shouldSendEmail: true });
}

async function getBookingDetails(bookingId: number): Promise<any> {
  // Try service_bookings first
  let bookingQuery = `
    SELECT sb.id, sb.user_id, sb.provider_id, sb.pet_name, sb.booking_date, sb.booking_time, sb.price as total_amount,
           sp.name as service_name, COALESCE(spr.name, CONCAT(u.first_name, ' ', u.last_name)) as provider_name
    FROM service_bookings sb
    LEFT JOIN service_packages sp ON sb.package_id = sp.package_id
    LEFT JOIN service_providers spr ON sb.provider_id = spr.provider_id
    LEFT JOIN users u ON sb.provider_id = u.user_id
    WHERE sb.id = ?`;
  let result = await query(bookingQuery, [bookingId]) as any[];
  if (!result || result.length === 0) {
    bookingQuery = `
      SELECT b.booking_id as id, b.user_id, b.provider_id, b.pet_name, b.booking_date, b.booking_time, b.total_price as total_amount,
             'Cremation Service' as service_name,
             COALESCE(spr.name, CONCAT(u.first_name, ' ', u.last_name)) as provider_name
      FROM bookings b
      LEFT JOIN service_providers spr ON b.provider_id = spr.provider_id
      LEFT JOIN users u ON b.provider_id = u.user_id
      WHERE b.booking_id = ?`;
    result = await query(bookingQuery, [bookingId]) as any[];
  }
  return result && result.length > 0 ? result[0] : null;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateString;
  }
}


