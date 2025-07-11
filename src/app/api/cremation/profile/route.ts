import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { testPhoneNumberFormatting } from '@/lib/smsService';
import bcrypt from 'bcryptjs';

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

    // Get user details
    const userResult = await query(
      'SELECT user_id, email, first_name, last_name, phone, address, profile_picture, created_at FROM users WHERE user_id = ? AND role = ?',
      [user.userId, 'business']
    );

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userResult[0];

    // Get service provider details including document paths
    const providerResult = await query(
      'SELECT * FROM service_providers WHERE user_id = ?',
      [user.userId]
    );

    let providerData = null;
    if (providerResult && providerResult.length > 0) {
      providerData = providerResult[0];
    }

    // Combine user and provider data
    const profileData = {
      ...userData,
      business_name: providerData?.name || null,
      business_type: providerData?.provider_type || null,
      business_phone: providerData?.phone || userData.phone,
      business_address: providerData?.address || userData.address,
      description: providerData?.description || null,
      hours: providerData?.hours || null,
      application_status: providerData?.application_status || null,
      verification_date: providerData?.verification_date || null,
      created_at: userData.created_at,
      provider_id: providerData?.provider_id || null,
      // Include document paths for UI display
      documents: {
        businessPermitPath: providerData?.business_permit_path || null,
        birCertificatePath: providerData?.bir_certificate_path || null,
        governmentIdPath: providerData?.government_id_path || null
      }
    };

    return NextResponse.json({
      success: true,
      profile: profileData
    });

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

    // Validate required fields
    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Update user table
    await query(
      'UPDATE users SET first_name = ?, last_name = ?, phone = ?, address = ?, updated_at = NOW() WHERE user_id = ? AND role = ?',
      [first_name, last_name, phone || null, address || null, user.userId, 'business']
    );

    // Check if service provider record exists
    const providerResult = await query(
      'SELECT provider_id FROM service_providers WHERE user_id = ?',
      [user.userId]
    );

    if (providerResult && providerResult.length > 0) {
      // Update existing service provider
      await query(
        'UPDATE service_providers SET name = ?, phone = ?, address = ?, description = ?, hours = ?, updated_at = NOW() WHERE user_id = ?',
        [business_name || null, business_phone || phone, business_address || address, description || null, hours || null, user.userId]
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
      const { street } = body.address;

      // Update service provider address
      await query(`
        UPDATE service_providers
        SET address = ?, updated_at = NOW()
        WHERE user_id = ?
      `, [street, user.userId]);

      return NextResponse.json({
        success: true,
        message: 'Address updated successfully',
        address: { street }
      });
    }
    else if (body.contactInfo) {
      // Handle contact info update
      const { firstName, lastName, email, phone } = body.contactInfo;

      // Validate required fields
      if (!firstName || !lastName || !email) {
        return NextResponse.json({
          error: 'First name, last name, and email are required'
        }, { status: 400 });
      }

      // Format phone number if provided
      let formattedPhone = null;
      if (phone && phone.trim()) {
        const formatResult = testPhoneNumberFormatting(phone.trim());
        if (formatResult.success && formatResult.formatted) {
          formattedPhone = formatResult.formatted;
        } else {
          return NextResponse.json({
            error: 'Invalid phone number format. Please enter a valid Philippine mobile number.'
          }, { status: 400 });
        }
      }

      // Update user info (including email)
      await query('UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, updated_at = NOW() WHERE user_id = ?', 
        [firstName, lastName, email, formattedPhone, user.userId]);

      // Update service provider contact info
      await query(`
        UPDATE service_providers
        SET contact_first_name = ?, contact_last_name = ?, phone = ?, updated_at = NOW()
        WHERE user_id = ?
      `, [firstName, lastName, formattedPhone, user.userId]);

      return NextResponse.json({
        success: true,
        message: 'Contact information updated successfully',
        contactInfo: { firstName, lastName, email, phone: formattedPhone }
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
