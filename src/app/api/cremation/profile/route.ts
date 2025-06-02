import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import { testPhoneNumberFormatting } from '@/lib/smsService';
import bcrypt from 'bcryptjs';

// GET endpoint to fetch cremation business profile
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Verify this is a business account
    if (accountType !== 'business') {
      return NextResponse.json({ error: 'Forbidden: Business access required' }, { status: 403 });
    }

    // Get business profile from database
    try {
      // Get the service provider details for this user including profile picture
      const businessResult = await query(`
        SELECT
          sp.provider_id as id,
          sp.name,
          sp.provider_type,
          sp.contact_first_name,
          sp.contact_last_name,
          sp.phone,
          sp.address,
          sp.province,
          sp.city,
          sp.zip,
          sp.hours,
          sp.description as service_description,
          sp.application_status,
          sp.verification_date,
          sp.created_at,
          sp.business_permit_path,
          sp.bir_certificate_path,
          sp.government_id_path,
          u.email as user_email,
          u.profile_picture
        FROM service_providers sp
        LEFT JOIN users u ON sp.user_id = u.user_id
        WHERE sp.user_id = ?
      `, [userId]) as any[];

      if (!businessResult || businessResult.length === 0) {
        return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
      }

      const businessData = businessResult[0];

      // Format response
      return NextResponse.json({
        profile: {
          id: businessData.id,
          name: businessData.name,
          email: businessData.user_email,
          phone: businessData.phone,
          contactPerson: `${businessData.contact_first_name} ${businessData.contact_last_name}`,
          address: {
            street: businessData.address || '',
            city: businessData.city || '',
            state: businessData.province || '',
            zipCode: businessData.zip || '',
            country: ''
          },
          description: businessData.service_description || '',
          website: businessData.hours || '',
          logoPath: null,
          profilePicturePath: businessData.profile_picture || null,
          verified: businessData.application_status === 'approved',
          createdAt: businessData.created_at,
          documents: {
            businessPermitPath: businessData.business_permit_path || null,
            birCertificatePath: businessData.bir_certificate_path || null,
            governmentIdPath: businessData.government_id_path || null
          }
        }
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    } catch (dbError) {
      const err = dbError as any;

      // Check for specific database errors
      let errorMessage = 'Database error occurred';
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        errorMessage = 'Could not connect to database - server may be unavailable';
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = 'Database authentication failed';
      } else if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        errorMessage = 'Database connection was lost during query';
      }

      return NextResponse.json({
        error: 'Failed to fetch profile data',
        message: errorMessage,
        code: err.code || 'UNKNOWN_ERROR'
      }, {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch profile data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
}

// PATCH endpoint to update cremation business profile
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Verify this is a business account
    if (accountType !== 'business') {
      return NextResponse.json({ error: 'Forbidden: Business access required' }, { status: 403 });
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
      const userResult = await query('SELECT password FROM users WHERE user_id = ?', [userId]) as any[];

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
      await query('UPDATE users SET password = ? WHERE user_id = ?', [hashedNewPassword, userId]);

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully'
      });
    }
    else if (body.address) {
      // Handle address update
      const { street, city, state, zipCode } = body.address;

      // Update service provider address
      await query(`
        UPDATE service_providers
        SET address = ?, city = ?, province = ?, zip = ?, updated_at = NOW()
        WHERE user_id = ?
      `, [street, city, state, zipCode, userId]);

      return NextResponse.json({
        success: true,
        message: 'Address updated successfully',
        address: { street, city, state, zipCode, country: '' }
      });
    }
    else if (body.contactInfo) {
      // Handle contact info update
      const { firstName, lastName, email, phone } = body.contactInfo;

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

      // Update user email if provided
      if (email) {
        await query('UPDATE users SET email = ?, updated_at = NOW() WHERE user_id = ?', [email, userId]);
      }

      // Update service provider contact info
      await query(`
        UPDATE service_providers
        SET contact_first_name = ?, contact_last_name = ?, phone = ?, updated_at = NOW()
        WHERE user_id = ?
      `, [firstName, lastName, formattedPhone, userId]);

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