import { query } from '@/lib/db';

export interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  previousMonthRevenue: number;
  revenueChange: number;
}

/**
 * Standardized revenue calculation function that works across all dashboards
 * Handles different table structures and column names consistently
 */
export async function calculateRevenue(providerId?: string | number): Promise<RevenueData> {
  let totalRevenue = 0;
  let monthlyRevenue = 0;
  let previousMonthRevenue = 0;

  try {
    // Check which tables exist
    const tablesResult = await query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('bookings', 'successful_bookings', 'service_bookings', 'payments')
    `) as any[];

    const availableTables = tablesResult.map(row => row.TABLE_NAME.toLowerCase());

    // Priority order: successful_bookings > bookings > service_bookings > payments
    if (availableTables.includes('successful_bookings')) {
      const result = await calculateFromSuccessfulBookings(providerId);
      totalRevenue = result.total;
      monthlyRevenue = result.monthly;
      previousMonthRevenue = result.previous;
    } else if (availableTables.includes('bookings')) {
      const result = await calculateFromBookings(providerId);
      totalRevenue = result.total;
      monthlyRevenue = result.monthly;
      previousMonthRevenue = result.previous;
    } else if (availableTables.includes('service_bookings')) {
      const result = await calculateFromServiceBookings(providerId);
      totalRevenue = result.total;
      monthlyRevenue = result.monthly;
      previousMonthRevenue = result.previous;
    } else if (availableTables.includes('payments')) {
      const result = await calculateFromPayments(providerId);
      totalRevenue = result.total;
      monthlyRevenue = result.monthly;
      previousMonthRevenue = result.previous;
    }

    // Calculate revenue change percentage
    const revenueChange = previousMonthRevenue > 0 
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0;

    return {
      totalRevenue,
      monthlyRevenue,
      previousMonthRevenue,
      revenueChange
    };
  } catch (error) {
    console.error('Error calculating revenue:', error);
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      previousMonthRevenue: 0,
      revenueChange: 0
    };
  }
}

async function calculateFromSuccessfulBookings(providerId?: string | number) {
  const providerFilter = providerId ? 'AND provider_id = ?' : '';
  const params = providerId ? [providerId] : [];

  // Total revenue
  const totalResult = await query(`
    SELECT COALESCE(SUM(transaction_amount), 0) as total
    FROM successful_bookings
    WHERE payment_status = 'completed' ${providerFilter}
  `, params) as any[];

  // Current month revenue
  const monthlyResult = await query(`
    SELECT COALESCE(SUM(transaction_amount), 0) as total
    FROM successful_bookings
    WHERE payment_status = 'completed'
    AND MONTH(payment_date) = MONTH(CURRENT_DATE())
    AND YEAR(payment_date) = YEAR(CURRENT_DATE())
    ${providerFilter}
  `, params) as any[];

  // Previous month revenue
  const previousResult = await query(`
    SELECT COALESCE(SUM(transaction_amount), 0) as total
    FROM successful_bookings
    WHERE payment_status = 'completed'
    AND MONTH(payment_date) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    AND YEAR(payment_date) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    ${providerFilter}
  `, params) as any[];

  return {
    total: parseFloat(String(totalResult[0]?.total || '0')),
    monthly: parseFloat(String(monthlyResult[0]?.total || '0')),
    previous: parseFloat(String(previousResult[0]?.total || '0'))
  };
}

async function calculateFromBookings(providerId?: string | number) {
  const providerFilter = providerId ? 'AND provider_id = ?' : '';
  const params = providerId ? [providerId] : [];

  // Try different column names for amount
  let amountColumn = 'total_price';
  try {
    await query(`SELECT ${amountColumn} FROM bookings LIMIT 1`);
  } catch (err) {
    try {
      amountColumn = 'total_amount';
      await query(`SELECT ${amountColumn} FROM bookings LIMIT 1`);
    } catch (err2) {
      amountColumn = 'amount';
    }
  }

  // Total revenue
  const totalResult = await query(`
    SELECT COALESCE(SUM(${amountColumn}), 0) as total
    FROM bookings
    WHERE status = 'completed' ${providerFilter}
  `, params) as any[];

  // Current month revenue
  const monthlyResult = await query(`
    SELECT COALESCE(SUM(${amountColumn}), 0) as total
    FROM bookings
    WHERE status = 'completed'
    AND MONTH(created_at) = MONTH(CURRENT_DATE())
    AND YEAR(created_at) = YEAR(CURRENT_DATE())
    ${providerFilter}
  `, params) as any[];

  // Previous month revenue
  const previousResult = await query(`
    SELECT COALESCE(SUM(${amountColumn}), 0) as total
    FROM bookings
    WHERE status = 'completed'
    AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    ${providerFilter}
  `, params) as any[];

  return {
    total: parseFloat(String(totalResult[0]?.total || '0')),
    monthly: parseFloat(String(monthlyResult[0]?.total || '0')),
    previous: parseFloat(String(previousResult[0]?.total || '0'))
  };
}

async function calculateFromServiceBookings(providerId?: string | number) {
  const providerFilter = providerId ? 'AND provider_id = ?' : '';
  const params = providerId ? [providerId] : [];

  // Total revenue
  const totalResult = await query(`
    SELECT COALESCE(SUM(price), 0) as total
    FROM service_bookings
    WHERE status = 'completed' ${providerFilter}
  `, params) as any[];

  // Current month revenue
  const monthlyResult = await query(`
    SELECT COALESCE(SUM(price), 0) as total
    FROM service_bookings
    WHERE status = 'completed'
    AND MONTH(created_at) = MONTH(CURRENT_DATE())
    AND YEAR(created_at) = YEAR(CURRENT_DATE())
    ${providerFilter}
  `, params) as any[];

  // Previous month revenue
  const previousResult = await query(`
    SELECT COALESCE(SUM(price), 0) as total
    FROM service_bookings
    WHERE status = 'completed'
    AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    ${providerFilter}
  `, params) as any[];

  return {
    total: parseFloat(String(totalResult[0]?.total || '0')),
    monthly: parseFloat(String(monthlyResult[0]?.total || '0')),
    previous: parseFloat(String(previousResult[0]?.total || '0'))
  };
}

async function calculateFromPayments(providerId?: string | number) {
  const providerFilter = providerId ? 'AND provider_id = ?' : '';
  const params = providerId ? [providerId] : [];

  // Total revenue
  const totalResult = await query(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE status = 'completed' ${providerFilter}
  `, params) as any[];

  // Current month revenue
  const monthlyResult = await query(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE status = 'completed'
    AND MONTH(payment_date) = MONTH(CURRENT_DATE())
    AND YEAR(payment_date) = YEAR(CURRENT_DATE())
    ${providerFilter}
  `, params) as any[];

  // Previous month revenue
  const previousResult = await query(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM payments
    WHERE status = 'completed'
    AND MONTH(payment_date) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    AND YEAR(payment_date) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
    ${providerFilter}
  `, params) as any[];

  return {
    total: parseFloat(String(totalResult[0]?.total || '0')),
    monthly: parseFloat(String(monthlyResult[0]?.total || '0')),
    previous: parseFloat(String(previousResult[0]?.total || '0'))
  };
}

/**
 * Format revenue amount for display
 */
export function formatRevenue(amount: number): string {
  return `₱${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): {
  value: string;
  type: 'increase' | 'decrease' | 'neutral';
} {
  if (previous === 0) {
    return { value: '0%', type: 'neutral' };
  }

  const change = ((current - previous) / previous) * 100;
  const type = change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral';
  
  return {
    value: `${Math.abs(change).toFixed(1)}%`,
    type
  };
}
