import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Serve /api/image/packages/<filename> from /public/uploads/packages/<filename>
export async function GET(_request: NextRequest, { params }: { params: { path: string[] } }) {
  const relPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  // Basic sanitization: remove leading slashes
  const safePath = relPath.replace(/^\/+/, '');
  
  try {
    const filePath = join(process.cwd(), 'public', 'uploads', 'packages', safePath);
    const fileBuffer = await readFile(filePath);
    
    // Determine content type based on file extension
    const ext = safePath.split('.').pop()?.toLowerCase();
    const contentType = 
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'png' ? 'image/png' :
      ext === 'gif' ? 'image/gif' :
      ext === 'webp' ? 'image/webp' :
      'application/octet-stream';
    
    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error(`Image not found: /uploads/packages/${safePath}`, error);
    
    // Return a 1x1 transparent PNG as fallback
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAAVz5AAAAAElFTkSuQmCC',
      'base64'
    );
    
    return new NextResponse(transparentPng as any, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
}


