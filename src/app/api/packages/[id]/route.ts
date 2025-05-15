import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import * as fs from 'fs';
import { join } from 'path';

// GET a specific package by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const packageId = parseInt(params.id);
    
    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }
    
    // When accessing a package directly by ID, don't filter by is_active
    // This allows editing inactive packages
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
        if (!path) return null;
        
        console.log(`Processing package ${packageId} image path: ${path}`);
        
        if (path && path.startsWith('blob:')) {
          console.log(`Skipping blob URL: ${path}`);
          return null;
        }
        
        // If path starts with http:// or https://, it's already a full URL
        if (path.startsWith('http://') || path.startsWith('https://')) {
          console.log(`Using full URL as is: ${path}`);
          return path;
        }
        
        // Handle paths from package_images table that might be relative to public folder
        let processedPath = path;
        if (path.startsWith('/')) {
          // Remove leading slash for consistency
          processedPath = path.substring(1);
          console.log(`Removed leading slash: ${processedPath}`);
        }
        
        // Check for the new folder structure first - /uploads/packages/{packageId}/{filename}
        if (processedPath.match(/uploads\/packages\/\d+\//)) {
          console.log(`Found new folder structure path: /${processedPath}`);
          return `/${processedPath}`;
        }
        
        // For files in uploads/packages/ directory - most reliable approach
        if (processedPath.includes('uploads/packages/package_')) {
          // Use the filename directly with the correct path prefix
          const filename = processedPath.split('/').pop();
          if (filename) {
            // Check if we can extract package id from the filename
            const pkgMatch = filename.match(/package_(\d+)_/);
            if (pkgMatch && pkgMatch[1] && parseInt(pkgMatch[1]) === packageId) {
              // New structure path with ID folder
              const newPath = `/uploads/packages/${packageId}/${filename}`;
              console.log(`Converted to new folder structure path: ${newPath}`);
              return newPath;
            }
            
            const fullPath = `/uploads/packages/${filename}`;
            console.log(`Using direct upload path with filename: ${fullPath}`);
            return fullPath;
          }
        }
        
        // For paths in uploads/packages/ directory but without the common format
        if (processedPath.includes('uploads/packages/')) {
          const fullPath = `/${processedPath.replace(/^\//, '')}`;
          console.log(`Using package upload path: ${fullPath}`);
          return fullPath;
        }
        
        // For sample data like bg_2.png
        if (processedPath.match(/^bg_\d+\.png$/)) {
          console.log(`Using background image path: /${processedPath}`);
          return `/${processedPath}`;
        }
        
        // For paths in uploads directory
        if (processedPath.includes('uploads/')) {
          const fullPath = `/${processedPath.replace(/^\//, '')}`;
          console.log(`Using uploads path: ${fullPath}`);
          return fullPath;
        }
        
        // Default approach for images stored in public directory
        console.log(`Using default path approach: /${processedPath}`);
        return `/${processedPath}`;
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
    console.log(`PATCH request received for package ID: ${params.id}`);
    const packageId = parseInt(params.id);
    
    if (isNaN(packageId)) {
      console.log('Invalid package ID format');
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }
    
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      console.log('Unauthorized: No auth token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    console.log(`User ID: ${userId}, Account Type: ${accountType}`);

    // Only allow business users to update packages
    if (accountType !== 'business') {
      console.log('Permission denied: Not a business account');
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
      console.log(`Service provider not found for user ID: ${userId}`);
      return NextResponse.json({
        error: 'Service provider not found'
      }, { status: 404 });
    }

    const providerId = providerResult[0].id;
    console.log(`Provider ID: ${providerId}`);

    // Check if the package belongs to this provider
    try {
      const packageResult = await query(
        'SELECT service_provider_id FROM service_packages WHERE id = ?',
        [packageId]
      ) as any[];

      if (!packageResult || packageResult.length === 0) {
        console.log(`Package not found with ID: ${packageId}`);
        return NextResponse.json({
          error: 'Package not found'
        }, { status: 404 });
      }

      if (packageResult[0].service_provider_id !== providerId) {
        console.log(`Permission denied: Package belongs to provider ${packageResult[0].service_provider_id}, not ${providerId}`);
        return NextResponse.json({
          error: 'You do not have permission to update this package'
        }, { status: 403 });
      }

      // Get update data from request body
      const body = await request.json();
      console.log('Update data:', body);
      
      // If isActive is provided, toggle the active state
      if (body.isActive !== undefined) {
        console.log(`Toggling active state to: ${body.isActive}`);
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
      
      // If there are other fields to update, implement full update logic here
      if (body.name || body.description || body.price || body.category || body.cremationType || body.processingTime || body.conditions) {
        console.log('Updating package fields');
        
        // Start a transaction
        await query('START TRANSACTION');
        
        try {
          // Build the update query based on provided fields
          let updateFields = [];
          let updateValues = [];
          
          if (body.name) {
            updateFields.push('name = ?');
            updateValues.push(body.name);
          }
          
          if (body.description) {
            updateFields.push('description = ?');
            updateValues.push(body.description);
          }
          
          if (body.price) {
            updateFields.push('price = ?');
            updateValues.push(body.price);
          }
          
          if (body.category) {
            updateFields.push('category = ?');
            updateValues.push(body.category);
          }
          
          if (body.cremationType) {
            updateFields.push('cremation_type = ?');
            updateValues.push(body.cremationType);
          }
          
          if (body.processingTime) {
            updateFields.push('processing_time = ?');
            updateValues.push(body.processingTime);
          }
          
          if (body.conditions) {
            updateFields.push('conditions = ?');
            updateValues.push(body.conditions);
          }
          
          if (updateFields.length > 0) {
            // Add packageId to values
            updateValues.push(packageId);
            
            // Execute the update
            const updateQuery = `UPDATE service_packages SET ${updateFields.join(', ')} WHERE id = ?`;
            await query(updateQuery, updateValues);
          }
          
          // Handle inclusions update
          if (body.inclusions && Array.isArray(body.inclusions)) {
            // Delete old inclusions
            await query('DELETE FROM package_inclusions WHERE package_id = ?', [packageId]);
            
            // Insert new inclusions
            for (const inclusion of body.inclusions) {
              await query(
                'INSERT INTO package_inclusions (package_id, description) VALUES (?, ?)',
                [packageId, inclusion]
              );
            }
          }
          
          // Handle addOns update
          if (body.addOns && Array.isArray(body.addOns)) {
            // Delete old add-ons
            await query('DELETE FROM package_addons WHERE package_id = ?', [packageId]);
            
            // Insert new add-ons
            for (const addOn of body.addOns) {
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
          
          // Handle images update if provided
          if (body.images && Array.isArray(body.images)) {
            // Process images - move them to the package folder and update paths
            const updatedImages = await moveImagesToPackageFolder(body.images, packageId);
            
            // Only update images if there's a change
            // Delete old images
            await query('DELETE FROM package_images WHERE package_id = ?', [packageId]);
            
            // Insert new images
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
            message: 'Package updated successfully'
          });
          
        } catch (error) {
          // Rollback the transaction on error
          await query('ROLLBACK');
          console.error('Error updating package:', error);
          return NextResponse.json({
            error: 'Failed to update package',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      }
      
      // If we reach here, no valid update data was provided
      console.log('No valid update data provided');
      return NextResponse.json({
        error: 'No update data provided'
      }, { status: 400 });
      
    } catch (dbError) {
      console.error('Database error when updating package:', dbError);
      return NextResponse.json({
        error: 'Database error occurred',
        message: dbError.message || 'Unknown database error'
      }, { status: 500 });
    }
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
    console.log(`DELETE request received for package ID: ${params.id}`);
    const packageId = parseInt(params.id);
    
    if (isNaN(packageId)) {
      console.log('Invalid package ID format');
      return NextResponse.json({ error: 'Invalid package ID' }, { status: 400 });
    }
    
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      console.log('Unauthorized: No auth token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    console.log(`User ID: ${userId}, Account Type: ${accountType}`);

    // Only allow business users to delete packages
    if (accountType !== 'business') {
      console.log('Permission denied: Not a business account');
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
      console.log(`Service provider not found for user ID: ${userId}`);
      return NextResponse.json({
        error: 'Service provider not found'
      }, { status: 404 });
    }

    const providerId = providerResult[0].id;
    console.log(`Provider ID: ${providerId}`);

    try {
      // Check if the package belongs to this provider
      const packageResult = await query(
        'SELECT service_provider_id FROM service_packages WHERE id = ?',
        [packageId]
      ) as any[];

      if (!packageResult || packageResult.length === 0) {
        console.log(`Package not found with ID: ${packageId}`);
        return NextResponse.json({
          error: 'Package not found'
        }, { status: 404 });
      }

      if (packageResult[0].service_provider_id !== providerId) {
        console.log(`Permission denied: Package belongs to provider ${packageResult[0].service_provider_id}, not ${providerId}`);
        return NextResponse.json({
          error: 'You do not have permission to delete this package'
        }, { status: 403 });
      }

      // Delete the package
      await query('DELETE FROM service_packages WHERE id = ?', [packageId]);
      
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
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json({
      error: 'Failed to delete package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Moves temporary package images to a package-specific folder after package creation/update
 * @param images Array of image paths
 * @param packageId The package ID
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