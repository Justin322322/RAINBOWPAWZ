'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import ReviewForm from './ReviewForm';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { LoadingSpinner } from '@/app/cremation/components/LoadingComponents';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
  userId: number;
  providerId: number;
  providerName: string;
  onSuccess?: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  userId,
  providerId,
  providerName,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasReview, setHasReview] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  const checkReviewStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/booking/${bookingId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setHasReview(data.hasReview);
      } else {
        setError('Failed to check review status');
      }
    } catch (error) {
      setError('Error checking review status');
      console.error('Error checking review status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  // Check review status when modal opens
  useEffect(() => {
    if (isOpen && bookingId) {
      checkReviewStatus();
    }
  }, [isOpen, bookingId, checkReviewStatus]);

  const handleSuccess = () => {
    setHasReview(true);
    if (onSuccess) {
      onSuccess();
    }
  };

  // Don't render if required props are missing
  if (!bookingId || !userId || !providerId) {
    console.error('ReviewModal: Missing required props:', { 
      bookingId, 
      userId, 
      providerId,
      types: {
        bookingId: typeof bookingId,
        userId: typeof userId,
        providerId: typeof providerId
      }
    });
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hasReview ? "Review Submitted" : "Leave a Review"}
      size="medium"
    >
      {isLoading ? (
        <LoadingSpinner
          message="Checking review status..."
          className="py-12"
        />
      ) : hasReview ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="py-8 flex flex-col items-center justify-center text-center"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircleIcon className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Thank you!</h2>
          <p className="text-gray-600 mb-6">
            You have already submitted a review for this booking. We appreciate your feedback!
          </p>
          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden mb-6">
            <motion.div
              className="h-full bg-green-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[var(--primary-green-hover)] focus:outline-none"
          >
            Close
          </button>
        </motion.div>
      ) : (
        <ReviewForm
          bookingId={bookingId}
          userId={userId}
          providerId={providerId}
          providerName={providerName}
          onSuccess={handleSuccess}
          onCancel={onClose}
        />
      )}
    </Modal>
  );
};

export default ReviewModal;
