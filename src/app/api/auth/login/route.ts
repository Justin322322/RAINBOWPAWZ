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

    // First check in users table
    let userResult = await query(
      'SELECT id, first_name, last_name, email, password FROM users WHERE email = ? LIMIT 1',
      [email]
    ) as any[];

    if (userResult && userResult.length > 0) {
      const user = userResult[0];

      try {
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
          // Remove password from the returned data
          delete user.password;

          return NextResponse.json({
            success: true,
            message: 'Login successful',
            user,
            account_type: 'user'
          });
        } else {
          // Password is incorrect for this user
          return NextResponse.json({
            error: 'Incorrect password',
            message: 'The password you entered is incorrect. Please try again.'
          }, { status: 401 });
        }
      } catch (bcryptError) {
        // Continue to check other tables
      }
    }

    // Check in businesses table
    let businessResult = await query(
      'SELECT id, business_name, email, password, is_verified FROM businesses WHERE email = ? LIMIT 1',
      [email]
    ) as any[];

    if (businessResult && businessResult.length > 0) {
      const business = businessResult[0];

      try {
        const passwordMatch = await bcrypt.compare(password, business.password);

        if (passwordMatch) {
          // Remove password from the returned data
          delete business.password;

          return NextResponse.json({
            success: true,
            message: 'Login successful',
            user: business,
            account_type: 'business'
          });
        } else {
          // Password is incorrect for this business
          return NextResponse.json({
            error: 'Incorrect password',
            message: 'The password you entered is incorrect. Please try again.'
          }, { status: 401 });
        }
      } catch (bcryptError) {
        // Continue to check other tables
      }
    }

    // Check in admins table
    let adminResult = await query(
      'SELECT id, username, email, password, full_name, role FROM admins WHERE email = ? OR username = ? LIMIT 1',
      [email, email]
    ) as any[];

    if (adminResult && adminResult.length > 0) {
      const admin = adminResult[0];

      try {
        const passwordMatch = await bcrypt.compare(password, admin.password);

        if (passwordMatch) {
          // Remove password from the returned data
          delete admin.password;

          // Update last login timestamp
          await query(
            'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [admin.id]
          );

          return NextResponse.json({
            success: true,
            message: 'Login successful',
            user: admin,
            account_type: 'admin'
          });
        } else {
          // Password is incorrect for this admin
          return NextResponse.json({
            error: 'Incorrect password',
            message: 'The password you entered is incorrect. Please try again.'
          }, { status: 401 });
        }
      } catch (bcryptError) {
        // Ignore bcrypt errors
      }
    }

    // If we get here, no user with this email was found in any table
    return NextResponse.json({
      error: 'User not found',
      message: 'No account exists with this email address. Please check your email or create a new account.'
    }, { status: 401 });

  } catch (error) {
    return NextResponse.json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
