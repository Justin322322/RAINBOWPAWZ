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

interface _WebhookPayload {
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
  payment_status: 'not_paid' | 'partially_paid' | 'paid' | 'awaiting_payment_confirmation' | 'refunded' | 'failed';
  payment_method: string;
  transaction_id?: number;
  amount_paid?: number;
  last_payment_date?: Date;
}


interface _GCashPaymentConfig {
  public_key: string;
  return_url: string;
  cancel_url: string;
  webhook_url: string;
}

// PayMongo specific types
interface _PayMongoWebhookEvent {
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

interface _PaymentMethodInfo {
  type: 'gcash' | 'cash';
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
  processing_fee?: number; // Percentage or fixed amount
  min_amount?: number;
  max_amount?: number;
}



interface _PaymentError {
  code: string;
  message: string;
  details?: any;
}


