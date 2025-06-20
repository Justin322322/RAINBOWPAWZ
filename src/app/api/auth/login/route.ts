import { NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/db';
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

  try {
    // Test database connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json({
        error: 'Database connection error',
        message: 'Unable to connect to the database. Please try again later.'
      }, {
        status: 500,
        headers
      });
    }

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


    // Check in users table - this now handles all account types
    let userResult;
    try {
      // Test database connection first
      const isConnected = await testConnection();
      if (!isConnected) {
        return NextResponse.json({
          error: 'Database connection error',
          message: 'Unable to connect to the database. Please try again later.'
        }, {
          status: 500,
          headers
        });
      }

      userResult = await query(
        'SELECT user_id, first_name, last_name, email, password, role, is_verified, is_otp_verified, status FROM users WHERE email = ? LIMIT 1',
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

      // Check if user is restricted
      if (user.status === 'restricted') {
        return NextResponse.json({
          error: 'Account restricted',
          message: 'Your account has been restricted. Please contact support for assistance.'
        }, {
          status: 403,
          headers
        });
      }

      try {

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

        if (passwordMatch) {
          // Remove password from the returned data
          delete user.password;

          // Determine account type from role field
          const accountType = user.role === 'fur_parent' ? 'user' : user.role;

          // Update last login timestamp
          await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
            [user.user_id]
          );

          // For admin accounts, fetch additional admin profile details
          if (user.role === 'admin') {
            try {
              // First, check if the admin_profiles table exists
              const adminTableCheck = await query(
                `SELECT COUNT(*) as count FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = 'admin_profiles'`
              ) as any[];

              const adminTableExists = adminTableCheck[0]?.count > 0;

              if (adminTableExists) {
                const adminResult = await query(
                  'SELECT username, full_name, admin_role FROM admin_profiles WHERE user_id = ? LIMIT 1',
                  [user.user_id]
                ) as any[];

                if (adminResult && adminResult.length > 0) {
                  const adminProfile = adminResult[0];

                  // Merge admin profile details with user data
                  const adminUser = {
                    ...user,
                    username: adminProfile.username,
                    full_name: adminProfile.full_name,
                    admin_role: adminProfile.admin_role,
                    user_type: 'admin', // For backward compatibility
                    id: user.user_id // Ensure id field is present
                  };

                  // Create secure response with httpOnly cookies
                  const response = NextResponse.json({
                    success: true,
                    message: 'Login successful',
                    user: adminUser,
                    account_type: 'admin'
                    // No token in response body - using secure cookies instead
                  }, {
                    headers
                  });

                  // Set secure authentication cookies
                  setSecureAuthCookies(response, user.user_id.toString(), 'admin', user.email);
                  
                  return response;
                }
              }
            } catch {
              // Continue with basic user data if admin details can't be fetched
            }
          }

          // For business accounts, fetch additional business profile details
          if (user.role === 'business') {
            try {
              // Check service_providers table first (new structure)
              let businessResult = await query(
                `SELECT provider_id, name as business_name, provider_type as business_type, phone as business_phone,
                 address as business_address, application_status as verification_status
                 FROM service_providers WHERE user_id = ? LIMIT 1`,
                [user.user_id]
              ) as any[];

              // If no result, try the legacy business_profiles table
              if (!businessResult || businessResult.length === 0) {
                businessResult = await query(
                  `SELECT id, business_name, business_type, business_phone, business_address,
                   province, city, zip
                   FROM business_profiles WHERE user_id = ? LIMIT 1`,
                  [user.user_id]
                ) as any[];
              }

              if (businessResult && businessResult.length > 0) {
                const business = businessResult[0];

                // Merge business details with user data
                const businessUser = {
                  ...user,
                  business_name: business.business_name,
                  business_type: business.business_type,
                  business_phone: business.business_phone,
                  business_address: business.business_address,
                  // Only include these fields if they exist (from legacy business_profiles table)
                  province: business.province || null,
                  city: business.city || null,
                  zip: business.zip || null,
                  business_id: business.provider_id || business.id,
                  user_type: 'business', // For backward compatibility
                  verification_status: business.verification_status || 'approved', // Use the status from DB or default
                  id: user.user_id // Ensure id field is present
                };

                // Create secure response with httpOnly cookies
                const response = NextResponse.json({
                  success: true,
                  message: 'Login successful',
                  user: businessUser,
                  account_type: 'business'
                  // No token in response body - using secure cookies instead
                }, {
                  headers
                });

                // Set secure authentication cookies
                setSecureAuthCookies(response, user.user_id.toString(), 'business', user.email);
                
                return response;
              }
            } catch {
              // Continue with basic user data if business details can't be fetched
            }
          }

          // Add user_type for backward compatibility
          user.user_type = user.role === 'fur_parent' ? 'fur_parent' : user.role;

          // Create secure response with httpOnly cookies
          const response = NextResponse.json({
            success: true,
            message: 'Login successful',
            user,
            account_type: accountType
            // No token in response body - using secure cookies instead
          }, {
            headers
          });

          // Set secure authentication cookies
          setSecureAuthCookies(response, user.user_id.toString(), accountType as 'user' | 'admin' | 'business', user.email);
          
          // Return user data for personal accounts or if profile details couldn't be fetched
          return response;
        } else {
          // Password is incorrect for this user
          return NextResponse.json({
            error: 'Incorrect password',
            message: 'The password you entered is incorrect. Please try again.'
          }, {
            status: 401,
            headers
          });
        }
      } catch {
        return NextResponse.json({
          error: 'Authentication error',
          message: 'An error occurred during authentication. Please try again.'
        }, {
          status: 500,
          headers
        });
      }
    }

    // If we get here, no user with this email was found
    return NextResponse.json({
      error: 'User not found',
      message: 'No account exists with this email address. Please check your email or create a new account.'
    }, {
      status: 401,
      headers
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers
    });
  }
}
