'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefundDetail } from '@/types/payment';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingComponents';
import { Alert } from '../ui/Alert';

interface RefundDetailModalProps {
  refundId: number;
  isOpen: boolean;
  onClose: () => void;
  onAction: () => void;
}

interface ApiResponse {
  success: boolean;
  refund: RefundDetail;
  error?: string;
}

export function RefundDetailModal({
  refundId,
  isOpen,
  onClose,
  onAction: _onAction
}: RefundDetailModalProps) {
  const [refund, setRefund] = useState<RefundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRefundDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/cremation/refunds/${refundId}`);
      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch refund details');
      }

      setRefund(data.refund);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  useEffect(() => {
    if (isOpen && refundId) {
      fetchRefundDetail();
    }
  }, [isOpen, refundId, fetchRefundDetail]);


  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'success';
      case 'failed':
        return 'danger';
      case 'processing':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'outline';
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasonLabels: Record<string, string> = {
      requested_by_customer: 'Customer Request',
      duplicate: 'Duplicate',
      fraudulent: 'Fraudulent',
      service_not_provided: 'Service Not Provided',
      other: 'Other'
    };
    return reasonLabels[reason] || reason;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Refund Details" size="large">
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <Alert variant="error">
            <p>{error}</p>
          </Alert>
        ) : refund ? (
          <>
            {/* Header Info */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Refund #{refund.id}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Booking #{refund.booking_id}
                </p>
              </div>
              <Badge variant={getStatusBadgeVariant(refund.status)} className="text-sm">
                {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
              </Badge>
            </div>

            {/* Refund Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Refund Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Refund Information</h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(refund.amount)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Reason</label>
                    <p className="text-sm text-gray-900">
                      {getReasonLabel(refund.reason)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Method</label>
                    <p className="text-sm text-gray-900 capitalize">
                      {refund.payment_method}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Provider</label>
                    <p className="text-sm text-gray-900">
                      {refund.provider}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-sm text-gray-900">
                      {formatDate(refund.created_at)}
                    </p>
                  </div>

                  {refund.processed_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Processed</label>
                      <p className="text-sm text-gray-900">
                        {formatDate(refund.processed_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking & Payment Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Related Information</h3>

                {/* Booking Details */}
                <div className="space-y-3">
                  <h4 className="text-md font-medium text-gray-700">Booking Details</h4>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Pet Name</label>
                    <p className="text-sm text-gray-900">
                      {refund.booking_details.pet_name}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer</label>
                    <p className="text-sm text-gray-900">
                      {refund.booking_details.user_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {refund.booking_details.user_email}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Service Type</label>
                    <p className="text-sm text-gray-900">
                      {refund.booking_details.service_type}
                    </p>
                  </div>

                  {refund.booking_details.service_date && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Service Date</label>
                      <p className="text-sm text-gray-900">
                        {formatDate(refund.booking_details.service_date)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Details */}
                <div className="space-y-3">
                  <h4 className="text-md font-medium text-gray-700">Original Payment</h4>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className="text-sm text-gray-900">
                      {formatCurrency(refund.payment_details.original_amount)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Date</label>
                    <p className="text-sm text-gray-900">
                      {formatDate(refund.payment_details.payment_date)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Method</label>
                    <p className="text-sm text-gray-900 capitalize">
                      {refund.payment_details.payment_method}
                    </p>
                  </div>

                  {refund.payment_details.transaction_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                      <p className="text-sm text-gray-900 font-mono">
                        {refund.payment_details.transaction_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PayMongo Details */}
            {(refund.paymongo_payment_id || refund.paymongo_refund_id) && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">PayMongo Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {refund.paymongo_payment_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Payment ID</label>
                      <p className="text-sm text-gray-900 font-mono break-all">
                        {refund.paymongo_payment_id}
                      </p>
                    </div>
                  )}
                  {refund.paymongo_refund_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Refund ID</label>
                      <p className="text-sm text-gray-900 font-mono break-all">
                        {refund.paymongo_refund_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {(refund.notes || refund.failure_reason) && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Information</h3>
                <div className="space-y-3">
                  {refund.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Notes</label>
                      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                        {refund.notes}
                      </p>
                    </div>
                  )}
                  {refund.failure_reason && (
                    <div>
                      <label className="text-sm font-medium text-red-600">Failure Reason</label>
                      <p className="text-sm text-red-700 bg-red-50 p-3 rounded-md">
                        {refund.failure_reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
