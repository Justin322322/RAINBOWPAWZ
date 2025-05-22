import { NextResponse } from 'next/server';
import { query, testConnection } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateOtp } from '@/lib/otpService';
import { createAdminNotification } from '@/utils/adminNotificationService';

// Import the consolidated email service
import { sendWelcomeEmail } from '@/lib/consolidatedEmailService';

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
  businessHours?: string;
  serviceDescription?: string;
  account_type: 'business';
}

type RegistrationData = PersonalRegistrationData | BusinessRegistrationData;

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

    // Parse request body
    let data;
    try {
      data = await request.json() as RegistrationData;
    } catch (parseError) {
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

      // Start a transaction to ensure data consistency
      await query('START TRANSACTION');

      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        let userId;

        // Set the role based on account type
        const role = data.account_type === 'personal' ? 'fur_parent' : 'business';

        // Register in users table
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


          const userResult = await query(sql, values) as any;
          userId = userResult.insertId;
        } catch (insertError) {
          throw insertError;
        }

        // If it's a business account, also create an entry in the service_providers table
        if (data.account_type === 'business' && userId) {

          try {
            // Insert service provider with simplified query
            const businessData = data as BusinessRegistrationData;

            // Map business type to provider_type enum value
            let providerType = 'cremation';
            if (businessData.businessType === 'memorial') {
              providerType = 'memorial';
            } else if (businessData.businessType === 'veterinary') {
              providerType = 'veterinary';
            }

            const sql = `INSERT INTO service_providers
                        (user_id, name, provider_type, contact_first_name, contact_last_name,
                         phone, address, province, city, zip,
                         hours, service_description, application_status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const values = [
              userId,
              businessData.businessName,
              providerType,
              data.firstName,
              data.lastName,
              businessData.businessPhone,
              businessData.businessAddress,
              null, // province
              null, // city
              null, // zip
              businessData.businessHours || null,
              businessData.serviceDescription || null,
              'pending'
            ];


            const result = await query(sql, values) as any;

            // Create admin notification for cremation center registration
            if (providerType === 'cremation') {
              try {
                const serviceProviderId = result.insertId;

                await createAdminNotification({
                  type: 'new_cremation_center',
                  title: 'New Cremation Center Registration',
                  message: `${businessData.businessName} has registered as a cremation center and is pending verification.`,
                  entityType: 'service_provider',
                  entityId: serviceProviderId
                });

              } catch (notificationError) {
                // Continue with registration even if notification creation fails
              }
            }
          } catch (serviceProviderError) {
            // Continue with registration even if service provider creation fails
            // We'll handle this in the admin dashboard
          }
        }

        // Commit the transaction
        await query('COMMIT');

        return userId;
      } catch (error) {
        // Rollback the transaction in case of error
        await query('ROLLBACK');
        throw error;
      }
    };

    // Execute the registration process
    const userId = await registerUser();

    if (userId) {
      // Send welcome email
      try {
        const accountType = data.account_type === 'personal' ? 'personal' : 'business';

        // Send using simple email service
        const emailResult = await sendWelcomeEmail(data.email, data.firstName, accountType);

        if (!emailResult.success) {
          // Continue with registration even if email fails
        }
      } catch (emailError) {
        // Continue with registration even if email fails
      }

      // Generate OTP for the new user, but skip for cremation centers
      try {
        // Check if this is a cremation center registration
        const isCremationCenter = data.account_type === 'business' &&
          (data as BusinessRegistrationData).businessType === 'cremation';

        // Skip OTP generation for cremation centers
        if (!isCremationCenter) {
          const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

          const otpResult = await generateOtp({
            userId: userId.toString(),
            email: data.email,
            ipAddress
          });

          if (!otpResult.success) {
            // Continue with registration even if OTP generation fails
          }
        } else {
          // For cremation centers, mark them as OTP verified automatically
          await query(
            'UPDATE users SET is_otp_verified = 1 WHERE id = ?',
            [userId]
          );
        }
      } catch (otpError) {
        // Continue with registration even if OTP generation fails
      }

      return NextResponse.json({
        success: true,
        message: 'Registration successful',
        userId: userId
      }, {
        status: 200,
        headers
      });
    } else {
      throw new Error('Failed to create user account');
    }
  } catch (error) {

    // Handle error
    if (error instanceof Error) {
      // Process error
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
