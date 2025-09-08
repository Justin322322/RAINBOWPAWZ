import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getAuthTokenFromRequest, parseAuthToken } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const packageIdParam = url.searchParams.get('packageId');
    const providerId = url.searchParams.get('providerId');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1);
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '10') || 10));
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
      if (isNaN(providerIdInt)) {
        return NextResponse.json(
          { error: 'Invalid provider ID format' },
          { status: 400 }
        );
      }
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

    // Simple query to get packages - inline LIMIT/OFFSET to avoid prepared statement issues
    const limitInt = Math.max(1, Math.min(100, parseInt(String(limit)) || 10));
    const offsetInt = Math.max(0, parseInt(String(offset)) || 0);

    const mainQuery = `
      SELECT
        package_id as id,
        name,
        description,
        category,
        cremation_type AS cremationType,
        processing_time AS processingTime,
        price,
        pricing_mode AS pricingMode,
        delivery_fee_per_km AS deliveryFeePerKm,
        overage_fee_per_kg AS overageFeePerKg,
        conditions,
        is_active AS isActive,
        provider_id AS providerId,
        inclusions,
        addons,
        images,
        size_pricing AS sizePricing,
        created_at,
        updated_at
      FROM service_packages
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${Number(limitInt)} OFFSET ${Number(offsetInt)}
    `;

    // Only include WHERE clause parameters in the prepared statement, not pagination
    const finalQueryParams = queryParams.map(param => {
      // Convert provider_id to proper integer type if it's a string
      if (typeof param === 'number') return param;
      if (typeof param === 'string') {
        const num = parseInt(param);
        return isNaN(num) ? param : num;
      }
      return param;
    });

    console.log('Main query:', mainQuery);
    console.log('Final query params:', finalQueryParams);

    let rows: any[];
    try {
      rows = (await query(mainQuery, finalQueryParams)) as any[];
      console.log('Query executed successfully, rows returned:', rows.length);
    } catch (queryError) {
      console.error('Database query failed:', queryError);
      console.error('Query:', mainQuery);
      console.error('Parameters:', finalQueryParams);
      throw new Error(`Database query failed: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`);
    }

    // Simple count query
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM service_packages
      ${whereClause}
    `;
    let countRows: any[];
    try {
      countRows = (await query(countQuery, queryParams)) as any[];
      console.log('Count query executed successfully');
    } catch (countError) {
      console.error('Count query failed:', countError);
      console.error('Count query:', countQuery);
      console.error('Count parameters:', queryParams);
      throw new Error(`Count query failed: ${countError instanceof Error ? countError.message : 'Unknown error'}`);
    }
    const total = +(countRows[0]?.total || 0);
    console.log('Count query executed, total:', total);

    // If no packages, return empty result
    if (!rows || rows.length === 0) {
      console.log('No packages found, returning empty result');
      console.log('Provider ID:', providerId, 'WHERE clause:', whereClause, 'Query params:', finalQueryParams);
      return NextResponse.json({
        packages: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    // Collect package ids for enrichment
    const packageIds = rows.map((p: any) => p.id);

    // Fetch images for all packages from the JSON column
    let imagesByPackage: Record<number, string[]> = {};
    if (packageIds.length > 0) {
      const placeholders = packageIds.map(() => '?').join(',');
      const imagesRows = (await query(
        `SELECT package_id as packageId, images
         FROM service_packages 
         WHERE package_id IN (${placeholders})
         AND images IS NOT NULL`,
        packageIds
      )) as any[];

      // Optimized image processing with pre-computed path mappings
      const pathMappings = {
        '/api/image/': (path: string) => path,
        '/uploads/': (path: string) => `/api/image/${path.substring('/uploads/'.length)}`,
        'uploads/': (path: string) => `/api/image/${path.substring('uploads/'.length)}`,
        'packages/': (path: string) => {
          const parts = path.split('packages/');
          return parts.length > 1 ? `/api/image/packages/${parts[1]}` : path;
        }
      };

      imagesByPackage = imagesRows.reduce((acc: Record<number, string[]>, row: any) => {
        const id = Number(row.packageId);
        let images: any[] = [];
        
        // Parse JSON images column
        try {
          if (row.images) {
            // Handle corrupted "[object Object]" strings
            if (typeof row.images === 'string') {
              if (row.images.trim().startsWith('[object Object]')) {
                console.warn(`Package ${id} has corrupted images data: ${row.images.substring(0, 50)}...`);
                images = [];
              } else {
                images = JSON.parse(row.images);
                if (!Array.isArray(images)) {
                  images = [];
                }
              }
            } else if (Array.isArray(row.images)) {
              images = row.images;
            } else {
              images = [];
            }
          }
        } catch (e) {
          console.warn(`Failed to parse images JSON for package ${id}:`, e);
          images = [];
        }

        const resolvedImages: string[] = [];
        
        for (const img of images) {
          let resolved: string | null = null;
          
          if (typeof img === 'string') {
            // Direct image path/URL
            resolved = img;
          } else if (img && typeof img === 'object') {
            // Image object with url/path property
            const rawPath = img.url || img.path || img.src || null;
            const dataUrl = img.data || null;
            
            // Fast path for base64 data URLs
            if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
              resolved = dataUrl;
            } else if (rawPath && typeof rawPath === 'string') {
              resolved = rawPath;
            }
          }
          
          if (resolved) {
            // Apply path mappings
            for (const [prefix, mapper] of Object.entries(pathMappings)) {
              if (resolved.startsWith(prefix)) {
                resolved = mapper(resolved);
                break;
              }
            }
            
            // Fallback for paths that don't match known patterns
            if (resolved && !resolved.startsWith('http') && !resolved.startsWith('data:') && !resolved.startsWith('/api/')) {
              if (resolved.includes('packages/')) {
                resolved = pathMappings['packages/'](resolved);
              }
            }
            
            resolvedImages.push(resolved);
          }
        }

        if (resolvedImages.length > 0) {
          acc[id] = resolvedImages;
        }
        return acc;
      }, {});
    }

    // Return packages with enriched images and parsed JSON fields
    const packages = rows.map((p: any) => {
      // Parse JSON fields safely
      let inclusions: string[] = [];
      let addOns: any[] = [];
      
      try {
        if (p.inclusions) {
          if (typeof p.inclusions === 'string') {
            // Handle corrupted [object Object] data
            if (p.inclusions.includes('[object Object]')) {
              console.warn(`Corrupted inclusions data for package ${p.id}, defaulting to empty array`);
              inclusions = [];
            } else {
              inclusions = JSON.parse(p.inclusions);
            }
          } else {
            inclusions = p.inclusions;
          }
          
          if (!Array.isArray(inclusions)) inclusions = [];
          
          // Ensure all inclusions are strings, not objects
          inclusions = inclusions.map((inc: any) => {
            if (typeof inc === 'string') return inc;
            if (inc && typeof inc === 'object') {
              return inc.description || inc.name || String(inc);
            }
            return String(inc);
          }).filter(Boolean);
        }
      } catch (e) {
        console.warn(`Failed to parse inclusions for package ${p.id}:`, e);
        inclusions = [];
      }
      
      try {
        if (p.addons) {
          if (typeof p.addons === 'string') {
            // Handle corrupted [object Object] data
            if (p.addons.includes('[object Object]')) {
              console.warn(`Corrupted addons data for package ${p.id}, defaulting to empty array`);
              addOns = [];
            } else {
              addOns = JSON.parse(p.addons);
            }
          } else {
            addOns = p.addons;
          }
          
          if (!Array.isArray(addOns)) addOns = [];
          
          // Ensure all addOns have proper structure
          addOns = addOns.map((addon: any) => {
            if (typeof addon === 'string') {
              return { name: addon, price: 0, description: addon };
            }
            if (addon && typeof addon === 'object') {
              return {
                name: addon.name || addon.description || String(addon),
                price: Number(addon.price || 0),
                description: addon.description || addon.name || String(addon)
              };
            }
            return { name: String(addon), price: 0, description: String(addon) };
          }).filter((addon: any) => addon.name);
        }
      } catch (e) {
        console.warn(`Failed to parse addons for package ${p.id}:`, e);
        addOns = [];
      }
      
      return {
        ...p,
        inclusions,
        addOns,
        images: imagesByPackage[p.id] || [],
        supportedPetTypes: []
      };
    });

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
      let pkgRes: any;
      try {
        pkgRes = (await transaction.query(
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
      } catch (e: any) {
        // Fallback for older schemas without new columns
        const msg = e?.message || '';
        if (msg.includes('ER_BAD_FIELD_ERROR')) {
          pkgRes = (await transaction.query(
            `
            INSERT INTO service_packages
              (provider_id, name, description, category, cremation_type,
               processing_time, price, conditions, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
            `,
            [
              providerId,
              name,
              description,
              category,
              cremationType,
              processingTime,
              Number(price),
              conditions
            ]
          )) as any;
        } else {
          throw e;
        }
      }
      const packageId = pkgRes.insertId as number;

      // Insert size-based pricing if provided
      const normalizeSizeCategory = (val: string): string => {
        const v = (val || '').toLowerCase();
        if (v.includes('extra')) return 'extra_large';
        if (v.includes('large')) return 'large';
        if (v.includes('medium')) return 'medium';
        if (v.includes('small')) return 'small';
        return v as any;
      };
      if (Array.isArray(sizePricing) && sizePricing.length > 0) {
        for (const sp of sizePricing) {
          if (!sp) continue;
          const sizeCategory = normalizeSizeCategory(String(sp.sizeCategory || '').trim());
          const min = Number(sp.weightRangeMin);
          const max = sp.weightRangeMax == null ? null : Number(sp.weightRangeMax);
          const p = Number(sp.price);
          if (!sizeCategory || isNaN(min) || isNaN(p)) continue;
          try {
            await transaction.query(
              `INSERT INTO service_packages
                (package_id, size_category, weight_range_min, weight_range_max, price)
               VALUES (?, ?, ?, ?, ?)`,
              [packageId, sizeCategory, min, max, p]
            );
          } catch (e: any) {
            if (e?.message?.includes('ER_NO_SUCH_TABLE') || e?.message?.includes('ER_BAD_FIELD_ERROR')) {
              // Silently skip if table/columns not present
            } else {
              throw e;
            }
          }
        }
      }

      // Insert inclusions
      if (Array.isArray(inclusions) && inclusions.length > 0) {
        for (const inc of inclusions) {
          if (inc && typeof inc === 'string' && inc.trim()) {
            await transaction.query(
              'INSERT INTO package_data (package_id, description) VALUES (?, ?)',
              [packageId, inc.trim()]
            );
          }
        }
      }

      // Insert add-ons
      if (Array.isArray(addOns) && addOns.length > 0) {
        for (const addon of addOns) {
          if (addon && addon.name && addon.name.trim()) {
            // Note: Add-ons should now be stored as JSON in service_packages table
            // This legacy code needs to be replaced with JSON storage approach
            console.warn('Legacy add-on storage method - should use JSON columns instead');
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
              'INSERT INTO package_data (package_id, image_path, display_order, image_data) VALUES (?, ?, ?, ?)',
              [packageId, `package_${packageId}_${Date.now()}_${i}.jpg`, i + 1, img]
            );
          } else {
            const path = normalizePath(img);
            await transaction.query(
              'INSERT INTO package_data (package_id, image_path, display_order) VALUES (?, ?, ?)',
              [packageId, path, i + 1]
            );
          }
        }
      }

      // Upsert supported pet types for this provider if provided
      if (Array.isArray(body.supportedPetTypes)) {
        // Deactivate all existing pet types
        await transaction.query(
          'UPDATE service_types SET is_active = 0 WHERE provider_id = ?',
          [providerId]
        );

        for (const petType of body.supportedPetTypes) {
          if (!petType || typeof petType !== 'string') continue;
          // Try to insert; if duplicate, update is_active
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
