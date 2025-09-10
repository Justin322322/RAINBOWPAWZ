/**
 * Refund Receipt Upload API
 * Handles uploading refund receipts for manual refund processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySecureAuth } from '@/lib/secureAuth';
import { getRefundById } from '@/lib/db/refunds';
import { uploadRefundReceipt } from '@/services/refundService';
import { logAdminAction } from '@/utils/adminUtils';
import path from 'path';
import fs from 'fs/promises';

// Ensure Node.js runtime for filesystem access (avoids Edge runtime limitations)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/refunds/[id]/upload-receipt - Upload refund receipt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and business users can upload receipts
    if (!['admin', 'business'].includes(authResult.accountType)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to upload receipts' 
      }, { status: 403 });
    }

    const resolvedParams = await params;
    const refundId = parseInt(resolvedParams.id);
    if (isNaN(refundId)) {
      return NextResponse.json({ error: 'Invalid refund ID' }, { status: 400 });
    }

    const refund = await getRefundById(refundId);
    if (!refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
    }

    // Check if refund is in a state that allows receipt upload
    if (!['pending', 'processing'].includes(refund.status)) {
      return NextResponse.json({ 
        error: 'Receipt can only be uploaded for pending or processing refunds' 
      }, { status: 400 });
    }

    // Check if refund requires manual processing
    if (refund.refund_type !== 'manual') {
      return NextResponse.json({ 
        error: 'Receipt upload is only required for manual refunds' 
      }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('receipt') as File;
    
    if (!file) {
      return NextResponse.json({ 
        error: 'No receipt file provided' 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, and PDF files are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 10MB.' 
      }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    // Use /tmp on serverless (read-only FS at /var/task), fallback to project public dir in dev
    const isServerless = !!process.env.VERCEL || process.env.NODE_ENV === 'production';
    const uploadBase = isServerless ? '/tmp' : path.join(process.cwd(), 'public');
    const uploadDir = path.join(uploadBase, 'uploads', 'refund-receipts');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = path.extname(file.name);
    const filename = `refund_${refundId}_${timestamp}${fileExtension}`;
    const filePath = path.join(uploadDir, filename);
    const relativePath = `/uploads/refund-receipts/${filename}`;

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // If running on serverless, mirror the file into a persistent public path via edge cache/CDN upload (optional)
    // Skipped here; relativePath still returned for client to reference when served by CDN/storage layer.

    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Update refund record with receipt path
    const uploadResult = await uploadRefundReceipt(
      refundId,
      relativePath,
      parseInt(authResult.userId),
      authResult.accountType === 'admin' ? 'admin' : 'staff',
      clientIp
    );

    if (!uploadResult.success) {
      // Clean up uploaded file if database update failed
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('Failed to clean up uploaded file:', cleanupError);
      }
      
      return NextResponse.json({ 
        error: uploadResult.error || 'Failed to save receipt information' 
      }, { status: 500 });
    }

    // Log admin action
    await logAdminAction(
      parseInt(authResult.userId),
      'upload_refund_receipt',
      'refund',
      refundId,
      {
        refund_id: refundId,
        booking_id: refund.booking_id,
        receipt_path: relativePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type
      },
      clientIp
    );

    return NextResponse.json({
      success: true,
      message: 'Receipt uploaded successfully',
      receipt_path: relativePath,
      refund_id: refundId
    });

  } catch (error) {
    console.error('Error uploading refund receipt:', error);
    return NextResponse.json({ 
      error: 'Failed to upload receipt',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET /api/refunds/[id]/upload-receipt - Get receipt upload status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const refundId = parseInt(resolvedParams.id);
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

    return NextResponse.json({
      success: true,
      refund_id: refundId,
      receipt_uploaded: !!refund.receipt_path,
      receipt_path: refund.receipt_path,
      receipt_verified: refund.receipt_verified,
      receipt_verified_by: refund.receipt_verified_by,
      requires_receipt: refund.refund_type === 'manual' && ['pending', 'processing'].includes(refund.status)
    });

  } catch (error) {
    console.error('Error getting receipt upload status:', error);
    return NextResponse.json({ 
      error: 'Failed to get receipt status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
