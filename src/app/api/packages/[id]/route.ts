import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import * as fs from 'fs';
import { join } from 'path';
import { getImagePath } from '@/utils/imagePathUtils';

// GET a specific package by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const packageId = parseInt(id);

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

    // Format add-ons as objects with name and price
    const formattedAddOns = addOns.map((addOn: any) => {
      console.log('Processing add-on for response:', addOn);
      return {
        name: addOn.description,
        price: addOn.price !== null ? parseFloat(addOn.price) : null
      };
    });

    console.log('Formatted add-ons for response:', formattedAddOns);

    // Process images using our utility function
    const validImages = images
      .map((img: any) => {
        const path = img.image_path;
        if (!path) return null;

        // Filter out blob URLs
        if (path && path.startsWith('blob:')) {
          return null;
        }

        // Use our utility function to get a consistent image path
        return getImagePath(path);
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
    return NextResponse.json({
      error: 'Failed to fetch package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PATCH endpoint to update package (including toggling active state)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const packageId = parseInt(id);

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
    try {
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

      // If there are other fields to update, implement full update logic here
      if (body.name !== undefined || body.description !== undefined || body.price !== undefined ||
          body.category !== undefined || body.cremationType !== undefined ||
          body.processingTime !== undefined || body.conditions !== undefined) {

        // Start a transaction
        await query('START TRANSACTION');

        try {
          // Log the received data for debugging
          console.log('Updating package with data:', JSON.stringify(body, null, 2));

          // Build the update query based on provided fields
          let updateFields = [];
          let updateValues = [];

          if (body.name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(body.name);
          }

          if (body.description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(body.description);
          }

          if (body.price !== undefined) {
            updateFields.push('price = ?');
            updateValues.push(body.price);
          }

          if (body.category !== undefined) {
            updateFields.push('category = ?');
            updateValues.push(body.category);
          }

          if (body.cremationType !== undefined) {
            updateFields.push('cremation_type = ?');
            updateValues.push(body.cremationType);
          }

          if (body.processingTime !== undefined) {
            updateFields.push('processing_time = ?');
            updateValues.push(body.processingTime);
          }

          if (body.conditions !== undefined) {
            updateFields.push('conditions = ?');
            updateValues.push(body.conditions);
          }

          if (updateFields.length > 0) {
            // Add packageId to values
            updateValues.push(packageId);

            // Execute the update
            const updateQuery = `UPDATE service_packages SET ${updateFields.join(', ')} WHERE id = ?`;
            console.log('Executing update query:', updateQuery, 'with values:', updateValues);
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
            console.log('Processing add-ons for package update:', JSON.stringify(body.addOns, null, 2));

            // Delete old add-ons
            await query('DELETE FROM package_addons WHERE package_id = ?', [packageId]);
            console.log(`Deleted existing add-ons for package ${packageId}`);

            // Insert new add-ons
            for (const addOn of body.addOns) {
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

              // Log the values being inserted for debugging
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
          return NextResponse.json({
            error: 'Failed to update package',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      }

      // If we reach here, no valid update data was provided
      return NextResponse.json({
        error: 'No update data provided'
      }, { status: 400 });

    } catch (dbError) {
      return NextResponse.json({
        error: 'Database error occurred',
        message: dbError.message || 'Unknown database error'
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update package',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE endpoint to remove a package
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const packageId = parseInt(id);

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

    try {
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

      // Delete the package
      await query('DELETE FROM service_packages WHERE id = ?', [packageId]);

      return NextResponse.json({
        success: true,
        message: 'Package deleted successfully'
      });

    } catch (error) {
      return NextResponse.json({
        error: 'Failed to delete package',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
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