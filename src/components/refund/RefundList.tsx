'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { RefundListItem, RefundSummary } from '@/types/payment';
import { RefundCard } from './RefundCard';
import { RefundFilters } from './RefundFilters';
import { RefundSummaryStats } from './RefundSummaryStats';
import { LoadingSpinner } from '../ui/LoadingComponents';
import { Alert } from '../ui/Alert';
import { Card, CardContent } from '../ui/Card';

interface RefundFiltersType {
  status: string;
  limit: number;
  offset: number;
}

interface RefundListProps {
  cremationCenterId: number;
}

interface ApiResponse {
  success: boolean;
  refunds: RefundListItem[];
  summary: RefundSummary;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  error?: string;
}

export function RefundList({ cremationCenterId: _cremationCenterId }: RefundListProps) {
  const [refunds, setRefunds] = useState<RefundListItem[]>([]);
  const [summary, setSummary] = useState<RefundSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    has_more: false
  });
  const [filters, setFilters] = useState<RefundFiltersType>({
    status: '',
    limit: 20,
    offset: 0
  });

  const fetchRefunds = useCallback(async (newFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (newFilters.status) queryParams.append('status', newFilters.status);
      queryParams.append('limit', newFilters.limit.toString());
      queryParams.append('offset', newFilters.offset.toString());

      const response = await fetch(`/api/cremation/refunds?${queryParams}`);
      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch refunds');
      }

      setRefunds(data.refunds);
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleFilterChange = (newFilters: Partial<RefundFiltersType>) => {
    const updatedFilters = { ...filters, ...newFilters, offset: 0 };
    setFilters(updatedFilters);
    fetchRefunds(updatedFilters);
  };

  const handleLoadMore = () => {
    const newOffset = pagination.offset + pagination.limit;
    const updatedFilters = { ...filters, offset: newOffset };
    setFilters(updatedFilters);
    fetchRefunds(updatedFilters);
  };

  const handleRefundAction = () => {
    // Refresh the list after a refund action
    fetchRefunds();
  };

  if (loading && refunds.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && <RefundSummaryStats summary={summary} />}

      {/* Filters */}
      <RefundFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      {/* Refunds List */}
      {refunds.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-500">
              <Image
                src="/no-refunds.png"
                alt="No refunds"
                width={96}
                height={96}
                className="mx-auto h-24 w-24 text-gray-400"
              />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No refunds found</h3>
              <p className="mt-1 text-sm text-gray-500">
                There are no refunds to display at this time.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {refunds.map((refund) => (
            <RefundCard
              key={refund.id}
              refund={refund}
              onAction={handleRefundAction}
            />
          ))}

          {/* Load More Button */}
          {pagination.has_more && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && refunds.length > 0 && (
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}
