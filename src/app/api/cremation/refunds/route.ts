/**
 * Cremation Business Refunds API
 * Handles refund data for cremation business dashboards
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySecureAuth } from "@/lib/secureAuth";
import { query } from "@/lib/db/query";
import { initializeRefundTables } from "@/lib/db/refunds";

/**
 * Ensure payment_receipts table exists with all required columns
 */
async function ensurePaymentReceiptsTable(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS payment_receipts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        user_id INT NOT NULL,
        receipt_path VARCHAR(500),
        reference_number VARCHAR(50),
        notes TEXT,
        status ENUM('awaiting', 'confirmed', 'rejected') DEFAULT 'awaiting',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_by INT NULL,
        confirmed_at TIMESTAMP NULL,
        rejection_reason TEXT,
        INDEX idx_booking_id (booking_id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_reference_number (reference_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add missing columns if table already exists
    try {
      const columns = (await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_receipts' 
        AND COLUMN_NAME = 'reference_number'
      `)) as any[];

      if (columns.length === 0) {
        await query(`
          ALTER TABLE payment_receipts 
          ADD COLUMN reference_number VARCHAR(50) AFTER receipt_path
        `);
        await query(`
          ALTER TABLE payment_receipts 
          ADD INDEX idx_reference_number (reference_number)
        `);
        console.log("Added reference_number column to payment_receipts");
      }
    } catch (alterError) {
      console.warn("Could not add reference_number column:", alterError);
    }
  } catch (error) {
    console.warn("Could not ensure payment_receipts table:", error);
  }
}

/**
 * GET /api/cremation/refunds - Get refunds for the authenticated cremation business
 */
export async function GET(request: NextRequest) {
  try {
    // Ensure refund tables exist first
    await initializeRefundTables();
    await ensurePaymentReceiptsTable();

    const authResult = await verifySecureAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only business users can access this endpoint
    if (authResult.accountType !== "business") {
      return NextResponse.json(
        {
          error: "Access denied. Business account required.",
        },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Get the business provider ID
    const providerQuery = `
      SELECT sp.provider_id 
      FROM service_providers sp 
      WHERE sp.user_id = ?
    `;
    const providerResult = (await query(providerQuery, [
      parseInt(authResult.userId),
    ])) as any[];

    if (providerResult.length === 0) {
      return NextResponse.json(
        {
          error: "No cremation business found for this user",
        },
        { status: 404 }
      );
    }

    const providerId = providerResult[0].provider_id;

    // Check if payment_receipts table exists and has the required columns
    let hasPaymentReceipts = false;
    try {
      const columnCheck = (await query(
        `SELECT COUNT(*) as count FROM information_schema.columns 
         WHERE table_schema = DATABASE() 
         AND table_name = 'payment_receipts' 
         AND column_name = 'reference_number'`
      )) as any[];
      hasPaymentReceipts = columnCheck[0]?.count > 0;
    } catch (error) {
      console.warn("Could not check payment_receipts columns:", error);
    }

    // Build the refunds query with conditional payment receipt data
    let refundsQuery = hasPaymentReceipts
      ? `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        b.pet_name as pet_name,
        b.booking_date as booking_date,
        b.provider_id as provider_id,
        pr.reference_number as payment_reference_number,
        pr.receipt_path as payment_receipt_path
      FROM refunds r
      JOIN users u ON r.user_id = u.user_id
      LEFT JOIN bookings b ON r.booking_id = b.id
      LEFT JOIN payment_receipts pr ON b.id = pr.booking_id
      WHERE b.provider_id = ?
    `
      : `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        b.pet_name as pet_name,
        b.booking_date as booking_date,
        b.provider_id as provider_id,
        NULL as payment_reference_number,
        NULL as payment_receipt_path
      FROM refunds r
      JOIN users u ON r.user_id = u.user_id
      LEFT JOIN bookings b ON r.booking_id = b.id
      WHERE b.provider_id = ?
    `;

    const queryParams = [providerId];

    // Add status filter if provided
    if (status && status !== "all") {
      refundsQuery += " AND r.status = ?";
      queryParams.push(status);
    }

    // Add date range filter if provided
    if (startDate) {
      refundsQuery += " AND DATE(r.initiated_at) >= ?";
      queryParams.push(startDate);
    }

    if (endDate) {
      refundsQuery += " AND DATE(r.initiated_at) <= ?";
      queryParams.push(endDate);
    }

    refundsQuery += " ORDER BY r.initiated_at DESC";

    const refunds = (await query(refundsQuery, queryParams)) as any[];

    // Format the refunds data including payment receipt information
    const formattedRefunds = refunds.map((refund) => ({
      id: refund.id,
      booking_id: refund.booking_id,
      user_id: refund.user_id,
      amount: parseFloat(refund.amount),
      reason: refund.reason,
      status: refund.status,
      refund_type: refund.refund_type,
      payment_method: refund.payment_method,
      transaction_id: refund.transaction_id,
      receipt_path: refund.receipt_path,
      receipt_verified: refund.receipt_verified,
      notes: refund.notes,
      initiated_at: refund.initiated_at,
      processed_at: refund.processed_at,
      completed_at: refund.completed_at,
      customer_name: `${refund.first_name} ${refund.last_name}`.trim(),
      customer_email: refund.email,
      pet_name: refund.pet_name,
      booking_date: refund.booking_date,
      payment_reference_number: refund.payment_reference_number,
      payment_receipt_path: refund.payment_receipt_path,
    }));

    return NextResponse.json({
      success: true,
      refunds: formattedRefunds,
    });
  } catch (error) {
    console.error("Error fetching cremation refunds:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch refunds",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
