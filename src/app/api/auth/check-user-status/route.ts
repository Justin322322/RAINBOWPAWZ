import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  try {
    // Use secure authentication
    const user = await verifySecureAuth(request);

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Check if this is a user (fur parent)
    if (user.accountType !== 'user') {
      return NextResponse.json({
        success: false,
        error: 'Not a fur parent user'
      }, { status: 403 });
    }

    // Get user data
    const userResult = await query(
      'SELECT * FROM users WHERE user_id = ?',
      [user.userId]
    ) as any[];

    console.log('🔍 [API] User query result:', userResult);
    console.log('🔍 [API] User ID being queried:', user.userId);

    if (!userResult || userResult.length === 0) {
      console.log('❌ [API] No user found for ID:', user.userId);
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const userData = userResult[0];
    console.log('✅ [API] Found user data:', userData);

    // Check if user role is correct for fur parent
    if (userData.role !== 'fur_parent' && userData.role !== 'user' && userData.user_type !== 'user') {
      console.log('❌ [API] User role not allowed:', userData.role, userData.user_type);
      return NextResponse.json({
        success: false,
        error: 'User is not a fur parent'
      }, { status: 403 });
    }

    // Get restriction details if user is restricted
    let restriction = null;
    if (userData.status === 'restricted') {
      console.log('🔍 [Check User Status] User is restricted, fetching restriction details for user_id:', userData.user_id);
      const restrictionResult = await query(`
        SELECT id as restriction_id, reason, restriction_date, duration, report_count, is_active
        FROM restrictions
        WHERE subject_type = 'user' AND subject_id = ? AND is_active = 1
        LIMIT 1
      `, [userData.user_id]) as any[];

      console.log('🔍 [Check User Status] Restriction query result:', restrictionResult);
      
      if (restrictionResult && restrictionResult.length > 0) {
        restriction = restrictionResult[0];
        console.log('🔍 [Check User Status] Found restriction:', restriction);
      } else {
        console.log('🔍 [Check User Status] No active restrictions found');
      }
    }

    const responseData = {
      success: true,
      user: {
        id: userData.user_id,           // Map user_id to id for consistency
        user_id: userData.user_id,      // Keep user_id for OTP API compatibility
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        role: userData.role,
        user_type: userData.role === 'fur_parent' ? 'user' : userData.user_type,
        is_verified: userData.is_verified,
        is_otp_verified: userData.is_otp_verified,
        phone: userData.phone,
        address: userData.address,
        created_at: userData.created_at,
        status: userData.status || 'active',
        restriction: restriction
      }
    };

    console.log('🔍 [Check User Status] Final response restriction:', restriction);
    console.log('📤 [API] Sending response:', responseData);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 
