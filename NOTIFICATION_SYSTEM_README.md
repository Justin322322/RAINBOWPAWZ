# Rainbow Paws - Comprehensive Notification System

This document describes the comprehensive notification system implemented for the Rainbow Paws application, covering all booking lifecycle events, payment confirmations, review requests, system maintenance notifications, and automated reminders.

## Overview

The notification system provides both in-app and email notifications for all major user interactions and system events. It includes proper rate limiting, error handling, and automated reminder processing.

## Features Implemented

### ✅ Comprehensive Booking Lifecycle Notifications
- **Booking Created**: Sent when a new booking is created
- **Booking Confirmed**: Sent when provider confirms the booking
- **Booking In Progress**: Sent when service begins
- **Booking Completed**: Sent when service is finished
- **Booking Cancelled**: Sent when booking is cancelled

### ✅ Payment Confirmation Notifications
- **Payment Pending**: Sent when payment is being processed
- **Payment Confirmed**: Sent when payment is successfully completed
- **Payment Failed**: Sent when payment processing fails
- **Payment Refunded**: Sent when a refund is processed

### ✅ Review Request Notifications
- **Automated Review Requests**: Sent 1 day after booking completion
- **Provider Review Notifications**: Sent to providers when they receive new reviews

### ✅ System Maintenance Notifications
- **System Maintenance**: Admin-controlled announcements for scheduled maintenance
- **Service Updates**: Notifications about new features or service changes
- **Policy Updates**: Notifications about terms of service or policy changes

### ✅ Automated Reminder Notifications
- **24-Hour Reminders**: Sent 24 hours before scheduled appointments
- **1-Hour Reminders**: Sent 1 hour before scheduled appointments
- **Automated Processing**: Cron job support for processing scheduled reminders

### ✅ Provider Notifications
- **New Booking Received**: Sent to providers when they receive new bookings
- **Review Received**: Sent when customers leave reviews

## File Structure

```
src/
├── utils/
│   ├── comprehensiveNotificationService.ts  # Main notification service
│   ├── reminderService.ts                   # Reminder processing service
│   └── rateLimitUtils.ts                    # Rate limiting utilities
├── app/api/notifications/
│   ├── route.ts                             # Basic notification CRUD
│   ├── mark-read/route.ts                   # Mark notifications as read
│   ├── process-reminders/route.ts           # Process scheduled reminders
│   └── system/route.ts                      # System-wide notifications
├── components/admin/
│   └── NotificationManagement.tsx           # Admin dashboard component
└── scripts/
    └── process-reminders.js                 # Cron job script
```

## API Endpoints

### Notification Management
- `GET /api/notifications` - Fetch user notifications
- `POST /api/notifications` - Create new notification
- `POST /api/notifications/mark-read` - Mark notifications as read

### System Notifications
- `GET /api/notifications/system` - Get notification templates
- `POST /api/notifications/system` - Send system-wide notifications

### Reminder Processing
- `GET /api/notifications/process-reminders` - Get reminder statistics
- `POST /api/notifications/process-reminders` - Process pending reminders

## Database Tables

### notifications
```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);
```

### booking_reminders
```sql
CREATE TABLE booking_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  reminder_type VARCHAR(10) NOT NULL,
  scheduled_time DATETIME NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booking_id (booking_id),
  INDEX idx_scheduled_time (scheduled_time),
  INDEX idx_sent (sent)
);
```

### rate_limits
```sql
CREATE TABLE rate_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  request_count INT DEFAULT 1,
  window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_identifier_action (identifier, action),
  INDEX idx_window_start (window_start)
);
```

## Usage Examples

### Creating Booking Notifications
```typescript
import { createBookingNotification } from '@/utils/comprehensiveNotificationService';

// When a booking is created
await createBookingNotification(bookingId, 'booking_created');

// When booking status changes
await createBookingNotification(bookingId, 'booking_confirmed');
```

### Creating Payment Notifications
```typescript
import { createPaymentNotification } from '@/utils/comprehensiveNotificationService';

// When payment is confirmed
await createPaymentNotification(bookingId, 'payment_confirmed');
```

### Scheduling Reminders
```typescript
import { scheduleBookingReminders } from '@/utils/comprehensiveNotificationService';

// Schedule 24h and 1h reminders for a booking
await scheduleBookingReminders(bookingId);
```

### System Notifications
```typescript
import { createSystemNotification } from '@/utils/comprehensiveNotificationService';

// Send maintenance notification to all users
await createSystemNotification(
  'system_maintenance',
  'Scheduled Maintenance',
  'System will be down for maintenance on Sunday 2AM-4AM'
);
```

## Cron Job Setup

To automatically process reminders, set up a cron job:

```bash
# Add to crontab (run every 15 minutes)
*/15 * * * * /usr/bin/node /path/to/scripts/process-reminders.js

# Environment variables required:
export CRON_SECRET="your-secret-key"
export NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## Rate Limiting

The system implements server-side rate limiting:
- **Notification Fetch**: 30 requests per minute per user
- **Mark Read**: 20 requests per minute per user
- **Create Notification**: 10 requests per minute per user

## Error Handling

All notification operations include comprehensive error handling:
- Database connection failures are handled gracefully
- Failed notifications don't break the main application flow
- Detailed error logging for debugging
- Standardized error response formats

## Admin Dashboard

The admin dashboard (`/admin/notifications`) provides:
- Reminder statistics and processing
- System notification creation
- Template management
- Manual reminder processing

## Integration Points

The notification system is integrated into:
- **Booking Creation**: `src/app/api/cremation/bookings/route.ts`
- **Status Updates**: `src/app/api/cremation/bookings/[id]/status/route.ts`
- **Payment Updates**: `src/app/api/cremation/bookings/[id]/payment/route.ts`
- **Review Creation**: `src/app/api/reviews/route.ts`

## Monitoring and Maintenance

- Reminder statistics are available via the admin dashboard
- Old notifications and reminders are automatically cleaned up
- Failed notification attempts are logged for investigation
- Rate limiting prevents system abuse

## Future Enhancements

Potential future improvements:
- Push notifications for mobile apps
- SMS notifications for critical events
- Advanced notification preferences per user
- Notification analytics and reporting
- A/B testing for notification content
