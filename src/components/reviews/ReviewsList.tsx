'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ArrowPathIcon,
  CheckBadgeIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import StarRating from '@/components/ui/StarRating';

interface Review {
  id: number;
  user_id: number;
  service_provider_id: number;
  booking_id: number;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  user_name?: string; // Real user name from database join
  service_name?: string; // Service specific details
  booking_date?: string; // Booking date if available
}

interface ReviewsListProps {
  providerId: number;
  className?: string;
}

// Helper function to format real reviewer names (first name + last initial)
const formatReviewerName = (fullName?: string): string => {
  if (!fullName || fullName === 'Anonymous') {
    return 'Anonymous User';
  }

  const names = fullName.trim().split(' ');
  if (names.length >= 2) {
    return `${names[0]} ${names[1].charAt(0)}.`;
  }
  return names[0]; // Just first name if only one name provided
};

// Helper function to generate avatar color based on user ID (for consistency)
const getAvatarColor = (userId: number): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
    'bg-yellow-500', 'bg-red-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
  ];
  return colors[userId % colors.length];
};

const ReviewsList: React.FC<ReviewsListProps> = ({ providerId, className = '' }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<number[]>([0, 0, 0, 0, 0]);



  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/reviews/provider/${providerId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }

        const data = await response.json();
        const reviewsData = data.reviews || [];

        // Calculate rating distribution
        const distribution = [0, 0, 0, 0, 0];
        reviewsData.forEach((review: Review) => {
          if (review.rating >= 1 && review.rating <= 5) {
            distribution[review.rating - 1]++;
          }
        });

        setReviews(reviewsData);
        setAverageRating(data.averageRating || 0);
        setTotalReviews(data.totalReviews || 0);
        setRatingDistribution(distribution);
      } catch (error) {
        setError('Error loading reviews');
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [providerId]);

  if (loading) {
    return (
      <div className={`flex justify-center items-center py-8 ${className}`}>
        <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <p className="text-gray-500">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Enhanced Rating Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overall Rating */}
          <div className="flex flex-col items-center lg:items-start">
            <div className="flex items-center mb-2">
              <span className="text-4xl font-bold text-gray-900 mr-2">
                {averageRating.toFixed(1)}
              </span>
              <div className="flex flex-col">
                <StarRating rating={averageRating} size="large" />
                <span className="text-sm text-gray-600 mt-1">
                  Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                </span>
              </div>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = ratingDistribution[rating - 1] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

              return (
                <div key={rating} className="flex items-center text-sm">
                  <span className="w-8 text-gray-600">{rating}</span>
                  <StarRating rating={rating} size="small" className="mx-2" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mx-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-gray-600 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => {
          const reviewerName = formatReviewerName(review.user_name);
          const avatarColor = getAvatarColor(review.user_id);
          const isVerifiedPurchase = review.booking_id && review.booking_id > 0;

          return (
            <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              {/* Reviewer Info */}
              <div className="flex items-start space-x-4 mb-4">
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full ${avatarColor} flex items-center justify-center text-white font-semibold text-lg flex-shrink-0`}>
                  {reviewerName.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{reviewerName}</h4>
                    {isVerifiedPurchase && (
                      <div className="flex items-center space-x-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                        <CheckBadgeIcon className="w-3 h-3" />
                        <span>Verified Purchase</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 mb-2">
                    <StarRating rating={review.rating} size="small" />
                    <span className="text-sm text-gray-500">
                      {format(new Date(review.created_at), 'MMMM d, yyyy')}
                    </span>
                  </div>

                  {review.service_name && (
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">Service:</span> {review.service_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Review Content */}
              {review.comment && (
                <div className="mb-4">
                  <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                </div>
              )}

              {/* Review Footer */}
              {(review.booking_id || review.booking_date) && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {review.booking_date && (
                      <span>Service Date: {format(new Date(review.booking_date), 'MMM d, yyyy')}</span>
                    )}
                  </div>

                  {review.booking_id && (
                    <div className="text-xs text-gray-500">
                      Booking #{review.booking_id}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReviewsList;
