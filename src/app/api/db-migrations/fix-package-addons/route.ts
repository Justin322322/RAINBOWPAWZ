import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(_request: NextRequest) {
  try {
    console.log('Starting package_addons table migration...');

    // Check if package_addons table exists
    const tableExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'package_addons'
    `) as any[];

    if (tableExists[0].count === 0) {
      // Create the table if it doesn't exist
      await query(`
        CREATE TABLE package_addons (
          id INT AUTO_INCREMENT PRIMARY KEY,
          addon_id INT,
          package_id INT NOT NULL,
          description TEXT NOT NULL,
          price DECIMAL(10,2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_package_id (package_id),
          INDEX idx_addon_id (addon_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      
      return NextResponse.json({ 
        status: 'success',
        message: 'package_addons table created successfully'
      });
    }

    // Check if id column exists
    const idColumnExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = 'package_addons'
      AND column_name = 'id'
    `) as any[];

    if (idColumnExists[0].count === 0) {
      // Add id column as primary key
      await query(`
        ALTER TABLE package_addons 
        ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST
      `);
      
      return NextResponse.json({ 
        status: 'success',
        message: 'ID column added to package_addons table successfully'
      });
    }

    // Check if id column is auto increment
    const columnInfo = await query(`
      SELECT EXTRA
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
      AND table_name = 'package_addons'
      AND column_name = 'id'
    `) as any[];

    const isAutoIncrement = columnInfo[0]?.EXTRA?.includes('auto_increment');

    if (!isAutoIncrement) {
      // Make id column auto increment
      await query(`
        ALTER TABLE package_addons 
        MODIFY COLUMN id INT AUTO_INCREMENT PRIMARY KEY
      `);
      
      return NextResponse.json({ 
        status: 'success',
        message: 'ID column updated to auto increment successfully'
      });
    }

    return NextResponse.json({ 
      status: 'success',
      message: 'package_addons table structure is already correct'
    });

  } catch (error) {
    console.error('Error in package_addons migration:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'An error occurred during migration'
    }, { status: 500 });
  }
}
