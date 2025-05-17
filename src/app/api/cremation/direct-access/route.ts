import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get the current user ID
    const url = new URL(request.url);
    const authCookie = request.cookies.get('auth_token');
    
    if (!authCookie) {
      return NextResponse.json({
        success: false,
        message: 'Not logged in. Please log in first.'
      }, { status: 401 });
    }
    
    const [userId] = authCookie.value.split('_');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Invalid auth token'
      }, { status: 400 });
    }
    
    // Get full user data for debugging
    const userResult = await query(
      `SELECT id, first_name, last_name, email, role, status, is_verified
       FROM users WHERE id = ?`,
      [userId]
    ) as any[];
    
    if (!userResult || userResult.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }
    
    const user = userResult[0];
    
    // Get service provider data
    const providerResult = await query(
      `SELECT id, name, provider_type, application_status
       FROM service_providers WHERE user_id = ?`,
      [userId]
    ) as any[];
    
    // Prepare HTML redirect and debugging info
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Debugging and Direct Access</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        button { background: #4CAF50; color: white; border: none; padding: 10px 20px; 
                 border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #45a049; }
        h1, h2 { color: #333; }
        .warning { color: #f44336; }
      </style>
    </head>
    <body>
      <h1>Rainbow Paws Debugging Page</h1>
      
      <div class="card">
        <h2>Debugging Information</h2>
        <p>User ID: ${userId}</p>
        <p>Is Verified: ${user.is_verified}</p>
        <p>Role: ${user.role}</p>
        ${providerResult.length > 0 
          ? `<p>Provider ID: ${providerResult[0].id}</p>
             <p>Application Status: ${providerResult[0].application_status}</p>`
          : '<p class="warning">No service provider found for this user</p>'
        }
      </div>
      
      <div class="card">
        <h2>Direct Access</h2>
        <p>Click the button below to directly access the cremation profile, bypassing all verification checks:</p>
        <button onclick="window.location.href='/cremation/profile'">Go to Profile</button>
      </div>
      
      <div class="card">
        <h2>Fix Application Status</h2>
        <p>Click the button below to fix your application status directly in the database:</p>
        <button onclick="fixStatus()">Fix Status Now</button>
        <p id="statusResult"></p>
      </div>
      
      <div class="card">
        <h2>Direct SQL Fix</h2>
        <p>If the button above doesn't work, this will run a direct SQL UPDATE:</p>
        <button onclick="fixWithDirectSQL()">Direct SQL Fix</button>
        <p id="directSqlResult"></p>
      </div>
      
      <div class="card">
        <h2>Raw User Data</h2>
        <pre>${JSON.stringify(user, null, 2)}</pre>
        
        <h2>Raw Provider Data</h2>
        <pre>${JSON.stringify(providerResult, null, 2)}</pre>
      </div>
      
      <script>
        async function fixStatus() {
          try {
            const response = await fetch('/api/cremation/fix-approval-status');
            const result = await response.json();
            document.getElementById('statusResult').innerHTML = 
              '<strong>' + (result.success ? 'Success: ' : 'Error: ') + '</strong>' + 
              result.message;
            if (result.success) {
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          } catch (err) {
            document.getElementById('statusResult').innerHTML = 
              '<strong>Error: </strong>' + err.message;
          }
        }
        
        async function fixWithDirectSQL() {
          try {
            const response = await fetch('/api/cremation/fix-approval-status?method=direct');
            const result = await response.json();
            document.getElementById('directSqlResult').innerHTML = 
              '<strong>' + (result.success ? 'Success: ' : 'Error: ') + '</strong>' + 
              result.message;
            if (result.success) {
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            }
          } catch (err) {
            document.getElementById('directSqlResult').innerHTML = 
              '<strong>Error: </strong>' + err.message;
          }
        }
      </script>
    </body>
    </html>
    `;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to process request',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 