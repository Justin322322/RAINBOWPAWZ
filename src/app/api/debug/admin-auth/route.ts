import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Get the auth token cookie
    const cookieStoreResolved = await cookies();
    const authCookie = cookieStoreResolved.get('auth_token');
    
    const debugInfo: any = {
      cookies: {
        all: Array.from(cookieStoreResolved.getAll()).map(c => ({ name: c.name, value: c.value })),
        authCookie: authCookie ? { 
          name: authCookie.name, 
          value: authCookie.value,
          decoded: null
        } : null
      },
      auth: {
        userId: null,
        accountType: null,
        valid: false
      },
      userData: null,
      adminData: null
    };
    
    // Try to decode the auth cookie
    if (authCookie && authCookie.value) {
      try {
        debugInfo.cookies.authCookie.decoded = decodeURIComponent(authCookie.value);
        
        // Parse the token
        const parts = debugInfo.cookies.authCookie.decoded.split('_');
        
        if (parts.length === 2) {
          debugInfo.auth.userId = parts[0];
          debugInfo.auth.accountType = parts[1];
          debugInfo.auth.valid = true;
        }
      } catch (error) {
        debugInfo.cookies.authCookie.decodeError = error instanceof Error ? error.message : 'Unknown error';
      }
    }
    
    // If we have a valid user ID, fetch user data
    if (debugInfo.auth.userId) {
      try {
        // Check users table
        const userResult = await query(
          `SELECT id, first_name, last_name, email, user_type, status, is_verified, is_otp_verified
           FROM users WHERE id = ? LIMIT 1`,
          [debugInfo.auth.userId]
        ) as any[];
        
        if (userResult && userResult.length > 0) {
          debugInfo.userData = userResult[0];
        }
        
        // Check admins table
        const adminResult = await query(
          `SELECT id, username, email, full_name, role
           FROM admins WHERE id = ? LIMIT 1`,
          [debugInfo.auth.userId]
        ) as any[];
        
        if (adminResult && adminResult.length > 0) {
          debugInfo.adminData = adminResult[0];
        }
        
        // If no user found by ID, try to find by email if we have user data
        if ((!debugInfo.userData || !debugInfo.adminData) && debugInfo.userData?.email) {
          const adminByEmailResult = await query(
            `SELECT id, username, email, full_name, role
             FROM admins WHERE email = ? LIMIT 1`,
            [debugInfo.userData.email]
          ) as any[];
          
          if (adminByEmailResult && adminByEmailResult.length > 0) {
            debugInfo.adminByEmail = adminByEmailResult[0];
          }
        }
      } catch (dbError) {
        debugInfo.dbError = dbError instanceof Error ? dbError.message : 'Unknown database error';
      }
    }
    
    // Add admin access check result
    debugInfo.adminAccess = {
      hasAdminAccountType: debugInfo.auth.accountType === 'admin',
      hasAdminUserType: debugInfo.userData?.user_type === 'admin' || 
                        (debugInfo.userData?.user_type && debugInfo.userData.user_type.includes('admin')),
      hasAdminRole: debugInfo.adminData?.role === 'admin' || debugInfo.adminData?.role === 'super_admin',
      shouldHaveAccess: false
    };
    
    // Determine if user should have admin access
    debugInfo.adminAccess.shouldHaveAccess = 
      debugInfo.adminAccess.hasAdminAccountType || 
      debugInfo.adminAccess.hasAdminUserType || 
      debugInfo.adminAccess.hasAdminRole;
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json({
      error: 'Debug info error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
