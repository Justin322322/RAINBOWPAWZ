import { phpToCentavos } from '@/lib/paymongo';
import { query } from '@/lib/db';

// Extended interface for split payments
interface SplitPaymentData {
  amount: number;
  payment_method_allowed: string[];
  description: string;
  split_payment?: {
    transfer_to: string;
    recipients: Array<{
      merchant_id: string;
      split_type: 'fixed' | 'percentage';
      value: number;
    }>;
  };
}

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
    
    // For now, let's simulate split payment creation
    // Once SEEDS is approved, we'll use the actual API
    const splitPaymentsEnabled = process.env.ENABLE_SPLIT_PAYMENTS === 'true';
    const seedsApproved = process.env.PAYMONGO_SEEDS_SECRET_KEY;
    
    if (splitPaymentsEnabled && seedsApproved) {
      // Use actual SEEDS API when available
      const paymentIntent = await createSeedsPaymentIntent({
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
      
      return {
        success: true,
        payment_intent: paymentIntent,
        split_details: {
          provider_amount: providerAmount,
          platform_fee: platformFeeAmount,
          provider_merchant_id: providerMerchantId
        }
      };
    } else {
      // Simulate split payment for testing without SEEDS approval
      return await simulateSplitPayment(bookingData, provider, providerAmount, platformFeeAmount);
    }
    
  } catch (error) {
    console.error('❌ Test split payment creation failed:', error);
    throw error;
  }
}

/**
 * Simulate split payment for testing without SEEDS approval
 */
async function simulateSplitPayment(
  bookingData: any,
  provider: any,
  providerAmount: number,
  platformFeeAmount: number
) {
  // Import the regular payment intent creation
  const { createPaymentIntent } = await import('@/lib/paymongo');
  
  // Create regular payment intent
  const paymentIntent = await createPaymentIntent({
    amount: phpToCentavos(bookingData.amount),
    currency: 'PHP',
    payment_method_allowed: ['gcash', 'card'],
    description: `TEST SIMULATION: Pet cremation service - Booking #${bookingData.booking_id}`
  });
  
  // Simulate the split by creating a mock transaction ID
  const mockSplitId = `sim_split_${Date.now()}_${bookingData.booking_id}`;
  
  // Record simulated split payment transaction
  await query(`
    INSERT INTO split_payment_transactions 
    (booking_id, main_payment_id, platform_fee_amount, provider_amount, total_amount, split_status)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `, [
    bookingData.booking_id,
    mockSplitId,
    platformFeeAmount,
    providerAmount,
    bookingData.amount
  ]);
  
  console.log('🎭 Simulated split payment created:', {
    paymentId: paymentIntent.id,
    mockSplitId: mockSplitId,
    checkoutUrl: paymentIntent.attributes.next_action?.redirect?.url,
    note: 'This is a simulation. Real split will happen when SEEDS is approved.'
  });
  
  return {
    success: true,
    payment_intent: paymentIntent,
    split_details: {
      provider_amount: providerAmount,
      platform_fee: platformFeeAmount,
      provider_merchant_id: provider.paymongo_merchant_id || 'org_test_provider_1',
      simulated: true
    },
    simulation_note: 'This payment will be processed normally. Split functionality activated when SEEDS is approved.'
  };
}

/**
 * Create SEEDS payment intent (when approved)
 */
async function createSeedsPaymentIntent(data: SplitPaymentData) {
  const secretKey = process.env.PAYMONGO_SEEDS_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('PayMongo SEEDS secret key is not configured');
  }
  
  const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: data.amount,
          currency: 'PHP',
          description: data.description,
          payment_method_allowed: data.payment_method_allowed,
          capture_type: 'automatic',
          statement_descriptor: 'Rainbow Paws',
          // SEEDS-specific attributes
          split_payment: data.split_payment
        }
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('PayMongo SEEDS API Error Response:', error);
    throw new Error(`PayMongo SEEDS API Error: ${error.errors?.[0]?.detail || error.message || 'Unknown error'}`);
  }
  
  const result = await response.json();
  return result.data;
}

/**
 * Check split payment status for testing
 */
export async function getTestSplitPaymentStatus(bookingId: number) {
  try {
    const splitPayment = await query(`
      SELECT spt.*, sb.pet_name, sp.name as provider_name
      FROM split_payment_transactions spt
      JOIN service_bookings sb ON spt.booking_id = sb.id
      JOIN service_providers sp ON sb.provider_id = sp.provider_id
      WHERE spt.booking_id = ?
    `, [bookingId]) as any[];
    
    if (splitPayment.length === 0) {
      return { found: false };
    }
    
    const payment = splitPayment[0];
    
    return {
      found: true,
      payment_id: payment.main_payment_id,
      total_amount: payment.total_amount,
      provider_amount: payment.provider_amount,
      platform_fee: payment.platform_fee_amount,
      status: payment.split_status,
      provider_name: payment.provider_name,
      pet_name: payment.pet_name,
      created_at: payment.created_at
    };
    
  } catch (error) {
    console.error('❌ Error checking split payment status:', error);
    throw error;
  }
}

/**
 * Get all test split payments for monitoring
 */
export async function getAllTestSplitPayments() {
  try {
    const payments = await query(`
      SELECT 
        spt.*,
        sb.pet_name,
        sb.booking_date,
        sb.service_type,
        sp.name as provider_name,
        u.first_name,
        u.last_name,
        u.email
      FROM split_payment_transactions spt
      JOIN service_bookings sb ON spt.booking_id = sb.id
      JOIN service_providers sp ON sb.provider_id = sp.provider_id
      JOIN users u ON sb.user_id = u.user_id
      ORDER BY spt.created_at DESC
      LIMIT 50
    `) as any[];
    
    return payments;
    
  } catch (error) {
    console.error('❌ Error fetching split payments:', error);
    throw error;
  }
} 