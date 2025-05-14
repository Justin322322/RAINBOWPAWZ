import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// GET a specific package by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const packageId = parseInt(params.id);
    
    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
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
    const packageData = packageResult[0];
    
    // Get inclusions
    const inclusions = await query(
      'SELECT description FROM package_inclusions WHERE package_id = ?',
      [packageId]
    ) as any[];
    
    // Get add-ons
    const addOns = await query(
      'SELECT description, price FROM package_addons WHERE package_id = ?',
      [packageId]
    ) as any[];
    
    // Get images
    const images = await query(
      'SELECT image_path FROM package_images WHERE package_id = ? ORDER BY display_order ASC',
      [packageId]
    ) as any[];
    
    // Format add-ons
    const formattedAddOns = addOns.map((addOn: any) => {
      let text = addOn.description;
      if (addOn.price) {
        text += ` (+₱${addOn.price.toLocaleString()})`;
      }
      return text;
    });
    
    // Filter out blob URLs from images
    const validImages = images
      .map((img: any) => {
        const path = img.image_path;
        if (path && path.startsWith('blob:')) {
          console.log(`Skipping blob URL: ${path}`);
          return null;
        }
        if (path && (path.startsWith('/uploads/') || path.startsWith('uploads/'))) {
          return path.startsWith('/') ? path : `/${path}`;
        }
        return path ? `/uploads/packages/${path}` : null;
      })
      .filter(Boolean);

    return NextResponse.json({
      package: {
        ...packageData,
        inclusions: inclusions.map((inc: any) => inc.description),
        addOns: formattedAddOns,
        images: validImages
      }
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json({
      error: 'Failed to fetch package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH endpoint to update package (including toggling active state)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const packageId = parseInt(params.id);
    
    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }
    
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

    // Check if the package belongs to this provider
    const packageResult = await query(
      'SELECT service_provider_id FROM service_packages WHERE id = ?',
      [packageId]
    ) as any[];

    if (!packageResult || packageResult.length === 0) {
      return NextResponse.json({
        error: 'Package not found'
      }, { status: 404 });
    }

    if (packageResult[0].service_provider_id !== providerId) {
      return NextResponse.json({
        error: 'You do not have permission to update this package'
      }, { status: 403 });
    }

    // Get update data from request body
    const body = await request.json();
    
    // If isActive is provided, toggle the active state
    if (body.isActive !== undefined) {
      await query(
        'UPDATE service_packages SET is_active = ? WHERE id = ?',
        [body.isActive ? 1 : 0, packageId]
      );
      
      return NextResponse.json({
        success: true,
        message: `Package ${body.isActive ? 'activated' : 'deactivated'} successfully`,
        isActive: body.isActive
      });
    }
    
    // Handle other update fields here if needed
    // For now, we're just implementing the active toggle functionality
    
    return NextResponse.json({
      error: 'No update data provided'
    }, { status: 400 });
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json({
      error: 'Failed to update package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE endpoint to remove a package
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const packageId = parseInt(params.id);
    
    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }
    
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

    // Check if the package belongs to this provider
    const packageResult = await query(
      'SELECT service_provider_id FROM service_packages WHERE id = ?',
      [packageId]
    ) as any[];

    if (!packageResult || packageResult.length === 0) {
      return NextResponse.json({
        error: 'Package not found'
      }, { status: 404 });
    }

    if (packageResult[0].service_provider_id !== providerId) {
      return NextResponse.json({
        error: 'You do not have permission to delete this package'
      }, { status: 403 });
    }

    // Instead of actually deleting, just set is_active to false
    await query(
      'UPDATE service_packages SET is_active = 0 WHERE id = ?',
      [packageId]
    );

    return NextResponse.json({
      success: true,
      message: 'Package deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json({
      error: 'Failed to delete package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}