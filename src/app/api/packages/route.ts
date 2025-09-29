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

    // Optimized query using composite index (provider_id, created_at) for better performance
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
      ORDER BY ${providerId ? 'provider_id, created_at DESC' : 'created_at DESC'}
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

      // Helper function to validate and process images
      const validateAndProcessImage = (img: any, packageId: number): string | null => {
        // Skip null/undefined
        if (!img) return null;
        
        let imagePath: string | null = null;
        
        if (typeof img === 'string') {
          // Skip corrupted data
          if (img.includes('[object') || img.trim() === '' || img === 'null' || img === 'undefined' || img.length < 3) {
            console.warn(`Package ${packageId} has corrupted image string: ${img.substring(0, 50)}...`);
            return null;
          }
          
          // Skip extremely long base64 strings that break Next.js optimization
          // Reduced size limit for better performance on services list view
          const MAX_IMAGE_SIZE = 1000000; // 1MB in characters for better performance
          if (img.startsWith('data:image/') && img.length > MAX_IMAGE_SIZE) {
            console.warn(`Package ${packageId} has oversized base64 image (${img.length} chars), skipping`);
            return null;
          }
          
          imagePath = img;
        } else if (typeof img === 'object') {
          const rawPath = img.url || img.path || img.src || null;
          const dataUrl = img.data || null;
          
          if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
            // Skip extremely long base64 strings - use same limit as above
            const MAX_IMAGE_SIZE = 1000000; // 1MB in characters for better performance
            if (dataUrl.length > MAX_IMAGE_SIZE) {
              console.warn(`Package ${packageId} has oversized base64 image (${dataUrl.length} chars), skipping`);
              return null;
            }
            imagePath = dataUrl;
          } else if (rawPath && typeof rawPath === 'string') {
            // Skip corrupted data
            if (rawPath.includes('[object') || rawPath.trim() === '' || rawPath === 'null' || rawPath === 'undefined' || rawPath.length < 3) {
              console.warn(`Package ${packageId} has corrupted image path: ${rawPath.substring(0, 50)}...`);
              return null;
            }
            imagePath = rawPath;
          }
        }
        
        if (!imagePath) return null;
        
        // Convert to proper API path
        if (imagePath.startsWith('data:image/') || imagePath.startsWith('http')) {
          return imagePath;
        }
        
        if (imagePath.startsWith('/api/image/')) {
          return imagePath;
        }
        
        if (imagePath.includes('packages/')) {
          const parts = imagePath.split('packages/');
          return parts.length > 1 ? `/api/image/packages/${parts[1]}` : null;
        }
        
        if (imagePath.startsWith('/uploads/')) {
          return `/api/image/${imagePath.substring('/uploads/'.length)}`;
        }
        
        if (imagePath.startsWith('uploads/')) {
          return `/api/image/${imagePath.substring('uploads/'.length)}`;
        }
        
        return null;
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
                try {
                  images = JSON.parse(row.images);
                  if (!Array.isArray(images)) {
                    images = [];
                  }
                } catch (parseError) {
                  console.warn(`Failed to parse images JSON for package ${id}:`, parseError);
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
          const validImage = validateAndProcessImage(img, id);
          if (validImage) {
            resolvedImages.push(validImage);
          }
        }

        if (resolvedImages.length > 0) {
          acc[id] = resolvedImages;
        } else {
          // If we had base64 images but skipped due to size or validation, expose via streaming endpoint
          const hadBase64 = Array.isArray(images) && images.some((im: any) => typeof im === 'string' && im.startsWith('data:image/'));
          if (hadBase64) {
            acc[id] = [`/api/image/packages/package_${id}_0.png`];
            console.log(`Package ${id} exposing base64 via streaming endpoint /api/image/packages/package_${id}_0.png`);
          } else {
            // If no valid images found, try to find filesystem images as fallback
            console.log(`Package ${id} has no valid images, checking filesystem fallback...`);
          }
        }
        return acc;
      }, {});
    }

    // Database fallback from package_data (convert base64 rows to streaming URLs)
    try {
      const tableExistsRows = (await query(
        `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'package_data'`
      )) as Array<{ cnt: number }>;
      const hasPackageData = Array.isArray(tableExistsRows) && Number(tableExistsRows[0]?.cnt || 0) > 0;
      if (hasPackageData) {
        for (const pkgId of packageIds) {
          if (!imagesByPackage[pkgId] || imagesByPackage[pkgId].length === 0) {
            const dbImgs = (await query(
              `SELECT id, image_data FROM package_data WHERE package_id = ? ORDER BY display_order ASC LIMIT 12`,
              [pkgId]
            )) as Array<{ id: number; image_data: string | null }>;
            const ids = dbImgs
              .filter(r => typeof r.image_data === 'string' && r.image_data.startsWith('data:image/'))
              .map(r => r.id);
            if (ids.length > 0) {
              imagesByPackage[pkgId] = ids.map((imgId) => `/api/image/package-data/${imgId}`);
              console.log(`Package ${pkgId} using ${ids.length} images from package_data via streaming endpoints`);
            }
          }
        }
      } else {
        console.log('package_data table not found; skipping DB image fallback');
      }
    } catch (dbErr) {
      console.warn('package_data fallback failed:', dbErr);
    }

    // Filesystem fallback for packages with no valid images
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      for (const pkg of rows) {
        if (!imagesByPackage[pkg.id] || imagesByPackage[pkg.id].length === 0) {
          const packagesDir = path.join(process.cwd(), 'public', 'uploads', 'packages');
          
          if (fs.existsSync(packagesDir)) {
            const files = fs.readdirSync(packagesDir, { recursive: true });
            const packageFiles = files.filter((file: any) => 
              typeof file === 'string' && 
              file.includes(`package_${pkg.id}_`) && 
              file.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            ) as string[];
            
            if (packageFiles.length > 0) {
              const fallbackImages = packageFiles.map((file: string) => 
                `/api/image/packages/${file}`
              );
              imagesByPackage[pkg.id] = fallbackImages;
              console.log(`Package ${pkg.id} using filesystem fallback images:`, fallbackImages);
            }
          }
        }
      }
    } catch (fsError) {
      console.warn('Filesystem fallback failed:', fsError);
    }

    // Return packages with enriched images and parsed JSON fields
    const packages = rows.map((p: any) => {
      // Parse JSON fields safely
      let inclusions: string[] = [];
      let addOns: any[] = [];
      let sizePricing: any[] = [];
      
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
      
      // Parse sizePricing JSON field
      try {
        if (p.sizePricing) {
          if (typeof p.sizePricing === 'string') {
            // Handle corrupted [object Object] data
            if (p.sizePricing.includes('[object Object]')) {
              console.warn(`Corrupted sizePricing data for package ${p.id}, defaulting to empty array`);
              sizePricing = [];
            } else {
              sizePricing = JSON.parse(p.sizePricing);
            }
          } else {
            sizePricing = p.sizePricing;
          }
          
          if (!Array.isArray(sizePricing)) sizePricing = [];
          
          // Ensure all sizePricing entries have proper structure
          sizePricing = sizePricing.map((sp: any) => ({
            sizeCategory: sp.sizeCategory || sp.pet_size || sp.size_category || 'unknown',
            weightRangeMin: Number(sp.weightRangeMin || sp.weight_range_min || 0),
            weightRangeMax: sp.weightRangeMax !== undefined ? Number(sp.weightRangeMax) : (sp.weight_range_max !== undefined ? Number(sp.weight_range_max) : null),
            price: Number(sp.price || 0)
          })).filter((sp: any) => sp.sizeCategory && !isNaN(sp.price));
        }
      } catch (e) {
        console.warn(`Failed to parse sizePricing for package ${p.id}:`, e);
        sizePricing = [];
      }
      
      // Use fallback image if no images found
      let finalImages = imagesByPackage[p.id] || [];
      if (finalImages.length === 0) {
        finalImages = ['/placeholder-pet.png'];
        console.log(`Package ${p.id} using ultimate fallback image: placeholder-pet.png`);
      }

      return {
        ...p,
        inclusions,
        addOns,
        images: finalImages,
        sizePricing,
        supportedPetTypes: p.supported_pet_types || []
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
      sizePricing,
      conditions = '',
      inclusions = [],
      addOns = [],
      images = [],
      supportedPetTypes = []
    } = body || {};

    if (!name || !description || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await withTransaction(async (transaction) => {
      // Insert the core package record including optional fields supported by schema
      let pkgRes: any;
      try {
        // Try to insert with supported_pet_types column first
        try {
          pkgRes = (await transaction.query(
            `
            INSERT INTO service_packages
              (provider_id, name, description, category, cremation_type,
               processing_time, price, delivery_fee_per_km, conditions, is_active,
               pricing_mode, overage_fee_per_kg, inclusions, addons, images, size_pricing, supported_pet_types)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?)
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
              Number(overageFeePerKg) || 0,
              JSON.stringify(inclusions || []),
              JSON.stringify(addOns || []),
              JSON.stringify(images || []),
              JSON.stringify(sizePricing || []),
              JSON.stringify(supportedPetTypes)
            ]
          )) as any;
        } catch (columnError: any) {
          // If supported_pet_types column doesn't exist, fall back to old schema
          if (columnError.code === 'ER_BAD_FIELD_ERROR' && columnError.message.includes('supported_pet_types')) {
            console.warn('supported_pet_types column not found, falling back to old schema');
            pkgRes = (await transaction.query(
              `
              INSERT INTO service_packages
                (provider_id, name, description, category, cremation_type,
                 processing_time, price, delivery_fee_per_km, conditions, is_active,
                 pricing_mode, overage_fee_per_kg, inclusions, addons, images, size_pricing)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?)
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
                Number(overageFeePerKg) || 0,
                JSON.stringify(inclusions || []),
                JSON.stringify(addOns || []),
                JSON.stringify(images || []),
                JSON.stringify(sizePricing || [])
              ]
            )) as any;
          } else {
            throw columnError; // Re-throw if it's a different error
          }
        }
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

      // Store size-based pricing in JSON column if provided
      if (sizePricing && Array.isArray(sizePricing) && sizePricing.length > 0) {
        const normalizeSizeCategory = (val: string): string => {
          const v = (val || '').toLowerCase();
          if (v.includes('extra')) return 'extra_large';
          if (v.includes('large')) return 'large';
          if (v.includes('medium')) return 'medium';
          if (v.includes('small')) return 'small';
          return v as any;
        };

        const processedSizePricing = sizePricing
          .filter(sp => sp && sp.sizeCategory && sp.price != null)
          .map(sp => ({
            sizeCategory: normalizeSizeCategory(String(sp.sizeCategory || '').trim()),
            weightRangeMin: Number(sp.weightRangeMin) || 0,
            weightRangeMax: sp.weightRangeMax != null ? Number(sp.weightRangeMax) : null,
            price: Number(sp.price)
          }))
          .filter(sp => sp.sizeCategory && !isNaN(sp.price));

        if (processedSizePricing.length > 0) {
          try {
            await transaction.query(
              `UPDATE service_packages 
               SET size_pricing = ? 
               WHERE package_id = ?`,
              [JSON.stringify(processedSizePricing), packageId]
            );
          } catch (e: any) {
            console.error('Failed to store size pricing in JSON column:', e);
            // Continue without size pricing if JSON column doesn't exist
          }
        }
      }

      // Inclusions and add-ons are now stored in JSON columns during the main INSERT
      // No separate insertion needed

      // Images are now stored in JSON column during the main INSERT
      // No separate insertion needed - images are already processed and stored in the JSON column


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
      supportedPetTypes: pkg.supported_pet_types || []
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
