import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import Cookies from 'js-cookie';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from auth cookie or URL
    const url = new URL(request.url);
    let userId = url.searchParams.get('userId');
    const method = url.searchParams.get('method');
    
    if (!userId) {
      // Extract from cookie - this won't work on server side, but we're just providing both options
      const authCookie = request.cookies.get('auth_token');
      if (authCookie) {
        const [id] = authCookie.value.split('_');
        userId = id;
      }
    }
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required. Add ?userId=X to the URL',
      }, { status: 400 });
    }
    
    // Direct SQL method if requested
    if (method === 'direct') {
      try {
        
        // Connect directly to the database
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'rainbow_paws'
        });
        
        // Get provider ID
        const [providerRows] = await conn.execute(
          'SELECT id FROM service_providers WHERE user_id = ?', 
          [userId]
        );
        
        if (!providerRows || providerRows.length === 0) {
          await conn.end();
          return NextResponse.json({
            success: false,
            message: `No service provider found for user ID ${userId}`
          }, { status: 404 });
        }
        
        const providerId = providerRows[0].id;
        
        // Update status in service_providers table
        await conn.execute(
          'UPDATE service_providers SET application_status = ? WHERE id = ?',
          ['approved', providerId]
        );
        
        // Update is_verified in users table
        await conn.execute(
          'UPDATE users SET is_verified = ? WHERE id = ?',
          [1, userId]
        );
        
        await conn.end();
        
        return NextResponse.json({
          success: true,
          message: `Successfully approved service provider with direct SQL for user ${userId}`,
          note: 'Please reload the page to see changes'
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'Failed to execute direct SQL updates',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }
    
    // Original method - use query utility
    try {
      // First get the service provider ID from the user ID
      const providerResult = await query(
        `SELECT id FROM service_providers WHERE user_id = ?`,
        [userId]
      ) as any[];
      
      if (!providerResult || providerResult.length === 0) {
        return NextResponse.json({
          success: false,
          message: `No service provider found for user ID ${userId}`
        }, { status: 404 });
      }
      
      const providerId = providerResult[0].id;
      
      try {
        // Update the service provider status to approved - only use application_status which we know exists
        await query(
          `UPDATE service_providers 
           SET application_status = 'approved',
               updated_at = NOW()
           WHERE id = ?`,
          [providerId]
        );
        
        // Also update the user's is_verified flag
        await query(
          `UPDATE users SET is_verified = 1 WHERE id = ?`,
          [userId]
        );
        
        return NextResponse.json({
          success: true,
          message: `Successfully approved service provider with ID ${providerId} for user ${userId}`,
          note: 'Please reload the page to see changes'
        });
      } catch (error) {
        
        // Fallback method - try with direct SQL
        try {
          
          // Try setting just the application_status in the most direct way possible
          const conn = await (await import('mysql2/promise')).createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root', 
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'rainbow_paws'
          });
          
          await conn.execute(
            `UPDATE service_providers SET application_status = 'approved' WHERE id = ?`,
            [providerId]
          );
          
          await conn.execute(
            `UPDATE users SET is_verified = 1 WHERE id = ?`,
            [userId]
          );
          
          await conn.end();
          
          return NextResponse.json({
            success: true,
            message: `Successfully approved service provider with fallback method for user ${userId}`,
            note: 'Please reload the page to see changes'
          });
        } catch (fallbackError) {
          return NextResponse.json({
            success: false,
            message: 'Failed to approve service provider even with fallback method',
            error: error instanceof Error ? error.message : 'Unknown error',
            fallbackError: fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error'
          }, { status: 500 });
        }
      }

    } catch (error) {
      return NextResponse.json({
        success: false,
        message: 'Failed to approve service provider',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to approve service provider',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 