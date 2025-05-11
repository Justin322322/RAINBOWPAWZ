import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export async function GET() {
  console.log('Health check API called');
  
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  
  // Handle preflight requests
  if (Request.prototype.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 204,
      headers
    });
  }
  
  try {
    // Test database connection
    const isConnected = await testConnection();
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: isConnected ? 'connected' : 'disconnected'
    }, { 
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers
    });
  }
}
