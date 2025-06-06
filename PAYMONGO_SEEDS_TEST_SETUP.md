# PayMongo SEEDS Test Environment Setup

## Overview

You can fully test PayMongo SEEDS payment splitting using test API keys and test merchant accounts. This allows you to build and validate the entire flow before needing actual business permits or live accounts.

## Test Environment Setup

### Step 1: PayMongo Test Account Setup

1. **Your Main Test Account**
   ```bash
   # Your existing test credentials
   PAYMONGO_SECRET_KEY=sk_test_xxxxx
   PAYMONGO_PUBLIC_KEY=pk_test_xxxxx
   ```

2. **Request SEEDS Test Access**
   ```
   Email: support@paymongo.com
   Subject: SEEDS Test Environment Access - RainbowPaws Platform
   
   Body:
   "Hi PayMongo Team,
   
   We're developing a pet cremation marketplace platform called RainbowPaws and would like to test the SEEDS payment splitting functionality in the test environment.
   
   Platform: Pet cremation services marketplace
   Use case: Split customer payments between service providers and platform commission
   
   Can you please enable SEEDS test access for our account?
   
   Test account: [your-email@domain.com]
   
   Thank you!"
   ```

### Step 2: Create Test Sub-Accounts (Mock Service Providers)

For testing, you can create mock service provider accounts:

```typescript
// src/services/testSeedsSetup.ts
export const TEST_PROVIDERS = {
  provider1: {
    merchant_id: "org_test_provider_1", // PayMongo will provide test IDs
    name: "Rainbow Paws Cremation Center",
    commission_rate: 15.00,
    test_credentials: {
      secret_key: "sk_test_provider_1_xxxxx",
      public_key: "pk_test_provider_1_xxxxx"
    }
  },
  provider2: {
    merchant_id: "org_test_provider_2",
    name: "Peaceful Pet Memorial",
    commission_rate: 15.00,
    test_credentials: {
      secret_key: "sk_test_provider_2_xxxxx", 
      public_key: "pk_test_provider_2_xxxxx"
    }
  }
};

export const TEST_MAIN_ACCOUNT = {
  merchant_id: "org_test_main_account", // Your main test merchant ID
  secret_key: "sk_test_seeds_main_xxxxx"
};
```

### Step 3: Database Setup for Testing

```sql
-- Update your local database with test data
UPDATE service_providers 
SET 
  paymongo_merchant_id = 'org_test_provider_1',
  commission_rate = 15.00
WHERE provider_id = 4; -- Your existing test provider

-- Add test commission rates
ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS paymongo_merchant_id VARCHAR(255) NULL;

ALTER TABLE service_providers 
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 15.00;

-- Create split payment tracking table
CREATE TABLE IF NOT EXISTS split_payment_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  main_payment_id VARCHAR(255) NOT NULL,
  provider_payment_id VARCHAR(255),
  platform_fee_amount DECIMAL(10,2),
  provider_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  split_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES service_bookings(id)
);
```

### Step 4: Environment Variables for Testing

```env
# .env.local - Test environment
NODE_ENV=development

# PayMongo Test Credentials
PAYMONGO_SECRET_KEY=sk_test_xxxxx
PAYMONGO_PUBLIC_KEY=pk_test_xxxxx

# SEEDS Test Configuration (PayMongo will provide these)
PAYMONGO_SEEDS_SECRET_KEY=sk_test_seeds_xxxxx
PAYMONGO_MAIN_MERCHANT_ID=org_test_main_account
PAYMONGO_WEBHOOK_SECRET=whsec_test_xxxxx

# Test Provider Merchant IDs
TEST_PROVIDER_1_MERCHANT_ID=org_test_provider_1
TEST_PROVIDER_2_MERCHANT_ID=org_test_provider_2

# Default Test Settings
DEFAULT_PLATFORM_COMMISSION=15.00
ENABLE_SPLIT_PAYMENTS=true
```

### Step 5: Test Payment Splitting Service

```typescript
// src/services/testPaymentSplittingService.ts
import { createPaymentIntent, phpToCentavos } from '@/lib/paymongo';
import { query } from '@/lib/db';

export async function createTestSplitPayment(bookingData: {
  booking_id: number;
  provider_id: number;
  amount: number;
  customer_info: any;
}) {
  try {
    console.log('🧪 Creating test split payment for booking:', bookingData.booking_id);
    
    // Get provider's test merchant ID
    const providerResult = await query(
      'SELECT paymongo_merchant_id, commission_rate, name FROM service_providers WHERE provider_id = ?',
      [bookingData.provider_id]
    ) as any[];
    
    if (!providerResult[0]) {
      throw new Error('Service provider not found');
    }
    
    const provider = providerResult[0];
    
    // Use test merchant ID if not set in database
    const providerMerchantId = provider.paymongo_merchant_id || 
      process.env.TEST_PROVIDER_1_MERCHANT_ID || 
      'org_test_provider_1';
    
    const platformFeeRate = (provider.commission_rate || 15.00) / 100;
    const providerAmount = bookingData.amount * (1 - platformFeeRate);
    const platformFeeAmount = bookingData.amount * platformFeeRate;
    
    console.log('💰 Split calculation:', {
      totalAmount: bookingData.amount,
      providerAmount: providerAmount,
      platformFee: platformFeeAmount,
      feeRate: `${provider.commission_rate || 15}%`
    });
    
    // Create payment intent with split configuration
    const paymentIntent = await createPaymentIntent({
      amount: phpToCentavos(bookingData.amount),
      payment_method_allowed: ['gcash', 'card'],
      description: `TEST: Pet cremation service - Booking #${bookingData.booking_id}`,
      split_payment: {
        transfer_to: process.env.PAYMONGO_MAIN_MERCHANT_ID || 'org_test_main_account',
        recipients: [
          {
            merchant_id: providerMerchantId,
            split_type: 'fixed',
            value: phpToCentavos(providerAmount)
          }
        ]
      }
    });
    
    // Record split payment transaction
    await query(`
      INSERT INTO split_payment_transactions 
      (booking_id, main_payment_id, platform_fee_amount, provider_amount, total_amount, split_status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [
      bookingData.booking_id,
      paymentIntent.id,
      platformFeeAmount,
      providerAmount,
      bookingData.amount
    ]);
    
    console.log('✅ Test split payment created:', {
      paymentId: paymentIntent.id,
      checkoutUrl: paymentIntent.attributes.next_action?.redirect?.url
    });
    
    return {
      success: true,
      payment_intent: paymentIntent,
      split_details: {
        provider_amount: providerAmount,
        platform_fee: platformFeeAmount,
        provider_merchant_id: providerMerchantId
      }
    };
    
  } catch (error) {
    console.error('❌ Test split payment creation failed:', error);
    throw error;
  }
}
```

### Step 6: Update Payment Service to Use Split Payments

```typescript
// src/services/paymentService.ts - Add split payment support
export async function createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
  try {
    // ... existing validation code ...

    // Check if split payments are enabled and provider is configured
    const splitPaymentsEnabled = process.env.ENABLE_SPLIT_PAYMENTS === 'true';
    
    if (splitPaymentsEnabled && request.payment_method === 'gcash') {
      try {
        // Use split payment for GCash payments
        const splitPaymentResult = await createTestSplitPayment({
          booking_id: request.booking_id,
          provider_id: request.provider_id, // Add this to your CreatePaymentRequest type
          amount: request.amount,
          customer_info: request.customer_info
        });
        
        if (splitPaymentResult.success) {
          // Create transaction record
          const transactionId = await createPaymentTransaction({
            booking_id: request.booking_id,
            payment_intent_id: splitPaymentResult.payment_intent.id,
            amount: request.amount,
            currency: request.currency || 'PHP',
            payment_method: 'gcash',
            status: 'pending',
            provider: 'paymongo',
            checkout_url: splitPaymentResult.payment_intent.attributes.next_action?.redirect?.url,
            metadata: {
              split_payment: true,
              provider_amount: splitPaymentResult.split_details.provider_amount,
              platform_fee: splitPaymentResult.split_details.platform_fee
            }
          });
          
          return {
            success: true,
            transaction_id: transactionId,
            payment_intent_id: splitPaymentResult.payment_intent.id,
            checkout_url: splitPaymentResult.payment_intent.attributes.next_action?.redirect?.url,
            status: 'pending',
            message: 'Split payment created successfully'
          };
        }
      } catch (splitError) {
        console.error('Split payment failed, falling back to regular payment:', splitError);
        // Fall back to regular payment flow
      }
    }
    
    // ... rest of existing payment flow ...
  } catch (error) {
    // ... error handling ...
  }
}
```

### Step 7: Test Webhook Handler

```typescript
// src/app/api/payments/webhook/route.ts - Add split payment webhook handling
async function handleSplitPaymentPaid(paymentData: any) {
  try {
    const paymentId = paymentData.id;
    console.log('🔄 Processing split payment webhook:', paymentId);
    
    // Update split payment transaction status
    await query(`
      UPDATE split_payment_transactions 
      SET split_status = 'completed' 
      WHERE main_payment_id = ?
    `, [paymentId]);
    
    // Get booking details
    const splitTransaction = await query(`
      SELECT spt.*, sb.provider_id, sb.user_id, sb.pet_name
      FROM split_payment_transactions spt
      JOIN service_bookings sb ON spt.booking_id = sb.id
      WHERE spt.main_payment_id = ?
    `, [paymentId]) as any[];
    
    if (splitTransaction.length > 0) {
      const transaction = splitTransaction[0];
      
      console.log('💸 Split payment completed:', {
        bookingId: transaction.booking_id,
        providerAmount: transaction.provider_amount,
        platformFee: transaction.platform_fee_amount
      });
      
      // Update booking payment status
      await query(`
        UPDATE service_bookings 
        SET payment_status = 'paid' 
        WHERE id = ?
      `, [transaction.booking_id]);
      
      // Create notifications
      await createPaymentNotification(transaction.booking_id, 'payment_confirmed');
      
      console.log('✅ Split payment webhook processed successfully');
    }
    
  } catch (error) {
    console.error('❌ Error handling split payment webhook:', error);
  }
}

// Add to webhook switch statement
switch (eventType) {
  case 'payment.paid':
    // Check if this is a split payment
    const isSplitPayment = await query(
      'SELECT id FROM split_payment_transactions WHERE main_payment_id = ?',
      [eventData.id]
    ) as any[];
    
    if (isSplitPayment.length > 0) {
      await handleSplitPaymentPaid(eventData);
    } else {
      await handlePaymentPaid(eventData);
    }
    break;
  // ... other cases
}
```

### Step 8: Test Admin Dashboard

```typescript
// src/app/api/admin/test-split-payments/route.ts
export async function GET(request: NextRequest) {
  try {
    // Get test split payment analytics
    const testAnalytics = await query(`
      SELECT 
        spt.*,
        sb.pet_name,
        sb.provider_id,
        sp.name as provider_name,
        u.first_name,
        u.last_name
      FROM split_payment_transactions spt
      JOIN service_bookings sb ON spt.booking_id = sb.id
      JOIN service_providers sp ON sb.provider_id = sp.provider_id
      JOIN users u ON sb.user_id = u.user_id
      ORDER BY spt.created_at DESC
      LIMIT 20
    `) as any[];
    
    const summary = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(total_amount) as total_revenue,
        SUM(platform_fee_amount) as total_platform_fees,
        SUM(provider_amount) as total_provider_payouts,
        COUNT(CASE WHEN split_status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN split_status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN split_status = 'failed' THEN 1 END) as failed_count
      FROM split_payment_transactions
    `) as any[];
    
    return NextResponse.json({
      success: true,
      test_transactions: testAnalytics,
      summary: summary[0] || {
        total_transactions: 0,
        total_revenue: 0,
        total_platform_fees: 0,
        total_provider_payouts: 0,
        completed_count: 0,
        pending_count: 0,
        failed_count: 0
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch test split payment data'
    }, { status: 500 });
  }
}
```

### Step 9: Testing Checklist

```bash
# 1. Test Split Payment Creation
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": 1,
    "provider_id": 4,
    "amount": 1000,
    "payment_method": "gcash",
    "customer_info": {
      "name": "John Doe",
      "email": "john@test.com"
    }
  }'

# 2. Test Webhook Processing
# Use PayMongo test webhooks or ngrok to test webhook delivery

# 3. Test Analytics
curl http://localhost:3000/api/admin/test-split-payments
```

### Step 10: Manual Testing Flow

1. **Create Test Booking**
   - Go to your booking flow
   - Select a cremation service
   - Use test payment (GCash test account)

2. **Verify Split Creation**
   - Check `split_payment_transactions` table
   - Verify amounts are calculated correctly
   - Check PayMongo dashboard for split payment

3. **Complete Test Payment**
   - Use PayMongo test payment flow
   - Verify webhook is received
   - Check that both provider and platform get their amounts

4. **Monitor Results**
   - Check provider gets correct amount
   - Verify platform fee is correct
   - Confirm booking status updates

## Benefits of Test Environment

✅ **No Business Permits Required** - Test with mock providers  
✅ **Full Feature Testing** - Test entire split payment flow  
✅ **Risk-Free Development** - No real money involved  
✅ **Iteration Speed** - Quick testing and debugging  
✅ **Provider Onboarding Practice** - Test the onboarding flow  

## Next Steps

1. **Request SEEDS test access** from PayMongo
2. **Implement the test payment splitting service**
3. **Test with mock service providers**
4. **Validate webhook processing**
5. **Build admin monitoring tools**
6. **Perfect the flow before going live**

Once you have the test environment working perfectly, moving to production only requires:
- Real business permits for service providers
- Live PayMongo SEEDS approval
- Switching to production API keys

The entire codebase and flow remains the same! 