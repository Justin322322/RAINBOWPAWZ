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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    
    // Only cremation businesses should have access
    if (accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }
    
    // Get business information
    const businessInfo = await query(`
      SELECT 
        sp.id, 
        sp.name, 
        sp.provider_type, 
        sp.contact_first_name, 
        sp.contact_last_name,
        sp.contact_email,
        sp.contact_phone,
        sp.address_street,
        sp.address_city,
        sp.address_state,
        sp.address_zip,
        sp.address_country,
        sp.description,
        sp.logo_path,
        sp.website,
        sp.verified,
        sp.created_at,
        u.email as user_email
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.user_id = ? AND sp.provider_type = 'cremation'
      LIMIT 1
    `, [userId]) as any[];
    
    if (!businessInfo || businessInfo.length === 0) {
      return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
    }
    
    const businessData = businessInfo[0];
    
    // Format response
    return NextResponse.json({
      profile: {
        id: businessData.id,
        name: businessData.name,
        email: businessData.user_email || businessData.contact_email,
        phone: businessData.contact_phone,
        contactPerson: `${businessData.contact_first_name} ${businessData.contact_last_name}`,
        address: {
          street: businessData.address_street || '',
          city: businessData.address_city || '',
          state: businessData.address_state || '',
          zipCode: businessData.address_zip || '',
          country: businessData.address_country || ''
        },
        description: businessData.description || '',
        website: businessData.website || '',
        logoPath: businessData.logo_path || null,
        verified: businessData.verified === 1,
        createdAt: businessData.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching cremation profile:', error);
    return NextResponse.json({
      error: 'Failed to fetch profile data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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
          address_street = ?,
          address_city = ?,
          address_state = ?,
          address_zip = ?,
          address_country = ?
        WHERE id = ?`,
        [street, city, state, zipCode, country, businessId]
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
          contact_email = ?,
          contact_phone = ?
        WHERE id = ?`,
        [firstName, lastName, email, phone, businessId]
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
    console.error('Error updating cremation profile:', error);
    return NextResponse.json({
      error: 'Failed to update profile data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 