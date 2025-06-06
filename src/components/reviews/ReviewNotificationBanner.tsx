'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, StarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
interface ReviewNotificationBannerProps {
  userId: number;
}

const ReviewNotificationBanner: React.FC<ReviewNotificationBannerProps> = ({ userId }) => {
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Create a cache key for the pending reviews data
    const CACHE_KEY = 'pendingReviewsData';
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

    const fetchPendingReviews = async () => {
      try {
        setLoading(true);

        // Check if we have cached data that's still valid
        if (typeof window !== 'undefined') {
          const cachedDataStr = localStorage.getItem(CACHE_KEY);
          if (cachedDataStr) {
            try {
              const cachedData = JSON.parse(cachedDataStr);
              const now = Date.now();

              // If the cache is still valid, use it
              if (cachedData.timestamp && (now - cachedData.timestamp < CACHE_EXPIRY)) {
                console.log('Using cached pending reviews data');
                setPendingReviewsCount(cachedData.count || 0);
                setLoading(false);
                return;
              }
            } catch (e) {
              console.error('Error parsing cached pending reviews data:', e);
              localStorage.removeItem(CACHE_KEY);
            }
          }
        }

        // If no valid cache, fetch from API
        const response = await fetch('/api/reviews/pending', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch pending reviews');
        }

        const data = await response.json();

        if (data.pendingReviews && Array.isArray(data.pendingReviews)) {
          const count = data.pendingReviews.length;
          setPendingReviewsCount(count);

          // Cache the result
          if (typeof window !== 'undefined') {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              count,
              timestamp: Date.now()
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching pending reviews:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPendingReviews();
    }
  }, [userId]);

  const handleDismiss = () => {
    setDismissed(true);
    // Store in local storage so it stays dismissed even after session ends
    if (typeof window !== 'undefined') {
      // Store with a timestamp so we can expire it after a day
      const dismissalData = {
        dismissed: true,
        timestamp: Date.now()
      };
      localStorage.setItem('reviewBannerDismissed', JSON.stringify(dismissalData));
    }
  };

  // Check local storage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const dismissalDataStr = localStorage.getItem('reviewBannerDismissed');
        if (dismissalDataStr) {
          const dismissalData = JSON.parse(dismissalDataStr);

          // Check if the dismissal is older than 24 hours (86400000 ms)
          const now = Date.now();
          const dismissedTime = dismissalData.timestamp || 0;
          const isExpired = now - dismissedTime > 86400000;

          if (isExpired) {
            // Clear expired dismissal
            localStorage.removeItem('reviewBannerDismissed');
            setDismissed(false);
          } else {
            setDismissed(dismissalData.dismissed === true);
          }
        }
      } catch (error) {
        console.error('Error parsing review banner dismissal data:', error);
        localStorage.removeItem('reviewBannerDismissed');
      }
    }
  }, []);

  // Don't show anything if loading, error, no pending reviews, or dismissed
  if (loading || error || pendingReviewsCount === 0 || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-blue-50 border-b border-blue-100 px-4 py-2 relative"
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <StarIcon className="h-5 w-5 text-blue-500 mr-2" />
            <p className="text-blue-700 text-sm">
              You have <span className="font-semibold">{pendingReviewsCount}</span> completed {pendingReviewsCount === 1 ? 'booking' : 'bookings'} that {pendingReviewsCount === 1 ? 'needs' : 'need'} a review
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/user/furparent_dashboard/bookings?filter=completed"
              className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md transition-colors"
            >
              Leave Reviews
            </Link>
            <button
              onClick={handleDismiss}
              className="text-blue-400 hover:text-blue-600"
              aria-label="Dismiss notification"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReviewNotificationBanner;
