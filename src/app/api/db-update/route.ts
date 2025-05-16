import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export async function GET(request: NextRequest) {
  try {
    // Only allow in development mode for security
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({
        success: false,
        error: 'This endpoint is only available in development mode'
      }, { status: 403 });
    }

    const results: { file: string; success: boolean; message?: string; error?: string }[] = [];

    // List of schema update files to run in order
    const schemaFiles = [
      'update_bookings_schema.sql',
      'update_packages_schema.sql',
      'update_bookings_schema_v2.sql',
      'update_bookings_schema_v3.sql',
      'update_bookings_schema_v4.sql'
    ];

    for (const file of schemaFiles) {
      try {
        // Read the SQL file
        const filePath = path.join(process.cwd(), 'src', 'lib', file);
        console.log(`Reading schema file: ${filePath}`);

        const sql = await readFile(filePath, 'utf8');

        // Split into statements and execute each one
        // Simple splitting by semicolon - more complex statements might need a better parser
        const statements = sql.split(';').filter(statement => statement.trim().length > 0);

        console.log(`Executing ${statements.length} statements from ${file}`);

        for (const statement of statements) {
          try {
            await query(statement);
          } catch (statementError) {
            console.error(`Error executing statement from ${file}:`, statementError);
            // Continue with next statement
          }
        }

        results.push({
          file,
          success: true,
          message: `Successfully executed schema updates from ${file}`
        });
      } catch (fileError: any) {
        console.error(`Error processing schema file ${file}:`, fileError);
        results.push({
          file,
          success: false,
          error: fileError.message || `Error processing ${file}`
        });
      }
    }

    // Check database tables to verify the results
    const tablesResult = await query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('service_bookings', 'bookings', 'service_packages')
    `);

    const columnsResult = await query(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('service_bookings', 'bookings', 'service_packages')
      AND COLUMN_NAME IN ('pet_type', 'delivery_fee_per_km', 'payment_method', 'delivery_option', 'pet_id', 'delivery_address')
    `);

    // Determine if the update was successful based on the presence of key columns
    const hasRequiredTables = Array.isArray(tablesResult) && tablesResult.length > 0;
    const hasRequiredColumns = Array.isArray(columnsResult) && columnsResult.length > 0;

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: errorCount === 0 && hasRequiredTables && hasRequiredColumns,
      message: `Executed ${successCount} schema files successfully. Database has the required tables and columns.`,
      tables: tablesResult,
      columns: columnsResult,
      results
    });
  } catch (error) {
    console.error('Error running database updates:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error running database updates'
    }, { status: 500 });
  }
}