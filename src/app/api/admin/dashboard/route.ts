import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authToken = getAuthTokenFromRequest(request);

    // In development mode, we'll allow requests without auth token for testing
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!authToken && !isDevelopment) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authToken) {
      const [, accountType] = authToken.split('_'); // Using comma to skip the first element
      if (accountType !== 'admin' && !isDevelopment) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
      }
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

    // Get total users count
    const usersCount = await query(`
      SELECT COUNT(*) as count FROM users
    `) as any[];

    // Get service providers count
    const serviceProvidersCount = await query(`
      SELECT COUNT(*) as count FROM service_providers
    `) as any[];

    // Get active services count
    const activeServicesCount = await query(`
      SELECT COUNT(*) as count FROM service_packages WHERE is_active = 1
    `) as any[];

    // Check if successful_bookings table exists
    const bookingsTableExists = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'successful_bookings'
    `) as any[];

    // Calculate revenue from successful bookings
    let revenueResult = [{ total: 0 }];
    let actualMonthlyRevenue = 0;

    if (bookingsTableExists[0]?.count === 1) {
      // Get total revenue from all successful bookings
      revenueResult = await query(`
        SELECT SUM(transaction_amount) as total FROM successful_bookings
        WHERE payment_status = 'completed'
      `) as any[];

      // Get current month's revenue
      const currentMonthRevenueResult = await query(`
        SELECT SUM(transaction_amount) as total FROM successful_bookings
        WHERE payment_status = 'completed'
        AND MONTH(payment_date) = MONTH(CURRENT_DATE())
        AND YEAR(payment_date) = YEAR(CURRENT_DATE())
      `) as any[];

      actualMonthlyRevenue = parseFloat(String(currentMonthRevenueResult[0]?.total || '0'));
    } else {
      // If successful_bookings table doesn't exist, set revenue to 0
      revenueResult = [{ total: 0 }];
      actualMonthlyRevenue = 0;
    }

    // Get recent applications (if the table exists)
    let recentApplications: any[] = [];
    try {
      // Try to fetch recent applications from service_providers table
      // since we've migrated away from the business_applications table
      recentApplications = await query(`
        SELECT
          sp.id,
          sp.id as businessId,
          sp.name as businessName,
          CONCAT(u.first_name, ' ', u.last_name) as owner,
          u.email,
          sp.created_at as submitDate,
          sp.application_status as status
        FROM service_providers sp
        JOIN users u ON sp.user_id = u.id
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

    } catch (error) {

      // Attempt fallback query with fewer joins if the main one fails
      try {
        recentApplications = await query(`
          SELECT
            id,
            id as businessId,
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
        // If all else fails, return an empty array
        recentApplications = [];
      }
    }

    // Get fur parents count (users with role 'fur_parent')
    const furParentsResult = await query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'fur_parent'
    `) as any[];

    // Get pending applications count
    let pendingApplicationsThisMonth = 0;
    let pendingApplicationsLastMonth = 0;

    try {
      // Check if service_providers table exists
      const serviceProvidersExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'service_providers'
      `) as any[];

      if (serviceProvidersExists[0]?.count === 1) {
        // Check if application_status column exists
        const applicationStatusExists = await query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = 'service_providers'
          AND column_name = 'application_status'
        `) as any[];

        if (applicationStatusExists[0]?.count === 1) {
          // Use application_status (preferred)
          // Get current month's pending applications
          const thisMonthResult = await query(`
            SELECT COUNT(*) as count
            FROM service_providers
            WHERE application_status = 'pending'
            AND MONTH(created_at) = MONTH(CURRENT_DATE())
            AND YEAR(created_at) = YEAR(CURRENT_DATE())
          `) as any[];

          pendingApplicationsThisMonth = thisMonthResult[0]?.count || 0;

          // Get last month's pending applications
          const lastMonthResult = await query(`
            SELECT COUNT(*) as count
            FROM service_providers
            WHERE application_status = 'pending'
            AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
          `) as any[];

          pendingApplicationsLastMonth = lastMonthResult[0]?.count || 0;
        } else {
          // Fallback to verification_status if available
          const verificationStatusExists = await query(`
            SELECT COUNT(*) as count
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = 'service_providers'
            AND column_name = 'verification_status'
          `) as any[];

          if (verificationStatusExists[0]?.count === 1) {
            // Get current month's pending applications
            const thisMonthResult = await query(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE verification_status = 'pending'
              AND MONTH(created_at) = MONTH(CURRENT_DATE())
              AND YEAR(created_at) = YEAR(CURRENT_DATE())
            `) as any[];

            pendingApplicationsThisMonth = thisMonthResult[0]?.count || 0;

            // Get last month's pending applications
            const lastMonthResult = await query(`
              SELECT COUNT(*) as count
              FROM service_providers
              WHERE verification_status = 'pending'
              AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
              AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            `) as any[];

            pendingApplicationsLastMonth = lastMonthResult[0]?.count || 0;
          }
        }
      }
    } catch (error) {
    }

    // Get restricted users count from users table
    const restrictedUsersResult = await query(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE status = 'restricted'
      GROUP BY role
    `) as any[];

    // Get restricted cremation centers count from service_providers table
    let restrictedCremationCenters = 0;
    try {
      // Check if application_status column exists in service_providers
      const applicationStatusExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'service_providers'
        AND column_name = 'application_status'
      `) as any[];

      if (applicationStatusExists[0]?.count === 1) {
        // Get restricted cremation centers count from application_status
        const restrictedCentersResult = await query(`
          SELECT COUNT(*) as count
          FROM service_providers
          WHERE application_status = 'restricted'
        `) as any[];

        restrictedCremationCenters = restrictedCentersResult[0]?.count || 0;
      } else {
        // Fallback to verification_status if available
        const verificationStatusExists = await query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = 'service_providers'
          AND column_name = 'verification_status'
        `) as any[];

        if (verificationStatusExists[0]?.count === 1) {
          const restrictedCentersResult = await query(`
            SELECT COUNT(*) as count
            FROM service_providers
            WHERE verification_status = 'restricted'
          `) as any[];

          restrictedCremationCenters = restrictedCentersResult[0]?.count || 0;
        }
      }
    } catch (error) {
    }

    // Get previous month's data for comparison - safely handle if created_at doesn't exist
    let previousMonthUsersCount = [{ count: 0 }];
    try {
      // Check if created_at column exists in users table
      const userCreatedAtExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'users'
        AND column_name = 'created_at'
      `) as any[];

      if (userCreatedAtExists[0]?.count === 1) {
        previousMonthUsersCount = await query(`
          SELECT COUNT(*) as count FROM users
          WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
        `) as any[];
      } else {
        // If created_at doesn't exist, just use a percentage of total users as an estimate
        previousMonthUsersCount = [{ count: Math.floor((usersCount[0]?.count || 0) * 0.8) }];
      }
    } catch (error) {
    }

    let previousMonthServicesCount = [{ count: 0 }];
    try {
      // Check if created_at column exists in service_packages table
      const serviceCreatedAtExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'service_packages'
        AND column_name = 'created_at'
      `) as any[];

      if (serviceCreatedAtExists[0]?.count === 1) {
        previousMonthServicesCount = await query(`
          SELECT COUNT(*) as count FROM service_packages
          WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH) AND is_active = 1
        `) as any[];
      } else {
        // If created_at doesn't exist, just use a percentage of total services as an estimate
        previousMonthServicesCount = [{ count: Math.floor((activeServicesCount[0]?.count || 0) * 0.7) }];
      }
    } catch (error) {
    }

    // Get previous month's revenue
    let previousMonthRevenue = [{ total: 0 }];

    if (bookingsTableExists[0]?.count === 1) {
      // Get previous month's revenue from successful_bookings
      previousMonthRevenue = await query(`
        SELECT SUM(transaction_amount) as total FROM successful_bookings
        WHERE payment_status = 'completed'
        AND MONTH(payment_date) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
        AND YEAR(payment_date) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
      `) as any[];
    } else {
      // If no successful_bookings table, set previous month revenue to 0
      previousMonthRevenue = [{ total: 0 }];
    }

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

    const currentRevenue = parseFloat(String(revenueResult[0]?.total || '0'));
    const previousRevenue = parseFloat(String(previousMonthRevenue[0]?.total || '0'));
    const revenueChange = calculateChange(currentRevenue, previousRevenue);

    // Get previous month's pending applications count
    let previousMonthApplications = [{ count: 0 }];
    try {
      // Check if service_providers table exists with application_status column
      const applicationStatusExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'service_providers'
        AND column_name = 'application_status'
      `) as any[];

      if (applicationStatusExists[0]?.count === 1) {
        // Count previous month's pending applications
        previousMonthApplications = await query(`
          SELECT COUNT(*) as count
          FROM service_providers
          WHERE application_status = 'pending'
          AND created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
        `) as any[];
      } else {
        // Legacy fallback for old business_applications table
        const applicationsTableExists = await query(`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name = 'business_applications'
        `) as any[];

        if (applicationsTableExists[0]?.count === 1) {
          // Check if created_at and status columns exist
          const appCreatedAtExists = await query(`
            SELECT COUNT(*) as count
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = 'business_applications'
            AND column_name = 'created_at'
          `) as any[];

          const appStatusExists = await query(`
            SELECT COUNT(*) as count
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
            AND table_name = 'business_applications'
            AND column_name = 'status'
          `) as any[];

          if (appCreatedAtExists[0]?.count === 1 && appStatusExists[0]?.count === 1) {
            previousMonthApplications = await query(`
              SELECT COUNT(*) as count
              FROM business_applications
              WHERE status = 'pending'
              AND created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
            `) as any[];
          } else if (appCreatedAtExists[0]?.count === 1) {
            // If no status column, just get count by date as a fallback
            previousMonthApplications = await query(`
              SELECT COUNT(*) as count
              FROM business_applications
              WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
            `) as any[];
          }
        }
      }
    } catch (error) {
    }

    // Get the total count of pending applications, not just the recent ones
    let pendingApplicationsCount = 0;
    try {
      // Check if service_providers table exists with application_status column
      const applicationStatusExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
        AND table_name = 'service_providers'
        AND column_name = 'application_status'
      `) as any[];

      if (applicationStatusExists[0]?.count === 1) {
        // Count all pending applications
        const pendingAppsResult = await query(`
          SELECT COUNT(*) as count
          FROM service_providers
          WHERE application_status = 'pending'
        `) as any[];

        pendingApplicationsCount = pendingAppsResult[0]?.count || 0;
      }
    } catch (error) {
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
        value: actualMonthlyRevenue > 0
          ? `₱${actualMonthlyRevenue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`
          : `₱0.00`,
        change: revenueChange.value,
        changeType: revenueChange.type,
        isEstimate: actualMonthlyRevenue <= 0
      }
    };

    dashboardData.recentApplications = recentApplications;

    // Format user distribution data
    const furParentsCount = furParentsResult[0]?.count || 0;
    const cremationCentersCount = serviceProvidersCount[0]?.count || 0;

    // Format restricted users data - handle both 'fur_parent' and legacy 'user' roles
    const restrictedFurParents =
      (restrictedUsersResult.find((t: any) => t.role === 'fur_parent')?.count || 0) +
      (restrictedUsersResult.find((t: any) => t.role === 'user')?.count || 0);

    // Use the directly queried restrictedCremationCenters count instead of filtering from users
    // This ensures we count from service_providers table with proper status fields

    dashboardData.userDistribution = {
      activeUsers: {
        cremationCenters: cremationCentersCount,
        furParents: furParentsCount
      },
      pendingApplications: {
        thisMonth: pendingApplicationsThisMonth,
        lastMonth: pendingApplicationsLastMonth
      },
      restrictedUsers: {
        cremationCenters: restrictedCremationCenters,
        furParents: restrictedFurParents || 0
      }
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
