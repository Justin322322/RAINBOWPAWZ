# PayMongo Refund Processing Fixes

## Issues Identified

The PayMongo refund processing was failing due to several critical issues:

### 1. **Incorrect Payment ID Usage**
- **Problem**: Using `payment_intent_id` or `source_id` instead of the actual `payment_id` for refund API calls
- **Impact**: PayMongo requires the specific payment ID, not the intent or source ID
- **Fix**: Enhanced `processPayMongoRefund()` to retrieve the correct payment ID from PayMongo API

### 2. **Missing Refund Webhook Handling**
- **Problem**: No webhook handlers for `refund.succeeded` and `refund.failed` events
- **Impact**: Refunds initiated successfully but never marked as completed in the system
- **Fix**: Added webhook handlers in `/api/payments/webhook/route.ts`

### 3. **Poor Error Handling**
- **Problem**: Generic error messages without specific PayMongo error code handling
- **Impact**: Difficult to diagnose and retry failed refunds
- **Fix**: Added comprehensive error parsing for common PayMongo refund errors

### 4. **No Retry Mechanism**
- **Problem**: No way to retry failed refunds
- **Impact**: Manual intervention required for transient failures
- **Fix**: Created `/api/admin/refunds/[id]/retry` endpoint

## Common PayMongo Refund Errors

Based on PayMongo documentation, these are the common refund errors and their handling:

| Error Code | Reason | Action Taken |
|------------|--------|--------------|
| `provider_processing_error` | Provider unavailable | Mark as retryable |
| `resource_processing_state` | Duplicate refund request | Don't retry |
| `resource_failed_state` | Payment not in paid state | Don't retry |
| `allowed_date_exceeded` | Refund period expired | Don't retry |
| `available_balance_insufficient` | Insufficient balance | Don't retry |
| `parameter_above_maximum` | Amount exceeds maximum | Don't retry |
| `refund_not_allowed` | Payment type not refundable | Don't retry |

## Fixes Implemented

### 1. Enhanced Payment ID Resolution

```typescript
// Old approach - incorrect
const paymongoRefund = await createPayMongoRefund(
  transaction.payment_intent_id || transaction.source_id,
  refundData
);

// New approach - correct payment ID resolution
let paymentId: string | null = null;

if (transaction.provider_transaction_id) {
  paymentId = transaction.provider_transaction_id;
} else if (transaction.payment_intent_id) {
  const paymentIntent = await retrievePaymentIntent(transaction.payment_intent_id);
  const successfulPayment = paymentIntent.attributes.payments.find(
    payment => payment.attributes.status === 'paid'
  );
  if (successfulPayment) {
    paymentId = successfulPayment.id;
  }
} else if (transaction.source_id) {
  paymentId = transaction.source_id; // Fallback for source-based payments
}

const paymongoRefund = await createPayMongoRefund(paymentId, refundData);
```

### 2. Webhook Event Handling

Added handlers for refund completion:

```typescript
case 'refund.succeeded':
  await handleRefundSucceeded(eventData);
  break;

case 'refund.failed':
  await handleRefundFailed(eventData);
  break;
```

### 3. Comprehensive Error Parsing

```typescript
if (errorMessage.includes('provider_processing_error')) {
  errorMessage = 'PayMongo provider is temporarily unavailable. Please try again later.';
  shouldRetry = true;
} else if (errorMessage.includes('resource_processing_state')) {
  errorMessage = 'A refund is already being processed for this payment.';
  shouldRetry = false;
}
// ... more error handling
```

### 4. Admin Retry Endpoint

New endpoint: `POST /api/admin/refunds/[id]/retry`
- Allows admins to retry failed refunds
- Only works for GCash payments (PayMongo refunds)
- Validates refund status before retry

## Usage Examples

### Retry a Failed Refund

```bash
curl -X POST /api/admin/refunds/123/retry \
  -H "Authorization: Bearer admin_token" \
  -H "Content-Type: application/json"
```

### Check Refund Status

Refund statuses are now properly tracked:
- `pending` - Initial refund request
- `processing` - Submitted to PayMongo
- `processed` - Completed successfully
- `failed` - Failed (may be retryable)

## Monitoring and Debugging

### Log Messages Added

- PayMongo refund attempt details
- Payment ID resolution process
- Webhook processing for refunds
- Error details with specific codes

### Database Updates

- Payment ID is now stored in `provider_transaction_id` if missing
- Detailed error messages in refund notes
- Proper status transitions

## Testing Refunds

### Test Scenarios

1. **Successful Refund Flow**:
   - Create GCash payment
   - Cancel booking
   - Request refund
   - Verify webhook completion

2. **Failed Refund Handling**:
   - Simulate PayMongo errors
   - Verify error parsing
   - Test retry mechanism

3. **Edge Cases**:
   - Missing payment ID
   - Duplicate refund requests
   - Expired refund periods

### Environment Variables Required

```env
PAYMONGO_SECRET_KEY=sk_test_...
PAYMONGO_WEBHOOK_SECRET=whsec_...
```

## Deployment Notes

1. Ensure webhook endpoint is accessible: `/api/payments/webhook`
2. PayMongo webhook events to subscribe to:
   - `refund.succeeded`
   - `refund.failed`
3. Monitor refund processing logs for any remaining issues

## Future Improvements

1. **Automatic Retry Logic**: Implement exponential backoff for retryable errors
2. **Refund Analytics**: Track refund success rates and common failure reasons
3. **Customer Notifications**: Enhanced messaging based on refund status
4. **Bulk Refund Operations**: Admin interface for processing multiple refunds 