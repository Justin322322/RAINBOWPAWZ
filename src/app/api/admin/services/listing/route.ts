// src/app/api/admin/services/listing/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';
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

// Cache for schema information to avoid repeated queries
let schemaCache: { columns: string[]; lastChecked: number } | null = null;
const SCHEMA_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Cache uploads directory listing to avoid repeated disk scans
let uploadsIndexCache: { files: string[]; lastScanned: number } | null = null;
const UPLOADS_CACHE_DURATION = 60 * 1000; // 1 minute

async function getUploadsIndex(): Promise<string[]> {
  const now = Date.now();
  if (uploadsIndexCache && (now - uploadsIndexCache.lastScanned) < UPLOADS_CACHE_DURATION) {
    return uploadsIndexCache.files;
  }
  try {
    const dir = join(process.cwd(), 'public', 'uploads', 'packages');
    const allFiles: string[] = [];
    
    // Recursively scan directory and subdirectories
    const scanDirectory = async (currentDir: string, relativePath: string = '') => {
      try {
        const entries = await readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(currentDir, entry.name);
          const relativeFilePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath, relativeFilePath);
          } else if (entry.isFile() && entry.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            allFiles.push(relativeFilePath);
          }
        }
      } catch (error) {
        console.warn(`Error scanning directory ${currentDir}:`, error);
      }
    };
    
    await scanDirectory(dir);
    uploadsIndexCache = { files: allFiles, lastScanned: now };
    return allFiles;
  } catch (error) {
    console.warn('Error in getUploadsIndex:', error);
    uploadsIndexCache = { files: [], lastScanned: now };
    return [];
  }
}

// Helper function to get available columns from service_providers table with caching
async function getServiceProviderColumns(): Promise<string[]> {
  const now = Date.now();

  // Return cached result if still valid
  if (schemaCache && (now - schemaCache.lastChecked) < SCHEMA_CACHE_DURATION) {
    return schemaCache.columns;
  }

  try {
    const result = await safeQuery(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'service_providers'
    `);
    const columns = result.map((col: any) => col.COLUMN_NAME.toLowerCase());

    // Cache the result
    schemaCache = { columns, lastChecked: now };
    return columns;
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
    spCols.push("sp.user_id AS providerUserId"); // Add user_id for joining with users
    if (spColumns.includes('name')) spCols.push("COALESCE(sp.name,'Cremation Center') AS providerName");
    if (spColumns.includes('address')) spCols.push("COALESCE(sp.address,'') AS providerAddress");
    if (spColumns.includes('phone')) spCols.push("COALESCE(sp.phone,'') AS providerPhone");
    if (spColumns.includes('application_status')) spCols.push("sp.application_status AS providerStatus");
  }

  const colsStr = [...baseCols, ...spCols].join(', ');
  
  // Enhanced join to include users table for complete business owner information
  let joinClause = '';
  if (joinSP) {
    joinClause = `
      LEFT JOIN service_providers sp ON p.provider_id=sp.provider_id
      LEFT JOIN users u ON sp.user_id=u.user_id
    `;
    // Add user columns for display
    spCols.push("CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) AS ownerName");
    spCols.push("u.email AS ownerEmail");
  }

  // Rebuild colsStr with new user columns
  const finalColsStr = [...baseCols, ...spCols].join(', ');

  // Start with base WHERE clause - include all packages
  // Admin should see all services, including those without providers or from restricted businesses
  let sql = `SELECT ${finalColsStr} FROM service_packages p ${joinClause} WHERE 1=1`;
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

  // Fetch inclusions and addons
  if (await checkTableExists('service_packages')) {
    const inclusionsData = await safeQuery(
      `SELECT package_id, inclusions FROM service_packages WHERE package_id ${clause}`,
      params
    );
    
    inclusionsData.forEach((pkg: any) => {
      if (pkg.inclusions) {
        try {
          let inclusionsArray: any[] = [];
          if (typeof pkg.inclusions === 'string') {
            // Handle corrupted [object Object] data
            if (pkg.inclusions.includes('[object Object]')) {
              console.warn(`Corrupted inclusions data for package ${pkg.package_id}, defaulting to empty array`);
              inclusionsArray = [];
            } else {
              inclusionsArray = JSON.parse(pkg.inclusions);
            }
          } else {
            inclusionsArray = pkg.inclusions;
          }
          
          if (Array.isArray(inclusionsArray)) {
            results.inclusions[pkg.package_id] = inclusionsArray.map((inc: any) => {
              if (typeof inc === 'string') return inc;
              if (inc && typeof inc === 'object') {
                return inc.description || inc.name || String(inc);
              }
              return String(inc);
            }).filter(Boolean);
          } else {
            results.inclusions[pkg.package_id] = [];
          }
        } catch (error) {
          console.warn(`Error parsing inclusions for package ${pkg.package_id}:`, error);
          results.inclusions[pkg.package_id] = [];
        }
      } else {
        results.inclusions[pkg.package_id] = [];
      }
    });

    const addonsData = await safeQuery(
      `SELECT package_id, addons FROM service_packages WHERE package_id ${clause}`,
      params
    );
    
    addonsData.forEach((pkg: any) => {
      if (pkg.addons) {
        try {
          const addonsArray = typeof pkg.addons === 'string' ? JSON.parse(pkg.addons) : pkg.addons;
          if (Array.isArray(addonsArray)) {
            results.addons[pkg.package_id] = addonsArray.map((addon: any) => {
              if (typeof addon === 'string') return addon;
              if (addon && typeof addon === 'object') {
                return addon.name || addon.description || String(addon);
              }
              return String(addon);
            }).filter(Boolean);
          } else {
            results.addons[pkg.package_id] = [];
          }
        } catch (error) {
          console.warn(`Error parsing addons for package ${pkg.package_id}:`, error);
          results.addons[pkg.package_id] = [];
        }
      } else {
        results.addons[pkg.package_id] = [];
      }
    });
  }

  // Fetch bookings
  const bookingsTable = await checkTableExists('bookings')
    ? 'bookings'
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

  // Fetch reviews with optimized query
  if (await checkTableExists('reviews')) {
    const reviewsTable = await checkTableExists('bookings') ? 'bookings' : null;
    
    if (reviewsTable) {
      // Optimized query with proper join
      const reviewsQuery = `
        SELECT sb.package_id, COUNT(r.id) as reviewsCount, AVG(r.rating) as rating
        FROM reviews r
        JOIN ${reviewsTable} sb ON r.booking_id = sb.id
        WHERE sb.package_id ${clause}
        GROUP BY sb.package_id
      `;
      const reviews = await safeQuery(reviewsQuery, params);
      reviews.forEach((review: any) => {
        results.reviews[review.package_id] = {
          reviewsCount: parseInt(review.reviewsCount, 10) || 0,
          rating: parseFloat(review.rating) || 0
        };
      });
    }
  }

  // Fetch images (optimized - minimal logging)
  if (await checkTableExists('service_packages')) {
    const images = await safeQuery(
      `SELECT package_id, images FROM service_packages WHERE package_id ${clause} ORDER BY package_id`,
      params
    );

    images.forEach((pkg: any) => {
      if (!results.images[pkg.package_id]) results.images[pkg.package_id] = [];

      // Parse images from JSON column
      if (pkg.images) {
        try {
          let imagesData: any[] = [];
          
          if (typeof pkg.images === 'string') {
            // Check for corrupted data with [object Object]
            if (pkg.images.includes('[object Object]')) {
              console.warn(`Package ${pkg.package_id} has corrupted images data with [object Object] - skipping`);
              // Skip corrupted data completely
              return;
            } else {
              try {
                imagesData = JSON.parse(pkg.images);
              } catch (parseError) {
                console.warn(`Package ${pkg.package_id} has invalid JSON in images column:`, parseError);
                return;
              }
            }
          } else if (Array.isArray(pkg.images)) {
            imagesData = pkg.images;
          }
          
          if (Array.isArray(imagesData) && imagesData.length > 0) {
            imagesData.forEach((img: any) => {
              let resolved: string | null = null;
              
              if (typeof img === 'string') {
                // Skip corrupted string data
                if (img.includes('[object Object]') || img === '[object Object]') {
                  console.warn(`Package ${pkg.package_id} has corrupted image string: ${img}`);
                  return;
                }
                resolved = img;
              } else if (img && typeof img === 'object') {
                const rawPath = img.url || img.path || img.src || null;
                const dataUrl = img.data || null;
                
                if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
                  resolved = dataUrl;
                } else if (rawPath && typeof rawPath === 'string') {
                  resolved = rawPath;
                }
              }
              
              if (resolved && resolved !== '[object Object]') {
                // Apply path mappings
                if (resolved.startsWith('/api/image/')) {
                  results.images[pkg.package_id].push(resolved);
                } else if (resolved.startsWith('/uploads/packages/')) {
                  results.images[pkg.package_id].push(`/api/image/packages/${resolved.substring('/uploads/packages/'.length)}`);
                } else if (resolved.startsWith('uploads/packages/')) {
                  results.images[pkg.package_id].push(`/api/image/packages/${resolved.substring('uploads/packages/'.length)}`);
                } else if (resolved.includes('packages/')) {
                  const parts = resolved.split('packages/');
                  if (parts.length > 1) {
                    results.images[pkg.package_id].push(`/api/image/packages/${parts[1]}`);
                  }
                } else if (resolved.startsWith('data:image/')) {
                  results.images[pkg.package_id].push(resolved);
                } else {
                  results.images[pkg.package_id].push(`/api/image/packages/${resolved}`);
                }
              }
            });
          }
        } catch (e) {
          console.warn(`Failed to parse images for package ${pkg.package_id}:`, e);
        }
      }
    });
  }

  // Filesystem fallback: only for packages without images (optimized)
  try {
    const packagesWithoutImages = packageIds.filter(id => !results.images[id] || results.images[id].length === 0);
    
    if (packagesWithoutImages.length > 0) {
      const uploads = await getUploadsIndex();
      
      packagesWithoutImages.forEach((id) => {
        // Look for files that start with package_${id}_
        const prefix = `package_${id}_`;
        const matches = uploads.filter((f) => f.startsWith(prefix));
        
        if (matches.length > 0) {
          results.images[id] = [`/api/image/packages/${matches.sort()[0]}`];
        } else {
          // Use placeholder for packages without images
          results.images[id] = ['/placeholder-pet.png'];
        }
      });
    }
  } catch (error) {
    console.warn('Filesystem fallback error:', error);
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
    const limitInt = Number(limit);
    const offsetInt = (page - 1) * Number(limit);
    const paginatedSql = `${sql} LIMIT ${limitInt} OFFSET ${offsetInt}`;

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
        LIMIT ${limitInt} OFFSET ${offsetInt}
      `, []);
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
