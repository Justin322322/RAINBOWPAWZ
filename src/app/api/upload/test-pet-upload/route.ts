import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Testing pet image upload functionality...');
    
    // Test basic connection
    const [testResult] = await query('SELECT 1 as test') as any[];
    console.log('Basic connection test result:', testResult);
    
    if (!testResult || testResult.test !== 1) {
      throw new Error('Database connection test failed');
    }

    // Test users table access
    const [userCount] = await query('SELECT COUNT(*) as count FROM users') as any[];
    console.log('Users count:', userCount);
    
    // Test pets table access (if it exists)
    try {
      const [petCount] = await query('SELECT COUNT(*) as count FROM pets') as any[];
      console.log('Pets count:', petCount);
    } catch (error) {
      console.log('Pets table not accessible or does not exist');
    }
    
    // Test file system access
    const fs = require('fs');
    const path = require('path');
    const petsDir = path.join(process.cwd(), 'public', 'uploads', 'pets');
    
    let fileSystemTest = { canRead: false, canWrite: false, canCreateDir: false };
    
    try {
      // Test if we can read the public directory
      fileSystemTest.canRead = fs.existsSync(path.join(process.cwd(), 'public'));
      
      // Test if we can create a test directory
      if (!fs.existsSync(petsDir)) {
        fs.mkdirSync(petsDir, { recursive: true });
        fileSystemTest.canCreateDir = true;
        // Clean up test directory
        fs.rmdirSync(petsDir);
      } else {
        fileSystemTest.canCreateDir = true;
      }
      
      // Test if we can write a test file
      const testFile = path.join(petsDir, 'test.txt');
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
      message: 'Pet image upload test successful',
      data: {
        connectionTest: testResult,
        userCount: userCount.count,
        fileSystem: fileSystemTest
      }
    });
    
  } catch (error) {
    console.error('Pet image upload test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Pet image upload test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
