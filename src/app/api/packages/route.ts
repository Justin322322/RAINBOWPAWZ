import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getAuthTokenFromRequest, parseAuthToken } from '@/utils/auth';
import * as fs from 'fs';
import { join } from 'path';
import { getImagePath } from '@/utils/imageUtils';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const packageIdParam = url.searchParams.get('packageId');
    const providerId = url.searchParams.get('providerId');
    const page = +url.searchParams.get('page')! || 1;
    const limit = +url.searchParams.get('limit')! || 10;
    const offset = (page - 1) * limit;
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    // SECURITY FIX: Build the WHERE clause safely with parameters
    let whereClause = '';
    const queryParams = [];

    if (providerId) {
      const providerIdInt = parseInt(providerId);
      whereClause = 'WHERE sp.provider_id = ?';
      queryParams.push(providerIdInt);
      if (!includeInactive) {
        whereClause += ' AND sp.is_active = 1';
      }
    } else if (!includeInactive) {
      whereClause = 'WHERE sp.is_active = 1';
    }

    if (packageIdParam) {
      return getPackageById(+packageIdParam, providerId || undefined);
    }

    // SECURITY FIX: Use parameterized query with safe WHERE clause
    const mainQuery = `
      SELECT
        sp.package_id as id,
        sp.name,
        sp.description,
        sp.category,
        sp.cremation_type    AS cremationType,
        sp.processing_time   AS processingTime,
        sp.price,
        sp.conditions,
        sp.is_active         AS isActive,
        svp.provider_id      AS providerId,
        svp.name             AS providerName
      FROM service_packages sp
      JOIN service_providers svp
        ON sp.provider_id = svp.provider_id
      ${whereClause}
      ORDER BY sp.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = (await query(mainQuery, [...queryParams, limit, offset])) as any[];

    // SECURITY FIX: Use parameterized count query
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM service_packages sp
      ${whereClause}
    `;
    const countRows = (await query(countQuery, queryParams)) as any[];
    const total = +(countRows[0]?.total || 0);

    const packages = await enhancePackagesWithDetails(rows);

    return NextResponse.json({
      packages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
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

    const {
      name,
      description,
      category,
      cremationType,
      processingTime,
      price,
      conditions,
      inclusions = [],
      addOns = [],
      images = [],
      // New fields for enhanced features
      pricePerKg = 0,
      deliveryFeePerKm = 0,
      usesCustomOptions = false,
      customCategories = [],
      customCremationTypes = [],
      customProcessingTimes = [],
      supportedPetTypes = [],
    } = await request.json();

    if (!name || !description || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await withTransaction(async (transaction) => {
      const pkgRes = (await transaction.query(
        `
        INSERT INTO service_packages
          (provider_id, name, description, category, cremation_type,
           processing_time, price, price_per_kg, delivery_fee_per_km, conditions, uses_custom_options, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `,
        [providerId, name, description, category, cremationType, processingTime, price, pricePerKg, deliveryFeePerKm, conditions, usesCustomOptions]
      )) as any;
      const packageId = pkgRes.insertId;

      // inclusions
      for (const incDesc of inclusions.filter((x: any) => x)) {
        await transaction.query(
          'INSERT INTO package_inclusions (package_id, description) VALUES (?, ?)',
          [packageId, incDesc]
        );
      }

      // Ensure package_addons table exists
      await transaction.query(`
        CREATE TABLE IF NOT EXISTS package_addons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          addon_id INT,
          package_id INT NOT NULL,
          description TEXT NOT NULL,
          price DECIMAL(10,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_package_id (package_id),
          INDEX idx_addon_id (addon_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      // add-ons
      for (const raw of addOns) {
        let desc: string;
        let cost: number | null = null;

        if (typeof raw === 'string') {
          desc = raw.replace(/\s*\(\+₱[\d,]+\)/, '').trim();
          const m = raw.match(/\(\+₱([\d,]+)\)/);
          cost = m ? +m[1].replace(/,/g, '') : null;
        } else {
          desc = raw.name;
          const num = parseFloat(String(raw.price));
          cost = isNaN(num) ? null : num;
        }
        if (!desc) continue;

        // Check if id column exists in package_addons table
        const idColumnExists = (await transaction.query(
          `
          SELECT COUNT(*) as count
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'package_addons'
            AND COLUMN_NAME = 'id'
          `
        )) as any[];

        const hasIdColumn = idColumnExists[0]?.count > 0;

        if (hasIdColumn) {
          // Check if id column is auto increment
          const colInfo = (await transaction.query(
            `
            SELECT EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'package_addons'
              AND COLUMN_NAME = 'id'
            `
          )) as any[];
          const hasAI = colInfo[0]?.EXTRA.includes('auto_increment');

          if (hasAI) {
            await transaction.query(
              'INSERT INTO package_addons (package_id, description, price) VALUES (?, ?, ?)',
              [packageId, desc, cost]
            );
          } else {
            const maxRow = (await transaction.query(
              'SELECT MAX(id) AS maxId FROM package_addons'
            )) as any[];
            const nextId = (maxRow[0]?.maxId || 0) + 1;
            await transaction.query(
              'INSERT INTO package_addons (id, package_id, description, price) VALUES (?, ?, ?, ?)',
              [nextId, packageId, desc, cost]
            );
          }
        } else {
          // Table doesn't have id column, use addon_id or create without id
          try {
            // Try to get max addon_id if it exists
            const maxRow = (await transaction.query(
              'SELECT MAX(addon_id) AS maxId FROM package_addons'
            )) as any[];
            const nextId = (maxRow[0]?.maxId || 0) + 1;
            await transaction.query(
              'INSERT INTO package_addons (addon_id, package_id, description, price) VALUES (?, ?, ?, ?)',
              [nextId, packageId, desc, cost]
            );
          } catch {
            // If addon_id doesn't exist either, insert without any id
            await transaction.query(
              'INSERT INTO package_addons (package_id, description, price) VALUES (?, ?, ?)',
              [packageId, desc, cost]
            );
          }
        }
      }

      return { packageId };
    });

    // Handle images after transaction commits successfully to maintain atomicity
    // File operations cannot be rolled back, so we do them after DB operations succeed
    if (images.length > 0) {
      try {
        const movedImagePaths = await moveImagesToPackageFolder(images, result.packageId);
        
        // Insert image records using a separate transaction
        await withTransaction(async (transaction) => {
          for (let i = 0; i < movedImagePaths.length; i++) {
            await transaction.query(
              'INSERT INTO package_images (package_id, image_path, display_order) VALUES (?, ?, ?)',
              [result.packageId, movedImagePaths[i], i]
            );
          }
        });
      } catch (imageError) {
        console.error('Failed to process images for package:', result.packageId, imageError);
        // Note: We don't fail the entire operation since the package was created successfully
        // The package exists without images, which is a valid state
      }
    }

    // We've replaced size-based pricing with price per kg

    // Handle custom options
    if (usesCustomOptions && (customCategories.length > 0 || customCremationTypes.length > 0 || customProcessingTimes.length > 0)) {
      try {
        await withTransaction(async (transaction) => {
          // Ensure the business_custom_options table exists

          // Insert custom categories
          for (const category of customCategories) {
            await transaction.query(
              'INSERT INTO business_custom_options (provider_id, option_type, option_value) VALUES (?, ?, ?)',
              [providerId, 'category', category]
            );
          }

          // Insert custom cremation types
          for (const type of customCremationTypes) {
            await transaction.query(
              'INSERT INTO business_custom_options (provider_id, option_type, option_value) VALUES (?, ?, ?)',
              [providerId, 'cremation_type', type]
            );
          }

          // Insert custom processing times
          for (const time of customProcessingTimes) {
            await transaction.query(
              'INSERT INTO business_custom_options (provider_id, option_type, option_value) VALUES (?, ?, ?)',
              [providerId, 'processing_time', time]
            );
          }
        });
      } catch (customOptionsError) {
        console.error('Failed to process custom options for package:', result.packageId, customOptionsError);
        // We don't fail the entire operation since the package was created successfully
      }
    }

    // Handle supported pet types
    if (supportedPetTypes.length > 0) {
      try {
        await withTransaction(async (transaction) => {
          // Ensure the business_pet_types table exists
          await transaction.query(`
            CREATE TABLE IF NOT EXISTS business_pet_types (
              id int(11) NOT NULL AUTO_INCREMENT,
              provider_id int(11) NOT NULL,
              pet_type varchar(100) NOT NULL,
              is_active tinyint(1) DEFAULT 1,
              created_at timestamp NOT NULL DEFAULT current_timestamp(),
              updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (id),
              KEY idx_business_pet_types_provider (provider_id),
              KEY idx_business_pet_types_active (is_active),
              CONSTRAINT fk_business_pet_types_provider FOREIGN KEY (provider_id) REFERENCES service_providers (provider_id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
          `);

          // Clear existing pet types for this provider
          // Mark existing pet types as inactive instead of deleting
          await transaction.query(
            'UPDATE business_pet_types SET is_active = 0 WHERE provider_id = ?',
            [providerId]
          );

          // Insert supported pet types
          for (const petType of supportedPetTypes) {
            // Use INSERT ... ON DUPLICATE KEY UPDATE for idempotency
            await transaction.query(
              'INSERT INTO business_pet_types (provider_id, pet_type, is_active) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE is_active = 1',
              [providerId, petType]
            );
          }

          // Insert supported pet types
          for (const petType of supportedPetTypes) {
            await transaction.query(
              'INSERT INTO business_pet_types (provider_id, pet_type) VALUES (?, ?)',
              [providerId, petType]
            );
          }
        });
      } catch (petTypesError) {
        console.error('Failed to process pet types for package:', result.packageId, petTypesError);
        // We don't fail the entire operation since the package was created successfully
      }
    }

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
  const ids = pkgs.map((p) => p.id);
  const providerIds = [...new Set(pkgs.map((p) => p.providerId))];

  const [incs, adds, imgs, sizePricing, petTypes] = await Promise.all([
    query(`SELECT package_id, description FROM package_inclusions WHERE package_id IN (?)`, [ids]),
    query(`SELECT package_id, addon_id as id, description, price FROM package_addons WHERE package_id IN (?)`, [ids]),
    query(`SELECT package_id, image_path, display_order FROM package_images WHERE package_id IN (?) ORDER BY display_order`, [ids]),
    query(`SELECT package_id, size_category, weight_range_min, weight_range_max, price FROM package_size_pricing WHERE package_id IN (?)`, [ids]),
    query(`SELECT provider_id, pet_type FROM business_pet_types WHERE provider_id IN (?) AND is_active = 1`, [providerIds]),
  ]) as any[][];

  const groupBy = (arr: any[], key: string) =>
    arr.reduce((acc, cur) => {
      (acc[cur[key]] = acc[cur[key]] || []).push(cur);
      return acc;
    }, {} as Record<string, any[]>);

  const incMap = groupBy(incs, 'package_id');
  const addMap = groupBy(adds, 'package_id');
  const imgMap = groupBy(imgs, 'package_id');
  const sizeMap = groupBy(sizePricing, 'package_id');
  const petTypeMap = groupBy(petTypes, 'provider_id');

  return pkgs.map((p: any) => {
    const inclusions = (incMap[p.id] || []).map((i: any) => i.description);
    const addOns = (addMap[p.id] || []).map((a: any) => ({
      id: a.id,
      name: a.description,
      price: a.price != null ? +a.price : 0,
      displayText: a.price != null ? `${a.description} (+₱${(+a.price).toLocaleString()})` : a.description
    }));
    const images = (imgMap[p.id] || [])
      .map((i: any) => {
        const path = i.image_path;
        if (!path || path.startsWith('blob:')) return null;
        if (path.startsWith('http')) return path;
        
        // Ensure all package images use the API route
        if (path.startsWith('/api/image/')) {
          return path; // Already correct
        }
        if (path.startsWith('/uploads/packages/')) {
          return `/api/image/packages/${path.substring('/uploads/packages/'.length)}`;
        }
        if (path.startsWith('uploads/packages/')) {
          return `/api/image/packages/${path.substring('uploads/packages/'.length)}`;
        }
        if (path.includes('packages/')) {
          const parts = path.split('packages/');
          if (parts.length > 1) {
            return `/api/image/packages/${parts[1]}`;
          }
        }
        // For other paths, use the standard function
        return getImagePath(path, false); // Disable cache busting for package images
      })
      .filter(Boolean);

    // Enhanced features
    const _sizePricingData = (sizeMap[p.id] || []).map((sp: any) => ({
      sizeCategory: sp.size_category,
      weightRangeMin: Number(sp.weight_range_min),
      weightRangeMax: Number(sp.weight_range_max),
      price: Number(sp.price)
    }));

    const supportedPetTypes = (petTypeMap[p.providerId] || []).map((pt: any) => pt.pet_type);

    return {
      ...p,
      inclusions,
      addOns,
      images,
      pricePerKg: Number(p.price_per_kg || 0),
      supportedPetTypes
    };
  });
}

async function moveImagesToPackageFolder(paths: string[], packageId: number) {
  if (!paths.length) return [];
  const base = join(process.cwd(), 'public', 'uploads', 'packages', String(packageId));
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });

  return Promise.all(
    paths.map((rel: string) => {
      if (rel.includes(`/uploads/packages/${packageId}/`)) return rel;
      const filename = rel.split('/').pop()!;
      const src = join(process.cwd(), 'public', rel);
      const destRel = `/uploads/packages/${packageId}/${filename}`;
      const dest = join(process.cwd(), 'public', destRel);
      if (!fs.existsSync(src)) return rel;
      fs.copyFileSync(src, dest);
      try { fs.unlinkSync(src); } catch {}
      return destRel;
    })
  );
}
