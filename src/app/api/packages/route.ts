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

    // For now, return basic package data without complex enrichment
    const packages = rows.map((p: any) => ({
      ...p,
      inclusions: [],
      addOns: [],
      images: [],
      pricePerKg: Number(p.price_per_kg || 0),
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

    const {
      name,
      description,
      category,
      cremationType,
      processingTime,
      price,
      conditions: _conditions,
    } = await request.json();

    if (!name || !description || price == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await withTransaction(async (transaction) => {
      const pkgRes = (await transaction.query(
        `
        INSERT INTO service_packages
          (provider_id, name, description, category, cremation_type,
           processing_time, price, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        `,
        [providerId, name, description, category, cremationType, processingTime, price]
      )) as any;
      const packageId = pkgRes.insertId;

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
      pricePerKg: Number(pkg.price_per_kg || 0),
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
