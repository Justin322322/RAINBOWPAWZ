import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import { join } from 'path';

function getImagePath(relativePath: string) {
  if (relativePath.startsWith('/')) {
    return relativePath;
  }
  return `/uploads/${relativePath}`;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const packageId = url.searchParams.get('id');
    const providerId = url.searchParams.get('providerId');
    
    if (packageId) {
      return await getPackageById(parseInt(packageId), providerId || undefined);
    }

    let sql = `
      SELECT
        sp.*,
        svp.provider_id AS providerId,
        svp.name AS providerName
      FROM service_packages sp
      JOIN service_providers svp
        ON sp.provider_id = svp.provider_id
      WHERE sp.is_active = 1
    `;

    const params: any[] = [];

    if (providerId) {
      sql += ` AND sp.provider_id = ?`;
      params.push(parseInt(providerId));
    }

    sql += ` ORDER BY sp.created_at DESC`;

    const rows = (await query(sql, params)) as any[];
    const packages = await enhancePackagesWithDetails(rows);

    return NextResponse.json({ packages });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to fetch packages', details: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user ID from headers
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    // Get provider ID
    const providerResult = await query(
      'SELECT provider_id as id FROM service_providers WHERE user_id = ?',
      [parseInt(userId)]
    ) as any[];

    if (!providerResult.length) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    const providerId = providerResult[0].id;

    const {
      name,
      description,
      category = 'Private',
      cremationType = 'Standard',
      processingTime = '1-2 days',
      price,
      deliveryFeePerKm = 0,
      conditions = '',
      inclusions = [],
      addOns = [],
      images = [],
    } = await request.json();

    if (!name || !description || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await query('START TRANSACTION');
    try {
      // Process inclusions - convert array to JSON
      const inclusionsJson = JSON.stringify(inclusions.filter((x: any) => x));
      
      // Process images - move to package folder first, then store as JSON
      const moved = await moveImagesToPackageFolder(images, 'temp'); // We'll update with real ID after insert
      const imagesJson = JSON.stringify(moved);

      const pkgRes = (await query(
        `
        INSERT INTO service_packages
          (provider_id, name, description, category, cremation_type,
           processing_time, price, delivery_fee_per_km, conditions, inclusions, images, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `,
        [providerId, name, description, category, cremationType, processingTime, price, deliveryFeePerKm, conditions, inclusionsJson, imagesJson]
      )) as any;
      const packageId = pkgRes.insertId;

      // Now move images to correct folder with package ID
      const finalImages = await moveImagesToPackageFolder(images, packageId);
      const finalImagesJson = JSON.stringify(finalImages);
      
      // Update package with correct image paths
      await query(
        'UPDATE service_packages SET images = ? WHERE package_id = ?',
        [finalImagesJson, packageId]
      );

      // Handle add-ons - since there's no package_addons table, we'll store them as JSON in a new field if needed
      // For now, we'll skip add-ons as they're not in the new schema
      // If you need add-ons, we should add an 'addons' JSON field to service_packages table

      await query('COMMIT');
      return NextResponse.json({
        success: true,
        packageId,
        message: 'Package created successfully',
        images: finalImages,
      });
    } catch (innerErr) {
      await query('ROLLBACK');
      throw innerErr;
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to create package', details: (err as Error).message },
      { status: 500 }
    );
  }
}

async function getPackageById(packageId: number, providerId?: string) {
  try {
    // Build the query with optional providerId filter
    let sql = `
      SELECT
        sp.*,
        svp.provider_id   AS providerId,
        svp.name AS providerName
      FROM service_packages sp
      JOIN service_providers svp
        ON sp.provider_id = svp.provider_id
      WHERE sp.package_id = ?
    `;

    const params = [packageId];

    // Add providerId filter if provided
    if (providerId) {
      sql += ` AND sp.provider_id = ?`;
      params.push(parseInt(providerId));
    }

    const rows = (await query(sql, params)) as any[];
    if (!rows.length) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }
    const [pkg] = await enhancePackagesWithDetails(rows);
    return NextResponse.json({ package: pkg });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to fetch package', details: (err as Error).message },
      { status: 500 }
    );
  }
}

async function enhancePackagesWithDetails(pkgs: any[]) {
  if (!pkgs.length) return [];

  return pkgs.map((p: any) => {
    // Parse inclusions from JSON
    let inclusions = [];
    try {
      inclusions = p.inclusions ? JSON.parse(p.inclusions) : [];
    } catch (e) {
      console.error('Error parsing inclusions JSON:', e);
      inclusions = [];
    }

    // Parse images from JSON
    let images = [];
    try {
      images = p.images ? JSON.parse(p.images) : [];
    } catch (e) {
      console.error('Error parsing images JSON:', e);
      images = [];
    }

    // Process image paths
    images = images
      .map((path: string) => {
        if (!path || path.startsWith('blob:')) return null;
        return path.startsWith('http') ? path : getImagePath(path);
      })
      .filter(Boolean);

    if (!images.length) {
      images.push(`/images/sample-package-${(p.package_id % 5) + 1}.jpg`);
    }

    // For addOns, since they're not in the new schema, we'll return empty array
    // If you need add-ons functionality, you should add an 'addons' JSON field to service_packages
    const addOns: any[] = [];

    return { 
      ...p, 
      id: p.package_id, // Ensure compatibility with frontend
      inclusions, 
      addOns, 
      images 
    };
  });
}

async function moveImagesToPackageFolder(paths: string[], packageId: number | string) {
  if (!paths.length) return [];
  
  const packageIdStr = packageId.toString();
  const base = join(process.cwd(), 'public', 'uploads', 'packages', packageIdStr);
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });

  return Promise.all(
    paths.map((rel: string) => {
      if (rel.includes(`/uploads/packages/${packageIdStr}/`)) return rel;
      const filename = rel.split('/').pop()!;
      const src = join(process.cwd(), 'public', rel);
      const destRel = `/uploads/packages/${packageIdStr}/${filename}`;
      const dest = join(process.cwd(), 'public', destRel);
      if (!fs.existsSync(src)) return rel;
      fs.copyFileSync(src, dest);
      try { fs.unlinkSync(src); } catch {}
      return destRel;
    })
  );
}