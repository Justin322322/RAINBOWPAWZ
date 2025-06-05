// app/api/service_packages/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import * as fs from 'fs';
import { join } from 'path';
import { getImagePath } from '@/utils/imageUtils';

export const dynamic = 'force-dynamic'; // ensure requests aren’t cached

/** GET a specific package by ID */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const packageId = Number(id);
  if (isNaN(packageId)) {
    return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
  }

  try {
    const rows = (await query(
      `SELECT * FROM service_packages WHERE package_id = ? LIMIT 1`,
      [packageId]
    )) as any[];

    if (!rows.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const pkg = rows[0];
    const inclusions = (await query(
      `SELECT description FROM package_inclusions WHERE package_id = ?`,
      [packageId]
    )) as any[];

    const addOns = (await query(
      `SELECT addon_id as id, description, price FROM package_addons WHERE package_id = ?`,
      [packageId]
    )) as any[];

    const images = (await query(
      `SELECT image_path FROM package_images WHERE package_id = ? ORDER BY display_order`,
      [packageId]
    )) as any[];

    return NextResponse.json({
      package: {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        category: pkg.category,
        cremationType: pkg.cremation_type,
        processingTime: pkg.processing_time,
        price: Number(pkg.price),
        deliveryFeePerKm: Number(pkg.delivery_fee_per_km),
        conditions: pkg.conditions,
        isActive: Boolean(pkg.is_active),
        inclusions: inclusions.map((i) => i.description),
        addOns: addOns.map((a) => ({ id: a.id, name: a.description, price: Number(a.price) })),
        images: images
          .map((i) => i.image_path)
          .map((p) => getImagePath(p))
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to fetch', details: err.message },
      { status: 500 }
    );
  }
}

/** PATCH to update a package */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('PATCH /api/packages/[id] - Request received for package:', id);

    const packageId = Number(id);
    if (isNaN(packageId)) {
      console.log('Invalid package ID provided:', id);
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }

  const authToken = getAuthTokenFromRequest(request);
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId: string | null = null;
  let accountType: string | null = null;

  // Check if it's a JWT token or old format
  if (authToken.includes('.')) {
    // JWT token format
    const { decodeTokenUnsafe } = await import('@/lib/jwt');
    const payload = decodeTokenUnsafe(authToken);
    userId = payload?.userId || null;
    accountType = payload?.accountType || null;
  } else {
    // Old format fallback
    const parts = authToken.split('_');
    if (parts.length === 2) {
      userId = parts[0];
      accountType = parts[1];
    }
  }

  if (!userId || !accountType || accountType !== 'business') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // confirm provider
  const prov = (await query(
    `SELECT provider_id FROM service_providers WHERE user_id = ?`,
    [userId]
  )) as any[];
  if (!prov.length) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }
  const providerId = Number(prov[0].provider_id);

  // confirm ownership
  const pkgOwner = (await query(
    `SELECT provider_id FROM service_packages WHERE package_id = ?`,
    [packageId]
  )) as any[];
  if (!pkgOwner.length || Number(pkgOwner[0].provider_id) !== providerId) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // simple toggle active
  if (typeof body.isActive === 'boolean') {
    try {
      const updateResult = await query(
        `UPDATE service_packages SET is_active = ? WHERE package_id = ?`,
        [body.isActive ? 1 : 0, packageId]
      ) as any;
      
      if (updateResult.affectedRows === 0) {
        return NextResponse.json({ error: 'Package not found or no changes made' }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        isActive: body.isActive,
        message: `Package ${body.isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (updateError: any) {
      console.error('Error toggling package status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update package status', details: updateError.message },
        { status: 500 }
      );
    }
  }

  // full update
  console.log('Starting full package update for package ID:', packageId);
  console.log('Update data:', JSON.stringify(body, null, 2));

  await query('START TRANSACTION');
  try {
    // Validate required fields
    if (!body.name || !body.description || !body.price) {
      console.error('Missing required fields:', { name: body.name, description: body.description, price: body.price });
      throw new Error('Missing required fields: name, description, and price are required');
    }

    // update core
    const updateResult = await query(
      `UPDATE service_packages
       SET name=?, description=?, category=?, cremation_type=?, processing_time=?,
           price=?, delivery_fee_per_km=?, conditions=?
       WHERE package_id=?`,
      [
        body.name,
        body.description,
        body.category,
        body.cremationType,
        body.processingTime,
        Number(body.price),
        Number(body.deliveryFeePerKm) || 0,
        body.conditions,
        packageId
      ]
    ) as any;

    // Check if the package was actually updated
    if (updateResult.affectedRows === 0) {
      throw new Error('Package not found or no changes made');
    }

    // inclusions
    if (Array.isArray(body.inclusions)) {
      await query(`DELETE FROM package_inclusions WHERE package_id=?`, [packageId]);
      for (const inc of body.inclusions) {
        await query(
          `INSERT INTO package_inclusions (package_id, description) VALUES (?,?)`,
          [packageId, inc]
        );
      }
    }

    // add-ons
    if (Array.isArray(body.addOns)) {
      await query(`DELETE FROM package_addons WHERE package_id=?`, [packageId]);
      for (const ao of body.addOns) {
        await query(
          `INSERT INTO package_addons (package_id, description, price) VALUES (?,?,?)`,
          [packageId, ao.name, Number(ao.price)]
        );
      }
    }

    // images
    if (Array.isArray(body.images)) {
      const updated = await moveImagesToPackageFolder(body.images, packageId);
      await query(`DELETE FROM package_images WHERE package_id=?`, [packageId]);
      for (let i = 0; i < updated.length; i++) {
        await query(
          `INSERT INTO package_images (package_id, image_path, display_order) VALUES (?,?,?)`,
          [packageId, updated[i], i]
        );
      }
    }

    await query('COMMIT');
    console.log('Package update completed successfully for package ID:', packageId);
    return NextResponse.json({ success: true, message: 'Package updated successfully' });
  } catch (e: any) {
    console.error('Package update failed for package ID:', packageId, 'Error:', e.message);
    await query('ROLLBACK');
    return NextResponse.json(
      { error: 'Update failed', details: e.message },
      { status: 500 }
    );
  }
  } catch (unexpectedError: any) {
    console.error('Unexpected error in PATCH /api/packages/[id]:', unexpectedError);
    return NextResponse.json(
      { error: 'Internal server error', details: unexpectedError.message },
      { status: 500 }
    );
  }
}

/** DELETE a package */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const packageId = Number(id);
  if (isNaN(packageId)) {
    return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
  }

  const authToken = getAuthTokenFromRequest(request);
  if (!authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userId: string | null = null;
  let accountType: string | null = null;

  // Check if it's a JWT token or old format
  if (authToken.includes('.')) {
    // JWT token format
    const { decodeTokenUnsafe } = await import('@/lib/jwt');
    const payload = decodeTokenUnsafe(authToken);
    userId = payload?.userId || null;
    accountType = payload?.accountType || null;
  } else {
    // Old format fallback
    const parts = authToken.split('_');
    if (parts.length === 2) {
      userId = parts[0];
      accountType = parts[1];
    }
  }

  if (!userId || !accountType || accountType !== 'business') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await query(`DELETE FROM service_packages WHERE package_id=?`, [packageId]);
  return NextResponse.json({ success: true, message: 'Deleted' });
}

/** Helper to move images */
async function moveImagesToPackageFolder(images: string[], packageId: number) {
  const base = join(process.cwd(), 'public', 'uploads', 'packages');
  const dir = join(base, String(packageId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const results: string[] = [];
  for (const img of images) {
    const name = img.split('/').pop()!;
    const src = join(process.cwd(), 'public', img);
    const destRel = `/uploads/packages/${packageId}/${name}`;
    const dest = join(process.cwd(), 'public', destRel);

    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
      results.push(destRel);
    } else {
      results.push(img);
    }
  }
  return results;
}
