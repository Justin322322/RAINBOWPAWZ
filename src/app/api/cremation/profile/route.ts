import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';
import bcrypt from 'bcrypt';

// GET endpoint to fetch cremation business profile
export async function GET(request: NextRequest) {
  try {
    
    // Get auth token and validate
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication token not found' }, { 
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    const parts = authToken.split('_');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Unauthorized', message: 'Invalid authentication token format' }, { status: 401 });
    }

    const [userId, accountType] = parts;
    
    // Only cremation businesses should have access
    if (accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized access', message: 'Only business accounts can access this resource' }, { 
        status: 403,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
    
    // Get business information
    try {
      const businessInfo = await query(`
        SELECT 
          sp.id, 
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
          sp.service_description,
          sp.application_status,
          sp.verification_date,
          sp.created_at,
          sp.business_permit_path,
          sp.bir_certificate_path,
          sp.government_id_path,
          u.email as user_email
        FROM service_providers sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.user_id = ? AND sp.provider_type = 'cremation'
        LIMIT 1
      `, [userId]) as any[];
      
      if (!businessInfo || businessInfo.length === 0) {
        return NextResponse.json({ error: 'Business profile not found', message: 'No cremation business profile associated with this account' }, { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
      }
      
      const businessData = businessInfo[0];
      
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
      
      // Check for specific database errors
      let errorMessage = 'Database error occurred';
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT') {
        errorMessage = 'Could not connect to database - server may be unavailable';
      } else if (dbError.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = 'Database authentication failed';
      } else if (dbError.code === 'PROTOCOL_CONNECTION_LOST') {
        errorMessage = 'Database connection was lost during query';
      }
      
      return NextResponse.json({
        error: 'Failed to fetch profile data',
        message: errorMessage,
        code: dbError.code || 'UNKNOWN_ERROR'
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
    // Get auth token and validate
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    
    // Only cremation businesses should have access
    if (accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Get business ID first
    const businessResult = await query(
      'SELECT id FROM service_providers WHERE user_id = ? AND provider_type = "cremation"',
      [userId]
    ) as any[];
    
    if (!businessResult || businessResult.length === 0) {
      return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
    }
    
    const businessId = businessResult[0].id;
    
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
      
      // Get current password hash
      const userResult = await query(
        'SELECT password FROM users WHERE id = ?',
        [userId]
      ) as any[];
      
      if (!userResult || userResult.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      const currentHash = userResult[0].password;
      
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, currentHash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
      
      // Hash new password
      const saltRounds = 10;
      const newHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      await query(
        'UPDATE users SET password = ? WHERE id = ?',
        [newHash, userId]
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Password updated successfully' 
      });
    } 
    else if (body.address) {
      // Handle address update
      const { street, city, state, zipCode, country } = body.address;
      
      await query(`
        UPDATE service_providers 
        SET 
          address = ?,
          city = ?,
          province = ?,
          zip = ?
        WHERE id = ?`,
        [street, city, state, zipCode, businessId]
      );
      
      return NextResponse.json({ 
        success: true, 
        message: 'Address updated successfully',
        address: { street, city, state, zipCode, country }
      });
    }
    else if (body.contactInfo) {
      // Handle contact info update
      const { firstName, lastName, email, phone } = body.contactInfo;
      
      await query(`
        UPDATE service_providers 
        SET 
          contact_first_name = ?,
          contact_last_name = ?,
          phone = ?
        WHERE id = ?`,
        [firstName, lastName, phone, businessId]
      );
      
      // If email is updated, also update user email
      if (email) {
        await query('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Contact information updated successfully',
        contactInfo: { firstName, lastName, email, phone }
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