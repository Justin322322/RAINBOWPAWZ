import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const contentType = searchParams.get('contentType') || 'application/octet-stream';
    const filename = searchParams.get('filename') || `upload_${Date.now()}`;

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token || token.length === 0) {
      return NextResponse.json({ error: 'Blob token not configured' }, { status: 500 });
    }

    // Use Vercel Blob REST API so no SDK install is required
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
      return NextResponse.json({ error: text || 'Failed to generate upload URL' }, { status: 500 });
    }

    const data = await resp.json();
    return NextResponse.json({ uploadUrl: data.url, id: data.id, filename });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}


