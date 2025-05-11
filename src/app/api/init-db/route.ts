import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  console.log('Database initialization API called');
  
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  try {
    // Check if users table exists
    console.log('Checking if users table exists...');
    const tablesResult = await query("SHOW TABLES LIKE 'users'") as any[];
    
    if (!tablesResult || tablesResult.length === 0) {
      console.log('Users table does not exist, creating it...');
      
      // Create users table
      await query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(50) NOT NULL,
          last_name VARCHAR(50) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          phone_number VARCHAR(20),
          address TEXT,
          sex VARCHAR(20),
          user_type VARCHAR(20) NOT NULL DEFAULT 'fur_parent',
          is_verified BOOLEAN DEFAULT 0,
          is_otp_verified BOOLEAN DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Users table created successfully');
    } else {
      console.log('Users table already exists');
    }
    
    // Check if business_profiles table exists
    console.log('Checking if business_profiles table exists...');
    const businessTablesResult = await query("SHOW TABLES LIKE 'business_profiles'") as any[];
    
    if (!businessTablesResult || businessTablesResult.length === 0) {
      console.log('Business profiles table does not exist, creating it...');
      
      // Create business_profiles table
      await query(`
        CREATE TABLE business_profiles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          business_name VARCHAR(100) NOT NULL,
          business_type VARCHAR(50) NOT NULL,
          contact_first_name VARCHAR(50) NOT NULL,
          contact_last_name VARCHAR(50) NOT NULL,
          business_phone VARCHAR(20) NOT NULL,
          business_address TEXT NOT NULL,
          province VARCHAR(50),
          city VARCHAR(50),
          zip VARCHAR(20),
          business_hours TEXT,
          service_description TEXT,
          verification_status VARCHAR(20) DEFAULT 'pending',
          verification_date TIMESTAMP NULL,
          verification_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      console.log('Business profiles table created successfully');
    } else {
      console.log('Business profiles table already exists');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database initialization completed successfully'
    }, { 
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers
    });
  }
}
