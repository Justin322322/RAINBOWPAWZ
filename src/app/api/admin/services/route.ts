import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!authToken && !isDevelopment) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authToken) {
      const [userId, accountType] = authToken.split('_');
      if (accountType !== 'admin' && !isDevelopment) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
      }
    }

    // Get query parameters
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('search') || '';
    const statusFilter = url.searchParams.get('status') || 'all';
    const categoryFilter = url.searchParams.get('category') || 'all';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build the base query
    let baseQuery = `
      SELECT
        sp.id,
        sp.name,
        sp.description,
        sp.category,
        sp.cremation_type as cremationType,
        sp.processing_time as processingTime,
        sp.price,
        sp.conditions,
        sp.is_active as status,
        sp.duration_minutes,
        sp.created_at,
        sp.updated_at,
        svp.id as providerId,
        svp.name as providerName
      FROM service_packages sp
      JOIN service_providers svp ON sp.service_provider_id = svp.id
      WHERE 1=1
    `;

    // Add search condition if provided
    const queryParams: any[] = [];
    if (searchTerm) {
      baseQuery += ` AND (sp.name LIKE ? OR svp.name LIKE ?)`;
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    // Add status filter if not 'all'
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active' ? 1 : 0;
      baseQuery += ` AND sp.is_active = ?`;
      queryParams.push(isActive);
    }

    // Add category filter if not 'all'
    if (categoryFilter !== 'all') {
      baseQuery += ` AND sp.category = ?`;
      queryParams.push(categoryFilter);
    }

    // Add order by and pagination
    baseQuery += ` ORDER BY sp.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    // Execute the query
    const services = await query(baseQuery, queryParams) as any[];

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM service_packages sp
      JOIN service_providers svp ON sp.service_provider_id = svp.id
      WHERE 1=1
    `;

    // Add the same filters to the count query
    const countParams = [...queryParams.slice(0, queryParams.length - 2)]; // Remove limit and offset
    if (searchTerm) {
      countQuery += ` AND (sp.name LIKE ? OR svp.name LIKE ?)`;
    }
    if (statusFilter !== 'all') {
      countQuery += ` AND sp.is_active = ?`;
    }
    if (categoryFilter !== 'all') {
      countQuery += ` AND sp.category = ?`;
    }

    const countResult = await query(countQuery, countParams) as any[];
    const total = countResult[0]?.total || 0;

    // Enhance services with additional data
    const enhancedServices = await Promise.all(services.map(async (service) => {
      // Get package inclusions
      const inclusions = await query(`
        SELECT description
        FROM package_inclusions
        WHERE package_id = ?
      `, [service.id]) as any[];

      // Get package addons
      const addons = await query(`
        SELECT description, price
        FROM package_addons
        WHERE package_id = ?
      `, [service.id]) as any[];

      // Get package images
      const images = await query(`
        SELECT image_path, image_id
        FROM package_images
        WHERE package_id = ?
        ORDER BY display_order ASC
      `, [service.id]) as any[];

      // Get booking count - use a try/catch to handle missing tables
      let bookingCount = 0;
      try {
        // First check if the tables exist
        const tablesExist = await query(`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name IN ('bookings', 'business_services')
        `) as any[];

        const bothTablesExist = tablesExist[0]?.count === 2;

        if (bothTablesExist) {
          const bookingResult = await query(`
            SELECT COUNT(*) as count
            FROM bookings b
            JOIN business_services bs ON b.business_service_id = bs.id
            WHERE bs.service_provider_id = ?
          `, [service.providerId]) as any[];

          bookingCount = bookingResult[0]?.count || 0;
        }
      } catch (error) {
        console.log('Error getting booking count, using default value of 0:', error);
      }

      // Get average rating - use a try/catch to handle missing tables
      let avgRating = 4.5; // Default rating
      try {
        // Check if reviews table exists
        const reviewsTableExists = await query(`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name = 'reviews'
        `) as any[];

        if (reviewsTableExists[0]?.count === 1) {
          const ratingResult = await query(`
            SELECT AVG(rating) as avg_rating
            FROM reviews
            WHERE service_provider_id = ?
          `, [service.providerId]) as any[];

          if (ratingResult[0]?.avg_rating) {
            avgRating = parseFloat(ratingResult[0].avg_rating);
          }
        }
      } catch (error) {
        console.log('Error getting average rating, using default value of 4.5:', error);
      }

      // Format the service data
      return {
        id: service.id,
        name: service.name,
        cremationCenter: service.providerName,
        category: service.category.toLowerCase(),
        price: `₱${parseFloat(service.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        priceValue: parseFloat(service.price),
        bookings: bookingCount,
        status: service.status ? 'active' : 'inactive',
        rating: avgRating,
        description: service.description || '',
        features: inclusions.map((inclusion: any) => inclusion.description),
        addOns: addons.map((addon: any) => {
          const price = parseFloat(addon.price || '0');
          return `${addon.description}${price > 0 ? ` (+₱${price.toLocaleString('en-US')})` : ''}`;
        }),
        image: images.length > 0 ? images[0].image_path : '',
        images: images.map((img: any) => img.image_path),
        processingTime: service.processingTime,
        cremationType: service.cremationType,
        conditions: service.conditions,
        providerId: service.providerId
      };
    }));

    return NextResponse.json({
      success: true,
      services: enhancedServices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({
      error: 'Failed to fetch services',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
