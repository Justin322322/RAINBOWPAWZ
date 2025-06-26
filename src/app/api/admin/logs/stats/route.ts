import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureAdminLogsTable } from '../ensure-table';

export async function GET(request: NextRequest) {
  try {
    // Ensure the admin_logs table exists
    await ensureAdminLogsTable();
    
    // Get query parameters for time range
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('range') || '7d'; // 1d, 7d, 30d, 90d
    
    let dateCondition = '';
    switch (timeRange) {
      case '1d':
        dateCondition = 'AND al.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
        break;
      case '7d':
        dateCondition = 'AND al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateCondition = 'AND al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case '90d':
        dateCondition = 'AND al.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
        break;
      default:
        dateCondition = 'AND al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    // Get total logs count
    const totalLogsResult = await query(`
      SELECT COUNT(*) as total
      FROM admin_logs al
      WHERE 1=1 ${dateCondition}
    `) as any[];
    
    // Get logs by action type
    const actionStatsResult = await query(`
      SELECT 
        al.action,
        COUNT(*) as count
      FROM admin_logs al
      WHERE 1=1 ${dateCondition}
      GROUP BY al.action
      ORDER BY count DESC
      LIMIT 10
    `) as any[];
    
    // Get logs by entity type
    const entityStatsResult = await query(`
      SELECT 
        al.entity_type,
        COUNT(*) as count
      FROM admin_logs al
      WHERE 1=1 ${dateCondition}
      GROUP BY al.entity_type
      ORDER BY count DESC
      LIMIT 10
    `) as any[];
    
    // Get most active admins
    const adminStatsResult = await query(`
      SELECT
        al.admin_id,
        CASE
          WHEN al.admin_id = 0 THEN 'system'
          ELSE COALESCE(ap.username, 'Unknown')
        END as admin_username,
        CASE
          WHEN al.admin_id = 0 THEN 'System'
          ELSE COALESCE(ap.full_name, 'Unknown Admin')
        END as admin_name,
        COUNT(*) as count
      FROM admin_logs al
      LEFT JOIN admin_profiles ap ON al.admin_id = ap.user_id AND al.admin_id != 0
      WHERE 1=1 ${dateCondition}
      GROUP BY al.admin_id,
        CASE WHEN al.admin_id = 0 THEN 'system' ELSE ap.username END,
        CASE WHEN al.admin_id = 0 THEN 'System' ELSE ap.full_name END
      ORDER BY count DESC
      LIMIT 10
    `) as any[];
    
    // Get recent activity (hourly breakdown for last 24 hours)
    const activityResult = await query(`
      SELECT 
        DATE_FORMAT(al.created_at, '%Y-%m-%d %H:00:00') as hour,
        COUNT(*) as count
      FROM admin_logs al
      WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY DATE_FORMAT(al.created_at, '%Y-%m-%d %H:00:00')
      ORDER BY hour ASC
    `) as any[];
    
    // Get error/warning logs count
    const errorLogsResult = await query(`
      SELECT COUNT(*) as count
      FROM admin_logs al
      WHERE 1=1 ${dateCondition}
      AND (
        al.action LIKE '%error%' OR 
        al.action LIKE '%fail%' OR 
        al.action LIKE '%reject%' OR
        al.action LIKE '%delete%'
      )
    `) as any[];
    
    // Get unique IP addresses
    const uniqueIpsResult = await query(`
      SELECT COUNT(DISTINCT al.ip_address) as count
      FROM admin_logs al
      WHERE 1=1 ${dateCondition}
      AND al.ip_address IS NOT NULL
    `) as any[];

    return NextResponse.json({
      success: true,
      timeRange,
      stats: {
        totalLogs: totalLogsResult[0]?.total || 0,
        errorLogs: errorLogsResult[0]?.count || 0,
        uniqueIps: uniqueIpsResult[0]?.count || 0,
        actionBreakdown: actionStatsResult,
        entityBreakdown: entityStatsResult,
        adminActivity: adminStatsResult,
        hourlyActivity: activityResult
      }
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    return NextResponse.json({
      error: 'Failed to fetch log statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
