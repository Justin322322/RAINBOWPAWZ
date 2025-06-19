import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = verifySecureAuth(request);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check if this is a business user
    if (user.accountType !== 'business') {
      return NextResponse.json({
        success: false,
        error: 'Not a business user'
      }, { status: 403 });
    }

    // Get user data
    const userResult = await query(
      'SELECT * FROM users WHERE user_id = ?',
      [user.userId]
    ) as any[];

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const userData = userResult[0];

    // Get service provider data
    const serviceProviderResult = await query(
      'SELECT * FROM service_providers WHERE user_id = ?',
      [userData.user_id]
    ) as any[];

    let serviceProvider = null;
    if (serviceProviderResult && serviceProviderResult.length > 0) {
      serviceProvider = serviceProviderResult[0];
    }

    return NextResponse.json({
      success: true,
      user: {
        user_id: userData.user_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        role: userData.role,
        user_type: userData.role === 'fur_parent' ? 'fur_parent' : userData.role,
        is_verified: userData.is_verified
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
