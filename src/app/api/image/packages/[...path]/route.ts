import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { query } from '@/lib/db';

// Serve package images - handles base64 data URLs, external URLs, and file paths
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const relPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  const safePath = relPath.replace(/^\/+/, '');
  
  try {
    // Extract package info from the filename pattern: package_ID_timestamp_index.ext
    const match = safePath.match(/^package_(\d+)_\d+_(\d+)\./);
    if (match) {
      const packageId = parseInt(match[1]);
      const imageIndex = parseInt(match[2]);
      
      // Get the actual image data from database
      const packageRows = await query(
        'SELECT images FROM service_packages WHERE package_id = ?',
        [packageId]
      ) as any[];
      
      if (packageRows.length > 0 && packageRows[0].images) {
        let images: any[] = [];
        
        try {
          const rawImages = packageRows[0].images;
          if (typeof rawImages === 'string') {
            // Handle corrupted data
            if (rawImages.trim().startsWith('[object Object]')) {
              console.warn(`Package ${packageId} has corrupted images data`);
              images = [];
            } else {
              images = JSON.parse(rawImages);
            }
          } else if (Array.isArray(rawImages)) {
            images = rawImages;
          }
        } catch (e) {
          console.warn(`Failed to parse images for package ${packageId}:`, e);
          images = [];
        }
        
        // Get the specific image by index
        if (images[imageIndex]) {
          const imageData = images[imageIndex];
          
          // Handle base64 data URLs
          if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
            const [header, base64Data] = imageData.split(',');
            const contentType = header.match(/data:(.*?);/)?.[1] || 'image/png';
            const buffer = Buffer.from(base64Data, 'base64');
            
            return new NextResponse(buffer as any, {
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable'
              }
            });
          }
          
          // Handle external URLs - redirect
          if (typeof imageData === 'string' && (imageData.startsWith('http://') || imageData.startsWith('https://'))) {
            return NextResponse.redirect(imageData, { status: 307 });
          }
        }
      }
    }
    
    // Fallback: try to serve from filesystem
    const filePath = join(process.cwd(), 'public', 'uploads', 'packages', safePath);
    const fileBuffer = await readFile(filePath);
    
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
    console.error(`Image not found or invalid: ${safePath}`, error);
    
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


