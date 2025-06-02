'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StarIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import ReviewModal from './ReviewModal';
import { useToast } from '@/context/ToastContext';
import { LoadingSpinner } from '@/app/cremation/components/LoadingComponents';

interface PendingReview {
  booking_id: number;
  service_provider_id: number;
  provider_name: string;
  booking_date: string;
  service_name: string;
}

interface CompletedBookingReviewPromptProps {
  userId: number;
  onReviewSubmitted?: () => void;
}

const CompletedBookingReviewPrompt: React.FC<CompletedBookingReviewPromptProps> = ({
  userId,
  onReviewSubmitted
}) => {
  const { showToast } = useToast();
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<PendingReview | null>(null);
  const [dismissed, setDismissed] = useState<number[]>([]);

  useEffect(() => {
    // Create a cache key for the pending reviews data
    const CACHE_KEY = 'pendingReviewsDetailData';
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

    const fetchPendingReviews = async () => {
      try {
        setLoading(true);
        console.log('Fetching pending reviews for user ID:', userId);

        // Check if we have cached data that's still valid
        if (typeof window !== 'undefined') {
          const cachedDataStr = localStorage.getItem(CACHE_KEY);
          if (cachedDataStr) {
            try {
              const cachedData = JSON.parse(cachedDataStr);
              const now = Date.now();

              // If the cache is still valid, use it
              if (cachedData.timestamp && (now - cachedData.timestamp < CACHE_EXPIRY)) {
                console.log('Using cached pending reviews detail data');
                setPendingReviews(cachedData.reviews || []);
                setLoading(false);
                return;
              }
            } catch (e) {
              console.error('Error parsing cached pending reviews detail data:', e);
              localStorage.removeItem(CACHE_KEY);
            }
          }
        }

        const response = await fetch('/api/reviews/pending');

        if (!response.ok) {
          throw new Error('Failed to fetch pending reviews');
        }

        const data = await response.json();
        console.log('Pending reviews API response:', data);

        const reviews = data.pendingReviews || [];
        setPendingReviews(reviews);

        // Cache the result
        if (typeof window !== 'undefined') {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            reviews,
            timestamp: Date.now()
          }));
        }

        // Log debug information if available
        if (data.debug) {
          console.log('Debug info:', data.debug);
        }

        // Removed toast notification to avoid duplication with the banner
      } catch (error) {
        console.error('Error fetching pending reviews:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPendingReviews();
    } else {
      console.error('No user ID provided to CompletedBookingReviewPrompt');
    }
  }, [userId]); // Removed showToast from dependencies to avoid infinite loop

  const handleOpenModal = (booking: PendingReview) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const handleReviewSuccess = () => {
    if (selectedBooking) {
      // Add the booking ID to the dismissed list
      setDismissed([...dismissed, selectedBooking.booking_id]);

      // Remove the booking from pending reviews
      const updatedReviews = pendingReviews.filter(
        review => review.booking_id !== selectedBooking.booking_id
      );
      setPendingReviews(updatedReviews);

      // Update the cache with the new reviews list
      if (typeof window !== 'undefined') {
        // Update detailed reviews cache
        localStorage.setItem('pendingReviewsDetailData', JSON.stringify({
          reviews: updatedReviews,
          timestamp: Date.now()
        }));

        // Update count cache for the banner
        localStorage.setItem('pendingReviewsData', JSON.stringify({
          count: updatedReviews.length,
          timestamp: Date.now()
        }));
      }

      // Close the modal
      handleCloseModal();

      // Call the callback if provided
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    }
  };

  const handleDismiss = (bookingId: number) => {
    setDismissed([...dismissed, bookingId]);
  };

  // Filter out dismissed reviews
  const filteredReviews = pendingReviews.filter(
    review => !dismissed.includes(review.booking_id)
  );

  if (loading) {
    return (
      <div className="mb-6 bg-gray-50 border border-gray-200 p-4 rounded-md">
        <LoadingSpinner
          message="Checking for completed bookings that need reviews..."
          className="py-4"
        />
      </div>
    );
  }

  // For debugging purposes, show error in development
  if (error && process.env.NODE_ENV === 'development') {
    return (
      <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-md">
        <p className="text-red-700">Error loading review prompts: {error}</p>
        <p className="text-sm text-red-600 mt-2">This message only appears in development mode.</p>
      </div>
    );
  }

  // Don't show anything if there's an error in production
  if (error) {
    console.error('Error in CompletedBookingReviewPrompt:', error);
    return null;
  }

  // Don't show anything if there are no pending reviews
  if (filteredReviews.length === 0) {
    return null;
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <>
      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-md p-5 rounded-lg"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-blue-100 p-2 rounded-full">
              <StarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-blue-800">Share Your Experience</h3>
              <p className="text-sm text-blue-700 mt-1">
                Your feedback helps other pet parents make informed decisions and improves services.
              </p>

              <div className="mt-4 space-y-3">
                {filteredReviews.map((review) => (
                  <motion.div
                    key={review.booking_id}
                    className="bg-white p-4 rounded-md shadow-sm border border-gray-100"
                    initial={{ opacity: 0.8 }}
                    whileHover={{ scale: 1.01, boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)" }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{review.provider_name}</p>
                        <p className="text-sm text-gray-600">{review.service_name}</p>
                        <p className="text-xs text-gray-500 mt-1">Booking date: {formatDate(review.booking_date)}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleOpenModal(review)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
                          data-review-booking-id={review.booking_id}
                        >
                          Leave Review
                        </button>
                        <button
                          onClick={() => handleDismiss(review.booking_id)}
                          className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-md transition-colors"
                          aria-label="Dismiss"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-3 text-xs text-gray-500">
                You can always find your completed bookings in the &quot;Completed&quot; tab.
                <p className="mt-1">Note: Reviews can only be submitted within 5 days of booking completion. Once submitted, reviews cannot be edited.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {selectedBooking && (
        <ReviewModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          bookingId={selectedBooking.booking_id}
          userId={userId}
          providerId={selectedBooking.service_provider_id}
          providerName={selectedBooking.provider_name}
          onSuccess={handleReviewSuccess}
        />
      )}
    </>
  );
};

export default CompletedBookingReviewPrompt;
