import { NextResponse } from 'next/server';
import { query, testConnection, checkTableExists, withTransaction } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateOtp } from '@/lib/otpService';
import { createAdminNotification } from '@/utils/adminNotificationService';

// Import the consolidated email service
import { sendWelcomeEmail } from '@/lib/consolidatedEmailService';

// Import phone number formatting
import { testPhoneNumberFormatting } from '@/lib/smsService';

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
  businessEntityType: string; // New field for legal entity type (Sole Proprietorship, Corporation, etc.)
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessPhone: string;
  businessAddress: string;
  businessProvince?: string;
  businessCity?: string;
  businessZip?: string;
  businessHours?: string;
  serviceDescription?: string;
  account_type: 'business';
}

type RegistrationData = PersonalRegistrationData | BusinessRegistrationData;

/**
 * Helper function to validate password strength
 * Must meet all criteria: 8+ chars, uppercase, lowercase, numbers, special chars
 */
function validatePasswordStrength(password: string): {
  isValid: boolean;
  message: string;
  requirements: string[];
} {
  const requirements: string[] = [];
  let isValid = true;

  // Check minimum length (8 characters)
  if (password.length < 8) {
    requirements.push('At least 8 characters long');
    isValid = false;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    requirements.push('At least one lowercase letter');
    isValid = false;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    requirements.push('At least one uppercase letter');
    isValid = false;
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    requirements.push('At least one number');
    isValid = false;
  }

  // Check for special characters
  if (!/[^A-Za-z0-9]/.test(password)) {
    requirements.push('At least one special character');
    isValid = false;
  }

  const message = isValid
    ? 'Password meets all requirements'
    : `Password must include: ${requirements.join(', ')}`;

  return {
    isValid,
    message,
    requirements
  };
}

/**
 * Helper function to format and validate Philippine phone numbers
 */
function formatPhoneNumber(phoneNumber: string | undefined): string | null {
  if (!phoneNumber || !phoneNumber.trim()) {
    return null;
  }

  const formatResult = testPhoneNumberFormatting(phoneNumber.trim());

  if (formatResult.success && formatResult.formatted) {
    return formatResult.formatted;
  }

  // If formatting fails, return null (will be handled as validation error if required)
  return null;
}

export async function POST(request: Request) {
  // Test database connection first
  const _dbConnected = await testConnection();

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
    } catch {
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
      requiredFields.push('businessName', 'businessType', 'businessEntityType', 'firstName', 'lastName', 'businessPhone', 'businessAddress');
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

    // Validate password strength (must meet all criteria)
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({
        error: 'Password does not meet requirements',
        message: passwordValidation.message,
        requirements: passwordValidation.requirements
      }, {
        status: 400,
        headers
      });
    }

    // Check if email already exists in users table (for all account types)
    const emailCheckResult = await query(
      `SELECT user_id FROM users WHERE email = ? LIMIT 1`,
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
      // **🔥 FIX: Use proper transaction management to prevent connection leaks**
      return await withTransaction(async (transaction) => {
        // Hash the password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        let userId;

        // Set the role based on account type
        const role = data.account_type === 'personal' ? 'fur_parent' : 'business';

        // Register in users table
        try {
          // Check users table structure
          const _usersTableColumns = await transaction.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
          `) as any[];


          // Insert user with simplified query
          const sql = `INSERT INTO users (email, password, first_name, last_name, phone, address, gender, role)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

          // Format gender value to match enum ('Male', 'Female', 'Other')
          let genderValue = null;
          if (data.account_type === 'personal' && (data as PersonalRegistrationData).sex) {
            const sex = (data as PersonalRegistrationData).sex;
            if (sex) {
              const lowerCaseSex = sex.toLowerCase();
              if (lowerCaseSex === 'male') {
                genderValue = 'Male';
              } else if (lowerCaseSex === 'female') {
                genderValue = 'Female';
              } else if (lowerCaseSex === 'other' || lowerCaseSex === 'prefer-not-to-say') {
                genderValue = 'Other';
              }
            }
          }

          // Format phone numbers before saving
          let formattedPhone = null;
          if (data.account_type === 'personal') {
            formattedPhone = formatPhoneNumber((data as PersonalRegistrationData).phoneNumber);
          } else {
            formattedPhone = formatPhoneNumber((data as BusinessRegistrationData).businessPhone);
            // Validate business phone is required and properly formatted
            if (!formattedPhone) {
              throw new Error('Invalid business phone number format. Please enter a valid Philippine mobile number.');
            }
          }

          const values = [
            data.email,
            hashedPassword,
            data.firstName,
            data.lastName,
            formattedPhone,
            data.account_type === 'personal' ? data.address || null : (data as BusinessRegistrationData).businessAddress,
            genderValue,
            role
          ];

          console.log("Inserting user with values:", {
            email: data.email,
            password: "REDACTED",
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.account_type === 'personal' ? data.phoneNumber || null : (data as BusinessRegistrationData).businessPhone,
            address: data.account_type === 'personal' ? data.address || null : (data as BusinessRegistrationData).businessAddress,
            gender: genderValue,
            role: role,
          });

          const userResult = await transaction.query(sql, values) as any;
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

            // Log the SQL query for debugging

            // Check if the service_providers table exists and get its columns
            const _tableCheckResult = await transaction.query(`
              SELECT COLUMN_NAME
              FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'service_providers'
            `) as any[];


            // Use a more explicit approach with column names
            // First, check if the service_providers table exists
            const _tableExists = await checkTableExists('service_providers');

            const sql = `INSERT INTO service_providers
                        SET user_id = ?,
                            name = ?,
                            provider_type = ?,
                            business_entity_type = ?,
                            contact_first_name = ?,
                            contact_last_name = ?,
                            phone = ?,
                            address = ?,
                            hours = ?,
                            description = ?,
                            application_status = ?`;

            // Log the values for debugging
            console.log("Service provider values:", {
              userId,
              businessName: businessData.businessName,
              providerType,
              firstName: data.firstName,
              lastName: data.lastName,
              phone: businessData.businessPhone,
              address: businessData.businessAddress,
              hours: businessData.businessHours || null,
              description: businessData.serviceDescription || null
            });

            // Format business phone number (already validated above)
            const formattedBusinessPhone = formatPhoneNumber(businessData.businessPhone);

            const values = [
              userId,
              businessData.businessName,
              providerType,
              businessData.businessEntityType,
              data.firstName,
              data.lastName,
              formattedBusinessPhone,
              businessData.businessAddress,
              businessData.businessHours || null,
              businessData.serviceDescription || null,
              'pending'
            ];

            let result;
            try {
              result = await transaction.query(sql, values) as any;
            } catch (queryError) {
              console.error("Error executing service provider insertion query:", queryError);
              throw queryError;
            }

            // Create admin notification for all business registrations
            try {
              const serviceProviderId = result.insertId;

              // Use different notification type and message based on provider type
              const notificationType = providerType === 'cremation' ? 'new_cremation_center' : 'pending_application';
              const notificationTitle = providerType === 'cremation' ? 'New Cremation Center Registration' : 'New Business Registration';
              const notificationMessage = `${businessData.businessName} has registered as a ${providerType} provider and is pending verification.`;

              const notificationResult = await createAdminNotification({
                type: notificationType,
                title: notificationTitle,
                message: notificationMessage,
                entityType: 'service_provider',
                entityId: serviceProviderId
              });

              if (notificationResult.success) {
              } else {
                console.error("Failed to create admin notification:", notificationResult.error);
              }
            } catch (notificationError) {
              console.error("Error creating admin notification:", notificationError);
              // Continue with registration even if notification creation fails
            }
          } catch (serviceProviderError) {
            // Log the error for debugging
            console.error("Error creating service provider:", serviceProviderError);

            // Continue with registration even if service provider creation fails
            // We'll handle this in the admin dashboard
          }
        }

        return userId;
      });
    };

    // Execute the registration process
    let userId;
    try {
      userId = await registerUser();
    } catch (regError) {
      console.error("Registration process failed:", regError);
      throw regError;
    }

    if (userId) {
      // Send welcome email
      try {
        const accountType = data.account_type === 'personal' ? 'personal' : 'business';

        // Send using simple email service
        const emailResult = await sendWelcomeEmail(data.email, data.firstName, accountType);

        if (!emailResult.success) {
          console.warn("Failed to send welcome email:", emailResult);
          // Continue with registration even if email fails
        } else {
        }
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
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
            console.warn("Failed to generate OTP:", otpResult);
            // Continue with registration even if OTP generation fails
          } else {

            // For fur parents, auto-approve is_verified
            try {
              const _updateResult = await query(
                'UPDATE users SET is_verified = 1 WHERE user_id = ?',
                [userId]
              );
            } catch (updateError) {
              console.error("Error updating fur parent verification status:", updateError);
              // Continue with registration even if verification update fails
            }
          }
        } else {
          // For cremation centers, mark them as OTP verified AND is_verified automatically
          try {
            const _updateResult = await query(
              'UPDATE users SET is_otp_verified = 1, is_verified = 1 WHERE user_id = ?',
              [userId]
            );
          } catch (updateError) {
            console.error("Error updating verification status:", updateError);
            throw updateError;
          }
        }
      } catch (otpError) {
        console.error("Error in OTP generation/verification process:", otpError);
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
    // Log the detailed error for debugging
    console.error("Registration failed with error:", error);

    // Handle error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
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
