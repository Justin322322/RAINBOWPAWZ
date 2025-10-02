import { NextRequest, NextResponse } from "next/server";
import { verifySecureAuth } from "@/lib/secureAuth";
import { query } from "@/lib/db";

async function ensureReceiptTable(): Promise<void> {
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

    // Add reference_number column if it doesn't exist (for existing tables)
    try {
      await query(`
        ALTER TABLE payment_receipts 
        ADD COLUMN IF NOT EXISTS reference_number VARCHAR(50) AFTER receipt_path,
        ADD INDEX IF NOT EXISTS idx_reference_number (reference_number)
      `);
    } catch {
      // Column might already exist or ALTER not supported
    }
  } catch {
    // DDL may be blocked in production; ignore
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const file = form.get("file") as unknown as File | null;
    const bookingIdRaw = form.get("bookingId") as string | null;
    const notes = (form.get("notes") as string | null) || null;
    const referenceNumber =
      (form.get("referenceNumber") as string | null) || null;

    if (!bookingIdRaw || isNaN(Number(bookingIdRaw))) {
      return NextResponse.json(
        { error: "Missing or invalid bookingId" },
        { status: 400 }
      );
    }
    const bookingId = Number(bookingIdRaw);

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Only JPEG, PNG, and WEBP images are allowed. Received: ${file.type}`,
        },
        { status: 400 }
      );
    }
    const MAX = 10 * 1024 * 1024;
    if (file.size > MAX) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is 10MB. Received: ${(
            file.size /
            1024 /
            1024
          ).toFixed(2)}MB`,
        },
        { status: 413 }
      );
    }

    // Validate file name
    if (!file.name || file.name.trim() === "") {
      return NextResponse.json(
        { error: "File must have a valid name" },
        { status: 400 }
      );
    }

    // Resolve provider user_id from booking (best-effort)
    let providerUserId: number | null = null;
    try {
      const rows = (await query(
        "SELECT provider_id FROM bookings WHERE id = ? LIMIT 1",
        [bookingId]
      )) as any[];
      const providerId = rows?.[0]?.provider_id ?? null;
      if (providerId) {
        const prow = (await query(
          "SELECT user_id FROM service_providers WHERE provider_id = ? LIMIT 1",
          [providerId]
        )) as any[];
        providerUserId = prow?.[0]?.user_id ?? null;
      }
    } catch {}

    // Upload to Blob
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    let putFn: any = null;
    if (typeof blobToken === "string" && blobToken.length > 0) {
      try {
        const blob = await import("@vercel/blob");
        putFn = (blob as any)?.put;
      } catch {}
    }

    // Prepare file data once
    const arrayBuffer = await file.arrayBuffer();
    const ext = file.type.split("/")[1] || "png";

    // Prefer Blob storage; gracefully fallback to base64 data URL if not configured
    let path = "";
    if (putFn && blobToken) {
      try {
        const key = `uploads/bookings/${bookingId}/payment_receipt_${Date.now()}.${ext}`;
        const result = await putFn(key, Buffer.from(arrayBuffer), {
          access: "public",
          contentType: file.type,
          token: blobToken,
        });
        path = result?.url || "";
        console.log("Receipt uploaded to blob storage:", path);
      } catch (blobError) {
        console.warn(
          "Blob storage upload failed, falling back to base64:",
          blobError
        );
        path = "";
      }
    }

    if (!path) {
      // Fallback: store as base64 data URL so upload still works without blob config
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      path = `data:${file.type};base64,${base64}`;
      console.log(
        "Receipt stored as base64 data URL (length:",
        path.length,
        ")"
      );
    }

    await ensureReceiptTable();

    // Upsert by booking if table exists; otherwise fallback to bookings
    let tableExists = false;
    try {
      const t = (await query(
        "SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payment_receipts'"
      )) as any[];
      tableExists = (t?.[0]?.c || 0) > 0;
    } catch {}

    if (tableExists) {
      const existing = (await query(
        "SELECT id FROM payment_receipts WHERE booking_id = ? LIMIT 1",
        [bookingId]
      )) as any[];

      if (existing && existing.length > 0) {
        await query(
          'UPDATE payment_receipts SET receipt_path = ?, reference_number = ?, status = "awaiting", notes = ?, user_id = ?, uploaded_at = NOW() WHERE booking_id = ?',
          [path, referenceNumber, notes, Number(user.userId), bookingId]
        );
      } else {
        await query(
          'INSERT INTO payment_receipts (booking_id, user_id, receipt_path, reference_number, status, notes) VALUES (?, ?, ?, ?, "awaiting", ?)',
          [bookingId, Number(user.userId), path, referenceNumber, notes]
        );
      }
    } else {
      try {
        const current = (await query(
          "SELECT special_requests FROM bookings WHERE id = ? LIMIT 1",
          [bookingId]
        )) as any[];
        const prev = current?.[0]?.special_requests || "";
        const appended = prev
          ? `${prev}\nReceipt: ${path}`
          : `Receipt: ${path}`;
        await query("UPDATE bookings SET special_requests = ? WHERE id = ?", [
          appended,
          bookingId,
        ]);
      } catch {}
    }

    // Best-effort: notify provider
    try {
      if (providerUserId) {
        const { createBusinessNotification } = await import(
          "@/utils/businessNotificationService"
        );
        await createBusinessNotification({
          userId: providerUserId,
          title: "Payment Receipt Submitted",
          message: `Booking #${bookingId} has a new receipt awaiting confirmation.`,
          type: "info",
          link: `/cremation/bookings/${bookingId}`,
          shouldSendEmail: false,
        });
      }
    } catch {}

    return NextResponse.json({ success: true, receiptPath: path });
  } catch (error) {
    console.error("Receipt upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload receipt";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const bookingIdRaw = url.searchParams.get("bookingId");
    if (!bookingIdRaw || isNaN(Number(bookingIdRaw))) {
      return NextResponse.json(
        { error: "Missing or invalid bookingId" },
        { status: 400 }
      );
    }
    const bookingId = Number(bookingIdRaw);

    await ensureReceiptTable();

    // Check if payment_receipts table exists before querying to avoid noisy errors
    let tableExists = false;
    try {
      const t = (await query(
        "SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'payment_receipts'"
      )) as any[];
      tableExists = (t?.[0]?.c || 0) > 0;
    } catch {}

    // Try primary table first if available
    let receipt: any = null;
    if (tableExists) {
      try {
        const rows = (await query(
          "SELECT booking_id, user_id, receipt_path, reference_number, status, notes, confirmed_by, confirmed_at, rejection_reason, uploaded_at FROM payment_receipts WHERE booking_id = ? LIMIT 1",
          [bookingId]
        )) as any[];
        if (rows && rows.length > 0) receipt = rows[0];
      } catch {}
    }

    if (!receipt) {
      // Fallback to bookings.special_requests
      try {
        const r = (await query(
          "SELECT special_requests FROM bookings WHERE id = ? LIMIT 1",
          [bookingId]
        )) as any[];
        const text: string = r?.[0]?.special_requests || "";
        const m = text.match(/Receipt:\s*(\S+)/i);
        if (m) {
          return NextResponse.json({
            exists: true,
            receipt: { receipt_path: m[1], status: "awaiting", notes: null },
          });
        }
      } catch {}
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true, receipt });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch receipt" },
      { status: 500 }
    );
  }
}
