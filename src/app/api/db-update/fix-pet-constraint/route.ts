import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Starting pet_id removal operation...');
    
    // Direct SQL commands approach
    console.log('Attempting to remove pet_id column...');
    
    try {
      // First check if pet_id column exists 
      const columnExists = await query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME = 'pet_id'
      `) as any[];
      
      if (columnExists && columnExists[0].count > 0) {
        console.log('pet_id column exists, checking for constraints...');
        
        // Check for foreign key constraints 
        const constraints = await query(`
          SELECT CONSTRAINT_NAME
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'bookings'
          AND COLUMN_NAME = 'pet_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
        `) as any[];
        
        // Drop each constraint if any exist
        if (constraints && constraints.length > 0) {
          for (const constraint of constraints) {
            console.log(`Dropping constraint: ${constraint.CONSTRAINT_NAME}`);
            await query(`
              ALTER TABLE bookings
              DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
            `);
          }
        }
        
        // Now drop the column
        console.log('Dropping pet_id column...');
        await query('ALTER TABLE bookings DROP COLUMN pet_id');
        
        return NextResponse.json({
          success: true,
          message: 'Successfully removed pet_id column from bookings table'
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'pet_id column does not exist in bookings table'
        });
      }
    } catch (sqlError) {
      console.error('SQL Error:', sqlError);
      
      // Try alternative approach - make column nullable
      try {
        console.log('Column removal failed, trying to make it nullable...');
        await query('ALTER TABLE bookings MODIFY COLUMN pet_id INT NULL');
        
        return NextResponse.json({
          success: true,
          message: 'Made pet_id column nullable instead of removing it',
          details: 'Could not remove column, but made it optional'
        });
      } catch (altError) {
        console.error('Alternative approach also failed:', altError);
        return NextResponse.json({
          success: false,
          error: 'Could not modify pet_id column',
          message: sqlError instanceof Error ? sqlError.message : 'Unknown error'
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Error updating database schema:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update database schema',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 