// app/api/service_packages/[id]/route.ts

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

export const dynamic = 'force-dynamic'; // ensure requests aren't cached

/** GET a specific package by ID */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const packageId = parseInt(params.id);

    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }

    const packageResult = await query(
      `SELECT * FROM service_packages WHERE package_id = ? LIMIT 1`,
      [packageId]
    ) as any[];

    if (packageResult.length === 0) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const pkg = packageResult[0];

    // Parse inclusions from JSON
    let inclusions = [];
    try {
      inclusions = pkg.inclusions ? JSON.parse(pkg.inclusions) : [];
    } catch (e) {
      console.error('Error parsing inclusions JSON:', e);
      inclusions = [];
    }

    // Parse images from JSON
    let images = [];
    try {
      images = pkg.images ? JSON.parse(pkg.images) : [];
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
      images.push(`/images/sample-package-${(pkg.package_id % 5) + 1}.jpg`);
    }

    // For addOns, since they're not in the new schema, we'll return empty array
    // If you need add-ons functionality, you should add an 'addons' JSON field to service_packages
    const addOns: any[] = [];

    const packageData = {
      ...pkg,
      id: pkg.package_id, // Ensure compatibility with frontend
      inclusions,
      addOns,
      images
    };

    return NextResponse.json({ package: packageData });
  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package' },
      { status: 500 }
    );
  }
}

/** PUT/UPDATE a package */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const packageId = parseInt(params.id);

    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }

    // Get user ID from headers
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    // Verify the package belongs to the user's provider
    const packageCheck = await query(
      `SELECT sp.provider_id 
       FROM service_packages sp 
       JOIN service_providers svp ON sp.provider_id = svp.provider_id 
       WHERE sp.package_id = ? AND svp.user_id = ?`,
      [packageId, parseInt(userId)]
    ) as any[];

    if (packageCheck.length === 0) {
      return NextResponse.json({ error: 'Package not found or access denied' }, { status: 404 });
    }

    const {
      name,
      description,
      category,
      cremationType,
      processingTime,
      price,
      deliveryFeePerKm,
      conditions,
      inclusions = [],
      addOns = [],
      images = [],
      isActive = true
    } = await request.json();

    if (!name || !description || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await query('START TRANSACTION');

    try {
      // Process inclusions - convert array to JSON
      const inclusionsJson = JSON.stringify(inclusions.filter((x: any) => x));
      
      // Process images - move to package folder and store as JSON
      const finalImages = await moveImagesToPackageFolder(images, packageId);
      const imagesJson = JSON.stringify(finalImages);

      // Update the main package
      await query(`
        UPDATE service_packages 
        SET name = ?, description = ?, category = ?, cremation_type = ?, 
            processing_time = ?, price = ?, delivery_fee_per_km = ?, 
            conditions = ?, inclusions = ?, images = ?, is_active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE package_id = ?
      `, [
        name, description, category, cremationType, processingTime, 
        price, deliveryFeePerKm || 0, conditions, inclusionsJson, imagesJson, 
        isActive, packageId
      ]);

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Package updated successfully',
        images: finalImages
      });
    } catch (innerErr) {
      await query('ROLLBACK');
      throw innerErr;
    }
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { error: 'Failed to update package' },
      { status: 500 }
    );
  }
}

/** DELETE a package */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const packageId = parseInt(params.id);

    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }

    // Get user ID from headers
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    // Verify the package belongs to the user's provider
    const packageCheck = await query(
      `SELECT sp.provider_id 
       FROM service_packages sp 
       JOIN service_providers svp ON sp.provider_id = svp.provider_id 
       WHERE sp.package_id = ? AND svp.user_id = ?`,
      [packageId, parseInt(userId)]
    ) as any[];

    if (packageCheck.length === 0) {
      return NextResponse.json({ error: 'Package not found or access denied' }, { status: 404 });
    }

    // Check if there are any bookings for this package
    const bookingsCheck = await query(
      'SELECT COUNT(*) as count FROM service_bookings WHERE package_id = ?',
      [packageId]
    ) as any[];

    if (bookingsCheck[0].count > 0) {
      // Don't delete if there are bookings, just mark as inactive
      await query(
        'UPDATE service_packages SET is_active = 0 WHERE package_id = ?',
        [packageId]
      );
      return NextResponse.json({
        success: true,
        message: 'Package deactivated successfully (has existing bookings)'
      });
    }

    // Safe to delete if no bookings
    await query('DELETE FROM service_packages WHERE package_id = ?', [packageId]);

    return NextResponse.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { error: 'Failed to delete package' },
      { status: 500 }
    );
  }
}

async function moveImagesToPackageFolder(paths: string[], packageId: number) {
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
