# Refund Module Documentation

## Overview

The Refund Module provides comprehensive refund functionality for the Rainbow Paws application, allowing both users and administrators to manage refund requests for booking cancellations. The module integrates with PayMongo for automated refund processing and includes email notifications for status updates.

## Features

### Core Functionality
- **Refund Eligibility Checking**: Automated validation of refund requests based on booking status, payment status, and timing
- **PayMongo Integration**: Automated refund processing for GCash payments through PayMongo API
- **Manual Refund Processing**: Support for cash payment refunds with admin oversight
- **Email Notifications**: Automated email updates for refund status changes
- **Admin Dashboard**: Comprehensive refund management interface for administrators
- **User Interface**: Easy-to-use refund request interface for customers

### Refund Policy
- **Full Refund**: Available 24+ hours before booking date
- **Partial Refund**: Available 12-24 hours before booking date
- **No Refund**: Less than 2 hours before booking date
- **Completed Bookings**: Not eligible for refund
- **Already Refunded**: Cannot be refunded again

## File Structure

```
src/
├── types/
│   └── refund.ts                           # TypeScript interfaces and types
├── services/
│   └── refundService.ts                    # Core refund business logic
├── lib/
│   ├── paymongo.ts                         # PayMongo API integration (updated)
│   ├── emailTemplates.ts                  # Email templates (updated)
│   └── migrations/
│       └── create_refunds_table.sql       # Database migration
├── app/api/
│   ├── bookings/[id]/refund/
│   │   └── route.ts                       # User refund API endpoints
│   └── admin/
│       ├── bookings/[id]/refund/
│       │   └── route.ts                   # Admin refund API endpoints
│       ├── refunds/
│       │   └── route.ts                   # Admin refunds list API
│       └── migrate-refunds/
│           └── route.ts                   # Database migration API
├── app/admin/refunds/
│   └── page.tsx                           # Admin refunds management page
└── components/refund/
    ├── RefundButton.tsx                   # Refund request button component
    ├── RefundRequestModal.tsx             # Refund request modal
    ├── RefundStatus.tsx                   # Refund status display component
    └── index.ts                           # Component exports
```

## Database Schema

### Refunds Table
```sql
CREATE TABLE refunds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status ENUM('pending', 'processing', 'processed', 'failed', 'cancelled') DEFAULT 'pending',
  processed_by INT NULL,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_booking_id (booking_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### Updated Tables
- **service_bookings**: Added `refund_id` column
- **payment_transactions**: Added `refund_id` and `refunded_at` columns

## API Endpoints

### User Endpoints

#### Check Refund Eligibility
```
GET /api/bookings/[id]/refund
```
Returns refund eligibility status and policy information.

#### Request Refund
```
POST /api/bookings/[id]/refund
Body: { reason: string, notes?: string }
```
Submits a refund request for the specified booking.

### Admin Endpoints

#### Get Refund Eligibility (Admin)
```
GET /api/admin/bookings/[id]/refund
```
Admin version of eligibility check with additional details.

#### Process Refund (Admin)
```
POST /api/admin/bookings/[id]/refund
Body: { reason: string, notes?: string }
```
Processes a refund request with admin privileges.

#### List All Refunds
```
GET /api/admin/refunds?status=all&limit=50&offset=0
```
Returns paginated list of all refunds with filtering options.

#### Run Database Migration
```
POST /api/admin/migrate-refunds
```
Creates the refunds table and updates existing tables.

## Components

### RefundButton
A reusable button component that checks eligibility and opens the refund request modal.

```tsx
<RefundButton
  booking={booking}
  onRefundRequested={() => refreshBookings()}
  size="md"
  variant="outline"
/>
```

### RefundRequestModal
Modal component for submitting refund requests with reason selection and notes.

### RefundStatus
Displays refund status with appropriate styling and progress information.

```tsx
<RefundStatus
  status="processing"
  amount={150.00}
  reason="Customer requested cancellation"
  createdAt="2024-01-15T10:30:00Z"
/>
```

## Usage Examples

### Adding Refund Button to Booking List
```tsx
import { RefundButton } from '@/components/refund';

// In your booking list component
{booking.payment_status === 'paid' && (
  <RefundButton
    booking={booking}
    onRefundRequested={handleRefundRequested}
  />
)}
```

### Checking Refund Eligibility
```tsx
const checkEligibility = async (bookingId: number) => {
  const response = await fetch(`/api/bookings/${bookingId}/refund`);
  const data = await response.json();
  
  if (data.success && data.eligible) {
    // Show refund option
  } else {
    // Show reason why refund is not available
    console.log(data.reason);
  }
};
```

## Setup Instructions

### 1. Run Database Migration
```bash
# Via API endpoint (recommended)
POST /api/admin/migrate-refunds

# Or manually run SQL
mysql -u root -p rainbow_paws < src/lib/migrations/create_refunds_table.sql
```

### 2. Update Admin Navigation
The refunds page has been added to the admin sidebar navigation automatically.

### 3. Environment Variables
Ensure PayMongo credentials are configured:
```env
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_PUBLIC_KEY=pk_test_...
```

### 4. Email Configuration
Refund email templates are included in the email service. Ensure SMTP is configured.

## PayMongo Integration

The module integrates with PayMongo's refund API for GCash payments:

- **Automatic Processing**: GCash refunds are automatically processed through PayMongo
- **Webhook Support**: Ready for PayMongo webhook integration for status updates
- **Fallback Handling**: Falls back to manual processing if PayMongo fails
- **Transaction Tracking**: Links refunds to original PayMongo transactions

## Email Notifications

Automated emails are sent for:
- Refund request received
- Refund being processed
- Refund completed
- Refund failed
- Refund cancelled

## Error Handling

The module includes comprehensive error handling:
- PayMongo API failures
- Database transaction errors
- Invalid refund requests
- Network timeouts
- Authentication errors

## Security Considerations

- User authentication required for refund requests
- Admin authentication required for refund processing
- Booking ownership verification
- Input validation and sanitization
- SQL injection prevention
- Rate limiting (recommended for production)

## Testing

### Manual Testing Steps
1. Create a booking with payment
2. Test refund eligibility checking
3. Submit refund request
4. Verify admin can see and process refunds
5. Check email notifications
6. Test PayMongo integration (if configured)

### Test Cases
- Eligible bookings (paid, not completed)
- Ineligible bookings (not paid, completed, already refunded)
- Different payment methods (GCash vs Cash)
- Admin vs user permissions
- Error scenarios (network failures, invalid data)

## Monitoring and Maintenance

### Key Metrics to Monitor
- Refund request volume
- Processing success rate
- PayMongo integration health
- Email delivery success
- Average processing time

### Regular Maintenance
- Monitor refund table growth
- Archive old refund records
- Update refund policies as needed
- Review PayMongo transaction logs
- Check email delivery logs

## Future Enhancements

### Planned Features
- Partial refund support
- Refund approval workflow
- Bulk refund processing
- Advanced reporting and analytics
- Mobile app integration
- Webhook endpoint for PayMongo status updates

### Integration Opportunities
- SMS notifications
- Push notifications
- Accounting system integration
- Customer support ticket creation
- Fraud detection and prevention
