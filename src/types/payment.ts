/**
 * Payment-related TypeScript interfaces and types
 */

export interface PaymentTransaction {
  id?: number;
  booking_id: number;
  payment_intent_id?: string;
  source_id?: string;
  amount: number; // Amount in PHP
  currency: string;
  payment_method: 'gcash' | 'cash';
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  provider: 'paymongo' | 'manual';
  provider_transaction_id?: string;
  checkout_url?: string;
  return_url?: string;
  failure_reason?: string;
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreatePaymentRequest {
  booking_id: number;
  amount: number; // Amount in PHP
  currency?: string;
  payment_method: 'gcash' | 'cash';
  description?: string;
  customer_info?: {
    name: string;
    email: string;
    phone?: string;
  };
  return_url?: string;
  cancel_url?: string;
}

export interface PaymentResponse {
  success: boolean;
  transaction_id?: number;
  payment_intent_id?: string;
  source_id?: string;
  checkout_url?: string;
  status: string;
  message?: string;
  error?: string;
}

export interface WebhookPayload {
  data: {
    id: string;
    type: string;
    attributes: {
      type: string;
      livemode: boolean;
      data: {
        id: string;
        type: string;
        attributes: any;
      };
      previous_data?: any;
      created_at: number;
      updated_at: number;
    };
  };
}

export interface PaymentStatus {
  booking_id: number;
  payment_status: 'not_paid' | 'partially_paid' | 'paid' | 'refunded';
  payment_method: string;
  transaction_id?: number;
  amount_paid?: number;
  last_payment_date?: Date;
}

export interface GCashPaymentConfig {
  public_key: string;
  return_url: string;
  cancel_url: string;
  webhook_url: string;
}

// PayMongo specific types
export interface PayMongoWebhookEvent {
  id: string;
  type: 'source.chargeable' | 'payment.paid' | 'payment.failed';
  attributes: {
    type: string;
    livemode: boolean;
    data: {
      id: string;
      type: string;
      attributes: {
        amount: number;
        currency: string;
        description: string;
        status: string;
        [key: string]: any;
      };
    };
    previous_data?: any;
    created_at: number;
    updated_at: number;
  };
}

export interface PaymentMethodInfo {
  type: 'gcash' | 'cash';
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
  processing_fee?: number; // Percentage or fixed amount
  min_amount?: number;
  max_amount?: number;
}

export const PAYMENT_METHODS: Record<string, PaymentMethodInfo> = {
  gcash: {
    type: 'gcash',
    name: 'GCash',
    description: 'Pay securely using your GCash account',
    enabled: true,
    processing_fee: 0, // No additional fee for customers
    min_amount: 1,
    max_amount: 50000, // PHP 50,000 limit
  },
  cash: {
    type: 'cash',
    name: 'Cash',
    description: 'Pay with cash upon service delivery',
    enabled: true,
    processing_fee: 0,
    min_amount: 1,
  }
};

export interface PaymentError {
  code: string;
  message: string;
  details?: any;
}

export const PAYMENT_ERRORS = {
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
  PAYMENT_ALREADY_PROCESSED: 'PAYMENT_ALREADY_PROCESSED',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  WEBHOOK_VALIDATION_FAILED: 'WEBHOOK_VALIDATION_FAILED',
} as const;
