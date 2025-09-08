/**
 * Refunds Database Schema and Utilities
 * Handles refund processing with comprehensive audit trail
 */

import { query } from '@/lib/db';

export interface RefundRecord {
  id?: number;
  booking_id: number;
  user_id: number;
  amount: number;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  refund_type: 'automatic' | 'manual';
  payment_method: 'gcash' | 'card' | 'paymaya' | 'cash' | 'qr_code';
  transaction_id?: string;
  paymongo_refund_id?: string;
  processed_by?: number; // admin/staff user ID for manual refunds
  receipt_path?: string; // for manual QR code refunds
  receipt_verified?: boolean;
  receipt_verified_by?: number;
  notes?: string;
  metadata?: string; // JSON string for additional data
  initiated_at: Date;
  processed_at?: Date;
  completed_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface RefundAuditLog {
  id?: number;
  refund_id: number;
  action: string;
  previous_status?: string;
  new_status: string;
  performed_by?: number; // user ID who performed the action
  performed_by_type: 'system' | 'admin' | 'staff';
  details?: string;
  ip_address?: string;
  created_at?: Date;
}

/**
 * Ensure refunds table exists with all necessary fields
 */
export async function ensureRefundsTable(): Promise<void> { /* no-op: DDL removed */ }

/**
 * Ensure refund audit logs table exists
 */
export async function ensureRefundAuditTable(): Promise<void> { /* no-op: DDL removed */ }

/**
 * Initialize refund-related database tables
 */
export async function initializeRefundTables(): Promise<void> {
  await ensureRefundsTable();
  await ensureRefundAuditTable();
}

/**
 * Create a new refund record
 */
export async function createRefundRecord(refund: Omit<RefundRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  await ensureRefundsTable();
  
  const result = await query(`
    INSERT INTO refunds (
      booking_id, user_id, amount, reason, status, refund_type, 
      payment_method, transaction_id, paymongo_refund_id, processed_by, 
      receipt_path, receipt_verified, receipt_verified_by, notes, 
      metadata, initiated_at, processed_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    refund.booking_id,
    refund.user_id,
    refund.amount,
    refund.reason,
    refund.status,
    refund.refund_type,
    refund.payment_method,
    refund.transaction_id || null,
    refund.paymongo_refund_id || null,
    refund.processed_by || null,
    refund.receipt_path || null,
    refund.receipt_verified || false,
    refund.receipt_verified_by || null,
    refund.notes || null,
    refund.metadata || null,
    refund.initiated_at,
    refund.processed_at || null,
    refund.completed_at || null
  ]) as any;

  return result.insertId;
}

/**
 * Update refund record
 */
export async function updateRefundRecord(
  refundId: number, 
  updates: Partial<RefundRecord>
): Promise<void> {
  const setClause = Object.keys(updates)
    .filter(key => key !== 'id' && key !== 'created_at')
    .map(key => `${key} = ?`)
    .join(', ');
  
  const values = Object.entries(updates)
    .filter(([key]) => key !== 'id' && key !== 'created_at')
    .map(([_, value]) => value);
  
  values.push(refundId);
  
  await query(`UPDATE refunds SET ${setClause} WHERE id = ?`, values);
}

/**
 * Log refund audit trail
 */
export async function logRefundAudit(auditLog: Omit<RefundAuditLog, 'id' | 'created_at'>): Promise<void> {
  const allowDDL = process.env.ALLOW_DDL === 'true';
  if (allowDDL) {
    await ensureRefundAuditTable();
  }

  try {
    await query(`
      INSERT INTO refund_audit_logs (
        refund_id, action, previous_status, new_status, 
        performed_by, performed_by_type, details, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      auditLog.refund_id,
      auditLog.action,
      auditLog.previous_status || null,
      auditLog.new_status,
      auditLog.performed_by || null,
      auditLog.performed_by_type,
      auditLog.details || null,
      auditLog.ip_address || null
    ]);
  } catch (error: any) {
    // If the audit table doesn't exist in prod (DDL disabled), skip non-fatal
    const message = (error && error.message) || '';
    if (message.includes('ER_NO_SUCH_TABLE') || message.includes('doesn\'t exist')) {
      console.warn('refund_audit_logs table missing; skipping audit write (non-fatal).');
      return;
    }
    throw error;
  }
}

/**
 * Get refund by ID with audit trail
 */
export async function getRefundById(refundId: number): Promise<RefundRecord | null> {
  const results = await query(`
    SELECT * FROM refunds WHERE id = ?
  `, [refundId]) as RefundRecord[];
  
  return results.length > 0 ? results[0] : null;
}

/**
 * Get refund by PayMongo refund id
 */
export async function getRefundByPaymongoRefundId(paymongoRefundId: string): Promise<RefundRecord | null> {
  const results = await query(`
    SELECT * FROM refunds WHERE paymongo_refund_id = ? LIMIT 1
  `, [paymongoRefundId]) as RefundRecord[];
  
  return results.length > 0 ? results[0] : null;
}

/**
 * Find latest pending automatic refund for a booking that was queued due to missing payment id
 */
export async function findLatestQueuedAutoRefundByBooking(bookingId: number): Promise<RefundRecord | null> {
  const results = await query(`
    SELECT *
    FROM refunds
    WHERE booking_id = ?
      AND refund_type = 'automatic'
      AND status = 'pending'
    ORDER BY id DESC
    LIMIT 1
  `, [bookingId]) as RefundRecord[];

  if (results.length === 0) return null;

  const record = results[0];
  try {
    const metadata = record.metadata ? JSON.parse(record.metadata) : {};
    if (metadata && metadata.missing_payment_id === true) {
      return record;
    }
  } catch {
    // ignore malformed metadata and treat as not queued for reconciliation
  }
  return null;
}

/**
 * Get refunds by booking ID
 */
export async function getRefundsByBookingId(bookingId: number): Promise<RefundRecord[]> {
  const results = await query(`
    SELECT * FROM refunds WHERE booking_id = ? ORDER BY created_at DESC
  `, [bookingId]) as RefundRecord[];
  
  return results;
}

/**
 * Get refund audit trail
 */
export async function getRefundAuditTrail(refundId: number): Promise<RefundAuditLog[]> {
  const results = await query(`
    SELECT 
      ral.*,
      u.first_name,
      u.last_name,
      u.email
    FROM refund_audit_logs ral
    LEFT JOIN users u ON ral.performed_by = u.user_id
    WHERE ral.refund_id = ?
    ORDER BY ral.created_at ASC
  `, [refundId]) as any[];
  
  return results;
}

/**
 * Check if booking has existing refunds
 */
export async function hasExistingRefund(bookingId: number): Promise<boolean> {
  const results = await query(`
    SELECT COUNT(*) as count FROM refunds 
    WHERE booking_id = ? AND status NOT IN ('failed', 'cancelled')
  `, [bookingId]) as any[];
  
  return results[0]?.count > 0;
}
