import { NextRequest, NextResponse } from 'next/server';
import { MonitoringService } from '@/lib/monitoring';
import { createSuccessResponse, handleApiError } from '@/lib/errorHandler';

export async function GET(_request: NextRequest) {
  try {
    const health = await MonitoringService.getSystemHealth();
    
    // Determine HTTP status based on health
    let status = 200;
    if (health.overall === 'degraded') {
      status = 200; // Still operational but with issues
    } else if (health.overall === 'unhealthy') {
      status = 503; // Service unavailable
    }

    const response = createSuccessResponse(health, 'Health check completed');
    
    return NextResponse.json(response, { 
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return handleApiError(error, '/api/health');
  }
}

// Simple ping endpoint for basic availability checks
export async function HEAD(_request: NextRequest) {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
