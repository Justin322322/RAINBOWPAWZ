import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySecureAuth } from "@/lib/secureAuth";

/**
 * GET - Debug endpoint to check refunds data structure
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Debug Refunds] Starting debug queries...");

    // Verify authentication
    const user = await verifySecureAuth(request);
    if (!user || user.accountType !== "business") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get cremation center ID
    const providerResult = (await query(
      "SELECT provider_id FROM service_providers WHERE user_id = ? AND provider_type = ?",
      [user.userId, "cremation"]
    )) as any[];

    if (!providerResult || providerResult.length === 0) {
      return NextResponse.json({ error: "No cremation center found" }, { status: 400 });
    }

    const cremationCenterId = providerResult[0].provider_id;

    // Debug queries
    const debugResults: any = {};

    // 1. Check total refunds in system
    const allRefunds = (await query("SELECT COUNT(*) as total FROM refunds")) as any[];
    debugResults.totalRefundsInSystem = allRefunds[0]?.total || 0;

    // 2. Check refunds table structure
    const refundsStructure = (await query("DESCRIBE refunds")) as any[];
    debugResults.refundsTableStructure = refundsStructure;

    // 3. Check service_bookings for this provider
    const bookingsForProvider = (await query(
      "SELECT COUNT(*) as total FROM service_bookings WHERE provider_id = ?",
      [cremationCenterId]
    )) as any[];
    debugResults.bookingsForProvider = bookingsForProvider[0]?.total || 0;

    // 4. Check if there are any refunds at all
    const sampleRefunds = (await query("SELECT * FROM refunds LIMIT 5")) as any[];
    debugResults.sampleRefunds = sampleRefunds;

    // 5. Check refunds with bookings for this provider
    const refundsWithBookings = (await query(
      `SELECT COUNT(*) as total 
       FROM refunds r 
       JOIN service_bookings sb ON r.booking_id = sb.id 
       WHERE sb.provider_id = ?`,
      [cremationCenterId]
    )) as any[];
    debugResults.refundsForThisProvider = refundsWithBookings[0]?.total || 0;

    // 6. Check service_bookings table structure
    const bookingsStructure = (await query("DESCRIBE service_bookings")) as any[];
    debugResults.serviceBookingsStructure = bookingsStructure;

    // 7. Sample service_bookings for this provider
    const sampleBookings = (await query(
      "SELECT id, user_id, provider_id, pet_name, booking_date, created_at FROM service_bookings WHERE provider_id = ? LIMIT 5",
      [cremationCenterId]
    )) as any[];
    debugResults.sampleBookingsForProvider = sampleBookings;

    // 8. Check users table connection
    const usersCheck = (await query(
      `SELECT COUNT(*) as total 
       FROM service_bookings sb 
       JOIN users u ON sb.user_id = u.user_id 
       WHERE sb.provider_id = ?`,
      [cremationCenterId]
    )) as any[];
    debugResults.bookingsWithValidUsers = usersCheck[0]?.total || 0;

    // 9. Test the exact stats query that's failing
    const statsQuery = `
      SELECT
        COUNT(*) as total_refunds,
        SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN r.status = 'processing' THEN 1 ELSE 0 END) as processing_count,
        SUM(CASE WHEN r.status = 'processed' THEN 1 ELSE 0 END) as processed_count,
        SUM(CASE WHEN r.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN r.status = 'processed' THEN r.amount ELSE 0 END) as total_refunded_amount,
        SUM(CASE WHEN DATE(r.created_at) = CURDATE() THEN 1 ELSE 0 END) as today_count
      FROM refunds r
      JOIN service_bookings sb ON r.booking_id = sb.id
      WHERE sb.provider_id = ?
    `;

    const statsResult = (await query(statsQuery, [cremationCenterId])) as any[];
    debugResults.statsQueryResult = statsResult[0] || null;

    // 10. Test a simpler stats query
    const simpleStatsQuery = `
      SELECT COUNT(*) as count
      FROM refunds r
      JOIN service_bookings sb ON r.booking_id = sb.id
      WHERE sb.provider_id = ?
    `;
    const simpleStatsResult = (await query(simpleStatsQuery, [cremationCenterId])) as any[];
    debugResults.simpleStatsResult = simpleStatsResult[0] || null;

    return NextResponse.json({
      success: true,
      cremationCenterId,
      debugResults
    });

  } catch (error) {
    console.error("Debug refunds error:", error);
    return NextResponse.json(
      {
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}