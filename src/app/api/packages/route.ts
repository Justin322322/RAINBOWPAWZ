import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import * as fs from 'fs';
import { join } from 'path';
import { getImagePath } from '@/utils/imagePathUtils';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const packageIdParam = url.searchParams.get('packageId');
    const providerId = url.searchParams.get('providerId');
    const page = +url.searchParams.get('page')! || 1;
    const limit = +url.searchParams.get('limit')! || 10;
    const offset = (page - 1) * limit;
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    // Build the WHERE clause based on providerId and includeInactive parameters
    let whereClause = '';

    if (providerId) {
      whereClause = `WHERE sp.provider_id = ${parseInt(providerId)}`;
      if (!includeInactive) {
        whereClause += ' AND sp.is_active = TRUE';
      }
    } else if (!includeInactive) {
      whereClause = 'WHERE sp.is_active = TRUE';
    }

    if (packageIdParam) {
      return getPackageById(+packageIdParam, providerId || undefined);
    }

    const rows = (await query(
      `
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
      `,
      [limit, offset]
    )) as any[];

    const countRows = (await query(
      `
      SELECT COUNT(*) AS total
      FROM service_packages sp
      ${whereClause}
      `
    )) as any[];
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
    const [userId, accountType] = authToken.split('_');
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
    } = await request.json();

    if (!name || !description || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await query('START TRANSACTION');
    try {
      const pkgRes = (await query(
        `
        INSERT INTO service_packages
          (provider_id, name, description, category, cremation_type,
           processing_time, price, conditions, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        `,
        [providerId, name, description, category, cremationType, processingTime, price, conditions]
      )) as any;
      const packageId = pkgRes.insertId;

      // inclusions
      for (const incDesc of inclusions.filter((x: any) => x)) {
        await query(
          'INSERT INTO package_inclusions (package_id, description) VALUES (?, ?)',
          [packageId, incDesc]
        );
      }

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

        const colInfo = (await query(
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
          await query(
            'INSERT INTO package_addons (package_id, description, price) VALUES (?, ?, ?)',
            [packageId, desc, cost]
          );
        } else {
          const maxRow = (await query(
            'SELECT MAX(id) AS maxId FROM package_addons'
          )) as any[];
          const nextId = (maxRow[0]?.maxId || 0) + 1;
          await query(
            'INSERT INTO package_addons (id, package_id, description, price) VALUES (?, ?, ?, ?)',
            [nextId, packageId, desc, cost]
          );
        }
      }

      // images
      const moved = await moveImagesToPackageFolder(images, pkgRes.insertId);
      for (let i = 0; i < moved.length; i++) {
        await query(
          'INSERT INTO package_images (package_id, image_path, display_order) VALUES (?, ?, ?)',
          [packageId, moved[i], i]
        );
      }

      await query('COMMIT');
      return NextResponse.json({
        success: true,
        packageId,
        message: 'Package created successfully',
        images: moved,
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
  const ids = pkgs.map((p) => p.id);
  const [incs, adds, imgs] = await Promise.all([
    query(`SELECT package_id, description FROM package_inclusions WHERE package_id IN (?)`, [ids]),
    query(`SELECT package_id, addon_id as id, description, price FROM package_addons WHERE package_id IN (?)`, [ids]),
    query(`SELECT package_id, image_path, display_order FROM package_images WHERE package_id IN (?) ORDER BY display_order`, [ids]),
  ]) as any[][];

  const groupBy = (arr: any[], key: string) =>
    arr.reduce((acc, cur) => {
      (acc[cur[key]] = acc[cur[key]] || []).push(cur);
      return acc;
    }, {} as Record<string, any[]>);

  const incMap = groupBy(incs, 'package_id');
  const addMap = groupBy(adds, 'package_id');
  const imgMap = groupBy(imgs, 'package_id');

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
        return path.startsWith('http') ? path : getImagePath(path);
      })
      .filter(Boolean);
    if (!images.length) {
      images.push(`/images/sample-package-${(p.id % 5) + 1}.jpg`);
    }
    return { ...p, inclusions, addOns, images };
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