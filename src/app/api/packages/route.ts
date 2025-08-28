import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getAuthTokenFromRequest, parseAuthToken } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const packageIdParam = url.searchParams.get('packageId');
    const providerId = url.searchParams.get('providerId');
    const page = +url.searchParams.get('page')! || 1;
    const limit = +url.searchParams.get('limit')! || 10;
    const offset = (page - 1) * limit;
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    console.log('Packages API called with:', { packageIdParam, providerId, page, limit, includeInactive });

    if (packageIdParam) {
      return getPackageById(+packageIdParam, providerId || undefined);
    }

    // Simple query to get packages without complex joins initially
    let whereClause = '';
    const queryParams: any[] = [];

    if (providerId) {
      const providerIdInt = parseInt(providerId);
      whereClause = 'WHERE provider_id = ?';
      queryParams.push(providerIdInt);
      if (!includeInactive) {
        whereClause += ' AND is_active = 1';
      }
    } else if (!includeInactive) {
      whereClause = 'WHERE is_active = 1';
    }

    console.log('Executing simple query with WHERE clause:', whereClause);
    console.log('Query parameters:', queryParams);

    // Simple query to get packages (inline numeric LIMIT/OFFSET to avoid prepared stmt issues)
    const mainQuery = `
      SELECT
        package_id as id,
        name,
        description,
        category,
        cremation_type AS cremationType,
        processing_time AS processingTime,
        price,
        conditions,
        is_active AS isActive,
        provider_id AS providerId
      FROM service_packages
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    
    console.log('Main query:', mainQuery);
    console.log('Final query params:', [...queryParams]);
    
    const rows = (await query(mainQuery, [...queryParams])) as any[];
    console.log('Query executed successfully, rows returned:', rows.length);

    // Simple count query
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM service_packages
      ${whereClause}
    `;
    const countRows = (await query(countQuery, queryParams)) as any[];
    const total = +(countRows[0]?.total || 0);
    console.log('Count query executed, total:', total);

    // If no packages, return empty result
    if (!rows || rows.length === 0) {
      console.log('No packages found, returning empty result');
      return NextResponse.json({
        packages: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    // Collect package ids for enrichment
    const packageIds = rows.map((p: any) => p.id);

    // Fetch images for all packages in one query
    let imagesByPackage: Record<number, string[]> = {};
    if (packageIds.length > 0) {
      const placeholders = packageIds.map(() => '?').join(',');
      const imagesRows = (await query(
        `SELECT package_id as packageId, image_path, image_data
         FROM package_images
         WHERE package_id IN (${placeholders})
         ORDER BY display_order`,
        packageIds
      )) as any[];

      imagesByPackage = imagesRows.reduce((acc: Record<number, string[]>, row: any) => {
        const id = Number(row.packageId);
        const rawPath: string | null = row.image_path || null;
        const dataUrl: string | null = row.image_data || null;
        let resolved: string | null = null;

        if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
          resolved = dataUrl; // use base64 directly
        } else if (rawPath && typeof rawPath === 'string') {
          // Normalize to API route
          let path = rawPath;
          if (path.startsWith('/api/image/')) {
            resolved = path;
          } else if (path.startsWith('/uploads/')) {
            resolved = `/api/image/${path.substring('/uploads/'.length)}`;
          } else if (path.startsWith('uploads/')) {
            resolved = `/api/image/${path.substring('uploads/'.length)}`;
          } else if (path.includes('packages/')) {
            const parts = path.split('packages/');
            resolved = parts.length > 1 ? `/api/image/packages/${parts[1]}` : path;
          } else {
            resolved = path;
          }
        }

        if (resolved) {
          if (!acc[id]) acc[id] = [];
          acc[id].push(resolved);
        }
        return acc;
      }, {});
    }

    // Return packages with enriched images (leave inclusions/addOns empty for list performance)
    const packages = rows.map((p: any) => ({
      ...p,
      inclusions: [],
      addOns: [],
      images: imagesByPackage[p.id] || [],
      supportedPetTypes: []
    }));

    console.log('Packages processed successfully, returning', packages.length, 'packages');

    return NextResponse.json({
      packages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('Error in packages GET endpoint:', err);
    console.error('Error stack:', (err as Error).stack);
    return NextResponse.json(
      { error: 'Failed to fetch packages', details: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'Only business accounts can create packages' },
        { status: 403 }
      );
    }

    const prov = (await query(
      'SELECT provider_id as id FROM service_providers WHERE user_id = ?',
      [userId]
    )) as any[];
    if (prov.length === 0) {
      return NextResponse.json({ error: 'Service provider not found' }, { status: 404 });
    }
    const providerId = prov[0].id;

    const body = await request.json();
    const {
      name,
      description,
      category,
      cremationType,
      processingTime,
      price,
      deliveryFeePerKm = 0,
      pricingMode = 'fixed',
      overageFeePerKg = 0,
      sizePricing = [],
      conditions = '',
      inclusions = [],
      addOns = [],
      images = []
    } = body || {};

    if (!name || !description || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await withTransaction(async (transaction) => {
      // Insert the core package record including optional fields supported by schema
      const pkgRes = (await transaction.query(
        `
        INSERT INTO service_packages
          (provider_id, name, description, category, cremation_type,
           processing_time, price, delivery_fee_per_km, conditions, is_active,
           pricing_mode, overage_fee_per_kg)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)
        `,
        [
          providerId,
          name,
          description,
          category,
          cremationType,
          processingTime,
          Number(price),
          Number(deliveryFeePerKm) || 0,
          conditions,
          pricingMode === 'by_size' ? 'by_size' : 'fixed',
          Number(overageFeePerKg) || 0
        ]
      )) as any;
      const packageId = pkgRes.insertId as number;

      // Insert size-based pricing if provided
      if (Array.isArray(sizePricing) && sizePricing.length > 0) {
        for (const sp of sizePricing) {
          if (!sp) continue;
          const sizeCategory = String(sp.sizeCategory || '').trim();
          const min = Number(sp.weightRangeMin);
          const max = sp.weightRangeMax == null ? null : Number(sp.weightRangeMax);
          const p = Number(sp.price);
          if (!sizeCategory || isNaN(min) || isNaN(p)) continue;
          await transaction.query(
            `INSERT INTO package_size_pricing
              (package_id, size_category, weight_range_min, weight_range_max, price)
             VALUES (?, ?, ?, ?, ?)`,
            [packageId, sizeCategory, min, max, p]
          );
        }
      }

      // Insert inclusions
      if (Array.isArray(inclusions) && inclusions.length > 0) {
        for (const inc of inclusions) {
          if (inc && typeof inc === 'string' && inc.trim()) {
            await transaction.query(
              'INSERT INTO package_inclusions (package_id, description) VALUES (?, ?)',
              [packageId, inc.trim()]
            );
          }
        }
      }

      // Insert add-ons
      if (Array.isArray(addOns) && addOns.length > 0) {
        for (const addon of addOns) {
          if (addon && addon.name && addon.name.trim()) {
            await transaction.query(
              'INSERT INTO package_addons (package_id, description, price) VALUES (?, ?, ?)',
              [packageId, addon.name.trim(), Number(addon.price) || 0]
            );
          }
        }
      }

      // Insert images with proper display order; support base64 or file path
      if (Array.isArray(images) && images.length > 0) {
        const normalizePath = (p: string): string => {
          if (!p) return p;
          if (p.startsWith('data:image/')) return p; // keep base64
          if (p.startsWith('/api/image/packages/')) {
            return `/uploads/packages/${p.substring('/api/image/packages/'.length)}`;
          }
          if (p.startsWith('api/image/packages/')) {
            return `/uploads/packages/${p.substring('api/image/packages/'.length)}`;
          }
          if (p.startsWith('uploads/')) return `/${p}`;
          return p;
        };

        for (let i = 0; i < images.length; i++) {
          const raw = images[i];
          const img = typeof raw === 'string' ? raw : '';
          if (!img) continue;

          if (img.startsWith('data:image/')) {
            await transaction.query(
              'INSERT INTO package_images (package_id, image_path, display_order, image_data) VALUES (?, ?, ?, ?)',
              [packageId, `package_${packageId}_${Date.now()}_${i}.jpg`, i + 1, img]
            );
          } else {
            const path = normalizePath(img);
            await transaction.query(
              'INSERT INTO package_images (package_id, image_path, display_order) VALUES (?, ?, ?)',
              [packageId, path, i + 1]
            );
          }
        }
      }

      // Upsert supported pet types for this provider if provided
      if (Array.isArray(body.supportedPetTypes)) {
        // Deactivate all existing pet types
        await transaction.query(
          'UPDATE business_pet_types SET is_active = 0 WHERE provider_id = ?',
          [providerId]
        );

        for (const petType of body.supportedPetTypes) {
          if (!petType || typeof petType !== 'string') continue;
          // Try to insert; if duplicate, update is_active
          try {
            await transaction.query(
              'INSERT INTO business_pet_types (provider_id, pet_type, is_active) VALUES (?, ?, 1)',
              [providerId, petType]
            );
          } catch {
            await transaction.query(
              'UPDATE business_pet_types SET is_active = 1 WHERE provider_id = ? AND pet_type = ?',
              [providerId, petType]
            );
          }
        }
      }

      return { packageId };
    });

    return NextResponse.json({
      success: true,
      packageId: result.packageId,
      message: 'Package created successfully'
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Failed to create package', details: (err as Error).message },
      { status: 500 }
    );
  }
}

async function getPackageById(packageId: number, providerId?: string): Promise<NextResponse> {
  try {
    // Build the query with optional providerId filter
    let sql = `
      SELECT *
      FROM service_packages
      WHERE package_id = ?
    `;

    const params = [packageId];

    // Add providerId filter if provided
    if (providerId) {
      sql += ` AND provider_id = ?`;
      params.push(parseInt(providerId));
    }

    const rows = (await query(sql, params)) as any[];
    if (!rows.length) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }
    
    const pkg = rows[0];
    // Return basic package data without complex enrichment
    const packageData = {
      ...pkg,
      inclusions: [],
      addOns: [],
      images: [],
      supportedPetTypes: []
    };
    
    return NextResponse.json({ package: packageData });
  } catch (err) {
    console.error('Error in getPackageById:', err);
    return NextResponse.json(
      { error: 'Failed to fetch package', details: (err as Error).message },
      { status: 500 }
    );
  }
}
