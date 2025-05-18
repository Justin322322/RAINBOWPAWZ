import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import * as fs from 'fs';
import { join } from 'path';
import { getImagePath } from '@/utils/imagePathUtils';

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
        console.log('Processing add-ons for new package:', JSON.stringify(addOns, null, 2));

        for (const addOn of addOns) {
          // Handle both new format (object with name and price) and legacy format (string)
          let addOnText;
          let addOnPrice = null;

          if (typeof addOn === 'string') {
            // Legacy format: parse price from add-on string if it contains a price
            addOnText = addOn;
            const priceMatch = addOn.match(/\(\+₱([\d,]+)\)/);
            if (priceMatch) {
              addOnPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
              addOnText = addOn.replace(/\s*\(\+₱[\d,]+\)/, '').trim();
            }
            console.log(`Parsed string add-on: "${addOnText}" with price: ${addOnPrice}`);
          } else if (typeof addOn === 'object' && addOn !== null) {
            // New format: object with name and price properties
            addOnText = addOn.name;

            // Handle price conversion carefully
            if (addOn.price !== undefined && addOn.price !== null) {
              // Convert to number and ensure it's a valid number
              const parsedPrice = parseFloat(String(addOn.price));
              addOnPrice = !isNaN(parsedPrice) ? parsedPrice : null;
            } else {
              addOnPrice = null;
            }

            console.log(`Parsed object add-on: "${addOnText}" with price: ${addOnPrice}, original:`, addOn);
          } else {
            // Skip invalid add-ons
            console.log('Skipping invalid add-on:', addOn);
            continue;
          }

          // Skip empty add-ons
          if (!addOnText || addOnText.trim() === '') {
            console.log('Skipping empty add-on');
            continue;
          }

          console.log(`Inserting add-on: "${addOnText}", price: ${addOnPrice}`);

          try {
            // Check if the package_addons table has an auto-increment id column
            const tableInfoResult = await query(`
              SELECT COLUMN_NAME, EXTRA
              FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'package_addons'
              AND COLUMN_NAME = 'id'
            `) as any[];

            const hasAutoIncrement = tableInfoResult.length > 0 &&
                                    tableInfoResult[0].EXTRA.includes('auto_increment');

            // If id is not auto_increment, we need to generate an ID
            if (!hasAutoIncrement) {
              // Get the max ID from the table
              const maxIdResult = await query('SELECT MAX(id) as maxId FROM package_addons') as any[];
              const nextId = maxIdResult[0].maxId ? maxIdResult[0].maxId + 1 : 1;

              // Insert with explicit ID
              await query(
                'INSERT INTO package_addons (id, package_id, description, price) VALUES (?, ?, ?, ?)',
                [nextId, packageId, addOnText, addOnPrice]
              );
              console.log(`Inserted add-on with explicit ID ${nextId}`);
            } else {
              // Insert normally with auto-increment
              await query(
                'INSERT INTO package_addons (package_id, description, price) VALUES (?, ?, ?)',
                [packageId, addOnText, addOnPrice]
              );
              console.log('Inserted add-on with auto-increment ID');
            }
          } catch (insertError) {
            console.error('Error inserting add-on:', insertError);
            // Log more details about the error
            console.error('Error details:', {
              message: insertError.message,
              code: insertError.code,
              sqlState: insertError.sqlState,
              sqlMessage: insertError.sqlMessage
            });
            throw insertError; // Re-throw to trigger transaction rollback
          }
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
    return NextResponse.json({
      error: 'Failed to fetch package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to get packages by provider ID
async function getPackagesByProviderId(providerId: number, includeInactive: boolean = false) {
  try {

    // Check if this is one of our test providers
    if (providerId === 1001 || providerId === 1002 || providerId === 1003) {
      // Return test packages for this provider
      const testPackages = getTestPackagesForProvider(providerId);

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


    let packagesResult = [] as any[];

    // Try to get packages using service_provider_id first
    if (hasServiceProviderId) {
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


    // Enhance packages with inclusions, add-ons, and images
    const enhancedPackages = await enhancePackagesWithDetails(packagesResult);

    return NextResponse.json({
      packages: enhancedPackages
    });
  } catch (error) {
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
      const path = img.image_path;

      // Skip blob URLs
      if (path.startsWith('blob:')) {
        return null;
      }

      // If path starts with http:// or https://, it's already a full URL
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
      }

      // Use our utility function to get a consistent image path
      return getImagePath(path);
    }).filter(Boolean);

    // If no valid images found and this is a production package, add sample images
    if (processedImages.length === 0) {
      // Use some placeholder images for testing
      const sampleImageNum = (pkg.id % 5) + 1; // Use ID to get a consistent but varied image
      processedImages.push(`/images/sample-package-${sampleImageNum}.jpg`);
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


  // Create package directory if it doesn't exist
  const baseDir = join(process.cwd(), 'public', 'uploads', 'packages');
  const packageDir = join(baseDir, packageId.toString());

  if (!fs.existsSync(packageDir)) {
    try {
      fs.mkdirSync(packageDir, { recursive: true });
    } catch (err) {
      return images; // Return original paths if directory creation fails
    }
  }

  // Process each image
  const updatedPaths = await Promise.all(images.map(async (imagePath) => {
    // Skip images that are already in the correct folder
    if (imagePath.includes(`/uploads/packages/${packageId}/`)) {
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
        return imagePath; // Return original path if file doesn't exist
      }

      // Copy file to new location
      fs.copyFileSync(sourcePath, destPath);

      // Delete the original file
      try {
        fs.unlinkSync(sourcePath);
      } catch (deleteErr) {
        // Continue even if delete fails
      }

      return newRelativePath;
    } catch (error) {
      return imagePath; // Return original path on error
    }
  }));

  return updatedPaths;
}
