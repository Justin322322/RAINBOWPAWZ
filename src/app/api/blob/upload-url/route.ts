import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Lazy import to avoid bundling if not configured
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const reqFn: any = (eval('require') as any);
    const blob = reqFn ? reqFn('@vercel/blob') : null;
    const generateUploadUrl = blob.generateUploadUrl as (opts: any) => Promise<any>;

    const searchParams = request.nextUrl.searchParams;
    const contentType = searchParams.get('contentType') || 'application/octet-stream';
    const filename = searchParams.get('filename') || `upload_${Date.now()}`;

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token || token.length === 0) {
      return NextResponse.json({ error: 'Blob token not configured' }, { status: 500 });
    }

    const res = await generateUploadUrl({
      access: 'public',
      contentType,
      token,
      // Let Blob choose the key; filename hints the extension
      // client will POST the file to res.url
    });

    return NextResponse.json({ uploadUrl: res.url, id: res.id, filename });
  } catch {
    return NextResponse.json({ error: 'Failed to generate upload URL (Blob SDK not installed or misconfigured)' }, { status: 500 });
  }
}


