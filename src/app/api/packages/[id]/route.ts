import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// GET endpoint to fetch a specific package
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const packageId = params.id;

    if (!packageId) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      );
    }

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

    // Check if this is one of our test packages
    if (packageId.startsWith('1000')) {
      // Get test package data
      const testPackage = getTestPackageById(parseInt(packageId));

      if (testPackage) {
        return NextResponse.json({
          package: testPackage
        });
      }
    }

    if (!packageResult || packageResult.length === 0) {
      return NextResponse.json({
        error: 'Package not found'
      }, { status: 404 });
    }

    // Enhance package with inclusions, add-ons, and images
    const enhancedPackage = await enhancePackageWithDetails(packageResult[0]);

    return NextResponse.json({
      package: enhancedPackage
    });
  } catch (error) {
    console.error(`Error fetching package ${params.id}:`, error);
    return NextResponse.json({
      error: 'Failed to fetch package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT endpoint to update a package
export async function PUT(request: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const packageId = pathParts[pathParts.length - 1];

    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Only allow business users to update packages
    if (accountType !== 'business') {
      return NextResponse.json({
        error: 'Only business accounts can update packages'
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

    // Verify that the package belongs to this provider
    const packageResult = await query(
      'SELECT id FROM service_packages WHERE id = ? AND service_provider_id = ?',
      [packageId, providerId]
    ) as any[];

    if (!packageResult || packageResult.length === 0) {
      return NextResponse.json({
        error: 'Package not found or you do not have permission to update it'
      }, { status: 404 });
    }

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
    if (!name || !description || !category || !cremationType || !processingTime || !price) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Start a transaction
    await query('START TRANSACTION');

    try {
      // Update package
      await query(`
        UPDATE service_packages SET
          name = ?,
          description = ?,
          category = ?,
          cremation_type = ?,
          processing_time = ?,
          price = ?,
          conditions = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name, description, category, cremationType,
        processingTime, price, conditions, packageId
      ]);

      // Delete existing inclusions, add-ons, and images
      await query('DELETE FROM package_inclusions WHERE package_id = ?', [packageId]);
      await query('DELETE FROM package_addons WHERE package_id = ?', [packageId]);
      await query('DELETE FROM package_images WHERE package_id = ?', [packageId]);

      // Insert new inclusions
      if (inclusions.length > 0) {
        for (const inclusion of inclusions) {
          await query(
            'INSERT INTO package_inclusions (package_id, description) VALUES (?, ?)',
            [packageId, inclusion]
          );
        }
      }

      // Insert new add-ons
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

      // Insert new images
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
        message: 'Package updated successfully'
      });
    } catch (error) {
      // Rollback the transaction on error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json({
      error: 'Failed to update package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE endpoint to delete a package (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    // Extract ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const packageId = pathParts[pathParts.length - 1];

    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Only allow business users to delete packages
    if (accountType !== 'business') {
      return NextResponse.json({
        error: 'Only business accounts can delete packages'
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

    // Verify that the package belongs to this provider
    const packageResult = await query(
      'SELECT id FROM service_packages WHERE id = ? AND service_provider_id = ?',
      [packageId, providerId]
    ) as any[];

    if (!packageResult || packageResult.length === 0) {
      return NextResponse.json({
        error: 'Package not found or you do not have permission to delete it'
      }, { status: 404 });
    }

    // Soft delete the package
    await query(
      'UPDATE service_packages SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [packageId]
    );

    return NextResponse.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json({
      error: 'Failed to delete package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Function to get a test package by ID
function getTestPackageById(packageId: number) {
  const testPackages = {
    10001: {
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
      images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
    },
    10002: {
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
      images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
    },
    10003: {
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
      images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
    },
    10004: {
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
      images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
    },
    10005: {
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
      images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
    },
    10006: {
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
      images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
    },
    10007: {
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
      images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
    },
    10008: {
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
      images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
    },
    10009: {
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
      images: ['/bg_2.png', '/bg_3.png', '/bg_4.png']
    }
  };

  return testPackages[packageId as keyof typeof testPackages] || null;
}

// Helper function to enhance a package with its details
async function enhancePackageWithDetails(packageData: any) {
  if (!packageData) return null;

  // Fetch inclusions
  const inclusionsResult = await query(`
    SELECT description
    FROM package_inclusions
    WHERE package_id = ?
    ORDER BY id ASC
  `, [packageData.id]) as any[];

  // Fetch add-ons
  const addOnsResult = await query(`
    SELECT description, price
    FROM package_addons
    WHERE package_id = ?
    ORDER BY id ASC
  `, [packageData.id]) as any[];

  // Fetch images
  const imagesResult = await query(`
    SELECT image_path
    FROM package_images
    WHERE package_id = ?
    ORDER BY display_order ASC
  `, [packageData.id]) as any[];

  // Format inclusions, add-ons, and images
  const inclusions = inclusionsResult.map((inclusion: any) => inclusion.description);

  const addOns = addOnsResult.map((addOn: any) => {
    let addOnText = addOn.description;
    if (addOn.price) {
      addOnText += ` (+₱${addOn.price.toLocaleString()})`;
    }
    return addOnText;
  });

  const images = imagesResult.map((image: any) => image.image_path);

  // Return enhanced package
  return {
    ...packageData,
    inclusions,
    addOns,
    images: images.length > 0 ? images : ['/bg_2.png', '/bg_3.png', '/bg_4.png'] // Default images if none found
  };
}