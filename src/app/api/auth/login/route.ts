import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { setSecureAuthCookies } from '@/lib/secureAuth';

// Timeout wrapper for database operations
async function withTimeout<T>(p: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms))
  ]) as Promise<T>;
}

// Types for our response
interface _LoginResponse {
  success: boolean;
  message: string;
  user?: any;
  account_type?: string;
}

export async function POST(request: Request) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers
    });
  }

  try {
    // Parse request body with timeout
    const body = await withTimeout(
      request.json(),
      3000,
      'request parsing'
    );
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({
        error: 'Invalid email or password'
      }, {
        status: 400,
        headers
      });
    }

    // Single database query to get user data with timeout
    // Use LOWER(email) for case-insensitive lookup to leverage the new index
    let userResult;
    try {
      userResult = await withTimeout(
        query(
          'SELECT user_id, first_name, last_name, email, password, role, is_verified, is_otp_verified, status, profile_picture, phone, address, gender FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
          [email]
        ),
        10000,
        'user lookup'
      ) as any[];
    } catch (queryError) {
      console.error('Error querying user:', queryError);
      throw queryError;
    }

    // Always perform password comparison to prevent timing attacks
    let passwordMatch = false;
    let user = null;
    let isRestricted = false;

    if (userResult && userResult.length > 0) {
      user = userResult[0];

      // Add id field for client compatibility
      user.id = user.user_id;

      // Allow restricted users to login but they'll be redirected to restricted page
      // This enables them to access the appeal system
      isRestricted = user.status === 'restricted';

      // Use stored password hash or a dummy hash if password is missing/invalid
      const passwordHash = user.password && user.password.length >= 20
        ? user.password
        : '$2a$12$dummyhashtopreventtimingattacks.invalid';

      // Always perform bcrypt comparison with timeout
      passwordMatch = await withTimeout(
        bcrypt.compare(password, passwordHash),
        5000,
        'password verification'
      );
    } else {
      // User doesn't exist - perform dummy comparison to maintain timing
      const dummyHash = '$2a$12$dummyhashtopreventtimingattacks.invalid';
      await withTimeout(
        bcrypt.compare(password, dummyHash),
        5000,
        'dummy password verification'
      );
    }

    // Check if authentication was successful
    if (!passwordMatch || !user) {
      return NextResponse.json({
        error: 'Invalid email or password'
      }, {
        status: 401,
        headers
      });
    }

      // Password is correct, proceed with login
      delete user.password;

      // Determine account type from role field
      const accountType = user.role === 'fur_parent' ? 'user' : user.role;

      // Update last login timestamp (fire-and-forget, non-blocking)
      withTimeout(
        query(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
          [user.user_id]
        ),
        3000,
        'last login update'
      ).catch((updateError) => {
        // Log but don't fail the login for this
        console.warn('Failed to update last login timestamp:', updateError);
      });

          // For admin accounts, fetch additional admin profile details (non-blocking)
          if (user.role === 'admin') {
            try {
              const adminResult = await withTimeout(
                query('SELECT username, full_name, admin_role FROM admin_profiles WHERE user_id = ? LIMIT 1', [user.user_id]),
                2000,
                'admin profile fetch'
              ) as any[];

              if (adminResult && adminResult.length > 0) {
                const adminProfile = adminResult[0];
                user.username = adminProfile.username;
                user.full_name = adminProfile.full_name;
                user.admin_role = adminProfile.admin_role;
              }
            } catch {
              // Continue with basic user data if admin details can't be fetched
              console.warn('Failed to fetch admin profile details');
            }
          }

          // For business accounts, fetch additional business profile details (non-blocking)
          if (user.role === 'business') {
            try {
              const businessResult = await withTimeout(
                query(
                  `SELECT provider_id, name as business_name, provider_type as business_type, phone as business_phone,
                   address as business_address, application_status as verification_status
                   FROM service_providers WHERE user_id = ? LIMIT 1`,
                  [user.user_id]
                ),
                2000,
                'business profile fetch'
              ) as any[];

              if (businessResult && businessResult.length > 0) {
                const business = businessResult[0];
                user.business_name = business.business_name;
                user.business_type = business.business_type;
                user.business_phone = business.business_phone;
                user.business_address = business.business_address;
                user.business_id = business.provider_id;
                user.verification_status = business.verification_status ?? 'pending';
              }
            } catch {
              // Continue with basic user data if business details can't be fetched
              console.warn('Failed to fetch business profile details');
            }
          }

          // Add user_type for backward compatibility
          user.user_type = user.role === 'fur_parent' ? 'fur_parent' : user.role;

          // Create secure response with httpOnly cookies
          const response = NextResponse.json({
            success: true,
            message: 'Login successful',
            user,
            account_type: accountType,
            isRestricted: isRestricted,
            // Add legacy token for frontend compatibility
            token: `${user.user_id}_${accountType}`
          }, {
            headers
          });

          // Set secure authentication cookies (JWT httpOnly)
          setSecureAuthCookies(response, user.user_id.toString(), accountType as 'user' | 'admin' | 'business', user.email);
          // Also set legacy cookie for client-side flows (capstone/demo). NOTE: Not secure for production.
          response.cookies.set('auth_token', `${user.user_id}_${accountType}`, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/'
          });

      return response;

  } catch (error) {
    // Log the original error for server-side diagnostics
    console.error('Login error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Check if it's a timeout error (operation-level timeouts via withTimeout function)
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json({
        error: 'Request timeout',
        message: 'Login request timed out. Please try again.'
      }, {
        status: 408,
        headers
      });
    }

    // Return fixed 500 payload without exposing internal error details
    return NextResponse.json({
      error: 'Login failed',
      message: 'An unexpected error occurred.'
    }, {
      status: 500,
      headers
    });
  }
}
