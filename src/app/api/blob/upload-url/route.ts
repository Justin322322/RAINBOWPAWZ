import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get("filename") || `upload_${Date.now()}`;

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      console.error("[blob/upload-url] Missing BLOB_READ_WRITE_TOKEN env var");
      return NextResponse.json(
        { error: "Blob storage not configured" },
        { status: 503 }
      );
    }

    // ✅ Correct Vercel Blob API endpoint
    const resp = await fetch("https://api.vercel.com/v2/blobs/upload-url", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access: "public", // or "private"
        metadata: { filename }, // optional, just to track
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[blob/upload-url] Vercel Blob API error:", {
        status: resp.status,
        statusText: resp.statusText,
        body: text,
      });
      return NextResponse.json(
        { error: "Failed to generate upload URL", details: text },
        { status: 502 }
      );
    }

    const data = await resp.json();

    return NextResponse.json({
      uploadUrl: data.url, // presigned URL
      id: data.id,         // blob id
      filename,
    });
  } catch (err) {
    console.error("[blob/upload-url] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
