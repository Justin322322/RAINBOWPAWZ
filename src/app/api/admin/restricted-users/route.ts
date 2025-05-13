import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

// Get all restricted users for admin panel
export async function GET(request: NextRequest) {
  console.log('Starting restricted users API request');

  try {
    // Verify admin authentication
    let isAuthenticated = false;
    let accountType = '';

    // Get auth token from request
    const authToken = getAuthTokenFromRequest(request);
    console.log('Auth token:', authToken ? 'Present' : 'Missing');

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (authToken) {
      // If we have a token, validate it
      const tokenParts = authToken.split('_');
      if (tokenParts.length === 2) {
        accountType = tokenParts[1];
        isAuthenticated = accountType === 'admin';
      }
    } else if (isDevelopment) {
      // In development, allow requests without auth for testing
      console.log('Development mode: Bypassing authentication for testing');
      isAuthenticated = true;
    }

    // Check authentication result
    if (!isAuthenticated) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { status: 401 });
    }

    // Fetch restricted users from different tables
    console.log('Fetching restricted users from database');

    // 1. Fetch restricted pet parents (regular users)
    const restrictedPetParents = await query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        'pet_parent' as user_type
      FROM 
        users u
      WHERE 
        u.is_restricted = 1 AND u.role = 'user'
    `).catch(err => {
      console.error('Error fetching restricted pet parents:', err);
      return [];
    });

    // 2. Fetch restricted cremation centers (business users with cremation type)
    const restrictedCremationCenters = await query(`
      SELECT 
        u.id,
        bp.business_name as name,
        CONCAT(bp.contact_first_name, ' ', bp.contact_last_name) as owner_name,
        u.email,
        bp.business_phone as phone,
        'cremation_center' as user_type,
        bp.id as business_id
      FROM 
        business_profiles bp
        JOIN users u ON bp.user_id = u.id
      WHERE 
        bp.verification_status = 'restricted' AND bp.business_type = 'cremation'
    `).catch(err => {
      console.error('Error fetching restricted cremation centers:', err);
      return [];
    });

    // Format the results
    const formattedPetParents = Array.isArray(restrictedPetParents) ? restrictedPetParents.map((user: any) => {
      return {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        phone: '',
        restrictionDate: '', // Use current date as fallback
        restrictionReason: 'Policy violation', // Default reason
        restrictionDuration: 'Indefinite', // Default duration
        reportCount: 0,
        userType: 'pet_parent',
        businessId: null
      };
    }) : [];

    const formattedCremationCenters = Array.isArray(restrictedCremationCenters) ? restrictedCremationCenters.map((center: any) => {
      return {
        id: center.id,
        name: center.name || 'Unknown Business',
        owner: center.owner_name || 'Unknown Owner',
        email: center.email,
        phone: center.phone || '',
        restrictionDate: '', // Use current date as fallback
        restrictionReason: 'Policy violation', // Default reason
        restrictionDuration: 'Indefinite', // Default duration
        reportCount: 0,
        userType: 'cremation_center',
        businessId: center.business_id
      };
    }) : [];

    // Combine all restricted users
    const allRestrictedUsers = [...formattedPetParents, ...formattedCremationCenters];

    console.log(`Found ${allRestrictedUsers.length} restricted users`);
    return NextResponse.json({
      success: true,
      restrictedUsers: allRestrictedUsers
    });
  } catch (error) {
    console.error('Error fetching restricted users:', error);
    return NextResponse.json({
      error: 'Failed to fetch restricted users',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}

// Update restriction status
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    console.log('Auth token:', authToken ? 'Present' : 'Missing');

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    let isAuthenticated = false;

    if (authToken) {
      // If we have a token, validate it
      const tokenParts = authToken.split('_');
      if (tokenParts.length === 2) {
        const accountType = tokenParts[1];
        isAuthenticated = accountType === 'admin';
      }
    } else if (isDevelopment) {
      // In development, allow requests without auth for testing
      console.log('Development mode: Bypassing authentication for testing');
      isAuthenticated = true;
    }

    // Check authentication result
    if (!isAuthenticated) {
      return NextResponse.json({
        error: 'Unauthorized',
        details: 'Admin access required',
        success: false
      }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { userId, userType, action, businessId } = body;

    if (!userId || !userType || !action) {
      return NextResponse.json({
        error: 'Missing required parameters',
        success: false
      }, { status: 400 });
    }

    if (action !== 'remove_restriction') {
      return NextResponse.json({
        error: 'Invalid action',
        success: false
      }, { status: 400 });
    }

    // Remove restriction based on user type
    if (userType === 'pet_parent') {
      await query(`
        UPDATE users
        SET is_restricted = 0, restriction_reason = NULL, restriction_date = NULL, restriction_duration = NULL
        WHERE id = ?
      `, [userId]);
    } else if (userType === 'cremation_center' && businessId) {
      await query(`
        UPDATE business_profiles
        SET verification_status = 'verified', restriction_reason = NULL, restriction_date = NULL, restriction_duration = NULL
        WHERE id = ?
      `, [businessId]);
    } else {
      return NextResponse.json({
        error: 'Invalid user type or missing business ID',
        success: false
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Restriction removed successfully'
    });
  } catch (error) {
    console.error('Error updating restriction status:', error);
    return NextResponse.json({
      error: 'Failed to update restriction status',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
