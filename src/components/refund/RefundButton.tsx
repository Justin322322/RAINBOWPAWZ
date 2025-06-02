'use client';

import React, { useState, useEffect } from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';
import RefundRequestModal from './RefundRequestModal';

interface RefundButtonProps {
  booking: {
    id: number;
    pet_name: string;
    booking_date: string;
    booking_time: string;
    price: number;
    payment_method: string;
    status: string;
    payment_status: string;
  };
  onRefundRequested?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
}

export default function RefundButton({
  booking,
  onRefundRequested,
  className = '',
  size = 'md',
  variant = 'outline'
}: RefundButtonProps) {
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState<string>('');
  const { showToast } = useToast();

  useEffect(() => {
    checkEligibility();
  }, [booking.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkEligibility = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/bookings/${booking.id}/refund`);
      const data = await response.json();

      if (data.success) {
        setIsEligible(data.eligible);
        setEligibilityReason(data.reason || '');
      } else {
        setIsEligible(false);
        setEligibilityReason(data.error || 'Unable to check refund eligibility');
      }
    } catch (error) {
      console.error('Error checking refund eligibility:', error);
      setIsEligible(false);
      setEligibilityReason('Error checking refund eligibility');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (isEligible) {
      setShowModal(true);
    } else {
      showToast(eligibilityReason || 'This booking is not eligible for refund', 'error');
    }
  };

  const handleRefundRequested = () => {
    setShowModal(false);
    onRefundRequested?.();
    // Re-check eligibility after refund request
    checkEligibility();
  };

  // Don't show button if already refunded
  if (booking.payment_status === 'refunded') {
    return null;
  }

  // Don't show button if payment wasn't made
  if (booking.payment_status !== 'paid') {
    return null;
  }

  // Don't show button if booking is not cancelled
  if (booking.status !== 'cancelled') {
    return null;
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-3 py-2 text-sm';
    }
  };

  const getVariantClasses = () => {
    if (!isEligible && !isLoading) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200';
    }

    switch (variant) {
      case 'primary':
        return 'bg-red-600 text-white hover:bg-red-700 border-red-600';
      case 'secondary':
        return 'bg-gray-600 text-white hover:bg-gray-700 border-gray-600';
      default:
        return 'bg-white text-red-600 hover:bg-red-50 border-red-300 hover:border-red-400';
    }
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading || !isEligible}
        className={`
          inline-flex items-center justify-center
          border rounded-lg font-medium
          transition-colors duration-200
          disabled:cursor-not-allowed
          ${getSizeClasses()}
          ${getVariantClasses()}
          ${className}
        `}
        title={
          isLoading
            ? 'Checking eligibility...'
            : isEligible
              ? 'Submit refund request for this booking'
              : eligibilityReason
        }
      >
        <CurrencyDollarIcon className={`${iconSize} mr-1`} />
        {isLoading ? 'Checking...' : 'Request Refund'}
      </button>

      {/* Refund Request Modal */}
      <RefundRequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        booking={booking}
        onRefundRequested={handleRefundRequested}
      />
    </>
  );
}
