import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userId, accountType] = authToken.split('_');
    if (accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Default stats if queries fail
    const defaultStats = {
      totalUsers: {
        count: 0,
        change: '0',
        changeType: 'increase'
      },
      applications: {
        count: 0,
        change: '0',
        changeType: 'increase'
      },
      services: {
        count: 0,
        change: '0',
        changeType: 'increase'
      },
      revenue: {
        amount: 0,
        change: '0',
        changeType: 'increase'
      },
      activeUsers: {
        cremation: 0,
        furparent: 0
      },
      pendingApplications: {
        current_month: 0,
        last_month: 0
      },
      restrictedUsers: {
        cremation: 0,
        furparent: 0
      }
    };

    try {
      // Get current date and 30 days ago for monthly comparisons
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // Just the date part
      
      // Simplified queries with safer access
      
      // Total users count
      const userCountResult = await query('SELECT COUNT(*) as count FROM users');
      const totalUserCount = userCountResult[0]?.count || 0;
      
      // Business applications count
      const businessCountResult = await query('SELECT COUNT(*) as count FROM businesses');
      const totalBusinessCount = businessCountResult[0]?.count || 0;
      
      // Services count
      let totalServiceCount = 0;
      try {
        const serviceCountResult = await query('SELECT COUNT(*) as count FROM business_services');
        totalServiceCount = serviceCountResult[0]?.count || 0;
      } catch (error) {
        console.error('Error fetching services count', error);
        // Continue with default value (0)
      }
      
      // Revenue data
      let totalRevenue = 0;
      try {
        const revenueResult = await query('SELECT SUM(total_amount) as total FROM bookings WHERE status = "completed"');
        totalRevenue = revenueResult[0]?.total || 0;
      } catch (error) {
        console.error('Error fetching revenue data', error);
        // Continue with default value (0)
      }
      
      // Active users by type
      const activeUserCounts = {
        cremation: 0,
        furparent: 0
      };
      
      try {
        const cremationResult = await query('SELECT COUNT(*) as count FROM businesses WHERE is_verified = 1');
        activeUserCounts.cremation = cremationResult[0]?.count || 0;
      } catch (error) {
        console.error('Error fetching cremation count', error);
      }
      
      try {
        const furparentResult = await query('SELECT COUNT(*) as count FROM users');
        activeUserCounts.furparent = furparentResult[0]?.count || 0;
      } catch (error) {
        console.error('Error fetching furparent count', error);
      }
      
      // Prepare the response data with the values we were able to retrieve
      const stats = {
        totalUsers: {
          count: totalUserCount,
          change: '0',
          changeType: 'increase'
        },
        applications: {
          count: totalBusinessCount,
          change: '0',
          changeType: 'increase'
        },
        services: {
          count: totalServiceCount,
          change: '0',
          changeType: 'increase'
        },
        revenue: {
          amount: totalRevenue,
          change: '0',
          changeType: 'increase'
        },
        activeUsers: activeUserCounts,
        pendingApplications: {
          current_month: 0,
          last_month: 0
        },
        restrictedUsers: {
          cremation: 0,
          furparent: 0
        }
      };

      return NextResponse.json({ success: true, stats });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      
      // Return default stats with error info
      return NextResponse.json({ 
        success: true, 
        stats: defaultStats,
        error: 'Some queries failed, showing default data'
      });
    }
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch admin dashboard statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 