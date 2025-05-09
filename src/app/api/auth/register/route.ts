import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createWelcomeEmail, sendEmail } from '../../email/serverEmailService';

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
  try {
    const data = await request.json() as RegistrationData;

    // Validate required fields
    const requiredFields = ['email', 'password', 'account_type'];

    if (data.account_type === 'personal') {
      requiredFields.push('firstName', 'lastName');
    } else if (data.account_type === 'business') {
      requiredFields.push('businessName', 'businessType', 'firstName', 'lastName', 'businessPhone', 'businessAddress');
    } else {
      return NextResponse.json({
        error: 'Invalid account type'
      }, { status: 400 });
    }

    const missingFields = requiredFields.filter(field => !data[field as keyof RegistrationData]);

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Missing required fields',
        fields: missingFields
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json({
        error: 'Invalid email format'
      }, { status: 400 });
    }

    // Check if email already exists
    const emailType = data.account_type === 'personal' ? 'users' : 'businesses';
    const emailCheckResult = await query(
      `SELECT id FROM ${emailType} WHERE email = ? LIMIT 1`,
      [data.email]
    ) as any[];

    if (emailCheckResult && emailCheckResult.length > 0) {
      return NextResponse.json({
        error: 'Email already exists'
      }, { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    let userId;

    if (data.account_type === 'personal') {
      // Register personal account
      const result = await query(
        `INSERT INTO users (first_name, last_name, email, password, phone_number, address, sex)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.firstName,
          data.lastName,
          data.email,
          hashedPassword,
          data.phoneNumber || null,
          data.address || null,
          data.sex || null
        ]
      ) as any;

      userId = result.insertId;
    } else {
      // Register business account
      const result = await query(
        `INSERT INTO businesses (business_name, business_type, email, password, contact_first_name,
         contact_last_name, business_phone, business_address, province, city, zip, business_hours,
         service_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          (data as BusinessRegistrationData).businessName,
          (data as BusinessRegistrationData).businessType,
          data.email,
          hashedPassword,
          data.firstName,
          data.lastName,
          (data as BusinessRegistrationData).businessPhone,
          (data as BusinessRegistrationData).businessAddress,
          (data as BusinessRegistrationData).province || null,
          (data as BusinessRegistrationData).city || null,
          (data as BusinessRegistrationData).zip || null,
          (data as BusinessRegistrationData).businessHours || null,
          (data as BusinessRegistrationData).serviceDescription || null
        ]
      ) as any;

      userId = result.insertId;
    }

    if (userId) {
      // Send welcome email
      try {
        const accountType = data.account_type === 'personal' ? 'personal' : 'business';
        const { to, subject, html } = createWelcomeEmail(data.email, data.firstName, accountType);
        await sendEmail(to, subject, html);
        console.log('Welcome email sent successfully to:', data.email);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue with registration even if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Registration successful',
        user_id: userId
      }, { status: 201 });
    } else {
      throw new Error('Failed to create user account');
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
