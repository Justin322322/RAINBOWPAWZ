/**
 * PayMongo API Client for GCash Payment Integration
 * This module provides functions to interact with PayMongo's API for processing GCash payments
 */

const PAYMONGO_BASE_URL = 'https://api.paymongo.com/v1';

interface PayMongoPaymentIntent {
  id: string;
  type: string;
  attributes: {
    amount: number;
    currency: string;
    description: string;
    statement_descriptor: string;
    status: string;
    livemode: boolean;
    client_key: string;
    created_at: number;
    updated_at: number;
    last_payment_error?: any;
    payment_method_allowed: string[];
    payments: any[];
    next_action?: {
      type: string;
      redirect?: {
        url: string;
        return_url: string;
      };
    };
    payment_method_options?: {
      card?: {
        request_three_d_secure: string;
      };
    };
    capture_type: string;
    setup_future_usage?: string;
  };
}

interface PayMongoSource {
  id: string;
  type: string;
  attributes: {
    amount: number;
    billing?: any;
    currency: string;
    description: string;
    livemode: boolean;
    redirect: {
      checkout_url: string;
      failed: string;
      success: string;
    };
    status: string;
    type: string;
    created_at: number;
    updated_at: number;
  };
}

interface CreatePaymentIntentData {
  amount: number; // Amount in centavos (e.g., 10000 = PHP 100.00)
  currency: string;
  description: string;
  payment_method_allowed: string[];
  capture_type?: string;
  statement_descriptor?: string;
}

interface CreateSourceData {
  amount: number; // Amount in centavos
  currency: string;
  type: string; // 'gcash' for GCash payments
  redirect: {
    success: string;
    failed: string;
  };
  billing?: {
    name: string;
    email: string;
    phone?: string;
  };
  description?: string;
}



/**
 * Create a source for GCash payment (alternative method)
 */
export async function createSource(data: CreateSourceData): Promise<PayMongoSource> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!secretKey) {
    throw new Error('PayMongo secret key is not configured');
  }

  const response = await fetch(`${PAYMONGO_BASE_URL}/sources`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: data.amount,
          currency: data.currency || 'PHP',
          type: data.type,
          redirect: data.redirect,
          billing: data.billing,
          description: data.description,
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('PayMongo Source API Error Response:', error);
    throw new Error(`PayMongo API Error: ${error.errors?.[0]?.detail || error.message || 'Unknown error'}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Retrieve a payment intent by ID
 */
export async function retrievePaymentIntent(paymentIntentId: string): Promise<PayMongoPaymentIntent> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!secretKey) {
    throw new Error('PayMongo secret key is not configured');
  }

  const response = await fetch(`${PAYMONGO_BASE_URL}/payment_intents/${paymentIntentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`PayMongo API Error: ${error.errors?.[0]?.detail || 'Unknown error'}`);
  }

  const result = await response.json();
  return result.data;
}



/**
 * List payments with optional filters
 */
export async function listPayments(filters?: {
  before?: string;
  after?: string;
  limit?: number;
}): Promise<any[]> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!secretKey) {
    throw new Error('PayMongo secret key is not configured');
  }

  // Build query parameters
  const params = new URLSearchParams();
  if (filters?.before) params.append('before', filters.before);
  if (filters?.after) params.append('after', filters.after);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const url = `${PAYMONGO_BASE_URL}/payments${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`PayMongo API Error: ${error.errors?.[0]?.detail || 'Unknown error'}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Retrieve a source by ID
 */
export async function retrieveSource(sourceId: string): Promise<PayMongoSource> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!secretKey) {
    throw new Error('PayMongo secret key is not configured');
  }

  const response = await fetch(`${PAYMONGO_BASE_URL}/sources/${sourceId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`PayMongo API Error: ${error.errors?.[0]?.detail || 'Unknown error'}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Convert PHP amount to centavos (PayMongo uses centavos)
 */
export function phpToCentavos(amount: number): number {
  return Math.round(amount * 100);
}



/**
 * Create a refund for a payment
 */
export async function createRefund(paymentId: string, refundData: {
  amount: number; // Amount in centavos
  reason: string;
  notes?: string;
}): Promise<any> {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;

  if (!secretKey) {
    throw new Error('PayMongo secret key is not configured');
  }

  const response = await fetch(`${PAYMONGO_BASE_URL}/refunds`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: refundData.amount,
          payment_id: paymentId,
          reason: refundData.reason,
          notes: refundData.notes
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('PayMongo Refund API Error Response:', error);
    throw new Error(`PayMongo Refund API Error: ${error.errors?.[0]?.detail || error.message || 'Unknown error'}`);
  }

  const result = await response.json();
  return result.data;
}



/**
 * Validate webhook signature (for webhook security)
 */
export function validateWebhookSignature(payload: string, signature: string, webhookSecret?: string): boolean {
  try {
    // PayMongo uses HMAC-SHA256 for webhook signature validation
    if (!webhookSecret) {
      console.warn('Webhook secret not configured, skipping signature validation');
      return true; // Allow webhook processing if no secret is configured
    }

    if (!signature) {
      console.error('No signature provided in webhook');
      return false;
    }

    const crypto = require('crypto');

    // PayMongo sends signature in format: t=timestamp,v1=signature
    const elements = signature.split(',');
    let timestamp = '';
    let v1Signature = '';

    for (const element of elements) {
      const [key, value] = element.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        v1Signature = value;
      }
    }

    if (!timestamp || !v1Signature) {
      console.error('Invalid signature format');
      return false;
    }

    // Create the signed payload
    const signedPayload = `${timestamp}.${payload}`;

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Compare signatures using timing-safe comparison
    const providedSignature = v1Signature;

    if (expectedSignature.length !== providedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      result |= expectedSignature.charCodeAt(i) ^ providedSignature.charCodeAt(i);
    }

    const isValid = result === 0;

    if (!isValid) {
      console.error('Webhook signature validation failed');
    }

    return isValid;
  } catch (error) {
    console.error('Error validating webhook signature:', error);
    return false;
  }
}
