import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const imageId = Number(id);
  if (isNaN(imageId)) {
    return NextResponse.json({ error: 'Invalid image id' }, { status: 400 });
  }

  try {
    // Check if package_data table exists first
    const tableExistsRows = (await query(
      `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'package_data'`
    )) as Array<{ cnt: number }>;
    const hasPackageData = Array.isArray(tableExistsRows) && Number(tableExistsRows[0]?.cnt || 0) > 0;
    
    if (!hasPackageData) {
      return NextResponse.json({ error: 'Image service not available' }, { status: 404 });
    }

    const rows = (await query(
      `SELECT image_data FROM package_data WHERE id = ? LIMIT 1`,
      [imageId]
    )) as Array<{ image_data: string | null }>;

    if (!rows.length || !rows[0].image_data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const dataUrl = rows[0].image_data;

    // Expect data URL like: data:image/png;base64,XXXX
    const match = /^data:(?<mime>[^;]+);base64,(?<b64>.+)$/i.exec(dataUrl);
    if (!match || !match.groups) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 500 });
    }

    const mime = match.groups['mime'];
    const b64 = match.groups['b64'];
    const buffer = Buffer.from(b64, 'base64');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch image', details: err?.message || 'unknown' },
      { status: 500 }
    );
  }
}


