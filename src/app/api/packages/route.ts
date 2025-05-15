import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import * as fs from 'fs';
import { join } from 'path';

// GET endpoint to fetch packages
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');
    const packageId = url.searchParams.get('packageId');
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    // If packageId is provided, fetch a specific package
    if (packageId) {
      return await getPackageById(parseInt(packageId), includeInactive);
    }

    // If providerId is provided, fetch packages for that provider
    if (providerId) {
      return await getPackagesByProviderId(parseInt(providerId), includeInactive);
    }

    // Otherwise, fetch all packages (with pagination)
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Modify the query to optionally include inactive packages
    const activeClause = includeInactive ? '' : 'WHERE sp.is_active = TRUE';

    const packagesResult = await query(`
      SELECT
        sp.id,
        sp.name,
        sp.description,
        sp.category,
        sp.cremation_type as cremationType,
        sp.processing_time as processingTime,
        sp.price,
        sp.conditions,
        sp.is_active as isActive,
        svp.name as providerName,
        svp.id as providerId
      FROM service_packages sp
      JOIN service_providers svp ON sp.service_provider_id = svp.id
      ${activeClause}
      ORDER BY sp.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]) as any[];

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total FROM service_packages ${includeInactive ? '' : 'WHERE is_active = TRUE'}
    `) as any[];

    const total = countResult[0]?.total || 0;

    // Enhance packages with inclusions, add-ons, and images
    const enhancedPackages = await enhancePackagesWithDetails(packagesResult);

    return NextResponse.json({
      packages: enhancedPackages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({
      error: 'Failed to fetch packages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST endpoint to create a new package
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Only allow business users to create packages
    if (accountType !== 'business') {
      return NextResponse.json({
        error: 'Only business accounts can create packages'
      }, { status: 403 });
    }

    // Get service provider ID
    const providerResult = await query(
      'SELECT id FROM service_providers WHERE user_id = ?',
      [userId]
    ) as any[];

    if (!providerResult || providerResult.length === 0) {
      return NextResponse.json({
        error: 'Service provider not found'
      }, { status: 404 });
    }

    const providerId = providerResult[0].id;

    // Get package data from request body
    const body = await request.json();
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
      images = []
    } = body;

    // Validate required fields
    if (!name || !description || !price) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Start a transaction
    await query('START TRANSACTION');

    try {
      // Insert package
      const packageResult = await query(`
        INSERT INTO service_packages (
          service_provider_id, name, description, category, cremation_type,
          processing_time, price, conditions, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
      `, [
        providerId, name, description, category, cremationType,
        processingTime, price, conditions
      ]) as any;

      const packageId = packageResult.insertId;

      // Insert inclusions
      if (inclusions.length > 0) {
        for (const inclusion of inclusions) {
          await query(
            'INSERT INTO package_inclusions (package_id, description) VALUES (?, ?)',
            [packageId, inclusion]
          );
        }
      }

      // Insert add-ons
      if (addOns.length > 0) {
        for (const addOn of addOns) {
          // Parse price from add-on string if it contains a price
          let addOnText = addOn;
          let addOnPrice = null;

          const priceMatch = addOn.match(/\(\+₱([\d,]+)\)/);
          if (priceMatch) {
            addOnPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
            addOnText = addOn.replace(/\s*\(\+₱[\d,]+\)/, '').trim();
          }

          await query(
            'INSERT INTO package_addons (package_id, description, price) VALUES (?, ?, ?)',
            [packageId, addOnText, addOnPrice]
          );
        }
      }

      // Process images - move them to the package folder and update paths
      const updatedImages = await moveImagesToPackageFolder(images, packageId);

      // Insert images with updated paths
      if (updatedImages.length > 0) {
        for (let i = 0; i < updatedImages.length; i++) {
          await query(
            'INSERT INTO package_images (package_id, image_path, display_order) VALUES (?, ?, ?)',
            [packageId, updatedImages[i], i]
          );
        }
      }

      // Commit the transaction
      await query('COMMIT');

      return NextResponse.json({
        success: true,
        packageId,
        message: 'Package created successfully',
        updatedImages // Return updated image paths for client-side UI update
      });
    } catch (error) {
      // Rollback the transaction on error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json({
      error: 'Failed to create package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to get a specific package by ID
async function getPackageById(packageId: number, includeInactive: boolean = false) {
  try {
    // When fetching by ID, always include inactive packages
    // This allows editing deactivated packages
    const packageResult = await query(`
      SELECT
        sp.id,
        sp.name,
        sp.description,
        sp.category,
        sp.cremation_type as cremationType,
        sp.processing_time as processingTime,
        sp.price,
        sp.conditions,
        sp.is_active as isActive,
        svp.name as providerName,
        svp.id as providerId
      FROM service_packages sp
      JOIN service_providers svp ON sp.service_provider_id = svp.id
      WHERE sp.id = ?
      LIMIT 1
    `, [packageId]) as any[];

    if (!packageResult || packageResult.length === 0) {
      return NextResponse.json({
        error: 'Package not found'
      }, { status: 404 });
    }

    // Enhance package with inclusions, add-ons, and images
    const enhancedPackages = await enhancePackagesWithDetails([packageResult[0]]);

    return NextResponse.json({
      package: enhancedPackages[0]
    });
  } catch (error) {
    console.error(`Error fetching package ${packageId}:`, error);
    return NextResponse.json({
      error: 'Failed to fetch package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to get packages by provider ID
async function getPackagesByProviderId(providerId: number, includeInactive: boolean = false) {
  try {
    console.log(`Fetching packages for provider ID: ${providerId}, includeInactive: ${includeInactive}`);
    
    // Check if this is one of our test providers
    if (providerId === 1001 || providerId === 1002 || providerId === 1003) {
      // Return test packages for this provider
      const testPackages = getTestPackagesForProvider(providerId);
      console.log(`Returning ${testPackages.length} test packages for provider ${providerId}`);

      return NextResponse.json({
        packages: testPackages
      });
    }
    
    // Modify the query to optionally include inactive packages
    const activeClause = includeInactive ? '' : 'AND sp.is_active = TRUE';
    
    // Check which columns exist in service_packages table
    const packageColumnsResult = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'service_packages'
    `) as any[];
    
    const packageColumns = packageColumnsResult.map(col => col.COLUMN_NAME.toLowerCase());
    const hasServiceProviderId = packageColumns.includes('service_provider_id');
    const hasProviderId = packageColumns.includes('provider_id');
    const hasBusinessId = packageColumns.includes('business_id');
    
    console.log(`Package columns found - service_provider_id: ${hasServiceProviderId}, provider_id: ${hasProviderId}, business_id: ${hasBusinessId}`);
    
    let packagesResult = [] as any[];
    
    // Try to get packages using service_provider_id first
    if (hasServiceProviderId) {
      console.log(`Fetching packages with service_provider_id = ${providerId}`);
      packagesResult = await query(`
        SELECT
          sp.id,
          sp.name,
          sp.description,
          sp.category,
          sp.cremation_type as cremationType,
          sp.processing_time as processingTime,
          sp.price,
          sp.conditions,
          sp.is_active as isActive,
          svp.name as providerName,
          svp.id as providerId
        FROM service_packages sp
        JOIN service_providers svp ON sp.service_provider_id = svp.id
        WHERE sp.service_provider_id = ? ${activeClause}
        ORDER BY sp.created_at DESC
      `, [providerId]) as any[];
    } 
    // If no packages found or no service_provider_id column, try provider_id
    else if (hasProviderId) {
      console.log(`Fetching packages with provider_id = ${providerId}`);
      packagesResult = await query(`
        SELECT
          sp.id,
          sp.name,
          sp.description,
          sp.category,
          sp.cremation_type as cremationType,
          sp.processing_time as processingTime,
          sp.price,
          sp.conditions,
          sp.is_active as isActive,
          svp.name as providerName,
          svp.id as providerId
        FROM service_packages sp
        JOIN service_providers svp ON sp.provider_id = svp.id
        WHERE sp.provider_id = ? ${activeClause}
        ORDER BY sp.created_at DESC
      `, [providerId]) as any[];
    }
    // If still no packages found, try business_id
    else if (hasBusinessId) {
      console.log(`Fetching packages with business_id = ${providerId}`);
      packagesResult = await query(`
        SELECT
          sp.id,
          sp.name,
          sp.description,
          sp.category,
          sp.cremation_type as cremationType,
          sp.processing_time as processingTime,
          sp.price,
          sp.conditions,
          sp.is_active as isActive,
          bp.business_name as providerName,
          bp.id as providerId
        FROM service_packages sp
        JOIN business_profiles bp ON sp.business_id = bp.id
        WHERE sp.business_id = ? ${activeClause}
        ORDER BY sp.created_at DESC
      `, [providerId]) as any[];
    }
    
    console.log(`Found ${packagesResult.length} packages for provider ${providerId}`);

    // Enhance packages with inclusions, add-ons, and images
    const enhancedPackages = await enhancePackagesWithDetails(packagesResult);

    return NextResponse.json({
      packages: enhancedPackages
    });
  } catch (error) {
    console.error(`Error fetching packages for provider ${providerId}:`, error);
    return NextResponse.json({
      error: 'Failed to fetch packages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Function to get test packages for test providers
function getTestPackagesForProvider(providerId: number) {
  // Sample test data
  const testPackages = {
    1001: [
      {
        id: 10001,
        name: "Basic Cremation",
        description: "Standard cremation service for small pets",
        category: "Communal",
        cremationType: "Standard",
        processingTime: "3-4 days",
        price: 2500,
        conditions: "Suitable for pets up to 10kg",
        providerName: "Happy Tails Cremation",
        providerId: 1001,
        inclusions: ["Basic urn", "Memorial certificate"],
        addOns: ["Paw print keepsake (+₱500)"],
        images: ["/images/sample-package-1.jpg", "/images/sample-package-2.jpg"],
        isActive: true
      },
      {
        id: 10002,
        name: "Private Cremation",
        description: "Individual cremation with return of ashes",
        category: "Private",
        cremationType: "Premium",
        processingTime: "1-2 days",
        price: 4500,
        conditions: "Available for all pet sizes",
        providerName: "Happy Tails Cremation",
        providerId: 1001,
        inclusions: ["Private viewing room", "Custom wooden urn", "Memorial certificate", "Paw print keepsake"],
        addOns: ["Fur clipping (+₱300)", "Memorial jewelry (+₱1200)"],
        images: ["/images/sample-package-3.jpg"],
        isActive: true
      },
      {
        id: 10003,
        name: "Premium Memorial Package",
        description: "Complete memorial service with premium keepsakes",
        category: "Private",
        cremationType: "Premium",
        processingTime: "Same day",
        price: 8000,
        conditions: "Booking must be made 24 hours in advance",
        providerName: "Happy Tails Cremation",
        providerId: 1001,
        inclusions: ["Private viewing room", "Custom engraved urn", "Memorial photo frame", "Paw print in clay", "Fur clipping", "Memorial certificate"],
        addOns: ["Professional photography (+₱2000)", "Video tribute (+₱1500)"],
        images: ["/images/sample-package-4.jpg", "/images/sample-package-5.jpg", "/images/sample-package-1.jpg"],
        isActive: false
      }
    ],
    1002: [
      {
        id: 10004,
        name: "Essential Cremation",
        description: "Basic cremation service with standard urn",
        category: "Private",
        cremationType: "Standard",
        processingTime: "2-3 days",
        price: 3500,
        conditions: "For pets up to 20kg",
        providerName: "Peaceful Paws Memorial",
        providerId: 1002,
        inclusions: ["Standard ceramic urn", "Memorial certificate", "Complimentary pet transport within 10km"],
        addOns: ["Premium wooden urn (+₱800)"],
        images: ["/images/sample-package-2.jpg"],
        isActive: true
      },
      {
        id: 10005,
        name: "Classic Memorial Service",
        description: "Traditional memorial service with viewing room",
        category: "Private",
        cremationType: "Deluxe",
        processingTime: "24 hours",
        price: 6000,
        conditions: "Viewing room available for up to 1 hour. Maximum 6 attendees.",
        providerName: "Peaceful Paws Memorial",
        providerId: 1002,
        inclusions: ["Private viewing room", "Premium hardwood urn", "Memorial photo display", "Paw print in clay", "Memorial certificate"],
        addOns: ["Video recording of service (+₱1,500)", "Memorial book (+₱800)"],
        images: ["/images/sample-package-3.jpg", "/images/sample-package-1.jpg"],
        isActive: true
      }
    ],
    1003: [
      {
        id: 10006,
        name: "Home Comfort Package",
        description: "Compassionate at-home collection and private cremation",
        category: "Private",
        cremationType: "Premium",
        processingTime: "2 days",
        price: 5000,
        conditions: "Available for all pet sizes. Includes home collection within 15km radius.",
        providerName: "Forever Friends Pet Services",
        providerId: 1003,
        inclusions: ["Home collection service", "Private viewing room access", "Wooden urn", "Memorial certificate", "Paw print keepsake"],
        addOns: ["Clay paw impression (+₱700)", "Custom photo urn (+₱1,500)"],
        images: ["/images/sample-package-4.jpg", "/images/sample-package-5.jpg"],
        isActive: true
      },
      {
        id: 10007,
        name: "Family Farewell Package",
        description: "Private viewing and ceremony before cremation",
        category: "Private",
        cremationType: "Deluxe",
        processingTime: "1-2 days",
        price: 7500,
        conditions: "Viewing room available for up to 2 hours. Up to 10 family members.",
        providerName: "Forever Friends Pet Services",
        providerId: 1003,
        inclusions: ["Private viewing room", "Ceremony coordination", "Premium wooden urn", "Memorial photo display", "Paw print in clay", "Memorial certificate"],
        addOns: ["Professional photography (+₱2,000)", "Catering services (+₱3,500)"],
        images: ["/images/sample-package-1.jpg", "/images/sample-package-2.jpg"],
        isActive: true
      },
      {
        id: 10008,
        name: "Rainbow Bridge Memorial",
        description: "Complete memorial service with custom tributes",
        category: "Private",
        cremationType: "Deluxe",
        processingTime: "Same day",
        price: 9500,
        conditions: "Includes all services and home delivery of remains within 20km radius.",
        providerName: "Forever Friends Pet Services",
        providerId: 1003,
        inclusions: ["Custom engraved urn", "Memorial video tribute", "Printed memorial booklets", "Paw print jewelry", "Fur clipping keepsake", "Memorial certificate", "Flower arrangement"],
        addOns: ["Live memorial service streaming (+₱1,800)", "Custom portrait painting (+₱4,500)"],
        images: ["/images/sample-package-3.jpg", "/images/sample-package-4.jpg", "/images/sample-package-5.jpg"],
        isActive: true
      },
      {
        id: 10009,
        name: "Basic Community Cremation",
        description: "Affordable communal cremation service",
        category: "Communal",
        cremationType: "Standard",
        processingTime: "3-4 days",
        price: 2500,
        conditions: "Communal cremation with other pets. No remains returned.",
        providerName: "Forever Friends Pet Services",
        providerId: 1003,
        inclusions: ["Memorial certificate", "Donation to animal shelter in pet's name"],
        addOns: ["Memorial plaque in community garden (+₱1,200)"],
        images: ["/images/sample-package-2.jpg"],
        isActive: true
      }
    ]
  };

  return testPackages[providerId as keyof typeof testPackages] || [];
}

// Helper function to enhance packages with their details
async function enhancePackagesWithDetails(packages: any[]) {
  if (!packages || packages.length === 0) {
    return [];
  }

  // Get all package IDs
  const packageIds = packages.map(pkg => pkg.id);

  // Fetch inclusions for all packages
  const inclusions = await query(`
    SELECT package_id, description
    FROM package_inclusions
    WHERE package_id IN (?)
  `, [packageIds]) as any[];

  // Fetch add-ons for all packages
  const addOns = await query(`
    SELECT package_id, description, price
    FROM package_addons
    WHERE package_id IN (?)
  `, [packageIds]) as any[];

  // Fetch images for all packages
  const images = await query(`
    SELECT package_id, image_path
    FROM package_images
    WHERE package_id IN (?)
    ORDER BY display_order ASC
  `, [packageIds]) as any[];

  // Group by package ID
  const inclusionsByPackage = groupBy(inclusions, 'package_id');
  const addOnsByPackage = groupBy(addOns, 'package_id');
  const imagesByPackage = groupBy(images, 'package_id');

  // Enhance each package with its details
  return packages.map(pkg => {
    const pkgInclusions = inclusionsByPackage[pkg.id] || [];
    const pkgAddOns = addOnsByPackage[pkg.id] || [];
    const pkgImages = imagesByPackage[pkg.id] || [];

    // Format add-ons
    const formattedAddOns = pkgAddOns.map((addOn: any) => {
      let text = addOn.description || '';
      if (addOn.price) {
        text += ` (+₱${parseFloat(addOn.price).toLocaleString()})`;
      }
      return text;
    });

    // Process images to ensure they have proper paths
    const processedImages = pkgImages.map((img: any) => {
      if (!img.image_path) return null;
      let path = img.image_path;
      
      console.log(`Processing image path: ${path}`);
      
      // Skip blob URLs
      if (path.startsWith('blob:')) {
        console.log(`Skipping blob URL: ${path}`);
        return null;
      }
      
      // If path starts with http:// or https://, it's already a full URL
      if (path.startsWith('http://') || path.startsWith('https://')) {
        console.log(`Using full URL as is: ${path}`);
        return path;
      }
      
      // Handle paths from package_images table that might be relative to public folder
      if (path.startsWith('/')) {
        // Remove leading slash for consistency
        path = path.substring(1);
        console.log(`Removed leading slash: ${path}`);
      }
      
      // For files in uploads/packages/ directory - most reliable approach
      if (path.includes('uploads/packages/package_')) {
        // Use the filename directly with the correct path prefix
        const filename = path.split('/').pop();
        if (filename) {
          const fullPath = `/uploads/packages/${filename}`;
          console.log(`Using direct upload path with filename: ${fullPath}`);
          return fullPath;
        }
      }
      
      // For paths in uploads/packages/ directory but without the common format
      if (path.includes('uploads/packages/')) {
        const fullPath = `/${path.replace(/^\//, '')}`;
        console.log(`Using package upload path: ${fullPath}`);
        return fullPath;
      }
      
      // For sample data that has paths like bg_2.png
      if (path.match(/^bg_\d+\.png$/)) {
        console.log(`Using background image path: /${path}`);
        return `/${path}`;
      }
      
      // For paths in uploads directory
      if (path.includes('uploads/')) {
        const fullPath = `/${path.replace(/^\//, '')}`;
        console.log(`Using uploads path: ${fullPath}`);
        return fullPath;
      }
      
      // Default approach for images stored in public directory
      console.log(`Using default path approach: /${path}`);
      return `/${path}`;
    }).filter(Boolean);

    // If no valid images found and this is a production package, add sample images
    if (processedImages.length === 0) {
      // Use some placeholder images for testing
      const sampleImageNum = (pkg.id % 5) + 1; // Use ID to get a consistent but varied image
      processedImages.push(`/images/sample-package-${sampleImageNum}.jpg`);
      console.log(`Added default sample image for package ${pkg.id}: /images/sample-package-${sampleImageNum}.jpg`);
    }

    return {
      ...pkg,
      inclusions: pkgInclusions.map((inc: any) => inc.description),
      addOns: formattedAddOns,
      images: processedImages
    };
  });
}

// Helper function to group arrays by a key
function groupBy(array: any[], key: string) {
  return array.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
}

/**
 * Moves temporary package images to a package-specific folder after package creation
 * @param images Array of image paths
 * @param packageId The newly created package ID
 * @returns Array of updated image paths
 */
async function moveImagesToPackageFolder(images: string[], packageId: number): Promise<string[]> {
  // If no images or invalid package ID, return as is
  if (!images.length || !packageId) return images;
  
  console.log(`Moving ${images.length} images to package folder for package ID ${packageId}`);
  
  // Create package directory if it doesn't exist
  const baseDir = join(process.cwd(), 'public', 'uploads', 'packages');
  const packageDir = join(baseDir, packageId.toString());
  
  if (!fs.existsSync(packageDir)) {
    try {
      fs.mkdirSync(packageDir, { recursive: true });
      console.log(`Created package directory: ${packageDir}`);
    } catch (err) {
      console.error(`Failed to create directory for package ${packageId}:`, err);
      return images; // Return original paths if directory creation fails
    }
  }
  
  // Process each image
  const updatedPaths = await Promise.all(images.map(async (imagePath) => {
    // Skip images that are already in the correct folder
    if (imagePath.includes(`/uploads/packages/${packageId}/`)) {
      console.log(`Image already in correct folder: ${imagePath}`);
      return imagePath;
    }
    
    try {
      // Get source and destination paths
      const filename = imagePath.split('/').pop() as string;
      const sourcePath = join(process.cwd(), 'public', imagePath);
      const newRelativePath = `/uploads/packages/${packageId}/${filename}`;
      const destPath = join(process.cwd(), 'public', newRelativePath);
      
      // Check if source file exists
      if (!fs.existsSync(sourcePath)) {
        console.log(`Source file doesn't exist: ${sourcePath}`);
        return imagePath; // Return original path if file doesn't exist
      }
      
      // Copy file to new location
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Moved file: ${sourcePath} -> ${destPath}`);
      
      // Delete the original file
      try {
        fs.unlinkSync(sourcePath);
        console.log(`Deleted original file: ${sourcePath}`);
      } catch (deleteErr) {
        console.log(`Note: Could not delete original file ${sourcePath}:`, deleteErr);
        // Continue even if delete fails
      }
      
      return newRelativePath;
    } catch (error) {
      console.error(`Failed to move image ${imagePath}:`, error);
      return imagePath; // Return original path on error
    }
  }));
  
  return updatedPaths;
}
