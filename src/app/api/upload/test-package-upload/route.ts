import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Testing package image upload functionality...');
    
    // Test basic connection
    const [testResult] = await query('SELECT 1 as test') as any[];
    console.log('Basic connection test result:', testResult);
    
    if (!testResult || testResult.test !== 1) {
      throw new Error('Database connection test failed');
    }

    // Test service_providers table access
    const [providerCount] = await query('SELECT COUNT(*) as count FROM service_providers') as any[];
    console.log('Service providers count:', providerCount);
    
    // Test service_packages table access
    const [packageCount] = await query('SELECT COUNT(*) as count FROM service_packages') as any[];
    console.log('Service packages count:', packageCount);
    
    // Test package_images table access
    const [imageCount] = await query('SELECT COUNT(*) as count FROM package_images') as any[];
    console.log('Package images count:', imageCount);
    
    // Test file system access
    const fs = require('fs');
    const path = require('path');
    const packagesDir = path.join(process.cwd(), 'public', 'uploads', 'packages');
    
    let fileSystemTest = { canRead: false, canWrite: false, canCreateDir: false };
    
    try {
      // Test if we can read the public directory
      fileSystemTest.canRead = fs.existsSync(path.join(process.cwd(), 'public'));
      
      // Test if we can create a test directory
      if (!fs.existsSync(packagesDir)) {
        fs.mkdirSync(packagesDir, { recursive: true });
        fileSystemTest.canCreateDir = true;
        // Clean up test directory
        fs.rmdirSync(packagesDir);
      } else {
        fileSystemTest.canCreateDir = true;
      }
      
      // Test if we can write a test file
      const testFile = path.join(packagesDir, 'test.txt');
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
      message: 'Package image upload test successful',
      data: {
        connectionTest: testResult,
        providerCount: providerCount.count,
        packageCount: packageCount.count,
        imageCount: imageCount.count,
        fileSystem: fileSystemTest
      }
    });
    
  } catch (error) {
    console.error('Package image upload test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Package image upload test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
