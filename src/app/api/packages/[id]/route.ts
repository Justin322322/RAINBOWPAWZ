// app/api/service_packages/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getAuthTokenFromRequest, parseAuthToken } from '@/utils/auth';
import * as fs from 'fs';
import { join } from 'path';
import { getImagePath } from '@/utils/imageUtils';

export const dynamic = 'force-dynamic'; // ensure requests aren't cached

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
    // Join with service_providers to get provider information
    const rows = (await query(
      `SELECT 
        sp.*,
        svp.provider_id AS providerId,
        svp.name AS providerName
      FROM service_packages sp
      JOIN service_providers svp ON sp.provider_id = svp.provider_id
      WHERE sp.package_id = ? LIMIT 1`,
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

    // Get size pricing if available
    const sizePricing = (await query(
      `SELECT size_category, weight_range_min, weight_range_max, price
       FROM package_size_pricing WHERE package_id = ? ORDER BY weight_range_min`,
      [packageId]
    )) as any[];

    // Get supported pet types
    const petTypes = (await query(
      `SELECT pet_type FROM business_pet_types
       WHERE provider_id = ? AND is_active = 1`,
      [pkg.providerId]
    )) as any[];

    return NextResponse.json({
      package: {
        id: pkg.package_id,
        name: pkg.name,
        description: pkg.description,
        category: pkg.category,
        cremationType: pkg.cremation_type,
        processingTime: pkg.processing_time,
        price: Number(pkg.price),
        pricePerKg: Number(pkg.price_per_kg || 0),
        deliveryFeePerKm: Number(pkg.delivery_fee_per_km),
        conditions: pkg.conditions,
        isActive: Boolean(pkg.is_active),
        providerId: pkg.providerId,
        providerName: pkg.providerName,
        inclusions: inclusions.map((i) => i.description),
        addOns: addOns.map((a) => ({ id: a.id, name: a.description, price: Number(a.price) })),
        images: images
          .map((i) => i.image_path)
          .map((p) => getImagePath(p)),
        // New enhanced features
        hasSizePricing: Boolean(pkg.has_size_pricing),
        sizePricing: sizePricing.map((sp) => ({
          sizeCategory: sp.size_category,
          weightRangeMin: Number(sp.weight_range_min),
          weightRangeMax: Number(sp.weight_range_max),
          price: Number(sp.price)
        })),
        supportedPetTypes: petTypes.map((pt) => pt.pet_type)
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

    const packageId = Number(id);
    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }

    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse auth token to handle both JWT and old formats
    const authData = await parseAuthToken(authToken);
    if (!authData) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const { userId, accountType } = authData;

    if (accountType !== 'business') {
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

    try {
      const result = await withTransaction(async (transaction) => {
        // Validate required fields
        if (!body.name || !body.description || !body.price) {
          console.error('Missing required fields:', { name: body.name, description: body.description, price: body.price });
          throw new Error('Missing required fields: name, description, and price are required');
        }

        // update core
        const updateResult = await transaction.query(
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

        if (updateResult.affectedRows === 0) {
          throw new Error('Package not found or no changes made');
        }

        // delete old inclusions
        await transaction.query(
          'DELETE FROM package_inclusions WHERE package_id = ?',
          [packageId]
        );

        // insert new inclusions
        if (body.inclusions && Array.isArray(body.inclusions)) {
          for (const inc of body.inclusions) {
            if (inc && inc.trim()) {
              await transaction.query(
                'INSERT INTO package_inclusions (package_id, description) VALUES (?, ?)',
                [packageId, inc.trim()]
              );
            }
          }
        }

        // delete old add-ons
        await transaction.query(
          'DELETE FROM package_addons WHERE package_id = ?',
          [packageId]
        );

        // insert new add-ons
        if (body.addOns && Array.isArray(body.addOns)) {
          for (const addon of body.addOns) {
            if (addon && addon.name && addon.name.trim()) {
              await transaction.query(
                'INSERT INTO package_addons (package_id, description, price) VALUES (?, ?, ?)',
                [packageId, addon.name.trim(), Number(addon.price) || 0]
              );
            }
          }
        }

        // Handle image updates
        let filesToDelete: string[] = [];
        if (body.images && Array.isArray(body.images)) {
          // Get current images from database
          const currentImages = await transaction.query(
            'SELECT image_path FROM package_images WHERE package_id = ?',
            [packageId]
          ) as any[];
          
          const currentImagePaths = currentImages.map(img => img.image_path);
          const newImagePaths = body.images;

          // Find images to remove (in current but not in new)
          const imagesToRemove = currentImagePaths.filter((path: string) => !newImagePaths.includes(path));
          
          // Store files to delete for later (after transaction commits)
          filesToDelete = imagesToRemove.slice();
          
          // Remove image records from database only
          for (const imagePath of imagesToRemove) {
            await transaction.query(
              'DELETE FROM package_images WHERE package_id = ? AND image_path = ?',
              [packageId, imagePath]
            );
          }

          // Add new images (in new but not in current)
          const imagesToAdd = newImagePaths.filter((path: string) => !currentImagePaths.includes(path));
          
          if (imagesToAdd.length > 0) {
            // Find the maximum display_order among remaining images to avoid duplicates
            const maxOrderResult = await transaction.query(
              'SELECT COALESCE(MAX(display_order), 0) as max_order FROM package_images WHERE package_id = ?',
              [packageId]
            ) as any[];
            
            const maxDisplayOrder = maxOrderResult[0]?.max_order || 0;
            
            for (let i = 0; i < imagesToAdd.length; i++) {
              const imagePath = imagesToAdd[i];
              const displayOrder = maxDisplayOrder + i + 1;
              
              await transaction.query(
                'INSERT INTO package_images (package_id, image_path, display_order) VALUES (?, ?, ?)',
                [packageId, imagePath, displayOrder]
              );
            }
          }
        }

        return { success: true, filesToDelete };
      });


      // Delete physical files only after transaction commits successfully
      if (result.filesToDelete && result.filesToDelete.length > 0) {
        for (const imagePath of result.filesToDelete) {
          try {
            const fullPath = join(process.cwd(), 'public', imagePath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          } catch (fileError) {
            console.error('Error deleting unused file:', fileError);
            // Note: This is not critical since the database is already consistent
          }
        }
      }

      // **🔥 FIX: Fetch updated package data outside transaction using regular query**
      const updatedPackage = await query(
        `SELECT package_id as id, name, description, category, cremation_type as cremationType,
                processing_time as processingTime, price, delivery_fee_per_km as deliveryFeePerKm,
                conditions, is_active as isActive
         FROM service_packages 
         WHERE package_id = ? LIMIT 1`,
        [packageId]
      ) as any[];

      if (!updatedPackage.length) {
        return NextResponse.json({ error: 'Package not found after update' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Package updated successfully',
        package: updatedPackage[0]
      });

    } catch (error: any) {
      console.error('Package update error:', error);
      return NextResponse.json(
        { error: 'Failed to update package', details: error.message },
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

  // Parse auth token to handle both JWT and old formats
  const authData = await parseAuthToken(authToken);
  if (!authData) {
    return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
  }

  const { userId: _userId, accountType } = authData;

  if (accountType !== 'business') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await query(`DELETE FROM service_packages WHERE package_id=?`, [packageId]);
  return NextResponse.json({ success: true, message: 'Deleted' });
}

/** Helper to move images */
async function _moveImagesToPackageFolder(images: string[], packageId: number) {
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
