'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { RefundListItem, RefundSummary } from '@/types/payment';
import { RefundCard } from './RefundCard';
import { RefundSummaryStats } from './RefundSummaryStats';
import { LoadingSpinner } from '../ui/LoadingComponents';
import { Alert } from '../ui/Alert';
import { Card, CardContent } from '../ui/Card';

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
  // report controls
  const [limit] = useState<number>(20);
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'not_paid'>('all');

  const fetchRefunds = useCallback(async (offset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      queryParams.append('limit', String(limit));
      queryParams.append('offset', String(offset));
      if (paymentStatus !== 'all') {
        queryParams.append('payment_status', paymentStatus);
      }

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
  }, [limit, paymentStatus]);

  useEffect(() => {
    fetchRefunds(0);
  }, [fetchRefunds]);

  const handleLoadMore = () => {
    const newOffset = pagination.offset + pagination.limit;
    fetchRefunds(newOffset);
  };
  const exportCsv = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allRows: RefundListItem[] = [];
      let localOffset = 0;
      const pageSize = 200; // export faster with larger page size

      // page through all data
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const params = new URLSearchParams();
        params.append('limit', String(pageSize));
        params.append('offset', String(localOffset));
        const res = await fetch(`/api/cremation/refunds?${params.toString()}`);
        const data: ApiResponse = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to export refunds');
        allRows.push(...data.refunds);
        if (!data.pagination.has_more) break;
        localOffset += pageSize;
      }

      const headers = [
        'Refund ID',
        'Booking ID',
        'Amount',
        'Status',
        'Reason',
        'Payment Method',
        'Created At',
        'Processed At',
        'Pet Name',
        'User Name',
        'Provider Name'
      ];

      const csvRows = [headers.join(',')];
      for (const r of allRows) {
        const row = [
          r.id,
          r.booking_id,
          r.amount,
          r.status,
          r.reason,
          r.payment_method,
          r.created_at ? new Date(r.created_at).toISOString() : '',
          r.processed_at ? new Date(r.processed_at).toISOString() : '',
          r.pet_name || '',
          r.user_name || '',
          r.provider_name || ''
        ]
          .map((v) =>
            typeof v === 'string'
              ? '"' + v.replace(/"/g, '""') + '"'
              : String(v)
          )
          .join(',');
        csvRows.push(row);
      }

      const csvContent = '\uFEFF' + csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `refunds_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export CSV');
    } finally {
      setLoading(false);
    }
  }, []);

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

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Payment Status</label>
          <select
            className="border rounded-md px-2 py-1 text-sm"
            value={paymentStatus}
            onChange={(e) => { setPaymentStatus(e.target.value as any); fetchRefunds(0); }}
          >
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="not_paid">Not Paid</option>
          </select>
        </div>
        <button
          onClick={exportCsv}
          className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black"
          disabled={loading}
        >
          {loading ? 'Preparing…' : 'Export CSV'}
        </button>
      </div>

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
