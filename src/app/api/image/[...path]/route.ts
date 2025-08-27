import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, normalize } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROOTS = new Set([
  'profile-pictures',
  'admin-profile-pictures',
  'packages',
  'pets',
  'documents',
  'businesses'
]);

function getContentType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [root, ...rest] = path;
  if (!ALLOWED_ROOTS.has(root)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Construct safe path under public/uploads
  const safeRelative = normalize([root, ...rest].join('/'));
  // Prevent path traversal
  if (safeRelative.startsWith('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const fullPath = join(process.cwd(), 'public', 'uploads', safeRelative);

  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const stat = statSync(fullPath);
    const stream = createReadStream(fullPath);
    const contentType = getContentType(fullPath);

    return new NextResponse(stream as unknown as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

