import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contentType = searchParams.get('contentType') || 'application/octet-stream';
    const filename = searchParams.get('filename') || `upload_${Date.now()}`;

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token || token.length === 0) {
      console.error('[blob/upload-url] Missing BLOB_READ_WRITE_TOKEN environment variable');
      return NextResponse.json({ error: 'Blob storage not configured' }, { status: 503 });
    }

    // Call Vercel Blob REST API
    const resp = await fetch('https://api.vercel.com/v2/blob/generate-upload-url', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ access: 'public', contentType })
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error('[blob/upload-url] Vercel Blob API error', {
        status: resp.status,
        statusText: resp.statusText,
        body: text?.slice(0, 500)
      });
      return NextResponse.json({
        error: 'Failed to generate upload URL',
        details: text || undefined,
        status: resp.status
      }, { status: 502 });
    }

    const data = await resp.json();
    return NextResponse.json({ uploadUrl: data.url, id: data.id, filename });
  } catch (err) {
    console.error('[blob/upload-url] Unexpected error', err);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}


