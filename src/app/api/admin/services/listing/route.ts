// src/app/api/admin/services/listing/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { query, checkTableExists } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { calculateRevenue, formatRevenue } from '@/lib/revenueCalculator';

// Safely execute a database query with error handling
async function safeQuery(queryString: string, params: any[] = []): Promise<any[]> {
  try {
    return await query(queryString, params) as any[];
  } catch (error) {
    console.error(`Query failed: ${queryString}`, error);
    return [];
  }
}

// Helper function to get valid package IDs
function getValidPackageIds(rows: any[]): number[] {
  return rows
    .map(r => r.package_id)
    .filter(id => id != null && !isNaN(id));
}

// Helper function to build IN clause with placeholders
function buildInClause(ids: number[]): { clause: string; params: any[] } {
  if (ids.length === 0) return { clause: '', params: [] };
  const placeholders = ids.map(() => '?').join(',');
  return { clause: `IN (${placeholders})`, params: ids };
}

// Helper function to get available columns from service_providers table
async function getServiceProviderColumns(): Promise<string[]> {
  try {
    const result = await safeQuery(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'service_providers'
    `);
    return result.map((col: any) => col.COLUMN_NAME.toLowerCase());
  } catch (error) {
    console.error('Error fetching service_providers columns:', error);
    return [];
  }
}

// Helper function to build main service query
async function buildServiceQuery(search: string, statusFilter: string, categoryFilter: string) {
  const spColumns = await getServiceProviderColumns();
  const joinSP = await checkTableExists('service_providers');

  // Base columns that always exist
  const baseCols = [
    'p.package_id', 'p.name', 'p.description',
    "COALESCE(p.price,0) AS price",
    "COALESCE(p.is_active,1) AS is_active",
    "COALESCE(p.category,'standard') AS category",
    "COALESCE(p.cremation_type,'') AS cremationType",
    "COALESCE(p.processing_time,'2-3 days') AS processingTime",
    "COALESCE(p.conditions,'') AS conditions"
  ];

  // Add service provider columns if they exist
  const spCols = [];
  if (joinSP) {
    spCols.push("sp.provider_id AS providerId");
    if (spColumns.includes('name')) spCols.push("COALESCE(sp.name,'Cremation Center') AS providerName");
    if (spColumns.includes('address')) spCols.push("COALESCE(sp.address,'') AS providerAddress");
    if (spColumns.includes('phone')) spCols.push("COALESCE(sp.phone,'') AS providerPhone");
  }

  const colsStr = [...baseCols, ...spCols].join(', ');
  const joinClause = joinSP ? 'LEFT JOIN service_providers sp ON p.provider_id=sp.provider_id' : '';

  let sql = `SELECT ${colsStr} FROM service_packages p ${joinClause} WHERE 1=1`;
  const params: any[] = [];

  // Build search conditions
  if (search) {
    const searchConditions = ['p.name LIKE ?'];
    params.push(`%${search}%`);

    if (joinSP && spColumns.includes('name')) {
      searchConditions.push('sp.name LIKE ?');
      params.push(`%${search}%`);
    }

    sql += ` AND (${searchConditions.join(' OR ')})`;
  }

  // Add filters
  if (statusFilter !== 'all') {
    sql += ' AND p.is_active = ?';
    params.push(statusFilter === 'active' ? 1 : 0);
  }

  if (categoryFilter !== 'all') {
    sql += ' AND p.category = ?';
    params.push(categoryFilter);
  }

  sql += ' ORDER BY p.created_at DESC';

  return { sql, params };
}

// Helper function to fetch related data for packages
async function fetchRelatedData(packageIds: number[]) {
  const results = {
    inclusions: {} as Record<number, string[]>,
    addons: {} as Record<number, string[]>,
    bookings: {} as Record<number, number>,
    reviews: {} as Record<number, { reviewsCount: number; rating: number }>,
    images: {} as Record<number, string[]>
  };

  if (packageIds.length === 0) return results;

  const { clause, params } = buildInClause(packageIds);

  // Helper to fetch table data
  const fetchTableData = async (tableName: string, columns: string) => {
    if (await checkTableExists(tableName)) {
      return await safeQuery(
        `SELECT ${columns} FROM ${tableName} WHERE package_id ${clause}`,
        params
      );
    }
    return [];
  };

  // Fetch inclusions and addons in parallel
  const [inclusions, addons] = await Promise.all([
    fetchTableData('package_inclusions', 'package_id, description'),
    fetchTableData('package_addons', 'package_id, description')
  ]);

  // Process inclusions
  inclusions.forEach((inc: any) => {
    if (!results.inclusions[inc.package_id]) results.inclusions[inc.package_id] = [];
    results.inclusions[inc.package_id].push(inc.description);
  });

  // Process addons
  addons.forEach((addon: any) => {
    if (!results.addons[addon.package_id]) results.addons[addon.package_id] = [];
    results.addons[addon.package_id].push(addon.description);
  });

  // Fetch bookings
  const bookingsTable = await checkTableExists('service_bookings')
    ? 'service_bookings'
    : await checkTableExists('bookings')
    ? 'bookings'
    : null;

  if (bookingsTable) {
    const bookings = await safeQuery(
      `SELECT package_id, COUNT(*) as count FROM ${bookingsTable} WHERE package_id ${clause} GROUP BY package_id`,
      params
    );
    bookings.forEach((booking: any) => {
      results.bookings[booking.package_id] = parseInt(booking.count, 10) || 0;
    });
  }

  // Fetch reviews
  if (await checkTableExists('reviews')) {
    const reviewsTable = await checkTableExists('service_bookings') ? 'service_bookings' : null;
    let reviewsQuery = `SELECT package_id, COUNT(id) as reviewsCount, AVG(rating) as rating FROM reviews WHERE package_id ${clause} GROUP BY package_id`;

    if (reviewsTable) {
      reviewsQuery = `
        SELECT sb.package_id, COUNT(r.id) as reviewsCount, AVG(r.rating) as rating
        FROM reviews r
        JOIN ${reviewsTable} sb ON r.booking_id = sb.id
        WHERE sb.package_id ${clause}
        GROUP BY sb.package_id
      `;
    }

    const reviews = await safeQuery(reviewsQuery, params);
    reviews.forEach((review: any) => {
      results.reviews[review.package_id] = {
        reviewsCount: parseInt(review.reviewsCount, 10) || 0,
        rating: parseFloat(review.rating) || 0
      };
    });
  }

  // Fetch images
  if (await checkTableExists('package_images')) {
    const images = await safeQuery(
      `SELECT package_id, image_path, image_data FROM package_images WHERE package_id ${clause} ORDER BY display_order, package_id`,
      params
    );

    images.forEach((img: any) => {
      if (!results.images[img.package_id]) results.images[img.package_id] = [];

      if (img.image_data) {
        results.images[img.package_id].push(`data:image/png;base64,${img.image_data}`);
      } else if (img.image_path) {
        let apiPath = `/api/image/packages/${img.image_path}`;
        if (img.image_path.startsWith('/uploads/packages/')) {
          apiPath = `/api/image/packages/${img.image_path.substring('/uploads/packages/'.length)}`;
        } else if (img.image_path.startsWith('uploads/packages/')) {
          apiPath = `/api/image/packages/${img.image_path.substring('uploads/packages/'.length)}`;
        }
        results.images[img.package_id].push(apiPath);
      }
    });
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const statusFilter = url.searchParams.get('status') || 'all';
    const categoryFilter = url.searchParams.get('category') || 'all';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '20'));

    // Check if service_packages table exists
    if (!(await checkTableExists('service_packages'))) {
      return NextResponse.json({
        success: true,
        services: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
        stats: { activeServices: 0, totalBookings: 0, verifiedCenters: 0 }
      });
    }

    // Build and execute main query
    const { sql, params } = await buildServiceQuery(search, statusFilter, categoryFilter);
    const paginatedSql = `${sql} LIMIT ${limit} OFFSET ${(page - 1) * limit}`;

    let rows: any[] = [];
    try {
      rows = await safeQuery(paginatedSql, params);
    } catch (error) {
      console.error('Primary query failed:', error);
      // Try fallback query
      const fallbackRows = await safeQuery(`
        SELECT
          package_id as id, name, description, 0 AS price, 1 AS is_active,
          'standard' AS category, '' AS cremationType, '2-3 days' AS processingTime,
          '' AS conditions, 'Cremation Center' AS providerName, 0 AS providerId
        FROM service_packages
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}
      `);
      rows = fallbackRows.map(row => ({ ...row, package_id: row.id }));
    }

    // Get total count
    const countResult = await safeQuery(`SELECT COUNT(*) AS total FROM service_packages`);
    const total = +(countResult[0]?.total || 0);

    // Fetch related data if we have services
    const packageIds = getValidPackageIds(rows);
    const relatedData = await fetchRelatedData(packageIds);

    // Process services with related data
    const services = rows.map(r => {
      const status = r.is_active ? 'active' : 'inactive';
      const priceVal = +r.price;
      const priceFmt = `₱${priceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const images = relatedData.images[r.package_id] || [];
      const [image] = images;
      const inclusions = relatedData.inclusions[r.package_id] || [];
      const addOns = relatedData.addons[r.package_id] || [];
      const bookings = relatedData.bookings[r.package_id] || 0;
      const reviewData = relatedData.reviews[r.package_id] || { reviewsCount: 0, rating: 0 };

      const centerName = r.providerName || r.name || 'Cremation Center';

      return {
        id: r.package_id,
        name: r.name,
        description: r.description,
        category: r.category,
        cremationType: r.cremationType,
        processingTime: r.processingTime,
        price: priceFmt,
        priceValue: priceVal,
        conditions: r.conditions,
        status,
        cremationCenter: centerName,
        providerId: r.providerId,
        rating: reviewData.rating,
        bookings,
        reviewsCount: reviewData.reviewsCount,
        revenue: 0,
        formattedRevenue: '₱0.00',
        image: image || null,
        images,
        inclusions,
        addOns,
      };
    });

    // Calculate stats
    const activeServices = services.filter(s => s.status === 'active').length;
    const totalBookings = Object.values(relatedData.bookings).reduce((sum, count) => sum + count, 0);

    // Get verified centers count
    let verifiedCenters = 0;
    const spColumns = await getServiceProviderColumns();
    if (await checkTableExists('service_providers')) {
      let whereClause = '';
      if (spColumns.includes('application_status')) {
        whereClause = "WHERE application_status IN ('approved', 'verified')";
      } else if (spColumns.includes('status')) {
        whereClause = "WHERE status = 'active' OR status = 'approved'";
      } else if (spColumns.includes('is_verified')) {
        whereClause = "WHERE is_verified = 1";
      }

      if (whereClause) {
        const centersResult = await safeQuery(`SELECT COUNT(*) as count FROM service_providers ${whereClause}`);
        verifiedCenters = centersResult[0]?.count || 0;
      }
    }

    // Revenue calculation (with error handling)
    let totalRev = 0;
    let formattedTotalRev = '₱0.00';
    let monthlyRev = '₱0.00';
    try {
      const revenueData = await calculateRevenue();
      totalRev = revenueData.totalRevenue || 0;
      formattedTotalRev = formatRevenue(totalRev);
      monthlyRev = formatRevenue(revenueData.monthlyRevenue || 0);
    } catch (error) {
      console.error('Revenue calculation failed:', error);
    }

    return NextResponse.json({
      success: true,
      services,
      totalRevenue: totalRev,
      formattedTotalRevenue: formattedTotalRev,
      monthlyRevenue: monthlyRev,
      serviceProvidersCount: verifiedCenters,
      activeServicesCount: activeServices,
      stats: {
        activeServices,
        totalBookings,
        verifiedCenters,
        monthlyRevenue: monthlyRev,
        totalRevenue: formattedTotalRev
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    });

  } catch (error) {
    console.error('Services listing API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch services',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 });
  }
}
