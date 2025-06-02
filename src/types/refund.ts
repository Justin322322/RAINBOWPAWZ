/**
 * Refund-related TypeScript interfaces and types
 */

export interface Refund {
  id?: number;
  booking_id: number;
  amount: number | string;
  reason: string;
  status: 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled';
  processed_by?: number; // admin user ID
  payment_method?: string;
  transaction_id?: string; // external transaction ID (PayMongo)
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface RefundRequest {
  booking_id: number;
  reason: string;
  amount?: number; // Optional, will be calculated from booking if not provided
  notes?: string;
}

export interface RefundResponse {
  success: boolean;
  refund?: Refund;
  message?: string;
  error?: string;
}

export interface RefundEligibilityCheck {
  eligible: boolean;
  reason?: string;
  booking_status?: string;
  payment_status?: string;
  amount?: number;
  refund_policy?: {
    full_refund_hours: number;
    partial_refund_hours: number;
    no_refund_hours: number;
  };
}

export interface PayMongoRefundData {
  amount: number; // Amount in centavos
  reason: string;
  notes?: string;
}

export interface PayMongoRefundResponse {
  id: string;
  type: string;
  attributes: {
    amount: number;
    currency: string;
    reason: string;
    status: string;
    available_at: number;
    created_at: number;
    updated_at: number;
    payment_id: string;
    payout_id?: string;
    notes?: string;
  };
}

export const REFUND_REASONS = {
  USER_REQUESTED: 'Customer requested cancellation',
  ADMIN_INITIATED: 'Admin initiated refund',
  SERVICE_UNAVAILABLE: 'Service no longer available',
  PROVIDER_CANCELLED: 'Service provider cancelled',
  TECHNICAL_ISSUE: 'Technical issue with booking',
  DUPLICATE_BOOKING: 'Duplicate booking',
  POLICY_VIOLATION: 'Policy violation',
  OTHER: 'Other reason'
} as const;

export const REFUND_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type RefundReason = typeof REFUND_REASONS[keyof typeof REFUND_REASONS];
export type RefundStatus = typeof REFUND_STATUS[keyof typeof REFUND_STATUS];
