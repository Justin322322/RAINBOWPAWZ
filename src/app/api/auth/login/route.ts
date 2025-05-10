import { NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Types for our response
interface LoginResponse {
  success: boolean;
  message: string;
  user?: any;
  account_type?: string;
}

export async function POST(request: Request) {
  try {
    // Test database connection first
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json({
        error: 'Database connection error',
        message: 'Unable to connect to the database. Please try again later.'
      }, { status: 500 });
    }

    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password are required'
      }, { status: 400 });
    }

    console.log('Login attempt for:', email);

    // First check in admins table (prioritize admin accounts)
    let adminResult = await query(
      'SELECT id, username, email, password, full_name, role FROM admins WHERE email = ? OR username = ? LIMIT 1',
      [email, email]
    ) as any[];

    if (adminResult && adminResult.length > 0) {
      const admin = adminResult[0];

      try {
        console.log('Verifying admin password for:', email);
        const passwordMatch = await bcrypt.compare(password, admin.password);
        console.log('Admin password match result:', passwordMatch);

        if (passwordMatch) {
          // Remove password from the returned data
          delete admin.password;

          // Add user_type field to ensure dashboard access works
          admin.user_type = 'admin';

          // Update last login timestamp
          await query(
            'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [admin.id]
          );

          console.log('Admin login successful for:', email, 'with ID:', admin.id);
          return NextResponse.json({
            success: true,
            message: 'Login successful',
            user: admin,
            account_type: 'admin'
          });
        } else {
          // Password is incorrect for this admin
          console.log('Admin password incorrect for:', email);
          return NextResponse.json({
            error: 'Incorrect password',
            message: 'The password you entered is incorrect. Please try again.'
          }, { status: 401 });
        }
      } catch (bcryptError) {
        console.error('Error comparing admin password:', bcryptError);
        // Ignore bcrypt errors but log them
      }
    }

    // Check in users table - this should now handle both personal and business accounts
    let userResult = await query(
      'SELECT id, first_name, last_name, email, password, user_type FROM users WHERE email = ? LIMIT 1',
      [email]
    ) as any[];

    if (userResult && userResult.length > 0) {
      const user = userResult[0];

      try {
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
          // Remove password from the returned data
          delete user.password;

          // Determine account type from user_type field
          const accountType = user.user_type === 'fur_parent' ? 'user' : user.user_type;

          // For business accounts, fetch additional business details
          if (user.user_type === 'business') {
            try {
              // Get business details
              const businessResult = await query(
                'SELECT * FROM businesses WHERE email = ? LIMIT 1',
                [email]
              ) as any[];

              if (businessResult && businessResult.length > 0) {
                const business = businessResult[0];
                // Remove sensitive data
                delete business.password;

                // Merge business details with user data
                const businessUser = {
                  ...user,
                  business_name: business.business_name,
                  business_type: business.business_type,
                  business_phone: business.business_phone,
                  business_address: business.business_address,
                  is_verified: business.is_verified,
                  business_id: business.id
                };

                return NextResponse.json({
                  success: true,
                  message: 'Login successful',
                  user: businessUser,
                  account_type: 'business'
                });
              }
            } catch (businessError) {
              console.error('Error fetching business details:', businessError);
              // Continue with basic user data if business details can't be fetched
            }
          }

          // Return user data for personal accounts or if business details couldn't be fetched
          return NextResponse.json({
            success: true,
            message: 'Login successful',
            user,
            account_type: accountType
          });
        } else {
          // Password is incorrect for this user
          return NextResponse.json({
            error: 'Incorrect password',
            message: 'The password you entered is incorrect. Please try again.'
          }, { status: 401 });
        }
      } catch (bcryptError) {
        console.error('Error comparing user password:', bcryptError);
        return NextResponse.json({
          error: 'Authentication error',
          message: 'An error occurred during authentication. Please try again.'
        }, { status: 500 });
      }
    }

    // If we get here, no user with this email was found in any table
    console.log('No account found with email/username:', email);
    return NextResponse.json({
      error: 'User not found',
      message: 'No account exists with this email address. Please check your email or create a new account.'
    }, { status: 401 });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
