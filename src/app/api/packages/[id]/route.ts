// app/api/service_packages/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getAuthTokenFromRequest, parseAuthToken } from '@/utils/auth';
import * as fs from 'fs';
import { join } from 'path';
import { getImagePath } from '@/utils/imageUtils';

export const dynamic = 'force-dynamic'; // ensure requests aren't cached

async function hasServiceTypesProviderSchema(): Promise<boolean> {
  try {
    const cols = (await query('SHOW COLUMNS FROM service_types')) as Array<{ Field: string }>;
    const names = (cols || []).map(c => c.Field);
    return names.includes('provider_id') && names.includes('pet_type');
  } catch {
    return false;
  }
}

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
    // Get inclusions from JSON column
    let inclusions: any[] = [];
    let addOns: any[] = [];
    let images: any[] = [];
    let sizePricing: any[] = [];

    try {
      // Extract inclusions from JSON column
      if (pkg.inclusions) {
        let inclusionsData;
        if (typeof pkg.inclusions === 'string') {
          // Handle corrupted [object Object] data
          if (pkg.inclusions.includes('[object Object]')) {
            console.warn(`Corrupted inclusions data for package ${packageId}, defaulting to empty array`);
            inclusionsData = [];
          } else {
            inclusionsData = JSON.parse(pkg.inclusions);
          }
        } else {
          inclusionsData = pkg.inclusions;
        }
        
        if (Array.isArray(inclusionsData)) {
          inclusions = inclusionsData.map((inc: any) => {
            if (typeof inc === 'string') return inc;
            if (inc && typeof inc === 'object') {
              return inc.description || inc.name || String(inc);
            }
            return String(inc);
          }).filter(Boolean);
        } else {
          inclusions = [];
        }
      }

      // Extract addons from JSON column
      if (pkg.addons) {
        const addonsData = typeof pkg.addons === 'string' ? JSON.parse(pkg.addons) : pkg.addons;
        addOns = Array.isArray(addonsData) ? addonsData.map((addon: any, index: number) => ({
          id: index + 1,
          name: addon.name || addon.description,
          description: addon.description || addon.name,
          price: Number(addon.price || 0)
        })) : [];
      }

      // Extract images from JSON column
      if (pkg.images) {
        const imagesData = typeof pkg.images === 'string' ? JSON.parse(pkg.images) : pkg.images;
        images = Array.isArray(imagesData) ? imagesData : [];
      }

      // Extract size pricing from JSON column
      if (pkg.size_pricing) {
        const sizePricingData = typeof pkg.size_pricing === 'string' ? JSON.parse(pkg.size_pricing) : pkg.size_pricing;
        sizePricing = Array.isArray(sizePricingData) ? sizePricingData : [];
      }
    } catch (error) {
      console.error('Error parsing JSON data for package:', packageId, error);
      // Default to empty arrays if JSON parsing fails
    }

    // Get supported pet types only if legacy schema exists; otherwise fallback to []
    let petTypes: any[] = [];
    try {
      if (await hasServiceTypesProviderSchema()) {
        petTypes = (await query(
          `SELECT pet_type FROM service_types WHERE provider_id = ? AND is_active = 1`,
          [pkg.provider_id]
        )) as any[];
      }
    } catch {
      petTypes = [];
    }

    return NextResponse.json({
      package: {
        id: pkg.package_id,
        name: pkg.name,
        description: pkg.description,
        category: pkg.category,
        cremationType: pkg.cremation_type,
        processingTime: pkg.processing_time,
        price: Number(pkg.price),
        pricingMode: pkg.pricing_mode === 'by_size' ? 'by_size' : 'fixed',
        overageFeePerKg: Number(pkg.overage_fee_per_kg || 0),
        deliveryFeePerKm: Number(pkg.delivery_fee_per_km),
        conditions: pkg.conditions,
        isActive: Boolean(pkg.is_active),
        providerId: Number(pkg.provider_id),
        providerName: pkg.providerName,
        inclusions: inclusions.map((i) => i.description || i.name || i),
        addOns: addOns,
        images: images
          .map((entry) => {
            // Direct base64 string
            if (typeof entry === 'string') {
              if (entry.startsWith('data:image/')) return entry;
              const path = entry;
              if (!path || path.startsWith('blob:')) return null;
              if (path.startsWith('http')) return path;
              if (path.startsWith('/api/image/')) return path;
              if (path.startsWith('/uploads/packages/')) return `/api/image/packages/${path.substring('/uploads/packages/'.length)}`;
              if (path.startsWith('uploads/packages/')) return `/api/image/packages/${path.substring('uploads/packages/'.length)}`;
              if (path.includes('packages/')) {
                const parts = path.split('packages/');
                if (parts.length > 1) return `/api/image/packages/${parts[1]}`;
              }
              return getImagePath(path);
            }

            // Object forms
            if (entry && typeof entry === 'object') {
              const dataUrl: string | undefined = (entry as any).image_data || (entry as any).data;
              if (dataUrl && dataUrl.startsWith('data:image/')) return dataUrl;
              const rawPath: string | undefined = (entry as any).image_path || (entry as any).url || (entry as any).path || (entry as any).src || (entry as any).filename;
              if (!rawPath) return null;
              const path = String(rawPath);
              if (path.startsWith('http')) return path;
              if (path.startsWith('/api/image/')) return path;
              if (path.startsWith('/uploads/packages/')) return `/api/image/packages/${path.substring('/uploads/packages/'.length)}`;
              if (path.startsWith('uploads/packages/')) return `/api/image/packages/${path.substring('uploads/packages/'.length)}`;
              if (path.includes('packages/')) {
                const parts = path.split('packages/');
                if (parts.length > 1) return `/api/image/packages/${parts[1]}`;
              }
              return getImagePath(path);
            }

            return null;
          })
          .filter(Boolean),
        // New enhanced features
        sizePricing: sizePricing.map((sp) => ({
          sizeCategory: sp.pet_size || sp.size_category,
          weightRangeMin: sp.weight_range_min || 0,
          weightRangeMax: sp.weight_range_max || 999,
          price: Number(sp.price || 0)
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
               price=?, delivery_fee_per_km=?, conditions=?,
               pricing_mode=?, overage_fee_per_kg=?
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
            body.pricingMode === 'by_size' ? 'by_size' : 'fixed',
            Number(body.overageFeePerKg) || 0,
            packageId
          ]
        ) as any;
        // Update size pricing as JSON
        let sizePricingJson = null;
        if (Array.isArray(body.sizePricing) && body.sizePricing.length > 0) {
          const normalizeSizeCategory = (val: string): string => {
            const v = (val || '').toLowerCase();
            if (v.includes('extra')) return 'extra_large';
            if (v.includes('large')) return 'large';
            if (v.includes('medium')) return 'medium';
            if (v.includes('small')) return 'small';
            return v as any;
          };
          
          const sizePricingData = body.sizePricing
            .filter((sp: any) => sp && sp.sizeCategory && !isNaN(Number(sp.price)))
            .map((sp: any) => ({
              sizeCategory: normalizeSizeCategory(String(sp.sizeCategory || '').trim()),
              weightRangeMin: Number(sp.weightRangeMin),
              weightRangeMax: sp.weightRangeMax == null ? null : Number(sp.weightRangeMax),
              price: Number(sp.price)
            }));
          
          if (sizePricingData.length > 0) {
            sizePricingJson = JSON.stringify(sizePricingData);
          }
        }

        // Update size pricing in the JSON column
        await transaction.query(
          'UPDATE service_packages SET size_pricing = ? WHERE package_id = ?',
          [sizePricingJson, packageId]
        );

        if (updateResult.affectedRows === 0) {
          throw new Error('Package not found or no changes made');
        }

        // Upsert supported pet types for this provider if provided
        if (Array.isArray(body.supportedPetTypes) && (await hasServiceTypesProviderSchema())) {
          // Deactivate all existing pet types
          await transaction.query(
            'UPDATE service_types SET is_active = 0 WHERE provider_id = ?',
            [providerId]
          );

          for (const petType of body.supportedPetTypes) {
            if (!petType || typeof petType !== 'string') continue;
            try {
              await transaction.query(
                'INSERT INTO service_types (provider_id, pet_type, is_active) VALUES (?, ?, 1)',
                [providerId, petType]
              );
            } catch {
              await transaction.query(
                'UPDATE service_types SET is_active = 1 WHERE provider_id = ? AND pet_type = ?',
                [providerId, petType]
              );
            }
          }
        }

        // Update inclusions as JSON
        const inclusionsData = body.inclusions && Array.isArray(body.inclusions)
          ? body.inclusions.filter((inc: any) => inc && inc.trim()).map((inc: any) => inc.trim())
          : [];

        // Update add-ons as JSON
        const addonsData = body.addOns && Array.isArray(body.addOns)
          ? body.addOns.filter((addon: any) => addon && addon.name && addon.name.trim()).map((addon: any) => ({
              name: addon.name.trim(),
              description: addon.name.trim(),
              price: Number(addon.price) || 0
            }))
          : [];

        // Update JSON columns
        await transaction.query(
          'UPDATE service_packages SET inclusions = ?, addons = ? WHERE package_id = ?',
          [JSON.stringify(inclusionsData), JSON.stringify(addonsData), packageId]
        );

        // Handle image updates
        let filesToDelete: string[] = [];
        if (body.images && Array.isArray(body.images)) {
          // Normalize incoming image paths so comparisons match DB-stored paths
          const normalizePath = (p: string): string => {
            if (!p) return p;
            // Keep base64 data URLs as-is
            if (p.startsWith('data:image/')) return p;
            // Convert API image routes back to underlying uploads path expected in DB
            if (p.startsWith('/api/image/packages/')) {
              return `/uploads/packages/${p.substring('/api/image/packages/'.length)}`;
            }
            if (p.startsWith('api/image/packages/')) {
              return `/uploads/packages/${p.substring('api/image/packages/'.length)}`;
            }
            // Ensure uploads path always starts with leading slash
            if (p.startsWith('uploads/')) return `/${p}`;
            // Leave other absolute URLs or other API paths untouched
            return p;
          };
          // Get current images from database JSON column
          const currentImagesResult = await transaction.query(
            'SELECT images FROM service_packages WHERE package_id = ?',
            [packageId]
          ) as any[];
          
          let currentImagePaths: string[] = [];
          if (currentImagesResult.length > 0 && currentImagesResult[0].images) {
            try {
              const imageData = typeof currentImagesResult[0].images === 'string' 
                ? JSON.parse(currentImagesResult[0].images) 
                : currentImagesResult[0].images;
              currentImagePaths = Array.isArray(imageData) ? imageData : [];
            } catch {
              currentImagePaths = [];
            }
          }
          
          const newImagePaths = body.images.map((p: string) => normalizePath(p));

          // Find images to remove (in current but not in new)
          const imagesToRemove = currentImagePaths.filter((path: string) => !newImagePaths.includes(path));
          
          // Store files to delete for later (after transaction commits)
          filesToDelete = imagesToRemove.slice();
          
          // Update the entire images JSON column with new image array
          await transaction.query(
            'UPDATE service_packages SET images = ? WHERE package_id = ?',
            [JSON.stringify(newImagePaths), packageId]
          );
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
