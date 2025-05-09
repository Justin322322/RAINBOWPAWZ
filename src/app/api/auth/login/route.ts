import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
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
    const body = await request.json();
    const { email, password } = body;

    console.log('Login attempt:', { email });

    // Validate required fields
    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json({
        error: 'Email and password are required'
      }, { status: 400 });
    }

    // First check in users table
    let userResult = await query(
      'SELECT id, first_name, last_name, email, password FROM users WHERE email = ? LIMIT 1',
      [email]
    ) as any[];

    console.log('User query result:', { found: userResult && userResult.length > 0 });

    if (userResult && userResult.length > 0) {
      const user = userResult[0];
      console.log('Found user:', { id: user.id, email: user.email, hasPassword: !!user.password });

      try {
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log('Password match result:', passwordMatch);

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
        console.error('bcrypt error:', bcryptError);
        // Continue to check other tables
      }
    }

    // Check in businesses table
    let businessResult = await query(
      'SELECT id, business_name, email, password, is_verified FROM businesses WHERE email = ? LIMIT 1',
      [email]
    ) as any[];

    console.log('Business query result:', { found: businessResult && businessResult.length > 0 });

    if (businessResult && businessResult.length > 0) {
      const business = businessResult[0];
      console.log('Found business:', { id: business.id, email: business.email, hasPassword: !!business.password });

      try {
        const passwordMatch = await bcrypt.compare(password, business.password);
        console.log('Password match result:', passwordMatch);

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
        console.error('bcrypt error:', bcryptError);
        // Continue to check other tables
      }
    }

    // Check in admins table
    let adminResult = await query(
      'SELECT id, username, email, password, full_name, role FROM admins WHERE email = ? OR username = ? LIMIT 1',
      [email, email]
    ) as any[];

    console.log('Admin query result:', { found: adminResult && adminResult.length > 0 });

    if (adminResult && adminResult.length > 0) {
      const admin = adminResult[0];
      console.log('Found admin:', { id: admin.id, email: admin.email, hasPassword: !!admin.password });

      try {
        const passwordMatch = await bcrypt.compare(password, admin.password);
        console.log('Password match result:', passwordMatch);

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
        console.error('bcrypt error:', bcryptError);
      }
    }

    // If we get here, no user with this email was found in any table
    console.log('No user found with email:', email);
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
