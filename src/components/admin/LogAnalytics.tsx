'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface LogStats {
  totalLogs: number;
  errorLogs: number;
  uniqueIps: number;
  actionBreakdown: Array<{ action: string; count: number }>;
  entityBreakdown: Array<{ entity_type: string; count: number }>;
  adminActivity: Array<{ admin_id: number; admin_username: string; admin_name: string; count: number }>;
  hourlyActivity: Array<{ hour: string; count: number }>;
}

interface LogAnalyticsProps {
  className?: string;
}

export default function LogAnalytics({ className = '' }: LogAnalyticsProps) {
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/logs/stats?range=${timeRange}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch log stats: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.message || 'Failed to fetch stats');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch log statistics';
      setError(errorMessage);
      console.error('Error fetching log stats:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchStats();
  }, [timeRange, fetchStats]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-md border border-gray-100 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-md border border-gray-100 p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Log Analytics</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }


  return (
    <div className={`bg-white rounded-xl shadow-md border border-gray-100 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <ChartBarIcon className="h-6 w-6 text-[var(--primary-green)] mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Recent Activity Overview</h3>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={fetchStats}
            className="p-1 text-gray-500 hover:text-[var(--primary-green)] transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Activities</p>
              <p className="text-2xl font-bold text-blue-800">{stats.totalLogs.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-red-600 font-medium">Restrictions/Rejections</p>
              <p className="text-2xl font-bold text-red-800">{stats.errorLogs.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-purple-600 font-medium">Active Admins</p>
              <p className="text-2xl font-bold text-purple-800">{stats.uniqueIps.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-3">Recent Actions</h4>
          <div className="space-y-2">
            {stats.actionBreakdown.slice(0, 5).map((item, _index) => {
              // Convert technical actions to user-friendly descriptions
              const getFriendlyAction = (action: string) => {
                const actionLower = action.toLowerCase();
                if (actionLower.includes('approve')) return 'Business Approvals';
                if (actionLower.includes('reject')) return 'Application Rejections';
                if (actionLower.includes('restrict')) return 'Account Restrictions';
                if (actionLower.includes('restore')) return 'Account Restorations';
                if (actionLower.includes('login')) return 'Admin Logins';
                if (actionLower.includes('refund')) return 'Refund Processing';
                return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              };

              return (
                <div key={item.action} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{getFriendlyAction(item.action)}</span>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-800 mb-3">Areas of Focus</h4>
          <div className="space-y-2">
            {stats.entityBreakdown.slice(0, 5).map((item, _index) => {
              // Convert technical entity types to user-friendly descriptions
              const getFriendlyEntity = (entityType: string) => {
                const entityLower = entityType.toLowerCase();
                if (entityLower.includes('service_provider')) return 'Cremation Centers';
                if (entityLower.includes('application')) return 'Business Applications';
                if (entityLower.includes('booking')) return 'Customer Bookings';
                if (entityLower.includes('review')) return 'Customer Reviews';
                if (entityLower.includes('refund')) return 'Refund Requests';
                if (entityLower.includes('user')) return 'User Accounts';
                return entityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              };

              return (
                <div key={item.entity_type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{getFriendlyEntity(item.entity_type)}</span>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Most Active Admins */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-800 mb-3">Admin Activity Summary</h4>
        <div className="space-y-2">
          {stats.adminActivity.slice(0, 3).map((admin, _index) => (
            <div key={admin.admin_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{admin.admin_name}</p>
                  <p className="text-xs text-gray-500">{admin.admin_username === 'system' ? 'Automated System' : `Admin: ${admin.admin_username}`}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-[var(--primary-green)]">
                {admin.count} {admin.count === 1 ? 'activity' : 'activities'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* View All Logs Link */}
      <div className="border-t border-gray-200 pt-4">
        <Link
          href="/admin/logs"
          className="inline-flex items-center text-sm text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] font-medium"
        >
          <DocumentTextIcon className="h-4 w-4 mr-1" />
          View All Activities
        </Link>
      </div>
    </div>
  );
}
