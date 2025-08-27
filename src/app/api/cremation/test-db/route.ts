import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Testing database connection for cremation section...');
    
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
    
    // Test file system access
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'profile-pictures', 'test');
    
    let fileSystemTest = { canRead: false, canWrite: false, canCreateDir: false };
    
    try {
      // Test if we can read the public directory
      fileSystemTest.canRead = fs.existsSync(path.join(process.cwd(), 'public'));
      
      // Test if we can create a test directory
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        fileSystemTest.canCreateDir = true;
        // Clean up test directory
        fs.rmdirSync(uploadsDir);
      } else {
        fileSystemTest.canCreateDir = true;
      }
      
      // Test if we can write a test file
      const testFile = path.join(uploadsDir, 'test.txt');
      fs.writeFileSync(testFile, 'test');
      fileSystemTest.canWrite = true;
      // Clean up test file
      fs.unlinkSync(testFile);
      
    } catch (fsError) {
      console.log('File system test error:', fsError);
    }
    
    console.log('File system test results:', fileSystemTest);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection test successful',
      data: {
        connectionTest: testResult,
        userCount: userCount.count,
        hasProfilePictureColumn: !!columnCheck,
        fileSystem: fileSystemTest
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
