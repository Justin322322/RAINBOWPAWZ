export const runtime = 'nodejs';
export const preferredRegion = ['sin1'];
export const revalidate = 30;
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { calculateRevenue } from '@/lib/revenueCalculator';

// Default stats to use as fallback if database queries fail
const defaultStats = {
  totalUsers: { count: 0, change: '0', changeType: 'neutral' },
  applications: { count: 0, change: '0', changeType: 'neutral' },
  services: { count: 0, change: '0', changeType: 'neutral' },
  revenue: { amount: 0, change: '0', changeType: 'neutral' },
  activeUsers: { cremation: 0, furparent: 0 },
  pendingApplications: { current_month: 0, last_month: 0 },
  restrictedUsers: { cremation: 0, furparent: 0 }
};

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = await verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }


    // Helper function to calculate percentage change
    const _calculateChange = (current: number, previous: number): string => {
      if (previous === 0) return '0';
      const change = ((current - previous) / previous) * 100;
      return change.toFixed(1);
    };

    try {
      // Verify database connection first
      try {
        // Simple query to check database connection
        const pingResult = await query('SELECT 1 as connected');
        if (!pingResult || !pingResult[0] || pingResult[0].connected !== 1) {
          throw new Error('Database connection failed');
        }
      } catch {
        // Return default stats when database is unreachable
        return NextResponse.json({
          success: true,
          stats: defaultStats,
          error: 'Database connection error'
        });
      }

      // Get current date and 30 days ago for monthly comparisons
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const _thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]; // Just the date part

      // Check which tables and columns are available
      const tables = {
        users: false,
        serviceProviders: false,
        servicePackages: false,
        bookings: false,
        pets: false,
        serviceBookings: false
      };

      try {
        const tablesResult = await query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name IN ('users', 'service_providers', 'service_packages', 'bookings', 'pets', 'service_bookings')
        `) as any[];

        tablesResult.forEach((row: any) => {
          if (row.table_name === 'users') tables.users = true;
          if (row.table_name === 'service_providers') tables.serviceProviders = true;
          if (row.table_name === 'service_packages') tables.servicePackages = true;
          if (row.table_name === 'bookings') tables.bookings = true;
          if (row.table_name === 'pets') tables.pets = true;
          if (row.table_name === 'service_bookings') tables.serviceBookings = true;
        });
      } catch {
      }


      // Total users count
      let totalUserCount = 0;
      if (tables.users) {
        try {
          const userCountResult = await query('SELECT COUNT(*) as count FROM users');
          totalUserCount = userCountResult[0]?.count || 0;
        } catch {
        }
      }

      // Business applications count (service providers)
      let totalBusinessCount = 0;
      if (tables.serviceProviders) {
        try {
          const businessCountResult = await query('SELECT COUNT(*) as count FROM service_providers');
          totalBusinessCount = businessCountResult[0]?.count || 0;
        } catch {
        }
      }

      // Services count (service packages)
      let totalServiceCount = 0;
      if (tables.servicePackages) {
        try {
          const serviceCountResult = await query(`
            SELECT COUNT(*) as count
            FROM service_packages
            WHERE is_active = 1
          `);
          totalServiceCount = serviceCountResult[0]?.count || 0;

          // Try to get active services for approved cremation centers
          if (tables.serviceProviders) {
            try {
              // Join service_packages and service_providers to get counts of active services for approved providers
              const activeServicesResult = await query(`
                SELECT COUNT(*) as count
                FROM service_packages sp
                JOIN service_providers p ON sp.service_provider_id = p.id
                WHERE (p.application_status = 'approved' OR p.application_status = 'verified')
                AND sp.is_active = 1
              `);

              if (activeServicesResult && activeServicesResult[0]) {
                totalServiceCount = activeServicesResult[0].count || 0;
              }
            } catch {
            }
          }
        } catch {
          // Try fallback query without is_active filter if that column might not exist
          try {
            const serviceCountResult = await query(`
              SELECT COUNT(*) as count
              FROM service_packages
            `);
            totalServiceCount = serviceCountResult[0]?.count || 0;
          } catch {
          }
        }
      }

      // Revenue data - using standardized calculation
      const revenueData = await calculateRevenue();
      const totalRevenue = revenueData.totalRevenue;

      // Active users by type
      const activeUserCounts = {
        cremation: 0,
        furparent: 0
      };

      if (tables.serviceProviders) {
        // Check if application_status column exists
        let hasApplicationStatus = false;
        try {
          const columnCheck = await query(`
            SHOW COLUMNS FROM service_providers LIKE 'application_status'
          `) as any[];
          hasApplicationStatus = columnCheck.length > 0;
        } catch {
        }

        try {
          if (hasApplicationStatus) {
            const cremationResult = await query(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE application_status = 'approved' OR application_status = 'verified'
            `);
            activeUserCounts.cremation = cremationResult[0]?.count || 0;
          } else {
            // Fallback to older database structure
            const cremationResult = await query(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE verification_status = 'verified'
            `);
            activeUserCounts.cremation = cremationResult[0]?.count || 0;
          }
        } catch {
        }
      }

      if (tables.users) {
        try {
          // Get fur parent count using improved query with role check
          const furparentResult = await query(`
            SELECT COUNT(*) as count
            FROM users
            WHERE role = 'fur_parent' AND is_verified = 1
          `);
          activeUserCounts.furparent = furparentResult[0]?.count || 0;
          
          // Add a fallback query if the first one returns 0
          if (activeUserCounts.furparent === 0) {
            try {
              const fallbackResult = await query(`
                SELECT COUNT(*) as count
                FROM users
                WHERE (role = 'fur_parent' OR user_type = 'user') AND status = 'active'
              `);
              activeUserCounts.furparent = fallbackResult[0]?.count || 0;
            } catch {
              // Continue with 0 if fallback fails
            }
          }
        } catch {
        }
      }

      // Pending applications
      const pendingApplications = {
        current_month: 0,
        last_month: 0
      };

      if (tables.serviceProviders) {
        // Check if application_status column exists
        let hasApplicationStatus = false;
        try {
          const columnCheck = await query(`
            SHOW COLUMNS FROM service_providers LIKE 'application_status'
          `) as any[];
          hasApplicationStatus = columnCheck.length > 0;
        } catch {
        }

        try {
          if (hasApplicationStatus) {
            // Current month pending applications
            const currentMonthResult = await query(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE application_status = 'pending'
              AND MONTH(created_at) = MONTH(CURRENT_DATE())
              AND YEAR(created_at) = YEAR(CURRENT_DATE())
            `);
            pendingApplications.current_month = currentMonthResult[0]?.count || 0;

            // Last month pending applications
            const lastMonthResult = await query(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE application_status = 'pending'
              AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
              AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            `);
            pendingApplications.last_month = lastMonthResult[0]?.count || 0;
          } else {
            // Current month pending applications using verification_status
            const currentMonthResult = await query(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE verification_status = 'pending'
              AND MONTH(created_at) = MONTH(CURRENT_DATE())
              AND YEAR(created_at) = YEAR(CURRENT_DATE())
            `);
            pendingApplications.current_month = currentMonthResult[0]?.count || 0;

            // Last month pending applications
            const lastMonthResult = await query(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE verification_status = 'pending'
              AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
              AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            `);
            pendingApplications.last_month = lastMonthResult[0]?.count || 0;
          }
        } catch {
        }
      }

      // Restricted users
      const restrictedUsers = {
        cremation: 0,
        furparent: 0
      };

      if (tables.serviceProviders) {
        try {
          // Try application_status first
          let hasApplicationStatus = false;
          try {
            const columnCheck = await query(`
              SHOW COLUMNS FROM service_providers LIKE 'application_status'
            `) as any[];
            hasApplicationStatus = columnCheck.length > 0;
          } catch {
          }

          if (hasApplicationStatus) {
            const cremationResult = await query(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE application_status = 'restricted'
            `);
            restrictedUsers.cremation = cremationResult[0]?.count || 0;
          } else {
            const cremationResult = await query(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE verification_status = 'restricted'
            `);
            restrictedUsers.cremation = cremationResult[0]?.count || 0;
          }
        } catch {
        }
      }

      if (tables.users) {
        try {
          // Get restricted fur parent count with improved query
          const furparentResult = await query(`
            SELECT COUNT(*) as count
            FROM users
            WHERE role = 'fur_parent' AND status = 'restricted'
          `);
          restrictedUsers.furparent = furparentResult[0]?.count || 0;
          
          // Add a fallback query if the first one returns 0
          if (restrictedUsers.furparent === 0) {
            try {
              const fallbackResult = await query(`
                SELECT COUNT(*) as count
                FROM users
                WHERE (role = 'fur_parent' OR user_type = 'user') AND status = 'restricted'
              `);
              restrictedUsers.furparent = fallbackResult[0]?.count || 0;
            } catch {
              // Continue with 0 if fallback fails
            }
          }
        } catch {
        }
      }

      // Get additional statistics for dashboard
      let totalPetsRegistered = 0;
      let totalCompletedBookings = 0;
      
      // Get total pets registered
      if (tables.pets) {
        try {
          const petsResult = await query(`
            SELECT COUNT(*) as count
            FROM pets
          `);
          totalPetsRegistered = petsResult[0]?.count || 0;
        } catch {
          // Continue with 0 if query fails
        }
      }
      
      // Get total completed bookings
      if (tables.serviceBookings) {
        try {
          const bookingsResult = await query(`
            SELECT COUNT(*) as count
            FROM service_bookings
            WHERE status = 'completed'
          `);
          totalCompletedBookings = bookingsResult[0]?.count || 0;
        } catch {
          // Continue with 0 if query fails
        }
      }

      // Calculate changes for the dashboard
      // For simplicity, we'll use 0% change if we can't get previous month data
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
        pendingApplications: pendingApplications,
        restrictedUsers: restrictedUsers,
        petsRegistered: totalPetsRegistered,
        completedBookings: totalCompletedBookings
      };

      return NextResponse.json({ success: true, stats });
    } catch (dbError) {

      // Return default stats with error info
      return NextResponse.json({
        success: true,
        stats: defaultStats,
        error: 'Some queries failed, showing default data',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }
  } catch (error) {

    // Even on error, return default stats to avoid UI breakage
    return NextResponse.json({
      success: true,
      stats: defaultStats,
      error: 'Failed to fetch admin dashboard statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
