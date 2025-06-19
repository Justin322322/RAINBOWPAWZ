import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseHealth } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Get auth token to verify admin access (optional - you may want to make this public for monitoring)
    const authToken = getAuthTokenFromRequest(request);
    
    // Only allow admins to access detailed health information
    let includeDetails = false;
    if (authToken) {
      try {
        let accountType: string | null = null;

        // Check if it's a JWT token or old format
        if (authToken.includes('.')) {
          // JWT token format
          const { decodeTokenUnsafe } = await import('@/lib/jwt');
          const payload = decodeTokenUnsafe(authToken);
          accountType = payload?.accountType || null;
        } else {
          // Old format fallback
          const parts = authToken.split('_');
          if (parts.length === 2) {
            accountType = parts[1];
          }
        }

        includeDetails = accountType === 'admin';
      } catch {
        // Invalid token, just show basic health status
      }
    }

    // Get comprehensive database health information
    const healthInfo = await getDatabaseHealth();
    
    // Basic health response for non-admin users
    const basicResponse = {
      status: healthInfo.isConnected ? 'healthy' : 'unhealthy',
      isConnected: healthInfo.isConnected,
      responseTime: healthInfo.responseTime,
      timestamp: new Date().toISOString()
    };

    // Detailed response for admin users
    if (includeDetails) {
      return NextResponse.json({
        ...basicResponse,
        poolStats: healthInfo.poolStats,
        errors: healthInfo.errors,
        recommendations: generateRecommendations(healthInfo)
      });
    }

    return NextResponse.json(basicResponse);

  } catch (error) {
    console.error('Database health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      isConnected: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper function to generate recommendations based on pool stats
function generateRecommendations(healthInfo: any): string[] {
  const recommendations: string[] = [];
  const { poolStats, responseTime, errors } = healthInfo;

  // Performance recommendations
  if (responseTime > 1000) {
    recommendations.push('Database response time is high (>1s). Consider optimizing queries or increasing connection pool size.');
  }

  if (responseTime > 5000) {
    recommendations.push('⚠️ CRITICAL: Database response time is very high (>5s). Immediate attention required.');
  }

  // Connection pool recommendations
  if (poolStats.queuedRequests > 0) {
    recommendations.push(`${poolStats.queuedRequests} requests are queued. Consider increasing connection pool size.`);
  }

  if (poolStats.queuedRequests > 10) {
    recommendations.push('⚠️ WARNING: High number of queued requests detected. Database may be overloaded.');
  }

  if (poolStats.idleConnections === 0 && poolStats.activeConnections > 0) {
    recommendations.push('No idle connections available. All connections are in use.');
  }

  if (poolStats.activeConnections / poolStats.totalConnections > 0.8) {
    recommendations.push('Connection pool is >80% utilized. Consider monitoring for connection leaks.');
  }

  // Error-based recommendations
  if (errors.length > 0) {
    recommendations.push('Database errors detected. Check logs for details.');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Database is operating normally.');
  }

  return recommendations;
}

// Also support POST for consistency
export async function POST(request: NextRequest) {
  return GET(request);
} 