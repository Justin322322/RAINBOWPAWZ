import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// GET endpoint to fetch packages
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');
    const packageId = url.searchParams.get('packageId');

    // If packageId is provided, fetch a specific package
    if (packageId) {
      return await getPackageById(parseInt(packageId));
    }

    // If providerId is provided, fetch packages for that provider
    if (providerId) {
      return await getPackagesByProviderId(parseInt(providerId));
    }

    // Otherwise, fetch all packages (with pagination)
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

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
        svp.name as providerName,
        svp.id as providerId
      FROM service_packages sp
      JOIN service_providers svp ON sp.service_provider_id = svp.id
      WHERE sp.is_active = TRUE
      ORDER BY sp.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]) as any[];

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total FROM service_packages
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

      // Insert images
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await query(
            'INSERT INTO package_images (package_id, image_path, display_order) VALUES (?, ?, ?)',
            [packageId, images[i], i]
          );
        }
      }

      // Commit the transaction
      await query('COMMIT');

      return NextResponse.json({
        success: true,
        packageId,
        message: 'Package created successfully'
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
async function getPackageById(packageId: number) {
  try {
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
        svp.name as providerName,
        svp.id as providerId
      FROM service_packages sp
      JOIN service_providers svp ON sp.service_provider_id = svp.id
      WHERE sp.id = ? AND sp.is_active = TRUE
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
async function getPackagesByProviderId(providerId: number) {
  try {
    // Check if this is one of our test providers
    if (providerId === 1001 || providerId === 1002 || providerId === 1003) {
      // Return test packages for this provider
      const testPackages = getTestPackagesForProvider(providerId);

      return NextResponse.json({
        packages: testPackages
      });
    }

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
        svp.name as providerName,
        svp.id as providerId
      FROM service_packages sp
      JOIN service_providers svp ON sp.service_provider_id = svp.id
      WHERE sp.service_provider_id = ? AND sp.is_active = TRUE
      ORDER BY sp.created_at DESC
    `, [providerId]) as any[];

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
  const testPackages = {
    1001: [
      {
        id: 10001,
        name: "Basic Cremation Package",
        description: "Simple cremation service with standard urn",
        category: "Communal",
        cremationType: "Standard",
        processingTime: "2-3 days",
        price: 3500,
        conditions: "For pets up to 50 lbs. Additional fees may apply for larger pets.",
        providerName: "Rainbow Bridge Pet Cremation",
        providerId: 1001,
        inclusions: ["Standard clay urn", "Memorial certificate", "Paw print impression"],
        addOns: ["Personalized nameplate (+₱500)", "Photo frame (+₱800)"],
        images: []
      },
      {
        id: 10002,
        name: "Premium Cremation Package",
        description: "Private cremation with premium urn and memorial certificate",
        category: "Private",
        cremationType: "Premium",
        processingTime: "1-2 days",
        price: 5500,
        conditions: "For pets up to 80 lbs. Includes home pickup within 10km radius.",
        providerName: "Rainbow Bridge Pet Cremation",
        providerId: 1001,
        inclusions: ["Premium wooden urn", "Memorial certificate", "Paw print keepsake", "Fur clipping", "Photo memorial"],
        addOns: ["Custom engraving (+₱800)", "Additional keepsake urns (+₱1,200)"],
        images: []
      },
      {
        id: 10003,
        name: "Deluxe Memorial Package",
        description: "Comprehensive memorial service with deluxe urn and keepsakes",
        category: "Private",
        cremationType: "Deluxe",
        processingTime: "Same day",
        price: 8500,
        conditions: "Available for all pet sizes. Includes home pickup and delivery within 20km radius.",
        providerName: "Rainbow Bridge Pet Cremation",
        providerId: 1001,
        inclusions: ["Deluxe marble urn", "Memorial photo book", "Paw print in clay", "Fur clipping in glass pendant", "Memorial certificate", "Flower arrangement"],
        addOns: ["Video memorial tribute (+₱1,500)", "Additional keepsake jewelry (+₱1,800)"],
        images: []
      }
    ],
    1002: [
      {
        id: 10004,
        name: "Eco-Friendly Cremation",
        description: "Environmentally conscious cremation with biodegradable urn",
        category: "Private",
        cremationType: "Standard",
        processingTime: "2-3 days",
        price: 4500,
        conditions: "For pets up to 60 lbs. Includes tree planting certificate.",
        providerName: "Peaceful Paws Memorial",
        providerId: 1002,
        inclusions: ["Biodegradable urn", "Tree planting certificate", "Memorial seed packet", "Paw print keepsake"],
        addOns: ["Memorial garden stone (+₱1,200)", "Photo frame made from reclaimed wood (+₱900)"],
        images: []
      },
      {
        id: 10005,
        name: "Water Memorial Package",
        description: "Special water-soluble urn for water ceremonies",
        category: "Private",
        cremationType: "Premium",
        processingTime: "3-4 days",
        price: 6000,
        conditions: "Includes detailed instructions for water memorial ceremony.",
        providerName: "Peaceful Paws Memorial",
        providerId: 1002,
        inclusions: ["Water-soluble urn", "Memorial certificate", "Ceremony guide", "Biodegradable flowers", "Paw print keepsake"],
        addOns: ["Professional ceremony coordination (+₱2,500)", "Video recording of ceremony (+₱1,500)"],
        images: []
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
        images: []
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
        images: []
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
        images: []
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
        images: []
      }
    ]
  };

  return testPackages[providerId as keyof typeof testPackages] || [];
}

// Helper function to enhance packages with their details
async function enhancePackagesWithDetails(packages: any[]) {
  if (!packages || packages.length === 0) return [];

  const packageIds = packages.map(pkg => pkg.id);

  // Fetch inclusions for all packages
  const inclusionsResult = await query(`
    SELECT package_id, description
    FROM package_inclusions
    WHERE package_id IN (?)
  `, [packageIds]) as any[];

  // Fetch add-ons for all packages
  const addOnsResult = await query(`
    SELECT package_id, description, price
    FROM package_addons
    WHERE package_id IN (?)
  `, [packageIds]) as any[];

  // Fetch images for all packages
  const imagesResult = await query(`
    SELECT package_id, image_path
    FROM package_images
    WHERE package_id IN (?)
    ORDER BY display_order ASC
  `, [packageIds]) as any[];

  // Group details by package ID
  const inclusionsByPackage: Record<number, string[]> = {};
  const addOnsByPackage: Record<number, string[]> = {};
  const imagesByPackage: Record<number, string[]> = {};

  inclusionsResult.forEach((inclusion: any) => {
    if (!inclusionsByPackage[inclusion.package_id]) {
      inclusionsByPackage[inclusion.package_id] = [];
    }
    inclusionsByPackage[inclusion.package_id].push(inclusion.description);
  });

  addOnsResult.forEach((addOn: any) => {
    if (!addOnsByPackage[addOn.package_id]) {
      addOnsByPackage[addOn.package_id] = [];
    }

    let addOnText = addOn.description;
    if (addOn.price) {
      addOnText += ` (+₱${addOn.price.toLocaleString()})`;
    }

    addOnsByPackage[addOn.package_id].push(addOnText);
  });

  imagesResult.forEach((image: any) => {
    if (!imagesByPackage[image.package_id]) {
      imagesByPackage[image.package_id] = [];
    }
    imagesByPackage[image.package_id].push(image.image_path);
  });

  // Enhance each package with its details
  return packages.map(pkg => ({
    ...pkg,
    inclusions: inclusionsByPackage[pkg.id] || [],
    addOns: addOnsByPackage[pkg.id] || [],
    images: imagesByPackage[pkg.id] || []
  }));
}
