/**
 * Individual Refund API Routes
 * Handles specific refund operations like status updates and receipt uploads
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { 
  getRefundById, 
  updateRefundRecord, 
  logRefundAudit,
  getRefundAuditTrail 
} from '@/lib/db/refunds';
import { 
  verifyAndCompleteRefund 
} from '@/services/refundService';
import { logAdminAction } from '@/utils/adminUtils';

/**
 * GET /api/refunds/[id] - Get specific refund details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const refundId = parseInt(params.id);
    if (isNaN(refundId)) {
      return NextResponse.json({ error: 'Invalid refund ID' }, { status: 400 });
    }

    const refund = await getRefundById(refundId);
    if (!refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    // Check access permissions
    if (authResult.accountType !== 'admin' && 
        authResult.accountType !== 'business' && 
        refund.user_id !== parseInt(authResult.userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get audit trail for admins and business users
    let auditTrail: any[] = [];
    if (['admin', 'business'].includes(authResult.accountType)) {
      auditTrail = await getRefundAuditTrail(refundId);
    }

    return NextResponse.json({
      success: true,
      refund,
      audit_trail: auditTrail
    });

  } catch (error) {
    console.error('Error fetching refund:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch refund',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/refunds/[id] - Update refund status or complete verification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and business users can update refunds
    if (!['admin', 'business'].includes(authResult.accountType)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to update refunds' 
      }, { status: 403 });
    }

    const refundId = parseInt(params.id);
    if (isNaN(refundId)) {
      return NextResponse.json({ error: 'Invalid refund ID' }, { status: 400 });
    }

    const body = await request.json();
    const { action, approved, rejection_reason, notes } = body;

    const refund = await getRefundById(refundId);
    if (!refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    let result;

    switch (action) {
      case 'verify_receipt':
        // Verify and complete manual refund
        if (typeof approved !== 'boolean') {
          return NextResponse.json({ 
            error: 'approved field must be a boolean' 
          }, { status: 400 });
        }

        result = await verifyAndCompleteRefund(
          refundId,
          parseInt(authResult.userId),
          authResult.accountType === 'admin' ? 'admin' : 'staff',
          approved,
          rejection_reason,
          clientIp
        );

        // Log admin action
        await logAdminAction(
          parseInt(authResult.userId),
          approved ? 'approve_refund' : 'reject_refund',
          'refund',
          refundId,
          {
            refund_id: refundId,
            booking_id: refund.booking_id,
            approved,
            rejection_reason
          },
          clientIp
        );

        break;

      case 'update_status':
        // Manual status update
        const { status } = body;
        if (!status || !['pending', 'processing', 'completed', 'failed', 'cancelled'].includes(status)) {
          return NextResponse.json({ 
            error: 'Invalid status. Must be one of: pending, processing, completed, failed, cancelled' 
          }, { status: 400 });
        }

        await updateRefundRecord(refundId, { 
          status,
          notes: notes || refund.notes
        });

        await logRefundAudit({
          refund_id: refundId,
          action: 'status_update',
          previous_status: refund.status,
          new_status: status,
          performed_by: parseInt(authResult.userId),
          performed_by_type: authResult.accountType === 'admin' ? 'admin' : 'staff',
          details: notes || `Status manually updated to ${status}`,
          ip_address: clientIp
        });

        // Log admin action
        await logAdminAction(
          parseInt(authResult.userId),
          'update_refund_status',
          'refund',
          refundId,
          {
            refund_id: refundId,
            booking_id: refund.booking_id,
            old_status: refund.status,
            new_status: status,
            notes
          },
          clientIp
        );

        result = { success: true, message: 'Refund status updated successfully' };
        break;

      case 'add_notes':
        // Add notes to refund
        if (!notes) {
          return NextResponse.json({ 
            error: 'notes field is required for this action' 
          }, { status: 400 });
        }

        const updatedNotes = refund.notes ? `${refund.notes}\n\n[${new Date().toISOString()}] ${notes}` : notes;
        
        await updateRefundRecord(refundId, { notes: updatedNotes });

        await logRefundAudit({
          refund_id: refundId,
          action: 'notes_added',
          new_status: refund.status,
          performed_by: parseInt(authResult.userId),
          performed_by_type: authResult.accountType === 'admin' ? 'admin' : 'staff',
          details: `Notes added: ${notes}`,
          ip_address: clientIp
        });

        result = { success: true, message: 'Notes added successfully' };
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Supported actions: verify_receipt, update_status, add_notes' 
        }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error updating refund:', error);
    return NextResponse.json({ 
      error: 'Failed to update refund',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/refunds/[id] - Cancel a refund (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can cancel refunds
    if (authResult.accountType !== 'admin') {
      return NextResponse.json({ 
        error: 'Only administrators can cancel refunds' 
      }, { status: 403 });
    }

    const refundId = parseInt(params.id);
    if (isNaN(refundId)) {
      return NextResponse.json({ error: 'Invalid refund ID' }, { status: 400 });
    }

    const refund = await getRefundById(refundId);
    if (!refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    // Check if refund can be cancelled
    if (['completed', 'cancelled'].includes(refund.status)) {
      return NextResponse.json({ 
        error: 'Cannot cancel a refund that is already completed or cancelled' 
      }, { status: 400 });
    }

    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Update refund status to cancelled
    await updateRefundRecord(refundId, { 
      status: 'cancelled',
      notes: refund.notes ? `${refund.notes}\n\n[CANCELLED] Refund cancelled by admin` : 'Refund cancelled by admin'
    });

    // Log audit trail
    await logRefundAudit({
      refund_id: refundId,
      action: 'refund_cancelled',
      previous_status: refund.status,
      new_status: 'cancelled',
      performed_by: parseInt(authResult.userId),
      performed_by_type: 'admin',
      details: 'Refund cancelled by administrator',
      ip_address: clientIp
    });

    // Log admin action
    await logAdminAction(
      parseInt(authResult.userId),
      'cancel_refund',
      'refund',
      refundId,
      {
        refund_id: refundId,
        booking_id: refund.booking_id,
        original_status: refund.status
      },
      clientIp
    );

    return NextResponse.json({
      success: true,
      message: 'Refund cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling refund:', error);
    return NextResponse.json({ 
      error: 'Failed to cancel refund',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
