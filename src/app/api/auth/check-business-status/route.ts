import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'No authentication token found'
      }, { status: 401 });
    }

    // Parse the token to get user ID and account type
    const tokenParts = authToken.split('_');
    if (tokenParts.length !== 2) {
      return NextResponse.json({
        success: false,
        error: 'Invalid authentication token format'
      }, { status: 401 });
    }

    const [userId, accountType] = tokenParts;

    // Check if this is a business user
    if (accountType !== 'business') {
      return NextResponse.json({
        success: false,
        error: 'Not a business user'
      }, { status: 403 });
    }

    // Get user data
    const userResult = await query(
      'SELECT * FROM users WHERE user_id = ?',
      [userId]
    ) as any[];

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const user = userResult[0];

    // Get service provider data
    const serviceProviderResult = await query(
      'SELECT * FROM service_providers WHERE user_id = ?',
      [user.user_id]
    ) as any[];

    let serviceProvider = null;
    if (serviceProviderResult && serviceProviderResult.length > 0) {
      serviceProvider = serviceProviderResult[0];
    }

    return NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified
      },
      serviceProvider: serviceProvider ? {
        provider_id: serviceProvider.provider_id,
        user_id: serviceProvider.user_id,
        name: serviceProvider.name,
        application_status: serviceProvider.application_status,
        created_at: serviceProvider.created_at,
        updated_at: serviceProvider.updated_at
      } : null
    });

  } catch (error) {
    console.error('Error checking business status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
