'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefundListItem,
  RefundSummary,
  RefundDetail,
  RefundStatus
} from '@/types/payment';

interface UseRefundsProps {
  cremationCenterId: number;
  initialFilters?: {
    status?: RefundStatus | '';
    limit?: number;
    offset?: number;
  };
}

interface RefundFilters {
  status: RefundStatus | '';
  limit: number;
  offset: number;
}

interface RefundApiResponse {
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

export function useRefunds({ cremationCenterId: _cremationCenterId, initialFilters }: UseRefundsProps) {
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

  const [filters, setFilters] = useState<RefundFilters>({
    status: '',
    limit: 20,
    offset: 0,
    ...initialFilters
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
      const data: RefundApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch refunds');
      }

      if (newFilters.offset === 0) {
        setRefunds(data.refunds);
      } else {
        setRefunds(prev => [...prev, ...data.refunds]);
      }

      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((newFilters: Partial<RefundFilters>) => {
    const updatedFilters = {
      ...filters,
      ...newFilters,
      offset: newFilters.offset ?? 0 // Reset offset when filters change
    };
    setFilters(updatedFilters);
    fetchRefunds(updatedFilters);
  }, [filters, fetchRefunds]);

  const loadMore = useCallback(() => {
    const newOffset = pagination.offset + pagination.limit;
    const updatedFilters = { ...filters, offset: newOffset };
    setFilters(updatedFilters);
    fetchRefunds(updatedFilters);
  }, [filters, pagination, fetchRefunds]);

  const refresh = useCallback(() => {
    fetchRefunds(filters);
  }, [filters, fetchRefunds]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  return {
    refunds,
    summary,
    loading,
    error,
    pagination,
    filters,
    updateFilters,
    loadMore,
    refresh
  };
}

interface UseRefundDetailProps {
  refundId?: number;
}

export function useRefundDetail({ refundId }: UseRefundDetailProps) {
  const [refund, setRefund] = useState<RefundDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRefundDetail = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cremation/refunds/${id}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch refund details');
      }

      setRefund(data.refund);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    if (refundId) {
      fetchRefundDetail(refundId);
    }
  }, [refundId, fetchRefundDetail]);

  useEffect(() => {
    if (refundId) {
      fetchRefundDetail(refundId);
    }
  }, [refundId, fetchRefundDetail]);

  return {
    refund,
    loading,
    error,
    refresh
  };
}

interface UseRefundActionsProps {
  refundId: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useRefundActions({ refundId, onSuccess, onError }: UseRefundActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performAction = useCallback(async (action: 'approve' | 'deny') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cremation/refunds/${refundId}/${action}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || `Failed to ${action} refund`);
      }

      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [refundId, onSuccess, onError]);

  const approve = useCallback(() => performAction('approve'), [performAction]);
  const deny = useCallback(() => performAction('deny'), [performAction]);

  return {
    loading,
    error,
    approve,
    deny
  };
}
