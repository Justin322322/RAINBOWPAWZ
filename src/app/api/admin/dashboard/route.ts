import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { calculateRevenue, formatRevenue, calculatePercentageChange } from '@/lib/revenueCalculator';

// Safely execute a database query with error handling
async function safeQuery(queryString: string, params: any[] = []): Promise<any[]> {
  try {
    return await query(queryString, params) as any[];
  } catch (error) {
    console.error(`Query failed: ${queryString}`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using secure auth
    const user = verifySecureAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.accountType !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Fetch dashboard data with proper typing
    const dashboardData: {
      stats: any;
      recentApplications: any[];
      userDistribution: any;
    } = {
      stats: {},
      recentApplications: [],
      userDistribution: {}
    };

    // Test database connection first
    try {
      const pingResult = await query('SELECT 1 as connected');
      if (!pingResult || !pingResult[0] || pingResult[0].connected !== 1) {
        throw new Error('Database connection failed');
      }
    } catch (error) {
      console.error('Database connection error:', error);
      return NextResponse.json({
        error: 'Database connection error',
        details: error instanceof Error ? error.message : 'Unknown database error',
        success: false
      }, { status: 500 });
    }

    // Get total users count
    const usersCount = await safeQuery(`
      SELECT COUNT(*) as count FROM users
    `);

    // Get service providers count
    const serviceProvidersCount = await safeQuery(`
      SELECT COUNT(*) as count FROM service_providers
    `);

    // Get active services count
    const activeServicesCount = await safeQuery(`
      SELECT COUNT(*) as count FROM service_packages WHERE is_active = 1
    `);

    // Calculate revenue using standardized calculation
    const revenueData = await calculateRevenue();
    const actualMonthlyRevenue = revenueData.monthlyRevenue || 0; // Ensure it's never null
    const actualTotalRevenue = revenueData.totalRevenue || 0; // Ensure it's never null

    // Format revenue for display
    const formattedMonthlyRevenue = formatRevenue(actualMonthlyRevenue);
    const _formattedTotalRevenue = formatRevenue(actualTotalRevenue);

    // Calculate revenue change percentage properly using the revenueCalculator utility
    const previousMonthRevenue = revenueData.previousMonthRevenue || 0; // Ensure it's never null
    const _revenueChange = calculatePercentageChange(actualMonthlyRevenue, previousMonthRevenue);

    // Get recent applications from service_providers table
    let recentApplications: any[] = [];
    try {
      recentApplications = await query(`
        SELECT
          sp.provider_id as id,
          sp.provider_id as businessId,
          sp.name as businessName,
          CONCAT(u.first_name, ' ', u.last_name) as owner,
          u.email,
          sp.created_at as submitDate,
          sp.application_status as status
        FROM service_providers sp
        JOIN users u ON sp.user_id = u.user_id
        WHERE sp.provider_type = 'cremation'
        ORDER BY sp.created_at DESC
        LIMIT 5
      `) as any[];

      // Format dates
      recentApplications = recentApplications.map(app => ({
        ...app,
        submitDate: new Date(app.submitDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }));

    } catch {
      // Attempt fallback query with fewer joins if the main one fails
      try {
        recentApplications = await query(`
          SELECT
            provider_id as id,
            provider_id as businessId,
            name as businessName,
            created_at as submitDate,
            application_status as status
          FROM service_providers
          WHERE provider_type = 'cremation'
          ORDER BY created_at DESC
          LIMIT 5
        `) as any[];

        // Format dates
        recentApplications = recentApplications.map(app => ({
          ...app,
          owner: 'Business Owner', // Default value
          email: 'Not available',  // Default value
          submitDate: new Date(app.submitDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }));

      } catch (fallbackError) {
        console.error('Failed to fetch recent applications:', fallbackError);
        // If all else fails, return an empty array
        recentApplications = [];
      }
    }

    // Get fur parents count (users with role 'fur_parent')
    const furParentsResult = await safeQuery(`
      SELECT COUNT(*) as count FROM users WHERE role = 'fur_parent' OR role = 'user'
    `);

    // Get pets count
    let _totalPetsCount = 0;
    try {
      // Check if pets table exists
      const petsTableExists = await safeQuery(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'pets'
      `);
      
      if (petsTableExists[0]?.count > 0) {
        const petsResult = await safeQuery(`
          SELECT COUNT(*) as count FROM pets
        `);
        _totalPetsCount = petsResult[0]?.count || 0;
      }
    } catch (error) {
      console.error('Failed to fetch pets count:', error);
      _totalPetsCount = 0;
    }

    // Get completed bookings count
    let _completedBookingsCount = 0;
    try {
      // Check if service_bookings table exists
      const bookingsTableExists = await safeQuery(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = 'service_bookings'
      `);
      
      if (bookingsTableExists[0]?.count > 0) {
        const bookingsResult = await safeQuery(`
          SELECT COUNT(*) as count FROM service_bookings WHERE status = 'completed'
        `);
        _completedBookingsCount = bookingsResult[0]?.count || 0;
      }
    } catch (error) {
      console.error('Failed to fetch completed bookings count:', error);
      _completedBookingsCount = 0;
    }

    // Get pending applications count
    let pendingApplicationsThisMonth = 0;
    let pendingApplicationsLastMonth = 0;

    try {
      // Get current month's pending applications
      const thisMonthResult = await safeQuery(`
        SELECT COUNT(*) as count
        FROM service_providers
        WHERE application_status = 'pending'
        AND MONTH(created_at) = MONTH(CURRENT_DATE())
        AND YEAR(created_at) = YEAR(CURRENT_DATE())
      `);

      pendingApplicationsThisMonth = thisMonthResult[0]?.count || 0;

      // Get last month's pending applications
      const lastMonthResult = await safeQuery(`
        SELECT COUNT(*) as count
        FROM service_providers
        WHERE application_status = 'pending'
        AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      `);

      pendingApplicationsLastMonth = lastMonthResult[0]?.count || 0;
    } catch (error) {
      console.error('Failed to fetch pending applications:', error);
      // If there's an error, set values to 0
      pendingApplicationsThisMonth = 0;
      pendingApplicationsLastMonth = 0;
    }

    // Get restricted users count from users table
    const restrictedUsersResult = await safeQuery(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE status = 'restricted'
      GROUP BY role
    `);

    // Get restricted cremation centers count from service_providers table
    let restrictedCremationCenters = 0;
    try {
      // Get restricted cremation centers count
      const restrictedCentersResult = await safeQuery(`
        SELECT COUNT(*) as count
        FROM service_providers
        WHERE application_status = 'restricted'
      `);

      restrictedCremationCenters = restrictedCentersResult[0]?.count || 0;
    } catch (error) {
      console.error('Failed to fetch restricted cremation centers:', error);
      restrictedCremationCenters = 0;
    }

    // Get previous month's data for comparison
    let previousMonthUsersCount = [{ count: 0 }];
    try {
      previousMonthUsersCount = await safeQuery(`
        SELECT COUNT(*) as count FROM users
        WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
      `);
    } catch (error) {
      console.error('Failed to fetch previous month users count:', error);
      // If there's an error, use a percentage of total users as an estimate
      previousMonthUsersCount = [{ count: Math.floor((usersCount[0]?.count || 0) * 0.8) }];
    }

    let previousMonthServicesCount = [{ count: 0 }];
    try {
      previousMonthServicesCount = await safeQuery(`
        SELECT COUNT(*) as count FROM service_packages
        WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH) AND is_active = 1
      `);
    } catch (error) {
      console.error('Failed to fetch previous month services count:', error);
      // If there's an error, use a percentage of total services as an estimate
      previousMonthServicesCount = [{ count: Math.floor((activeServicesCount[0]?.count || 0) * 0.7) }];
    }

    // Current month revenue is already calculated in revenueData
    const _previousMonthRevenueObj = [{ total: previousMonthRevenue }];

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return { value: '+100%', type: 'increase' };
      const change = ((current - previous) / previous) * 100;
      return {
        value: `${change > 0 ? '+' : ''}${Math.abs(Math.round(change))}%`,
        type: change >= 0 ? 'increase' : 'decrease'
      };
    };

    const currentUsers = usersCount[0]?.count || 0;
    const previousUsers = previousMonthUsersCount[0]?.count || 0;
    const usersChange = calculateChange(currentUsers, previousUsers);

    const currentServices = activeServicesCount[0]?.count || 0;
    const previousServices = previousMonthServicesCount[0]?.count || 0;
    const servicesChange = calculateChange(currentServices, previousServices);

    // Use the correctly calculated revenue data
    const currentRevenue = actualMonthlyRevenue;
    const previousRevenue = previousMonthRevenue;
    const revenueChangeObj = calculateChange(currentRevenue, previousRevenue);

    // Get previous month's pending applications count
    let previousMonthApplications = [{ count: 0 }];
    try {
      // Count previous month's pending applications
      previousMonthApplications = await safeQuery(`
        SELECT COUNT(*) as count
        FROM service_providers
        WHERE application_status = 'pending'
        AND created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
      `);
    } catch (error) {
      console.error('Failed to fetch previous month applications:', error);
      previousMonthApplications = [{ count: 0 }];
    }

    // Get the total count of pending applications, not just the recent ones
    let pendingApplicationsCount = 0;
    try {
      // Count all pending applications
      const pendingAppsResult = await safeQuery(`
        SELECT COUNT(*) as count
        FROM service_providers
        WHERE application_status = 'pending'
      `);

      pendingApplicationsCount = pendingAppsResult[0]?.count || 0;
    } catch (error) {
      console.error('Failed to fetch pending applications count:', error);
      // Fallback to counting pending applications in the recent applications array
      pendingApplicationsCount = recentApplications.filter((app: any) => app.status === 'pending').length;
    }

    const currentApplications = pendingApplicationsCount;
    const previousApplications = previousMonthApplications[0]?.count || 0;
    const applicationsChange = calculateChange(currentApplications, previousApplications);

    // Format the dashboard data with real statistics
    dashboardData.stats = {
      totalUsers: {
        value: currentUsers,
        change: usersChange.value,
        changeType: usersChange.type
      },
      applicationRequests: {
        value: currentApplications,
        change: applicationsChange.value,
        changeType: applicationsChange.type
      },
      activeServices: {
        value: currentServices,
        change: servicesChange.value,
        changeType: servicesChange.type
      },
      monthlyRevenue: {
        value: formattedMonthlyRevenue,
        change: revenueChangeObj.value,
        changeType: revenueChangeObj.type,
        isEstimate: actualMonthlyRevenue <= 0
      }
    };

    dashboardData.recentApplications = recentApplications;

    // Format user distribution data - these should be TOTAL counts across the entire system
    const furParentsCount = furParentsResult[0]?.count || 0;
    const cremationCentersCount = serviceProvidersCount[0]?.count || 0;

    // Format restricted users data - handle both 'fur_parent' and legacy 'user' roles
    const restrictedFurParents =
      (restrictedUsersResult.find((t: any) => t.role === 'fur_parent')?.count || 0) +
      (restrictedUsersResult.find((t: any) => t.role === 'user')?.count || 0);

    dashboardData.userDistribution = {
      activeUsers: {
        cremationCenters: cremationCentersCount, // Total active cremation centers across the system
        furParents: furParentsCount // Total active fur parents across the system
      },
      pendingApplications: {
        thisMonth: pendingApplicationsThisMonth,
        lastMonth: pendingApplicationsLastMonth
      },
      restrictedUsers: {
        cremationCenters: restrictedCremationCenters,
        furParents: restrictedFurParents || 0
      }
      // Removed petsRegistered and completedBookings as requested
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
