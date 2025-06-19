import { query } from '@/lib/db';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: HealthCheckResult[];
  uptime: number;
}

export class MonitoringService {
  private static startTime = Date.now();

  // Check database connectivity
  static async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await query('SELECT 1 as health_check');
      const responseTime = Date.now() - start;
      
      return {
        service: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Check external API connectivity (example: payment gateway)
  static async checkExternalAPIs(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Example: Check if PayMongo API is reachable
      const response = await fetch('https://api.paymongo.com/v1/ping', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - start;

      return {
        service: 'external_apis',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime,
        details: { statusCode: response.status },
      };
    } catch (error) {
      return {
        service: 'external_apis',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Check memory usage
  static async checkMemoryUsage(): Promise<HealthCheckResult> {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
      } else if (memoryUsagePercent > 75) {
        status = 'degraded';
      }

      return {
        service: 'memory',
        status,
        details: {
          usedMB: Math.round(usedMemory / 1024 / 1024),
          totalMB: Math.round(totalMemory / 1024 / 1024),
          usagePercent: Math.round(memoryUsagePercent),
        },
      };
    } catch (error) {
      return {
        service: 'memory',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Check disk space (simplified)
  static async checkDiskSpace(): Promise<HealthCheckResult> {
    try {
      // This is a simplified check - in production, you'd want to check actual disk usage
      const _stats = await import('fs').then(fs => fs.promises.stat('.'));
      
      return {
        service: 'disk',
        status: 'healthy',
        details: {
          message: 'Disk space check completed',
        },
      };
    } catch (error) {
      return {
        service: 'disk',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Comprehensive health check
  static async getSystemHealth(): Promise<SystemHealth> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkExternalAPIs(),
      this.checkMemoryUsage(),
      this.checkDiskSpace(),
    ]);

    // Determine overall health
    const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length;
    const degradedCount = checks.filter(check => check.status === 'degraded').length;

    let overall: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      timestamp: new Date().toISOString(),
      checks,
      uptime: Date.now() - this.startTime,
    };
  }

  // Log performance metrics
  static logPerformanceMetric(operation: string, duration: number, success: boolean) {
    const metric = {
      operation,
      duration,
      success,
      timestamp: new Date().toISOString(),
    };

    // In production, you'd send this to a monitoring service
    console.log('Performance Metric:', metric);
  }

  // Performance monitoring wrapper
  static async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    let success = false;
    
    try {
      const result = await fn();
      success = true;
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = Date.now() - start;
      this.logPerformanceMetric(operation, duration, success);
    }
  }

  // Alert thresholds
  static readonly ALERT_THRESHOLDS = {
    DATABASE_RESPONSE_TIME: 2000, // 2 seconds
    MEMORY_USAGE_PERCENT: 85,
    ERROR_RATE_PERCENT: 5,
  };

  // Check if alerts should be triggered
  static shouldAlert(health: SystemHealth): boolean {
    return health.overall === 'unhealthy' || 
           health.checks.some(check => 
             check.service === 'database' && 
             check.responseTime && 
             check.responseTime > this.ALERT_THRESHOLDS.DATABASE_RESPONSE_TIME
           );
  }
}

// Performance monitoring decorator
export function monitored(_operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return MonitoringService.measurePerformance(
        `${target.constructor.name}.${propertyName}`,
        () => method.apply(this, args)
      );
    };
  };
}

// Simple uptime tracking
export class UptimeTracker {
  private static downtimeStart: number | null = null;
  private static totalDowntime = 0;

  static markDown() {
    if (!this.downtimeStart) {
      this.downtimeStart = Date.now();
    }
  }

  static markUp() {
    if (this.downtimeStart) {
      this.totalDowntime += Date.now() - this.downtimeStart;
      this.downtimeStart = null;
    }
  }

  static getUptimePercent(): number {
    const totalTime = Date.now() - MonitoringService['startTime'];
    const uptime = totalTime - this.totalDowntime;
    return (uptime / totalTime) * 100;
  }
}
