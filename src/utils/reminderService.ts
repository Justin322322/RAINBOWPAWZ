import { query } from '@/lib/db';
import { createBookingNotification } from '@/utils/comprehensiveNotificationService';

/**
 * Service to process scheduled reminders
 * This would typically be run by a cron job or scheduled task
 */

/**
 * Process all pending reminders
 */
export async function processPendingReminders(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Get all pending reminders that are due
    const pendingReminders = await query(`
      SELECT br.*, sb.id as booking_id
      FROM booking_reminders br
      JOIN service_bookings sb ON br.booking_id = sb.id
      WHERE br.sent = FALSE 
        AND br.scheduled_time <= NOW()
        AND sb.status NOT IN ('cancelled', 'completed')
      ORDER BY br.scheduled_time ASC
      LIMIT 100
    `) as any[];

    console.log(`Found ${pendingReminders.length} pending reminders to process`);

    for (const reminder of pendingReminders) {
      try {
        // Send the reminder notification
        const notificationType = reminder.reminder_type === '24h' ? 'reminder_24h' : 'reminder_1h';
        const result = await createBookingNotification(reminder.booking_id, notificationType);

        if (result.success) {
          // Mark reminder as sent
          await query(
            'UPDATE booking_reminders SET sent = TRUE, sent_at = NOW() WHERE id = ?',
            [reminder.id]
          );
          processed++;
          console.log(`Processed reminder ${reminder.id} for booking ${reminder.booking_id}`);
        } else {
          console.error(`Failed to send reminder ${reminder.id}:`, result.error);
          errors++;
        }
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        errors++;
      }
    }

    console.log(`Reminder processing complete: ${processed} processed, ${errors} errors`);
    return { processed, errors };
  } catch (error) {
    console.error('Error in processPendingReminders:', error);
    return { processed, errors: errors + 1 };
  }
}

/**
 * Process review requests for completed bookings
 */
export async function processReviewRequests(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    // Get completed bookings from the last 7 days that don't have reviews yet
    const completedBookings = await query(`
      SELECT DISTINCT sb.id, sb.user_id, sb.provider_id
      FROM service_bookings sb
      LEFT JOIN reviews r ON sb.id = r.booking_id
      WHERE sb.status = 'completed'
        AND sb.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND sb.updated_at <= DATE_SUB(NOW(), INTERVAL 1 DAY)
        AND r.id IS NULL
      LIMIT 50
    `) as any[];

    console.log(`Found ${completedBookings.length} completed bookings eligible for review requests`);

    for (const booking of completedBookings) {
      try {
        // Check if we've already sent a review request for this booking
        const existingRequest = await query(
          'SELECT id FROM notifications WHERE user_id = ? AND link LIKE ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
          [booking.user_id, `%/bookings/${booking.id}/review%`]
        ) as any[];

        if (existingRequest.length === 0) {
          // Send review request notification
          const result = await createBookingNotification(booking.id, 'review_request');

          if (result.success) {
            processed++;
            console.log(`Sent review request for booking ${booking.id}`);
          } else {
            console.error(`Failed to send review request for booking ${booking.id}:`, result.error);
            errors++;
          }
        }
      } catch (error) {
        console.error(`Error processing review request for booking ${booking.id}:`, error);
        errors++;
      }
    }

    console.log(`Review request processing complete: ${processed} processed, ${errors} errors`);
    return { processed, errors };
  } catch (error) {
    console.error('Error in processReviewRequests:', error);
    return { processed, errors: errors + 1 };
  }
}

/**
 * Clean up old reminders and notifications
 */
export async function cleanupOldData(): Promise<{ remindersDeleted: number; notificationsDeleted: number }> {
  let remindersDeleted = 0;
  let notificationsDeleted = 0;

  try {
    // Delete old sent reminders (older than 30 days)
    const reminderResult = await query(`
      DELETE FROM booking_reminders 
      WHERE sent = TRUE AND sent_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `) as any;

    remindersDeleted = reminderResult.affectedRows || 0;

    // Delete old read notifications (older than 90 days)
    const notificationResult = await query(`
      DELETE FROM notifications 
      WHERE is_read = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
    `) as any;

    notificationsDeleted = notificationResult.affectedRows || 0;

    console.log(`Cleanup complete: ${remindersDeleted} reminders deleted, ${notificationsDeleted} notifications deleted`);
    return { remindersDeleted, notificationsDeleted };
  } catch (error) {
    console.error('Error in cleanupOldData:', error);
    return { remindersDeleted: 0, notificationsDeleted: 0 };
  }
}

/**
 * Get reminder statistics
 */
export async function getReminderStats(): Promise<{
  pendingReminders: number;
  sentToday: number;
  failedToday: number;
}> {
  try {
    const [pendingResult, sentTodayResult] = await Promise.all([
      query(`
        SELECT COUNT(*) as count 
        FROM booking_reminders 
        WHERE sent = FALSE AND scheduled_time <= NOW()
      `) as Promise<any[]>,
      query(`
        SELECT 
          COUNT(*) as sent_today,
          SUM(CASE WHEN sent = FALSE THEN 1 ELSE 0 END) as failed_today
        FROM booking_reminders 
        WHERE DATE(created_at) = CURDATE()
      `) as Promise<any[]>
    ]);

    return {
      pendingReminders: pendingResult[0]?.count || 0,
      sentToday: sentTodayResult[0]?.sent_today || 0,
      failedToday: sentTodayResult[0]?.failed_today || 0
    };
  } catch (error) {
    console.error('Error getting reminder stats:', error);
    return {
      pendingReminders: 0,
      sentToday: 0,
      failedToday: 0
    };
  }
}

/**
 * Manual trigger for processing reminders (for testing or manual execution)
 */
export async function triggerReminderProcessing(): Promise<{
  reminders: { processed: number; errors: number };
  reviews: { processed: number; errors: number };
  cleanup: { remindersDeleted: number; notificationsDeleted: number };
}> {
  console.log('Starting manual reminder processing...');

  const [reminderResults, reviewResults, cleanupResults] = await Promise.all([
    processPendingReminders(),
    processReviewRequests(),
    cleanupOldData()
  ]);

  console.log('Manual reminder processing complete');

  return {
    reminders: reminderResults,
    reviews: reviewResults,
    cleanup: cleanupResults
  };
}
