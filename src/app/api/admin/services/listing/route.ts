// src/app/api/packages/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { query, checkTableExists } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { calculateRevenue, formatRevenue } from '@/lib/revenueCalculator';

type RawServiceRow = Record<string, any>;
type PackageResponse = {
  id: number;
  name: string;
  description: string;
  category: string;
  cremationType: string;
  processingTime: string;
  price: string;
  priceValue: number;
  conditions: string;
  status: 'active' | 'inactive';
  cremationCenter: string;
  providerId: number;
  rating: number;
  bookings: number;
  revenue: number;
  formattedRevenue: string;
  image: string | null;
  images: string[];
  inclusions: string[];
  addOns: string[];
  reviewsCount: number;
};

// Removed listImagePaths function - now using database-based image fetching

export async function GET(request: NextRequest) {
  // --- Authentication ---
  const user = await verifySecureAuth(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (user.accountType !== 'admin') {
    return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // --- Query params ---
  const url = new URL(request.url);
  const s = url.searchParams.get('search') || '';
  const statusF = url.searchParams.get('status') || 'all';
  const catF = url.searchParams.get('category') || 'all';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '20'));
  const offset = (page - 1) * limit;

  // --- Ensure table exists ---
  if (!(await checkTableExists('service_packages'))) {
    return NextResponse.json({
      success: true,
      services: [],
      pagination: { total: 0, page, limit, totalPages: 0 }
    });
  }

  // --- Build main query ---
  const cols = [
    'p.package_id', 'p.name', 'p.description',
    "COALESCE(p.price,0) AS price",
    "COALESCE(p.is_active,1) AS is_active",
    "COALESCE(p.category,'standard') AS category",
    "COALESCE(p.cremation_type,'') AS cremationType",
    "COALESCE(p.processing_time,'2-3 days') AS processingTime",
    "COALESCE(p.conditions,'') AS conditions",
    "sp.provider_id AS providerId", "COALESCE(sp.name,'Cremation Center') AS providerName"
  ];
  // Build the JOIN clause - using the correct column names for joining
  const joinSP = await checkTableExists('service_providers')
    ? 'LEFT JOIN service_providers sp ON p.provider_id=sp.provider_id'
    : '';
  // SECURITY FIX: Build safe query with validated components
  const colsStr = cols.join(', ');
  let sql = `SELECT ${colsStr} FROM service_packages p ${joinSP} WHERE 1=1`;
  const params: any[] = [];

  if (s) {
    sql += ' AND (p.name LIKE ? OR sp.name LIKE ?)';
    params.push(`%${s}%`, `%${s}%`);
  }
  if (statusF !== 'all') {
    sql += ' AND p.is_active = ?';
    params.push(statusF === 'active' ? 1 : 0);
  }
  if (catF !== 'all') {
    sql += ' AND p.category = ?';
    params.push(catF);
  }
  sql += ` ORDER BY p.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

  // --- Execute main query with fallback ---
  let rows: RawServiceRow[] = [];
  try {
    const result = await query(sql, params);
    if (Array.isArray(result)) {
      rows = result as RawServiceRow[];
    } else {
      console.error('Unexpected query result format:', result);
      throw new Error('Unexpected query result format');
    }
  } catch (err) {
    console.error('Primary query failed:', err);
    try {
      // Fallback to simple query
      const fallbackQuery = `
        SELECT
          package_id as id,
          name,
          description,
          0 AS price,
          1 AS is_active,
          'standard' AS category,
          '' AS cremationType,
          '2-3 days' AS processingTime,
          '' AS conditions,
          'Cremation Center' AS providerName,
          0 AS providerId
        FROM service_packages
        LIMIT ? OFFSET ?
      `;
      const fallbackResult = await query(fallbackQuery, [limit, offset]);
      rows = Array.isArray(fallbackResult) ? fallbackResult as RawServiceRow[] : [];
    } catch (fallbackError: any) {
      console.error('Fallback query also failed:', fallbackError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch services',
        details: process.env.NODE_ENV === 'development' ?
          (fallbackError.message || String(fallbackError)) :
          undefined
      }, { status: 500 });
    }
  }

  // --- Total count ---
  let total = 0;
  try {
    total = +((await query(`SELECT COUNT(*) AS t FROM service_packages`))[0].t || 0);
  } catch {
    total = rows.length;
  }

  // --- Revenue stats ---
  // Ensure we have proper revenue values using the standardized revenueCalculator
  let totalRev = 0;
  let formattedTotalRev = '₱0.00';
  let monthlyRev = '₱0.00';
  try {
    const revenueData = await calculateRevenue();
    totalRev = revenueData.totalRevenue || 0;
    
    // Format revenue correctly using the formatRevenue utility
    formattedTotalRev = formatRevenue(totalRev);
    monthlyRev = formatRevenue(revenueData.monthlyRevenue || 0);
  } catch (error) {
    console.error('Error calculating revenue:', error);
  }

  // --- Format each service ---
  // First, check if tables exist to avoid repeated queries for each service
  const inclusionsTableExists = await checkTableExists('package_inclusions');
  const addonsTableExists = await checkTableExists('package_addons');
  const _bookingsTableExists = await checkTableExists('bookings');
  const reviewsTableExists = await checkTableExists('reviews');

  // Batch fetch inclusions and addons for all packages
  let allInclusions: Record<number, string[]> = {};
  let allAddons: Record<number, string[]> = {};

  if (inclusionsTableExists) {
    try {
      const packageIds = rows.map(r => r.package_id);
      if (packageIds.length > 0) {
        // SECURITY FIX: Create parameterized query for package inclusions
        const placeholders = packageIds.map(() => '?').join(',');
        const inclusionsResult = await query(
          `SELECT package_id, description FROM package_inclusions WHERE package_id IN (${placeholders})`,
          packageIds
        ) as any[];

        // Group inclusions by package_id
        inclusionsResult.forEach(inc => {
          if (!allInclusions[inc.package_id]) {
            allInclusions[inc.package_id] = [];
          }
          allInclusions[inc.package_id].push(inc.description);
        });
      }
    } catch (error) {
      console.error('Error fetching inclusions:', error);
    }
  }

  if (addonsTableExists) {
    try {
      const packageIds = rows.map(r => r.package_id);
      if (packageIds.length > 0) {
        // SECURITY FIX: Create parameterized query for package addons
        const placeholders = packageIds.map(() => '?').join(',');
        const addonsResult = await query(
          `SELECT package_id, description FROM package_addons WHERE package_id IN (${placeholders})`,
          packageIds
        ) as any[];

        // Group addons by package_id
        addonsResult.forEach(addon => {
          if (!allAddons[addon.package_id]) {
            allAddons[addon.package_id] = [];
          }
          allAddons[addon.package_id].push(addon.description);
        });
      }
    } catch (error) {
      console.error('Error fetching addons:', error);
    }
  }

  // Batch fetch reviews count and average rating
  let allReviews: Record<number, { reviewsCount: number; rating: number }> = {};
  if (reviewsTableExists) {
    try {
      const packageIds = rows.map(r => r.package_id);
      if (packageIds.length > 0) {
        const placeholders = packageIds.map(() => '?').join(',');
        const reviewsResult = await query(
          `SELECT 
             sb.package_id, 
             COUNT(r.id) as reviewsCount, 
             AVG(r.rating) as rating 
           FROM reviews r
           JOIN service_bookings sb ON r.booking_id = sb.id
           WHERE sb.package_id IN (${placeholders}) 
           GROUP BY sb.package_id`,
          packageIds
        ) as any[];

        reviewsResult.forEach(review => {
          allReviews[review.package_id] = {
            reviewsCount: parseInt(review.reviewsCount, 10) || 0,
            rating: parseFloat(review.rating) || 0
          };
        });
      }
    } catch (error) {
      console.error('Error fetching reviews data:', error);
    }
  }

  // Get images from database for all packages
  let allImages: Record<number, string[]> = {};
  try {
    const packageIds = rows.map(r => r.package_id);
    if (packageIds.length > 0) {
      const imageResults = await query(
        `SELECT package_id, image_path FROM package_images WHERE package_id IN (${packageIds.map(() => '?').join(',')}) ORDER BY display_order`,
        packageIds
      ) as any[];

      // Group images by package ID and convert to API paths
      imageResults.forEach((img: any) => {
        if (!allImages[img.package_id]) {
          allImages[img.package_id] = [];
        }
        
        const imagePath = img.image_path;
        if (imagePath && !imagePath.startsWith('blob:')) {
          // Convert to API path
          let apiPath;
          if (imagePath.startsWith('/api/image/')) {
            apiPath = imagePath; // Already correct
          } else if (imagePath.startsWith('/uploads/packages/')) {
            apiPath = `/api/image/packages/${imagePath.substring('/uploads/packages/'.length)}`;
          } else if (imagePath.startsWith('uploads/packages/')) {
            apiPath = `/api/image/packages/${imagePath.substring('uploads/packages/'.length)}`;
          } else if (imagePath.includes('packages/')) {
            const parts = imagePath.split('packages/');
            if (parts.length > 1) {
              apiPath = `/api/image/packages/${parts[1]}`;
            }
          } else {
            // Default fallback
            apiPath = `/api/image/packages/${imagePath}`;
          }
          allImages[img.package_id].push(apiPath);
        }
      });
    }
  } catch (error) {
    console.error('Error fetching package images:', error);
  }

  // Process services in parallel but with reduced database queries
  const services: PackageResponse[] = await Promise.all(
    rows.map(async r => {
      const status = r.is_active ? 'active' : 'inactive';
      const priceVal = +r.price;
      const priceFmt = `₱${priceVal.toLocaleString('en-US',{ minimumFractionDigits:2, maximumFractionDigits:2 })}`;

      // Get images from pre-fetched database results
      const images = allImages[r.package_id] || [];
      const [image] = images;

      // Get inclusions and addons from pre-fetched data
      const incs = allInclusions[r.package_id] || [];
      const adds = allAddons[r.package_id] || [];
      const reviewData = allReviews[r.package_id] || { reviewsCount: 0, rating: 0 };

      // Default values for bookings and rating
      let bookings = 0, _rating = 0;

      // Map package_id to id for frontend compatibility
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
        cremationCenter: r.providerName,
        providerId: r.providerId,
        rating: reviewData.rating,
        bookings,
        reviewsCount: reviewData.reviewsCount,
        revenue: 0,
        formattedRevenue: `₱0.00`,
        image: image || null,
        images,
        inclusions: incs,
        addOns: adds,
      };
    })
  );

  // --- Build response ---
  const totalPages = Math.ceil(total / limit) || 1;

  // Get total bookings count across all service packages
  let totalBookings = 0;
  try {
    if (await checkTableExists('service_bookings')) {
      const bookingsResult = await query('SELECT COUNT(*) as count FROM service_bookings') as any[];
      totalBookings = bookingsResult[0]?.count || 0;
    } else if (await checkTableExists('bookings')) {
      const bookingsResult = await query('SELECT COUNT(*) as count FROM bookings') as any[];
      totalBookings = bookingsResult[0]?.count || 0;
    }
  } catch (error) {
    console.error('Error fetching total bookings:', error);
    totalBookings = 0;
  }

  // Get verified/approved cremation centers count
  let verifiedCenters = 0;
  try {
    if (await checkTableExists('service_providers')) {
      // First check which columns exist in the service_providers table
      const columnsResult = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'service_providers'
      `) as any[];
      
      const columns = columnsResult.map(col => col.COLUMN_NAME.toLowerCase());
      
      // Build query based on available columns
      let whereClause = '';
      
      if (columns.includes('application_status')) {
        whereClause = "WHERE application_status IN ('approved', 'verified')";
      } else if (columns.includes('status')) {
        whereClause = "WHERE status = 'active' OR status = 'approved'";
      } else {
        // If no status columns, count all providers
        whereClause = '';
      }
      
      const centersResult = await query(`
        SELECT COUNT(*) as count 
        FROM service_providers 
        ${whereClause}
      `) as any[];
      
      verifiedCenters = centersResult[0]?.count || 0;
    }
  } catch (error) {
    console.error('Error fetching verified centers:', error);
    verifiedCenters = 0;
  }

  return NextResponse.json({
    success: true,
    services,
    totalRevenue: totalRev,
    formattedTotalRevenue: formattedTotalRev,
    monthlyRevenue: monthlyRev,
    serviceProvidersCount: verifiedCenters,
    activeServicesCount: services.filter(s => s.status === 'active').length,
    stats: {
      activeServices: services.filter(s => s.status === 'active').length,
      totalBookings: totalBookings,
      verifiedCenters: verifiedCenters,
      monthlyRevenue: monthlyRev,
      totalRevenue: formattedTotalRev
    },
    pagination: { total, page, limit, totalPages }
  });
}

