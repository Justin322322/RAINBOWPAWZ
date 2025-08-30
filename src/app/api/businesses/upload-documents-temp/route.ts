import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Maximum file size (10MB for documents)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const formData = await request.formData();
    const businessPermit: File | null = formData.get('businessPermit') as File | null;
    const birCertificate: File | null = formData.get('birCertificate') as File | null;
    const governmentId: File | null = formData.get('governmentId') as File | null;

    // Validate files
    const filesToProcess: Array<{ file: File; type: 'businessPermit' | 'birCertificate' | 'governmentId' }> = [];
    if (businessPermit) filesToProcess.push({ file: businessPermit, type: 'businessPermit' });
    if (birCertificate) filesToProcess.push({ file: birCertificate, type: 'birCertificate' });
    if (governmentId) filesToProcess.push({ file: governmentId, type: 'governmentId' });

    // Check file sizes and types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    for (const { file, type } of filesToProcess) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File size exceeds the limit (10MB) for ${type}` }, { status: 413 });
      }
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type for ${type}. Only PDF, Word documents, and images are allowed.` }, { status: 400 });
      }
    }

    // Process files and upload to temporary storage
    const filePaths: any = {};

    // Lazy import to avoid bundling when not configured
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const useBlob = typeof blobToken === 'string' && blobToken.length > 0;
    let putFn: any = null;

    if (useBlob) {
      try {
        const blob = await import('@vercel/blob');
        putFn = (blob as any)?.put;
      } catch {
        // Silently fallback to base64
      }
    }

    for (const { file, type } of filesToProcess) {
      const arrayBuffer = await file.arrayBuffer();
      const mime = file.type || 'application/octet-stream';
      const ext = mime.split('/')[1] || 'bin';

      if (putFn && useBlob) {
        // Upload to Vercel Blob with temp prefix
        const key = `temp/registration/${Date.now()}_${type}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const result = await putFn(key, Buffer.from(arrayBuffer), {
          access: 'public',
          contentType: mime,
          token: blobToken,
        });
        const url = result?.url || '';
        if (type === 'businessPermit') filePaths.business_permit_path = url;
        if (type === 'birCertificate') filePaths.bir_certificate_path = url;
        if (type === 'governmentId') filePaths.government_id_path = url;
      } else {
        // Fallback: base64 data URL (for development/local)
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:${mime};base64,${base64Data}`;
        if (type === 'businessPermit') filePaths.business_permit_path = dataUrl;
        if (type === 'birCertificate') filePaths.bir_certificate_path = dataUrl;
        if (type === 'governmentId') filePaths.government_id_path = dataUrl;
      }
    }

    return NextResponse.json({
      success: true,
      filePaths: {
        business_permit_path: filePaths.business_permit_path,
        bir_certificate_path: filePaths.bir_certificate_path,
        government_id_path: filePaths.government_id_path
      },
      message: 'Documents uploaded to temporary storage successfully'
    });

  } catch (error) {
    console.error('Error in temporary document upload:', error);
    return NextResponse.json({
      error: 'Failed to upload documents to temporary storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
