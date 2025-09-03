import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { testPhoneNumberFormatting } from '@/lib/httpSmsService';
import bcrypt from 'bcryptjs';

// Ensure this route is always dynamic and not statically cached
export const dynamic = 'force-dynamic';

async function ensureBusinessDocumentsTable(): Promise<void> {
  try {
    // Create table if not exists with MEDIUMTEXT columns to store base64/data URLs
    await query(`
      CREATE TABLE IF NOT EXISTS business_documents (
        provider_id INT PRIMARY KEY,
        business_permit_data MEDIUMTEXT NULL,
        bir_certificate_data MEDIUMTEXT NULL,
        government_id_data MEDIUMTEXT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch {
    // best-effort; ignore
  }
}

// GET - Retrieve cremation provider profile
export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized - Business access required' }, { status: 403 });
    }

    // Mirror admin-style fetch: LEFT JOIN service_providers to ensure document paths are returned consistently
    const rows = await query(
      `SELECT 
         u.user_id,
         u.email,
         u.first_name,
         u.last_name,
         u.phone,
         u.address,
         u.profile_picture,
         u.created_at,
         sp.provider_id,
         sp.name AS business_name,
         sp.provider_type,
         sp.phone AS business_phone,
         sp.address AS business_address,
         sp.description,
         sp.hours,
         sp.application_status,
         sp.verification_date,
         sp.business_permit_path,
         sp.bir_certificate_path,
         sp.government_id_path
       FROM users u
       LEFT JOIN service_providers sp ON sp.user_id = u.user_id
       WHERE u.user_id = ? AND u.role = ?
       LIMIT 1`,
      [user.userId, 'business']
    ) as any[];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const row = rows[0];

    // If document paths are placeholders or missing, try to load actual data from business_documents table
    let businessPermitPath = row.business_permit_path || null as string | null;
    let birCertificatePath = row.bir_certificate_path || null as string | null;
    let governmentIdPath = row.government_id_path || null as string | null;

    // Heuristic: if values are 'stored' or empty while provider exists, hydrate from business_documents
    const needsHydration = row.provider_id && (
      !businessPermitPath || businessPermitPath === 'stored' ||
      !birCertificatePath || birCertificatePath === 'stored' ||
      !governmentIdPath || governmentIdPath === 'stored'
    );

    if (needsHydration) {
      try {
        // Best effort: ensure table exists; if not possible, skip
        await ensureBusinessDocumentsTable();

        // Verify table exists before querying (avoid throwing)
        const tableExists = await query(
          `SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'business_documents'`
        ) as any[];
        if (tableExists?.[0]?.c > 0) {
          const docRows = await query(
            'SELECT business_permit_data, bir_certificate_data, government_id_data FROM business_documents WHERE provider_id = ? LIMIT 1',
            [row.provider_id]
          ) as any[];
          if (docRows && docRows.length > 0) {
            const doc = docRows[0];
            if (!businessPermitPath || businessPermitPath === 'stored') {
              businessPermitPath = doc.business_permit_data || businessPermitPath;
            }
            if (!birCertificatePath || birCertificatePath === 'stored') {
              birCertificatePath = doc.bir_certificate_data || birCertificatePath;
            }
            if (!governmentIdPath || governmentIdPath === 'stored') {
              governmentIdPath = doc.government_id_data || governmentIdPath;
            }
          }
        }
      } catch (docErr) {
        // Non-fatal: continue without hydration
        console.error('Failed to hydrate business documents:', docErr);
      }
    }

    // Combine data in the same shape used by the frontend
    const profileData = {
      user_id: row.user_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      address: row.address,
      profile_picture: row.profile_picture,
      created_at: row.created_at,
      provider_id: row.provider_id || null,
      business_name: row.business_name || null,
      business_type: row.provider_type || null,
      business_phone: row.business_phone || row.phone,
      business_address: row.business_address || row.address,
      description: row.description || null,
      hours: row.hours || null,
      application_status: row.application_status || null,
      verification_date: row.verification_date || null,
      documents: {
        businessPermitPath,
        birCertificatePath,
        governmentIdPath
      }
    };

    return NextResponse.json(
      {
        success: true,
        profile: profileData
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60', // 1 minute cache for business profile data
          'Pragma': 'no-cache'
        }
      }
    );

  } catch (error) {
    console.error('Error fetching cremation provider profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT - Update cremation provider profile
export async function PUT(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized - Business access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      phone,
      address,
      business_name,
      business_phone,
      business_address,
      description,
      hours
    } = body;

    // Conditionally update user table only if personal fields are provided
    if (first_name || last_name || phone || address) {
      await query(
        'UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), phone = COALESCE(?, phone), address = COALESCE(?, address), updated_at = NOW() WHERE user_id = ? AND role = ?',
        [first_name || null, last_name || null, phone || null, address || null, user.userId, 'business']
      );
    }

    // Check if service provider record exists
    const providerResult = await query(
      'SELECT provider_id FROM service_providers WHERE user_id = ?',
      [user.userId]
    );

    if (providerResult && providerResult.length > 0) {
      // Update existing service provider
      await query(
        'UPDATE service_providers SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address), description = COALESCE(?, description), hours = COALESCE(?, hours), updated_at = NOW() WHERE user_id = ?',
        [business_name || null, (business_phone || phone) || null, (business_address || address) || null, description || null, hours || null, user.userId]
      );
    } else if (business_name) {
      // Create new service provider record if business name is provided
      await query(
        'INSERT INTO service_providers (user_id, name, phone, address, description, hours, provider_type, application_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [user.userId, business_name, business_phone || phone, business_address || address, description || null, hours || null, 'cremation', 'pending']
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating cremation provider profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update cremation business profile
export async function PATCH(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized - Business access required' }, { status: 403 });
    }

    // Get update data from request body
    const body = await request.json();

    // Check what is being updated
    if (body.password) {
      // Handle password update
      const { currentPassword, newPassword } = body.password;

      if (!currentPassword || !newPassword) {
        return NextResponse.json({
          error: 'Both current and new password are required'
        }, { status: 400 });
      }

      // Get current user password from database
      const userResult = await query('SELECT password FROM users WHERE user_id = ?', [user.userId]) as any[];

      if (!userResult || userResult.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult[0].password);

      if (!isCurrentPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      // Hash new password and update
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await query('UPDATE users SET password = ? WHERE user_id = ?', [hashedNewPassword, user.userId]);

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully'
      });
    }
    else if (body.address) {
      // Handle address update
      // Support both single string and object formats
      let addressString: string;

      if (typeof body.address === 'string') {
        addressString = body.address;
      } else if (typeof body.address === 'object' && body.address !== null) {
        // Handle structured address object
        const { street, city, province, postalCode } = body.address;
        const addressParts = [];
        if (street?.trim()) addressParts.push(street.trim());
        if (city?.trim()) addressParts.push(city.trim());
        if (province?.trim()) addressParts.push(province.trim());
        if (postalCode?.trim()) addressParts.push(postalCode.trim());
        addressParts.push('Philippines'); // Always include country
        addressString = addressParts.join(', ');
      } else {
        return NextResponse.json({
          error: 'Invalid address format'
        }, { status: 400 });
      }

      // Validate address is not empty
      if (!addressString?.trim()) {
        return NextResponse.json({
          error: 'Address cannot be empty'
        }, { status: 400 });
      }

      // Sanitize address (remove potentially harmful characters)
      addressString = addressString.trim().replace(/[<>\"'&]/g, '');

      // Update service provider address
      await query(`
        UPDATE service_providers
        SET address = ?, updated_at = NOW()
        WHERE user_id = ?
      `, [addressString, user.userId]);

      return NextResponse.json({
        success: true,
        message: 'Address updated successfully',
        address: addressString
      });
    }
    else if (body.contactInfo) {
      // Handle contact info update
      console.log('🔍 DEBUG: Received contactInfo update:', body.contactInfo);
      const { firstName, lastName, email, phone, address } = body.contactInfo;

      // Validate required fields
      if (!firstName || !lastName || !email) {
        return NextResponse.json({
          error: 'First name, last name, and email are required'
        }, { status: 400 });
      }

      console.log('🔍 DEBUG: Address received:', address);

      // Process and validate address
      let processedAddress: string | null = null;
      if (address) {
        if (typeof address === 'string') {
          processedAddress = address.trim();
        } else if (typeof address === 'object' && address !== null) {
          // Handle structured address object
          const { streetAddress, city, province, postalCode } = address;
          const addressParts = [];
          if (streetAddress?.trim()) addressParts.push(streetAddress.trim());
          if (city?.trim()) addressParts.push(city.trim());
          if (province?.trim()) addressParts.push(province.trim());
          if (postalCode?.trim()) addressParts.push(postalCode.trim());
          addressParts.push('Philippines'); // Always include country
          processedAddress = addressParts.join(', ');
        }

        // Validate and sanitize address
        if (processedAddress?.trim()) {
          processedAddress = processedAddress.trim().replace(/[<>\"'&]/g, '');
        } else {
          processedAddress = null;
        }
      }

      // Format phone number if provided. If invalid, skip updating phone instead of blocking address/email updates.
      let formattedPhone: string | null | undefined = undefined; // undefined => do not touch phone
      if (phone && phone.trim()) {
        const formatResult = testPhoneNumberFormatting(phone.trim());
        if (formatResult.success && formatResult.formatted) {
          formattedPhone = formatResult.formatted;
        } else {
          // Keep formattedPhone as undefined to preserve existing phone value
          formattedPhone = undefined;
        }
      }

      console.log('🔍 DEBUG: Updating user table with processed address:', processedAddress);
      // Update user info (including email and address)
      await query(
        'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = COALESCE(?, phone), address = ?, updated_at = NOW() WHERE user_id = ?',
        [firstName, lastName, email, formattedPhone ?? null, processedAddress, user.userId]
      );
      console.log('✅ DEBUG: User table updated');

      console.log('🔍 DEBUG: Updating service_providers table with processed address:', processedAddress);
      // Update service provider contact info
      await query(`
        UPDATE service_providers
        SET contact_first_name = ?, contact_last_name = ?, phone = COALESCE(?, phone), address = ?, updated_at = NOW()
        WHERE user_id = ?
      `, [firstName, lastName, formattedPhone ?? null, processedAddress, user.userId]);
      console.log('✅ DEBUG: Service providers table updated');

      return NextResponse.json({
        success: true,
        message: 'Contact information updated successfully',
        contactInfo: { firstName, lastName, email, phone: formattedPhone, address: processedAddress }
      });
    }

    return NextResponse.json({ error: 'No valid update data provided' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update profile data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
