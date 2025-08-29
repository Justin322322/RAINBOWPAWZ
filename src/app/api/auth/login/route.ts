import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { setSecureAuthCookies } from '@/lib/secureAuth';

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

  // Set timeout for the entire operation (25 seconds for Vercel)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password are required'
      }, {
        status: 400,
        headers
      });
    }

    // Single database query to get user data
    let userResult;
    try {
      userResult = await query(
        'SELECT user_id, first_name, last_name, email, password, role, is_verified, is_otp_verified, status, profile_picture, phone, address, gender FROM users WHERE email = ? LIMIT 1',
        [email]
      ) as any[];
    } catch (queryError) {
      console.error('Error querying user:', queryError);
      throw queryError;
    }

    if (userResult && userResult.length > 0) {
      const user = userResult[0];

      // Add id field for client compatibility
      user.id = user.user_id;

      // Allow restricted users to login but they'll be redirected to restricted page
      // This enables them to access the appeal system
      const isRestricted = user.status === 'restricted';

      // Check if password hash is valid
      if (!user.password || user.password.length < 20) {
        return NextResponse.json({
          error: 'Authentication error',
          message: 'Your account has an invalid password format. Please reset your password.'
        }, {
          status: 401,
          headers
        });
      }

      // Compare password with stored hash
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return NextResponse.json({
          error: 'Incorrect password',
          message: 'The password you entered is incorrect. Please try again.'
        }, {
          status: 401,
          headers
        });
      }

      // Password is correct, proceed with login
      delete user.password;

      // Determine account type from role field
      const accountType = user.role === 'fur_parent' ? 'user' : user.role;

      // Update last login timestamp (non-blocking)
      try {
        await query(
          'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
          [user.user_id]
        );
      } catch (updateError) {
        // Log but don't fail the login for this
        console.warn('Failed to update last login timestamp:', updateError);
      }

          // For admin accounts, fetch additional admin profile details (non-blocking)
          if (user.role === 'admin') {
            try {
              const adminResult = await Promise.race([
                query('SELECT username, full_name, admin_role FROM admin_profiles WHERE user_id = ? LIMIT 1', [user.user_id]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Admin profile query timeout')), 3000))
              ]) as any[];

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
              const businessResult = await Promise.race([
                query(
                  `SELECT provider_id, name as business_name, provider_type as business_type, phone as business_phone,
                   address as business_address, application_status as verification_status
                   FROM service_providers WHERE user_id = ? LIMIT 1`,
                  [user.user_id]
                ),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Business profile query timeout')), 3000))
              ]) as any[];

              if (businessResult && businessResult.length > 0) {
                const business = businessResult[0];
                user.business_name = business.business_name;
                user.business_type = business.business_type;
                user.business_phone = business.business_phone;
                user.business_address = business.business_address;
                user.business_id = business.provider_id;
                user.verification_status = business.verification_status || 'approved';
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

          // Clear timeout on successful response
          clearTimeout(timeoutId);
          return response;
    }

    // If we get here, no user with this email was found
    clearTimeout(timeoutId);
    return NextResponse.json({
      error: 'User not found',
      message: 'No account exists with this email address. Please check your email or create a new account.'
    }, {
      status: 401,
      headers
    });

  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    // Check if it's a timeout error
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({
        error: 'Request timeout',
        message: 'Login request timed out. Please try again.'
      }, {
        status: 408,
        headers
      });
    }

    return NextResponse.json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers
    });
  }
}
