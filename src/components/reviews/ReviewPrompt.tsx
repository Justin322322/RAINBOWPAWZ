'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ReviewModal from './ReviewModal';

interface ReviewPromptProps {
  bookingId: number;
  userId: number;
  providerId: number;
  providerName: string;
  onDismiss?: () => void;
}

const ReviewPrompt: React.FC<ReviewPromptProps> = ({
  bookingId,
  userId,
  providerId,
  providerName,
  onDismiss,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasReview, setHasReview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has already reviewed this booking
    const checkExistingReview = async () => {
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
        }
      } catch (error) {
        console.error('Error checking for existing review:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkExistingReview();
  }, [bookingId]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (isLoading || hasReview) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-6"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <StarIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-blue-700">
              How was your experience with {providerName}? Your feedback helps others make informed decisions.
            </p>
            <div className="mt-2">
              <button
                onClick={handleOpenModal}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-md text-sm font-medium transition-colors"
              >
                Leave a Review
              </button>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-auto flex-shrink-0 text-blue-400 hover:text-blue-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </motion.div>

      <ReviewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        bookingId={bookingId}
        userId={userId}
        providerId={providerId}
        providerName={providerName}
      />
    </>
  );
};

export default ReviewPrompt;
