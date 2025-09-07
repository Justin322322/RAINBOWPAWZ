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
  payment_status: 'not_paid' | 'partially_paid' | 'paid' | 'refunded';
  payment_method: string;
  transaction_id?: number;
  amount_paid?: number;
  last_payment_date?: Date;
}

// Refund-related types
export interface RefundTransaction {
  id?: number;
  booking_id: number;
  amount: number;
  currency: string;
  reason: RefundReason;
  status: RefundStatus;
  payment_method: 'gcash' | 'qr_manual' | 'cash';
  provider: 'paymongo' | 'manual';
  paymongo_payment_id?: string;
  paymongo_refund_id?: string;
  provider_transaction_id?: string;
  notes?: string;
  failure_reason?: string;
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
  processed_at?: Date;
}

export type RefundStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

export type RefundReason =
  | 'requested_by_customer'
  | 'duplicate'
  | 'fraudulent'
  | 'service_not_provided'
  | 'other';

export interface RefundRequest {
  booking_id: number;
  amount: number;
  reason: RefundReason;
  notes?: string;
  payment_method?: 'gcash' | 'qr_manual' | 'cash';
}

export interface RefundResponse {
  success: boolean;
  refund_id?: string;
  amount?: number;
  status?: RefundStatus;
  message: string;
  error?: string;
  transaction_id?: number;
}

export interface RefundSummary {
  total_amount: number;
  total_count: number;
  pending_count: number;
  processed_count: number;
  failed_count: number;
  success_rate: number;
}

export interface RefundListItem {
  id: number;
  booking_id: number;
  amount: number;
  status: RefundStatus;
  reason: RefundReason;
  payment_method: string;
  created_at: Date;
  processed_at?: Date;
  pet_name?: string;
  user_name?: string;
  provider_name?: string;
}

export interface RefundDetail {
  id: number;
  booking_id: number;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: RefundReason;
  payment_method: string;
  provider: string;
  notes?: string;
  failure_reason?: string;
  paymongo_payment_id?: string;
  paymongo_refund_id?: string;
  created_at: Date;
  updated_at: Date;
  processed_at?: Date;
  // Related booking information
  booking_details: {
    pet_name: string;
    user_name: string;
    user_email: string;
    provider_name: string;
    service_date?: Date;
    service_type: string;
  };
  // Related payment information
  payment_details: {
    original_amount: number;
    payment_date: Date;
    payment_method: string;
    transaction_id?: string;
  };
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


