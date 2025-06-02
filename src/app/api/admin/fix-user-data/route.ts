import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/admin/fix-user-data
 * Fix common user data issues like missing phone numbers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, user_id, phone_number } = body;

    switch (action) {
      case 'add_phone_number':
        return await addPhoneNumber(user_id, phone_number);
      
      case 'check_missing_phones':
        return await checkMissingPhoneNumbers();
      
      case 'fix_all_missing_phones':
        return await fixAllMissingPhoneNumbers();
      
      default:
        return NextResponse.json({
          error: 'Invalid action',
          details: 'Valid actions: add_phone_number, check_missing_phones, fix_all_missing_phones'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Fix user data error:', error);
    return NextResponse.json({
      error: 'Failed to fix user data',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

/**
 * Add phone number to a specific user
 */
async function addPhoneNumber(user_id: number, phone_number: string) {
  if (!user_id || !phone_number) {
    return NextResponse.json({
      error: 'user_id and phone_number are required'
    }, { status: 400 });
  }

  try {
    // Validate phone number format (Philippine format)
    const phoneRegex = /^(\+63|63|0)?[0-9]{10}$/;
    if (!phoneRegex.test(phone_number.replace(/\s+/g, ''))) {
      return NextResponse.json({
        error: 'Invalid phone number format',
        details: 'Phone number should be in Philippine format (e.g., +639123456789, 09123456789)'
      }, { status: 400 });
    }

    // Format phone number to standard format
    let formattedPhone = phone_number.replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+63' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('63')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+63')) {
      formattedPhone = '+63' + formattedPhone;
    }

    // Check if user exists
    const userCheck = await query(
      'SELECT user_id, first_name, last_name, email, phone FROM users WHERE user_id = ?',
      [user_id]
    ) as any[];

    if (userCheck.length === 0) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    const user = userCheck[0];

    // Update phone number
    await query(
      'UPDATE users SET phone = ? WHERE user_id = ?',
      [formattedPhone, user_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Phone number added successfully',
      data: {
        user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        old_phone: user.phone,
        new_phone: formattedPhone
      }
    });

  } catch (error) {
    throw new Error(`Failed to add phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check for users with missing phone numbers
 */
async function checkMissingPhoneNumbers() {
  try {
    const usersWithoutPhone = await query(`
      SELECT user_id, first_name, last_name, email, role, created_at
      FROM users 
      WHERE phone IS NULL OR phone = '' OR phone = '0'
      ORDER BY created_at DESC
    `) as any[];

    const totalUsers = await query('SELECT COUNT(*) as count FROM users') as any[];
    const totalCount = totalUsers[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        users_without_phone: usersWithoutPhone,
        count: usersWithoutPhone.length,
        total_users: totalCount,
        percentage: totalCount > 0 ? ((usersWithoutPhone.length / totalCount) * 100).toFixed(2) : '0'
      }
    });

  } catch (error) {
    throw new Error(`Failed to check missing phone numbers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fix all missing phone numbers with default values
 */
async function fixAllMissingPhoneNumbers() {
  try {
    // Get users without phone numbers
    const usersWithoutPhone = await query(`
      SELECT user_id, first_name, last_name, email, role
      FROM users 
      WHERE phone IS NULL OR phone = '' OR phone = '0'
    `) as any[];

    if (usersWithoutPhone.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users found with missing phone numbers',
        data: { updated_count: 0 }
      });
    }

    let updatedCount = 0;

    // Update each user with a placeholder phone number
    for (const user of usersWithoutPhone) {
      try {
        // Generate a placeholder phone number based on user ID
        const placeholderPhone = `+639${String(user.user_id).padStart(9, '0')}`;
        
        await query(
          'UPDATE users SET phone = ? WHERE user_id = ?',
          [placeholderPhone, user.user_id]
        );

        updatedCount++;
        console.log(`Updated phone for user ${user.user_id}: ${user.first_name} ${user.last_name} -> ${placeholderPhone}`);
      } catch (error) {
        console.error(`Failed to update phone for user ${user.user_id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated phone numbers for ${updatedCount} users`,
      data: {
        total_found: usersWithoutPhone.length,
        updated_count: updatedCount,
        failed_count: usersWithoutPhone.length - updatedCount,
        note: 'Placeholder phone numbers were assigned. Users should update their real phone numbers in their profile.'
      }
    });

  } catch (error) {
    throw new Error(`Failed to fix missing phone numbers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * GET /api/admin/fix-user-data
 * Get information about user data issues
 */
export async function GET() {
  try {
    // Check for various user data issues
    const usersWithoutPhone = await query(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE phone IS NULL OR phone = '' OR phone = '0'
    `) as any[];

    const usersWithoutEmail = await query(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE email IS NULL OR email = ''
    `) as any[];

    const usersWithoutName = await query(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = ''
    `) as any[];

    const totalUsers = await query('SELECT COUNT(*) as count FROM users') as any[];

    return NextResponse.json({
      success: true,
      data: {
        total_users: totalUsers[0]?.count || 0,
        issues: {
          missing_phone: usersWithoutPhone[0]?.count || 0,
          missing_email: usersWithoutEmail[0]?.count || 0,
          missing_name: usersWithoutName[0]?.count || 0
        },
        available_actions: [
          'add_phone_number',
          'check_missing_phones',
          'fix_all_missing_phones'
        ]
      }
    });

  } catch (error) {
    console.error('Error checking user data issues:', error);
    return NextResponse.json({
      error: 'Failed to check user data issues',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
