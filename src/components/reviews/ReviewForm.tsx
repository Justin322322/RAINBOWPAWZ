'use client';

import React, { useState } from 'react';
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import StarRating from '@/components/ui/StarRating';
import { useToast } from '@/contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ReviewFormProps {
  bookingId: number;
  userId: number;
  providerId: number;
  providerName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  bookingId,
  userId,
  providerId,
  providerName,
  onSuccess,
  onCancel,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const { showToast } = useToast();

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    // Validate required props
    if (!bookingId || !userId || !providerId) {
      setError('Missing required information. Please try again.');
      console.error('Missing required props:', { bookingId, userId, providerId });
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('Submitting review:', {
        booking_id: bookingId,
        user_id: userId,
        service_provider_id: providerId,
        rating,
        comment: comment.substring(0, 500), // Limit comment length
      });

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          booking_id: bookingId,
          user_id: userId,
          service_provider_id: providerId,
          rating,
          comment: comment.substring(0, 500), // Limit comment length
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Log validation details if available
        if (responseData.validation) {
          console.error('Validation failed:', responseData.validation);
        }
        
        // Check for specific error messages
        if (responseData.error && responseData.error.includes('already reviewed')) {
          throw new Error('You have already submitted a review for this booking.');
        } else if (responseData.error && responseData.error.includes('5 days')) {
          throw new Error('Reviews can only be submitted within 5 days of booking completion.');
        } else if (responseData.error && responseData.error.includes('required')) {
          throw new Error('Missing required information. Please refresh the page and try again.');
        } else {
          throw new Error(responseData.error || 'Failed to submit review');
        }
      }

      // Show success UI
      setIsSuccess(true);

      // Show toast notification
      showToast('Review submitted successfully!', 'success');

      // Wait for animation to complete before calling onSuccess
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (error) {
      console.error('Error submitting review:', error);

      // Format the error message for display
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while submitting your review';
      setError(errorMessage);

      // Show a more user-friendly toast message
      if (errorMessage.includes('already submitted')) {
        showToast('This booking has already been reviewed.', 'info');
      } else if (errorMessage.includes('5 days')) {
        showToast('Review period has expired for this booking.', 'info');
      } else {
        showToast('Error: ' + errorMessage, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isSuccess ? (
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
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Thank you for your review!</h2>
          <p className="text-gray-600 mb-6">
            Your feedback helps improve our services and assists other pet parents.
          </p>
          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Rate your experience with {providerName}
            </h3>
            <div className="flex items-center">
              <StarRating
                rating={rating}
                interactive={true}
                onRatingChange={handleRatingChange}
                size="large"
                className="mb-2"
              />
              <span className="ml-2 text-gray-500">
                {rating > 0 ? `${rating} out of 5 stars` : 'Select a rating'}
              </span>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>

          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              Share your thoughts (optional)
            </label>
            <textarea
              id="comment"
              name="comment"
              rows={4}
              value={comment}
              onChange={handleCommentChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
              placeholder="Tell others about your experience..."
            />
            <p className="mt-2 text-xs text-gray-500">
              Note: Once submitted, reviews cannot be edited. Reviews will expire 5 days after booking completion.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="animate-spin h-5 w-5 mr-2 inline-block" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
};

export default ReviewForm;
