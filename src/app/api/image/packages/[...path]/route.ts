import { NextRequest, NextResponse } from 'next/server';

// Redirect /api/image/packages/<filename> to /uploads/packages/<filename> under /public
export async function GET(_request: NextRequest, { params }: { params: { path: string[] } }) {
  const relPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  // Basic sanitization: remove leading slashes
  const safePath = relPath.replace(/^\/+/, '');
  const target = `/uploads/packages/${safePath}`;
  // Let Next Image fetch the public file by redirecting
  return NextResponse.redirect(target, { status: 307 });
}


