import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Updating database schema...');
    
    // Check if users table exists
    const usersTableResult = await query(
      "SHOW TABLES LIKE 'users'"
    ) as any[];
    
    if (usersTableResult && usersTableResult.length > 0) {
      console.log('Users table exists, checking for required columns...');
      
      // Check if status column exists in users table
      const statusColumnResult = await query(
        "SHOW COLUMNS FROM users LIKE 'status'"
      ) as any[];
      
      if (!statusColumnResult || statusColumnResult.length === 0) {
        console.log('Adding status column to users table...');
        await query(
          "ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active' AFTER role"
        );
        console.log('Status column added successfully');
      } else {
        console.log('Status column already exists');
      }
      
      // Check if last_login column exists in users table
      const lastLoginColumnResult = await query(
        "SHOW COLUMNS FROM users LIKE 'last_login'"
      ) as any[];
      
      if (!lastLoginColumnResult || lastLoginColumnResult.length === 0) {
        console.log('Adding last_login column to users table...');
        await query(
          "ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL AFTER updated_at"
        );
        console.log('Last login column added successfully');
      } else {
        console.log('Last login column already exists');
      }
    } else {
      console.log('Users table does not exist');
    }
    
    // Check if user_restrictions table exists
    const restrictionsTableResult = await query(
      "SHOW TABLES LIKE 'user_restrictions'"
    ) as any[];
    
    if (!restrictionsTableResult || restrictionsTableResult.length === 0) {
      console.log('Creating user_restrictions table...');
      await query(`
        CREATE TABLE user_restrictions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          reason TEXT,
          restriction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          duration VARCHAR(50) DEFAULT 'indefinite',
          report_count INT DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('User restrictions table created successfully');
    } else {
      console.log('User restrictions table already exists');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database schema updated successfully'
    });
  } catch (error) {
    console.error('Error updating database schema:', error);
    return NextResponse.json({
      error: 'Failed to update database schema',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
