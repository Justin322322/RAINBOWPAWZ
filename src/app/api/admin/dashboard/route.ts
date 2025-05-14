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
      // Fallback to estimated revenue if table doesn't exist
      revenueResult = await query(`
        SELECT SUM(price) as total FROM service_packages
      `) as any[];

      // Estimate monthly revenue as 1/12 of total
      actualMonthlyRevenue = parseFloat(String(revenueResult[0]?.total || '0')) / 12;
    }

    // Get recent applications (if the table exists)
    let recentApplications: any[] = [];
    try {
      // Check if applications table exists
      const applicationsTableExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'business_applications'
      `) as any[];

      if (applicationsTableExists[0]?.count === 1) {
        // Fetch recent applications
        recentApplications = await query(`
          SELECT
            ba.id,
            ba.business_id as businessId,
            sp.name as businessName,
            u.full_name as owner,
            u.email,
            ba.created_at as submitDate,
            ba.status
          FROM business_applications ba
          JOIN service_providers sp ON ba.business_id = sp.id
          JOIN users u ON sp.user_id = u.id
          ORDER BY ba.created_at DESC
          LIMIT 4
        `) as any[];

        // Format dates
        recentApplications = recentApplications.map(app => ({
          ...app,
          submitDate: new Date(app.submitDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          documents: [] // Placeholder for documents
        }));
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      // If there's an error, just return empty applications
      recentApplications = [];
    }

    // Get fur parents count (users with role 'fur_parent')
    const furParentsResult = await query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'fur_parent'
    `) as any[];

    // Get pending applications count
    let pendingApplicationsThisMonth = 0;
    let pendingApplicationsLastMonth = 0;

    try {
      // Check if service_providers table exists and count pending verifications
      const serviceProvidersExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'service_providers'
      `) as any[];

      if (serviceProvidersExists[0]?.count === 1) {
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
    } catch (error) {
      console.error('Error fetching pending applications:', error);
    }

    // Get restricted users count - only use status field for now
    const restrictedUsersResult = await query(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE status = 'restricted'
      GROUP BY role
    `) as any[];

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
      console.error('Error fetching previous month users count:', error);
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
      console.error('Error fetching previous month services count:', error);
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
          previousMonthRevenue = await query(`
            SELECT SUM(price) as total FROM service_packages
            WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
          `) as any[];
        } else {
          // If created_at doesn't exist, just use a percentage of total revenue as an estimate
          const estimatedTotal = parseFloat(String(revenueResult[0]?.total || '0')) * 0.75;
          previousMonthRevenue = [{ total: estimatedTotal }];
        }
      } catch (error) {
        console.error('Error fetching previous month revenue:', error);
      }
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

    // Get previous month's applications count - safely handle if business_applications table doesn't exist
    let previousMonthApplications = [{ count: 0 }];
    try {
      // Check if business_applications table exists
      const applicationsTableExists = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'business_applications'
      `) as any[];

      if (applicationsTableExists[0]?.count === 1) {
        // Check if created_at column exists
        const appCreatedAtExists = await query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
          AND table_name = 'business_applications'
          AND column_name = 'created_at'
        `) as any[];

        if (appCreatedAtExists[0]?.count === 1) {
          previousMonthApplications = await query(`
            SELECT COUNT(*) as count FROM business_applications
            WHERE created_at < DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)
          `) as any[];
        }
      }
    } catch (error) {
      console.error('Error fetching previous month applications:', error);
    }

    const currentApplications = recentApplications.length;
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
          ? `₱${Math.round(actualMonthlyRevenue).toLocaleString()}`
          : `₱0`,
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

    // Handle both 'business' and legacy business roles
    const restrictedCremationCenters = restrictedUsersResult.find((t: any) => t.role === 'business')?.count || 0;

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
        cremationCenters: restrictedCremationCenters || 0,
        furParents: restrictedFurParents || 0
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 });
  }
}
