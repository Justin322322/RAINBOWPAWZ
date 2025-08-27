import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Testing database connection for users section...');
    
    // Test basic connection
    const [testResult] = await query('SELECT 1 as test') as any[];
    console.log('Basic connection test result:', testResult);
    
    if (!testResult || testResult.test !== 1) {
      throw new Error('Database connection test failed');
    }

    // Test users table access
    const [userCount] = await query('SELECT COUNT(*) as count FROM users') as any[];
    console.log('Users table count:', userCount);
    
    // Test profile_picture column
    const [columnCheck] = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'profile_picture'
    `) as any[];
    
    console.log('Profile picture column check:', columnCheck);
    
    // Test fur parent users
    const [furParentCount] = await query('SELECT COUNT(*) as count FROM users WHERE role = "fur_parent"') as any[];
    console.log('Fur parent users count:', furParentCount);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test successful',
      data: {
        connectionTest: testResult,
        userCount: userCount.count,
        hasProfilePictureColumn: !!columnCheck,
        furParentCount: furParentCount.count
      }
    });
    
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
