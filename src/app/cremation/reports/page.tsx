'use client';

import { useState, useEffect, useCallback } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
// No metric tiles on reports; focus on charts and tables
import {
    ChartBarIcon,
    ArrowDownTrayIcon,
    CalendarDaysIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { RefundsLineChart, StatusPieChart, type LinePoint } from '@/components/ui/Chart';
import { StatsCardSkeleton } from '@/app/cremation/components/LoadingComponents';

function CremationReportsPage({ userData }: { userData: any }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState('last30days');
    const [reportData, setReportData] = useState({
        stats: {
            totalBookings: 0,
            completedBookings: 0,
            cancelledBookings: 0,
            pendingBookings: 0,
            totalRevenue: 0,
            averageRevenue: 0,
            averageRating: 0,
            totalRefunds: 0,
            totalRefunded: 0,
            completedRefunds: 0,
            pendingRefunds: 0,
            manualRefunds: 0,
            refundRate: '0'
        },
        monthlyData: [],
        topServices: [],
        recentActivity: []
    });
    const { showToast } = useToast();

    const fetchReportData = useCallback(async () => {
        // Check if user is logging out to prevent 401 error toasts
        if (typeof window !== 'undefined' && sessionStorage.getItem('is_logging_out') === 'true') {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            if (dateFilter && dateFilter !== 'all') {
                queryParams.append('period', dateFilter);
            }

            const response = await fetch(`/api/cremation/reports?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const data = await response.json();
            // Start with server-provided data
            let merged = data;

            // Also fetch refund stats from existing refunds endpoint to ensure accuracy
            try {
                // Map dateFilter to start/end dates supported by refunds API
                const now = new Date();
                const startEnd: { start?: string; end?: string } = {};
                const toISO = (d: Date) => d.toISOString().slice(0, 10);
                if (dateFilter === 'last7days') {
                    const d = new Date(now);
                    d.setDate(d.getDate() - 7);
                    startEnd.start = toISO(d);
                    startEnd.end = toISO(now);
                } else if (dateFilter === 'last30days') {
                    const d = new Date(now);
                    d.setDate(d.getDate() - 30);
                    startEnd.start = toISO(d);
                    startEnd.end = toISO(now);
                } else if (dateFilter === 'last90days') {
                    const d = new Date(now);
                    d.setDate(d.getDate() - 90);
                    startEnd.start = toISO(d);
                    startEnd.end = toISO(now);
                } else if (dateFilter === 'last6months') {
                    const d = new Date(now);
                    d.setMonth(d.getMonth() - 6);
                    startEnd.start = toISO(d);
                    startEnd.end = toISO(now);
                } else if (dateFilter === 'thisyear') {
                    const d = new Date(now.getFullYear(), 0, 1);
                    startEnd.start = toISO(d);
                    startEnd.end = toISO(now);
                }

                const refundParams = new URLSearchParams();
                if (startEnd.start) refundParams.append('start_date', startEnd.start);
                if (startEnd.end) refundParams.append('end_date', startEnd.end);

                const refundsRes = await fetch(`/api/cremation/refunds?${refundParams.toString()}`, {
                    method: 'GET',
                    headers: { 'Cache-Control': 'no-cache' },
                    credentials: 'include'
                });

                if (refundsRes.ok) {
                    const refundsJson = await refundsRes.json();
                    const refunds = refundsJson.refunds || [];

                    const totalRefunds = refunds.length;
                    const completed = refunds.filter((r: any) => r.status === 'completed');
                    const pending = refunds.filter((r: any) => r.status === 'pending' || r.status === 'pending_approval' || r.status === 'processing');
                    const totalRefunded = completed.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

                    // Compute refund rate relative to total bookings if available
                    const totalBookings = merged?.stats?.totalBookings ?? merged?.stats?.total_bookings ?? merged?.detailedStats?.totalBookings ?? 0;
                    const refundRate = totalBookings > 0 ? ((totalRefunds / totalBookings) * 100) : 0;

                    // Build simple last 6 month refunded amounts series
                    const seriesMap = new Map<string, number>();
                    for (let i = 5; i >= 0; i--) {
                      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
                      seriesMap.set(key, 0);
                    }
                    completed.forEach((r: any) => {
                      const d = new Date(r.completed_at || r.processed_at || r.initiated_at);
                      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
                      if (seriesMap.has(key)) {
                        seriesMap.set(key, (seriesMap.get(key) || 0) + (Number(r.amount) || 0));
                      }
                    });
                    const refundSeries: LinePoint[] = Array.from(seriesMap.entries()).map(([key, value]) => {
                      const [, month] = key.split('-');
                      const label = new Date(2000, Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
                      return { label, value };
                    });

                    merged = {
                        ...merged,
                        stats: {
                            ...merged.stats,
                            totalRefunds,
                            totalRefunded,
                            pendingRefunds: pending.length,
                            refundRate: refundRate.toFixed(2)
                        },
                        monthlyData: refundSeries
                    };
                }
            } catch {
                // If refund fetch fails, keep server data as-is
            }

            setReportData(merged);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch report data';
            
            // Don't show error toasts for 401 errors during logout
            if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                const isLoggingOut = typeof window !== 'undefined' && sessionStorage.getItem('is_logging_out') === 'true';
                if (isLoggingOut) {
                    setLoading(false);
                    return;
                }
            }
            
            setError(errorMessage);
            showToast(`Error: ${errorMessage}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [dateFilter, showToast]);

    useEffect(() => {
        fetchReportData();
    }, [dateFilter, fetchReportData]);

    const handleRefresh = () => {
        fetchReportData();
    };

    const exportReport = () => {
        if (!reportData.stats) {
            showToast('No data to export', 'info');
            return;
        }

        try {
            const reportContent = `
Cremation Service Business Report
Generated: ${new Date().toLocaleDateString()}
Period: ${dateFilter}

SUMMARY STATISTICS
==================
Total Bookings: ${reportData.stats.totalBookings}
Completed Bookings: ${reportData.stats.completedBookings}
Cancelled Bookings: ${reportData.stats.cancelledBookings}
Pending Bookings: ${reportData.stats.pendingBookings}
Total Revenue: ₱${reportData.stats.totalRevenue.toLocaleString()}
Average Revenue per Booking: ₱${reportData.stats.averageRevenue.toLocaleString()}
Average Rating: ${reportData.stats.averageRating}/5

TOP SERVICES
============
${reportData.topServices.map((service: any, index: number) =>
                `${index + 1}. ${service.name} - ${service.bookings} bookings (₱${service.revenue.toLocaleString()})`
            ).join('\n')}
      `.trim();

            const blob = new Blob([reportContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', `cremation-report-${new Date().toISOString().split('T')[0]}.txt`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            showToast('Report exported successfully', 'success');
        } catch {
            showToast('Failed to export report', 'error');
        }
    };

    return (
        <CremationDashboardLayout activePage="reports" userData={userData}>
            {/* Header section */}
            <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-800">Business Reports</h1>
                        <p className="text-gray-600 mt-1">Analyze your cremation service performance and trends</p>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                        <button
                            onClick={exportReport}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <ArrowDownTrayIcon className="h-5 w-5 mr-2 text-gray-500" />
                            Export Report
                        </button>
                        <button
                            onClick={handleRefresh}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            disabled={loading}
                        >
                            <ArrowPathIcon className={`h-5 w-5 mr-2 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
                <div className="flex items-center space-x-4">
                    <label htmlFor="date-filter" className="text-sm font-medium text-gray-700">
                        Report Period:
                    </label>
                    <select
                        id="date-filter"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="block pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                    >
                        <option value="last7days">Last 7 Days</option>
                        <option value="last30days">Last 30 Days</option>
                        <option value="last90days">Last 90 Days</option>
                        <option value="last6months">Last 6 Months</option>
                        <option value="thisyear">This Year</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {/* Removed headline metric tiles for a cleaner report layout */}

            {/* Refunds Section: compact cards + line chart */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-800">Refunds Overview</h2>
                    {!loading && (
                        <span className="text-sm text-gray-500">Last 6 months</span>
                    )}
                </div>
                {!loading && (
                  <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-2"><XCircleIcon className="h-4 w-4 text-gray-500" /><span>Total Refunds:</span><strong className="text-gray-900">{reportData.stats.totalRefunds}</strong></div>
                    <div className="flex items-center gap-2"><CurrencyDollarIcon className="h-4 w-4 text-gray-500" /><span>Total Refunded:</span><strong className="text-gray-900">₱{reportData.stats.totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                    <div className="flex items-center gap-2"><ClockIcon className="h-4 w-4 text-gray-500" /><span>Pending:</span><strong className="text-gray-900">{reportData.stats.pendingRefunds}</strong></div>
                    <div className="flex items-center gap-2"><ChartBarIcon className="h-4 w-4 text-gray-500" /><span>Refund Rate:</span><strong className="text-gray-900">{reportData.stats.refundRate}%</strong></div>
                  </div>
                )}
                {!loading && (
                    <div className="mt-6">
                        <RefundsLineChart data={(reportData.monthlyData as any) || []} height={220} />
                    </div>
                )}
            </div>

            {/* Bookings distribution */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-8">
                <h2 className="text-lg font-medium text-gray-800 mb-4">Bookings Status Mix</h2>
                {loading ? (
                  <StatsCardSkeleton count={1} />
                ) : (
                  <StatusPieChart
                    data={[
                      { name: 'Completed', value: reportData.stats.completedBookings || 0 },
                      { name: 'Pending', value: reportData.stats.pendingBookings || 0 },
                      { name: 'Cancelled', value: reportData.stats.cancelledBookings || 0 }
                    ]}
                    height={260}
                  />
                )}
            </div>

            {/* Top Services */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-800">Top Services</h2>
                </div>
                <div className="p-6">
                    {loading ? (
                        <div className="animate-pulse space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                </div>
                            ))}
                        </div>
                    ) : reportData.topServices.length > 0 ? (
                        <div className="space-y-4">
                            {reportData.topServices.map((service: any, index: number) => (
                                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{service.name}</h3>
                                        <p className="text-sm text-gray-500">{service.bookings} bookings</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">₱{service.revenue.toLocaleString()}</p>
                                        <p className="text-sm text-gray-500">Revenue</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-500">No service data available for the selected period</p>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                    <div className="flex">
                        <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">Error Loading Reports</h3>
                            <p className="text-sm text-red-700 mt-1">{error}</p>
                            <button
                                onClick={handleRefresh}
                                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CremationDashboardLayout>
    );
}

export default withBusinessVerification(CremationReportsPage);