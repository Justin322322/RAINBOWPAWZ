# Payment Splitting Implementation Guide for RainbowPaws

## Overview

RainbowPaws can implement payment splitting to automatically distribute customer payments between the platform and service providers. This guide outlines the implementation options and requirements.

## Current vs. Proposed Flow

### Current Flow
```
Customer Payment (₱1,000)
    ↓
PayMongo → RainbowPaws Main Account (₱1,000)
    ↓
Manual Payout → Service Provider (₱850)
    ↓
Platform Fee → RainbowPaws (₱150)
```

### Proposed Flow with SEEDS
```
Customer Payment (₱1,000)
    ↓
PayMongo SEEDS Split Payment
    ├── Service Provider Account (₱850 - 85%)
    └── RainbowPaws Platform Fee (₱150 - 15%)
```

## Implementation Options

### Option 1: PayMongo SEEDS (Recommended)

**Pros:**
- ✅ Instant automatic payouts to service providers
- ✅ Reduced manual work and accounting
- ✅ Built-in compliance and security
- ✅ Real-time payment tracking
- ✅ Automatic commission collection

**Cons:**
- ❌ Requires all service providers to have PayMongo SEEDS accounts
- ❌ Need platform approval from PayMongo
- ❌ BSP compliance requirements for each provider

**Requirements:**
1. **Platform Approval**: Apply for PayMongo SEEDS marketplace account
2. **Service Provider Onboarding**: Each cremation business needs PayMongo SEEDS sub-account
3. **Database Updates**: Store PayMongo merchant IDs for each provider
4. **API Integration**: Update payment creation to include split_payment parameters

### Option 2: PayMongo Wallet + Treasury API

**Pros:**
- ✅ More flexible payout timing
- ✅ Batch payouts possible
- ✅ Less stringent provider requirements

**Cons:**
- ❌ Manual payout process
- ❌ Delayed payments to providers
- ❌ More complex accounting

### Option 3: Keep Current System + Enhance

**Pros:**
- ✅ No additional PayMongo requirements
- ✅ Full control over payouts
- ✅ Can use any payment method for payouts

**Cons:**
- ❌ Manual work continues
- ❌ Delayed payments to providers
- ❌ Complex accounting and tracking

## Recommended Implementation: PayMongo SEEDS

### Step 1: Platform Setup

1. **Apply for PayMongo SEEDS**
   ```bash
   # Contact PayMongo for SEEDS approval
   # Email: support@paymongo.com
   # Subject: SEEDS Marketplace Application - RainbowPaws Pet Cremation Platform
   ```

2. **Database Schema Updates**
   ```sql
   -- Add PayMongo merchant ID to service providers
   ALTER TABLE service_providers 
   ADD COLUMN paymongo_merchant_id VARCHAR(255) NULL;
   
   -- Add commission rate settings
   ALTER TABLE service_providers 
   ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 15.00;
   
   -- Track split payment transactions
   CREATE TABLE split_payment_transactions (
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

### Step 2: Service Provider Onboarding

```typescript
// src/services/providerOnboardingService.ts
export async function onboardProviderToPayMongo(providerId: number) {
  try {
    // Get provider details
    const provider = await getProviderDetails(providerId);
    
    // Create SEEDS sub-account using PayMongo API
    const subAccount = await createPayMongoSubAccount({
      business_name: provider.name,
      contact_email: provider.email,
      contact_phone: provider.phone,
      business_address: provider.address,
      // ... other required fields
    });
    
    // Store PayMongo merchant ID
    await query(
      'UPDATE service_providers SET paymongo_merchant_id = ? WHERE provider_id = ?',
      [subAccount.id, providerId]
    );
    
    return { success: true, merchantId: subAccount.id };
  } catch (error) {
    console.error('Provider onboarding failed:', error);
    throw error;
  }
}
```

### Step 3: Payment Service Updates

```typescript
// src/services/paymentSplittingService.ts
export async function createSplitPayment(bookingData: {
  booking_id: number;
  provider_id: number;
  amount: number;
  customer_info: any;
}) {
  try {
    // Get provider's PayMongo merchant ID
    const providerResult = await query(
      'SELECT paymongo_merchant_id, commission_rate FROM service_providers WHERE provider_id = ?',
      [bookingData.provider_id]
    ) as any[];
    
    if (!providerResult[0]?.paymongo_merchant_id) {
      throw new Error('Service provider not onboarded to PayMongo SEEDS');
    }
    
    const provider = providerResult[0];
    const platformFeeRate = provider.commission_rate / 100; // Convert to decimal
    const providerAmount = bookingData.amount * (1 - platformFeeRate);
    const platformFeeAmount = bookingData.amount * platformFeeRate;
    
    // Create payment with split configuration
    const paymentIntent = await createPaymentIntent({
      amount: phpToCentavos(bookingData.amount),
      payment_method_allowed: ['gcash', 'card'],
      description: `Pet cremation service - Booking #${bookingData.booking_id}`,
      split_payment: {
        transfer_to: process.env.PAYMONGO_MAIN_MERCHANT_ID, // Your main account
        recipients: [
          {
            merchant_id: provider.paymongo_merchant_id,
            split_type: 'fixed',
            value: phpToCentavos(providerAmount)
          }
        ]
      }
    });
    
    // Record split payment transaction
    await query(`
      INSERT INTO split_payment_transactions 
      (booking_id, main_payment_id, platform_fee_amount, provider_amount, total_amount)
      VALUES (?, ?, ?, ?, ?)
    `, [
      bookingData.booking_id,
      paymentIntent.id,
      platformFeeAmount,
      providerAmount,
      bookingData.amount
    ]);
    
    return paymentIntent;
  } catch (error) {
    console.error('Split payment creation failed:', error);
    throw error;
  }
}
```

### Step 4: Webhook Updates

```typescript
// Update webhook to handle split payment events
async function handleSplitPaymentSucceeded(paymentData: any) {
  try {
    const paymentId = paymentData.id;
    
    // Update split payment transaction status
    await query(`
      UPDATE split_payment_transactions 
      SET split_status = 'completed' 
      WHERE main_payment_id = ?
    `, [paymentId]);
    
    // Get booking details
    const splitTransaction = await query(`
      SELECT * FROM split_payment_transactions 
      WHERE main_payment_id = ?
    `, [paymentId]) as any[];
    
    if (splitTransaction.length > 0) {
      const booking = splitTransaction[0];
      
      // Notify service provider of payment received
      await createProviderPaymentNotification(booking.booking_id, 'payment_received');
      
      // Notify platform admin of commission received
      await createAdminPaymentNotification(booking.booking_id, 'commission_received');
    }
    
  } catch (error) {
    console.error('Error handling split payment webhook:', error);
  }
}
```

### Step 5: Admin Dashboard Updates

```typescript
// src/app/api/admin/payment-splits/route.ts
export async function GET(request: NextRequest) {
  try {
    // Get split payment analytics
    const splitAnalytics = await query(`
      SELECT 
        DATE(spt.created_at) as date,
        COUNT(*) as total_transactions,
        SUM(spt.total_amount) as total_revenue,
        SUM(spt.platform_fee_amount) as platform_commission,
        SUM(spt.provider_amount) as provider_payouts
      FROM split_payment_transactions spt
      WHERE spt.split_status = 'completed'
      GROUP BY DATE(spt.created_at)
      ORDER BY date DESC
      LIMIT 30
    `) as any[];
    
    return NextResponse.json({
      success: true,
      analytics: splitAnalytics
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch split payment analytics'
    }, { status: 500 });
  }
}
```

## Migration Strategy

### Phase 1: Setup & Testing (Week 1-2)
1. Apply for PayMongo SEEDS approval
2. Set up development environment with test accounts
3. Create database schema updates
4. Implement basic split payment functionality

### Phase 2: Provider Onboarding (Week 3-4)
1. Build provider onboarding flow
2. Create admin tools for managing provider accounts
3. Test with 1-2 pilot providers

### Phase 3: Full Implementation (Week 5-6)
1. Migrate all existing providers to SEEDS
2. Update payment flow for all new bookings
3. Implement analytics and reporting

### Phase 4: Monitoring & Optimization (Week 7+)
1. Monitor payment success rates
2. Optimize split ratios based on data
3. Add advanced features (bulk payouts, custom splits, etc.)

## Environment Variables

```env
# PayMongo SEEDS Configuration
PAYMONGO_SEEDS_SECRET_KEY=sk_seeds_...
PAYMONGO_MAIN_MERCHANT_ID=org_your_main_merchant_id
PAYMONGO_WEBHOOK_SECRET=whsec_...

# Default Commission Settings
DEFAULT_PLATFORM_COMMISSION=15.00
```

## Cost Benefit Analysis

### Current Manual System Costs:
- **Staff time**: 2-3 hours/week for manual payouts
- **Transaction fees**: Same PayMongo fees + manual transfer fees
- **Errors/delays**: Provider complaints, accounting errors

### SEEDS Split Payment Benefits:
- **Time savings**: Automatic payouts eliminate 2-3 hours/week
- **Provider satisfaction**: Instant payments improve relationships
- **Accounting accuracy**: Automatic record keeping
- **Scalability**: Handles growth without additional manual work

## Risk Mitigation

1. **Provider Onboarding Issues**: Have manual payout as backup
2. **PayMongo API Failures**: Implement retry logic and fallback
3. **Commission Disputes**: Clear agreements and audit trails
4. **Compliance Issues**: Regular BSP compliance checks

## Success Metrics

- **Payment Success Rate**: >95% for split payments
- **Provider Onboarding Rate**: 100% of active providers
- **Time Savings**: Eliminate manual payout processing
- **Provider Satisfaction**: Faster payment delivery
- **Revenue Growth**: More providers due to instant payouts

This implementation will transform RainbowPaws into a fully automated marketplace with instant payouts to service providers while ensuring platform sustainability through automatic commission collection. 