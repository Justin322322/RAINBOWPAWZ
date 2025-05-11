import { NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createWelcomeEmail, sendEmail } from '../../email/serverEmailService';
import { generateOtp } from '@/lib/otpService';

// Types for our request
interface PersonalRegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  address?: string;
  sex?: string;
  account_type: 'personal';
}

interface BusinessRegistrationData {
  businessName: string;
  businessType: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessPhone: string;
  businessAddress: string;
  province?: string;
  city?: string;
  zip?: string;
  businessHours?: string;
  serviceDescription?: string;
  account_type: 'business';
}

type RegistrationData = PersonalRegistrationData | BusinessRegistrationData;

export async function POST(request: Request) {
  console.log('Registration API called');
  console.log('Request method:', request.method);
  console.log('Request headers:', Object.fromEntries([...request.headers.entries()]));

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
    console.log('Testing database connection...');
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Database connection failed during registration');
      return NextResponse.json({
        error: 'Database connection error',
        message: 'Unable to connect to the database. Please try again later.'
      }, {
        status: 500,
        headers
      });
    }
    console.log('Database connection successful');

    // Parse request body
    let data;
    try {
      data = await request.json() as RegistrationData;
      console.log('Request body parsed successfully:', {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        account_type: data.account_type
      });
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({
        error: 'Invalid request body',
        message: 'The request body could not be parsed as JSON.'
      }, {
        status: 400,
        headers
      });
    }

    // Validate required fields
    const requiredFields = ['email', 'password', 'account_type'];

    if (data.account_type === 'personal') {
      requiredFields.push('firstName', 'lastName');
    } else if (data.account_type === 'business') {
      requiredFields.push('businessName', 'businessType', 'firstName', 'lastName', 'businessPhone', 'businessAddress');
    } else {
      return NextResponse.json({
        error: 'Invalid account type'
      }, {
        status: 400,
        headers
      });
    }

    const missingFields = requiredFields.filter(field => !data[field as keyof RegistrationData]);

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Missing required fields',
        fields: missingFields
      }, {
        status: 400,
        headers
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json({
        error: 'Invalid email format'
      }, {
        status: 400,
        headers
      });
    }

    // Check if email already exists in users table (for all account types)
    const emailCheckResult = await query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [data.email]
    ) as any[];

    if (emailCheckResult && emailCheckResult.length > 0) {
      return NextResponse.json({
        error: 'Email already exists'
      }, {
        status: 400,
        headers
      });
    }

    // Function to handle the registration process with transaction
    const registerUser = async () => {
      console.log('Starting registration process for:', data.email);

      // Start a transaction to ensure data consistency
      console.log('Starting transaction...');
      await query('START TRANSACTION');
      console.log('Transaction started successfully');

      try {
        // Hash the password
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash(data.password, 10);
        console.log('Password hashed successfully');

        let userId;

        // Set the role based on account type
        const role = data.account_type === 'personal' ? 'fur_parent' : 'business';
        console.log('User role set to:', role);

        // Register in users table
        console.log('Inserting user into database...');
        try {
          // Insert user with simplified query
          const sql = `INSERT INTO users (email, password, first_name, last_name, phone_number, address, sex, role)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

          const values = [
            data.email,
            hashedPassword,
            data.firstName,
            data.lastName,
            data.account_type === 'personal' ? data.phoneNumber || null : (data as BusinessRegistrationData).businessPhone,
            data.account_type === 'personal' ? data.address || null : (data as BusinessRegistrationData).businessAddress,
            data.account_type === 'personal' ? (data as PersonalRegistrationData).sex || null : null,
            role
          ];

          console.log('SQL Query:', sql);
          console.log('Values:', values.map((val, i) => i === 1 ? '[REDACTED]' : val));

          const userResult = await query(sql, values) as any;
          console.log('User inserted successfully, result:', userResult);
          userId = userResult.insertId;
          console.log('User ID assigned:', userId);
        } catch (insertError) {
          console.error('Error inserting user into database:', insertError);
          throw insertError;
        }

        // If it's a business account, also create an entry in the business_profiles table
        if (data.account_type === 'business' && userId) {
          console.log('Creating business profile for user ID:', userId);

          try {
            // Insert business profile with simplified query
            const businessData = data as BusinessRegistrationData;
            const sql = `INSERT INTO business_profiles
                        (user_id, business_name, business_type, contact_first_name, contact_last_name,
                         business_phone, business_address, province, city, zip,
                         business_hours, service_description, verification_status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const values = [
              userId,
              businessData.businessName,
              businessData.businessType,
              data.firstName,
              data.lastName,
              businessData.businessPhone,
              businessData.businessAddress,
              businessData.province || null,
              businessData.city || null,
              businessData.zip || null,
              businessData.businessHours || null,
              businessData.serviceDescription || null,
              'pending'
            ];

            console.log('Business profile SQL Query:', sql);
            console.log('Business profile values:', values);

            const result = await query(sql, values) as any;
            console.log('Business profile created successfully, result:', result);
          } catch (businessProfileError) {
            console.error('Error creating business profile:', businessProfileError);
            // Continue with registration even if business profile creation fails
            // We'll handle this in the admin dashboard
          }
        }

        // Commit the transaction
        console.log('Committing transaction...');
        await query('COMMIT');
        console.log('Transaction committed successfully');

        return userId;
      } catch (error) {
        // Rollback the transaction in case of error
        console.error('Error during registration transaction, rolling back:', error);
        await query('ROLLBACK');
        console.log('Transaction rolled back');
        throw error;
      }
    };

    // Execute the registration process
    const userId = await registerUser();

    if (userId) {
      // Send welcome email
      try {
        const accountType = data.account_type === 'personal' ? 'personal' : 'business';
        const { to, subject, html } = createWelcomeEmail(data.email, data.firstName, accountType);

        // Log email details for debugging
        console.log('Attempting to send welcome email with details:', {
          to,
          subject,
          smtpUser: process.env.SMTP_USER ? 'Set' : 'Not set',
          smtpPass: process.env.SMTP_PASS ? 'Set' : 'Not set'
        });

        const emailResult = await sendEmail(to, subject, html);

        if (emailResult.success) {
          console.log('Welcome email sent successfully to:', data.email);
        } else {
          console.error('Failed to send welcome email:', emailResult.error);
          // Continue with registration even if email fails
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue with registration even if email fails
      }

      // Generate OTP for the new user
      try {
        console.log('Generating OTP for newly registered user:', userId);
        const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

        const otpResult = await generateOtp({
          userId: userId.toString(),
          email: data.email,
          ipAddress
        });

        if (otpResult.success) {
          console.log('OTP generated successfully for new user');
        } else {
          console.error('Failed to generate OTP for new user:', otpResult.error);
          // Continue with registration even if OTP generation fails
        }
      } catch (otpError) {
        console.error('Error generating OTP for new user:', otpError);
        // Continue with registration even if OTP generation fails
      }

      return NextResponse.json({
        success: true,
        message: 'Registration successful',
        user_id: userId
      }, {
        status: 201,
        headers
      });
    } else {
      throw new Error('Failed to create user account');
    }
  } catch (error) {
    console.error('Registration error:', error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers
    });
  }
}
