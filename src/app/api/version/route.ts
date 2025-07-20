import { NextRequest, NextResponse } from 'next/server';
import packageJson from '../../../../package.json';

export async function GET(_request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: {
        version: packageJson.version,
        name: packageJson.name,
        timestamp: new Date().toISOString(),
        // Add any deployment-specific info
        environment: process.env.NODE_ENV || 'development'
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to get version info'
    }, { status: 500 });
  }
}
