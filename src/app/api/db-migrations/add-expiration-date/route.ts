import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

/**
 * API endpoint to add expiration_date column to reviews table
 * GET /api/db-migrations/add-expiration-date
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token to verify user is authenticated
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');

    // Only allow in development or for admin users
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment && accountType !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Check if the reviews table exists
    const tablesResult = await query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'reviews'
    `) as any[];

    if (!tablesResult || tablesResult.length === 0) {
      return NextResponse.json({ 
        status: 'error',
        message: 'Reviews table does not exist'
      });
    }

    // Check if the expiration_date column already exists
    const columnsResult = await query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'reviews'
      AND COLUMN_NAME = 'expiration_date'
    `) as any[];

    if (columnsResult && columnsResult.length > 0) {
      return NextResponse.json({ 
        status: 'success',
        message: 'Expiration date column already exists'
      });
    }

    // Add the expiration_date column
    await query(`
      ALTER TABLE reviews
      ADD COLUMN expiration_date TIMESTAMP NULL
    `);

    return NextResponse.json({ 
      status: 'success',
      message: 'Expiration date column added successfully'
    });
  } catch (error) {
    console.error('Error in migration script:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'An error occurred during migration'
    }, { status: 500 });
  }
}
