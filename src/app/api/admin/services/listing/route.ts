import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import fs from 'fs';
import path from 'path';

// Function to check for existing images for a package
async function getPackageImages(packageId: number) {
  try {
    // First, check if we have entries in the package_images table
    const imagesResult = await query(`
      SELECT image_path
      FROM package_images
      WHERE package_id = ?
      ORDER BY display_order ASC
    `, [packageId]) as any[];
    
    if (imagesResult && imagesResult.length > 0) {
      // Process paths to ensure they have proper format
      const processedImages = imagesResult.map((img: any) => {
        if (!img.image_path) return null;
        let path = img.image_path;
        
        // If path starts with http:// or https://, it's already a full URL
        if (path.startsWith('http://') || path.startsWith('https://')) {
          return path;
        }
        
        // Handle paths from package_images table that might be relative to public folder
        if (!path.startsWith('/')) {
          path = `/${path}`;
        }
        
        return path;
      }).filter(Boolean);
      
      if (processedImages.length > 0) {
        return processedImages;
      }
    }
    
    // If no database entries, check the filesystem for common patterns
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'packages');
    let packageImages: string[] = [];
    
    // Only try to read directory if it exists
    if (fs.existsSync(uploadsDir)) {
      try {
        const files = fs.readdirSync(uploadsDir);
        
        // Look for files matching our package ID
        const packageFiles = files.filter(file => {
          // Match different patterns: 
          // - package_ID_timestamp.ext
          // - ID.ext
          return (
            file.startsWith(`package_${packageId}_`) || 
            file === `${packageId}.jpg` || 
            file === `${packageId}.png`
          );
        });
        
        packageImages = packageFiles.map(file => `/uploads/packages/${file}`);
      } catch (err) {
        console.error('Error reading uploads directory:', err);
      }
    }
    
    // Return empty array if no images are found
    return packageImages;
  } catch (error) {
    console.error(`Error getting images for package ${packageId}:`, error);
    // Return empty array instead of fallback image
    return [];
  }
}

// Function to find existing image files for a package
async function findPackageImagePaths(packageId: number) {
  try {
    const uploadsBaseDir = path.join(process.cwd(), 'public', 'uploads', 'packages');
    let packageImages: string[] = [];
    
    console.log(`Looking for images for package ID: ${packageId}`);
    
    // First, check for the package-specific folder (new structure)
    const packageDir = path.join(uploadsBaseDir, packageId.toString());
    if (fs.existsSync(packageDir)) {
      try {
        console.log(`Package directory exists: ${packageDir}`);
        const packageFiles = fs.readdirSync(packageDir);
        
        // Filter for image files only
        const imageFiles = packageFiles.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
        });
        
        if (imageFiles.length > 0) {
          console.log(`Found ${imageFiles.length} images in package directory:`, imageFiles);
          packageImages = imageFiles.map(file => `/uploads/packages/${packageId}/${file}`);
          return packageImages;
        }
      } catch (err) {
        console.error(`Error reading package directory for ID ${packageId}:`, err);
      }
    }
    
    // If no package directory or no images in it, check the root uploads directory (old structure)
    if (fs.existsSync(uploadsBaseDir)) {
      try {
        const files = fs.readdirSync(uploadsBaseDir);
        
        // Check for all package ID matches in the format of "package_[ID]_timestamp.ext"
        const exactMatches = files.filter(file => {
          // Check for common patterns:
          // - package_ID_timestamp.ext
          // - ID.ext
          return (
            file.startsWith(`package_${packageId}_`) || 
            file === `${packageId}.jpg` || 
            file === `${packageId}.png` ||
            file === `${packageId}.jpeg` ||
            file === `${packageId}.webp`
          );
        });
        
        if (exactMatches.length > 0) {
          console.log(`Found ${exactMatches.length} exact matches in root dir for package ${packageId}:`, exactMatches);
          packageImages = exactMatches.map(file => `/uploads/packages/${file}`);
          return packageImages;
        }
      } catch (err) {
        console.error('Error reading uploads root directory:', err);
      }
    }
    
    // Return empty array if no images found - don't add fallback sample images
    return [];
  } catch (error) {
    console.error(`Error finding images for package ${packageId}:`, error);
    // Return empty array instead of fallback
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication in production only
    const isDevelopment = process.env.NODE_ENV === 'development';
    let isAuthenticated = false;

    const authToken = getAuthTokenFromRequest(request);
    
    if (authToken) {
      // If we have a token, validate it
      const tokenParts = authToken.split('_');
      if (tokenParts.length === 2) {
        const accountType = tokenParts[1];
        isAuthenticated = accountType === 'admin';
      }
    } else if (isDevelopment) {
      // In development, allow requests without auth for testing
      console.log('Development mode: Bypassing authentication for testing');
      isAuthenticated = true;
    }

    // Check authentication result
    if (!isAuthenticated) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'all';
    const categoryFilter = searchParams.get('category') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // First check if service_packages table exists
    const hasServicePackages = await checkTableExists('service_packages');
    const hasServiceProviders = await checkTableExists('service_providers');

    if (!hasServicePackages) {
      return NextResponse.json({
        success: true,
        services: [],
        message: "No service tables found in database",
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      });
    }

    // Use a simpler query with hardcoded fields for stability
    // This prioritizes working code over dynamic adaptation
    const baseQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.created_at,
        p.updated_at,
        COALESCE(p.is_active, 1) as is_active,
        COALESCE(p.category, 'standard') as category,
        COALESCE(p.cremation_type, '') as cremationType,
        COALESCE(p.processing_time, '2-3 days') as processingTime,
        COALESCE(p.bookings_count, 0) as bookings_count,
        COALESCE(p.rating, 0) as rating,
        COALESCE(p.conditions, '') as conditions,
        sp.id as providerId,
        COALESCE(sp.name, 'Cremation Center') as providerName
      FROM 
        service_packages p
      LEFT JOIN 
        service_providers sp ON p.service_provider_id = sp.id OR p.provider_id = sp.id
      WHERE 1=1
    `;

    let whereClause = '';
    const queryParams: any[] = [];
    
    if (searchTerm) {
      whereClause += ` AND (p.name LIKE ? OR sp.name LIKE ?)`;
      queryParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (statusFilter !== 'all') {
      whereClause += ` AND p.is_active = ?`;
      queryParams.push(statusFilter === 'active' ? 1 : 0);
    }

    if (categoryFilter !== 'all') {
      whereClause += ` AND p.category = ?`;
      queryParams.push(categoryFilter);
    }

    // Complete the query with pagination
    const fullQuery = `${baseQuery} ${whereClause} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    console.log('Executing query:', fullQuery);
    console.log('Query params:', queryParams);

    // Execute the query with error handling
    let servicesResult;
    try {
      servicesResult = await query(fullQuery, queryParams) as any[];
    } catch (err) {
      console.error('Error executing service query:', err);
      // Try simplified query without joins if the first one fails
      try {
        const backupQuery = `
          SELECT 
            id, 
            name, 
            description, 
            price, 
            created_at, 
            updated_at,
            COALESCE(is_active, 1) as is_active,
            COALESCE(category, 'Private') as category,
            COALESCE(cremation_type, 'Standard') as cremationType,
            COALESCE(processing_time, '2-3 days') as processingTime,
            COALESCE(conditions, '') as conditions,
            'Cremation Center' as providerName,
            0 as providerId
          FROM service_packages
          LIMIT ? OFFSET ?
        `;
        servicesResult = await query(backupQuery, [limit, offset]) as any[];
      } catch (backupErr) {
        console.error('Backup query also failed:', backupErr);
        return NextResponse.json({
          success: true,
          services: [],
          error: `Database query error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0
          }
        });
      }
    }

    // Count total records - use a simplified count query for stability
    let total = 0;
    try {
      const countResult = await query(`SELECT COUNT(*) as total FROM service_packages`) as any[];
      total = countResult[0]?.total || 0;
    } catch (countErr) {
      console.error('Error counting services:', countErr);
      total = servicesResult.length;
    }

    // Format services for response
    const formattedServicesPromises = servicesResult.map(async (service: any) => {
      // Determine status based on is_active field
      const status = service.is_active ? 'active' : 'inactive';

      // Format price with PHP sign
      const priceValue = parseFloat(service.price || '0');
      const formattedPrice = `₱${priceValue.toLocaleString('en-US', { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

      // Find possible image paths for this package
      const imagePaths = await findPackageImagePaths(service.id);
      
      // Debug output for each package ID 
      console.log(`Service ID ${service.id} has image paths:`, imagePaths);

      // Get package inclusions and add-ons
      let inclusions = [];
      let addOns = [];
      
      try {
        const inclusionsResult = await query(
          `SELECT description FROM package_inclusions WHERE package_id = ?`,
          [service.id]
        ) as any[];
        
        inclusions = inclusionsResult.map((item: any) => item.description);
        
        const addOnsResult = await query(
          `SELECT description FROM package_addons WHERE package_id = ?`,
          [service.id]
        ) as any[];
        
        addOns = addOnsResult.map((item: any) => item.description);
      } catch (err) {
        console.error(`Error fetching inclusions/add-ons for package ${service.id}:`, err);
      }

      return {
        id: service.id,
        name: service.name || 'Unnamed Service',
        description: service.description || '',
        category: (service.category || 'standard').toLowerCase(),
        cremationType: service.cremationType || 'Standard',
        processingTime: service.processingTime || '2-3 days',
        price: formattedPrice,
        priceValue: priceValue,
        conditions: service.conditions || '',
        status,
        cremationCenter: service.providerName || 'Cremation Center',
        providerId: service.providerId || 0,
        rating: service.rating || 0,
        bookings: service.bookings_count || 0,
        image: imagePaths[0], // Use first image path
        images: imagePaths, // Include all potential paths
        inclusions: inclusions,
        addOns: addOns
      };
    });

    const formattedServices = await Promise.all(formattedServicesPromises);

    return NextResponse.json({
      success: true,
      services: formattedServices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching services listing:', error);
    
    return NextResponse.json({
      success: true, // Return success:true even with errors to avoid breaking UI
      error: 'Failed to fetch services',
      details: error instanceof Error ? error.message : 'Unknown error',
      services: []
    });
  }
}

// Helper function to check if a table exists
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await query(`SHOW TABLES LIKE '${tableName}'`) as any[];
    return result.length > 0;
  } catch (err) {
    console.error(`Error checking if table ${tableName} exists:`, err);
    return false;
  }
} 