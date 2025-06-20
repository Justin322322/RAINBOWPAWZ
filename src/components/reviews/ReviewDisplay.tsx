'use client';

import React, { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface ReviewDisplayProps {
  bookingId: number;
  userId: number;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
}

const ReviewDisplay: React.FC<ReviewDisplayProps> = ({ bookingId, userId }) => {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/reviews/user-booking/${bookingId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch review');
        }

        const data = await response.json();

        if (data.hasReview && data.review) {
          setReview(data.review);
        } else {
          setReview(null);
        }
      } catch (error) {
        console.error('Error fetching review:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (bookingId && userId) {
      fetchReview();
    }
  }, [bookingId, userId]);

  if (loading) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500">
        Error loading review: {error}
      </div>
    );
  }

  if (!review) {
    return (
      <div className="text-sm text-gray-500 italic">
        No review found for this booking.
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex items-center mb-2">
        <div className="flex mr-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star}>
              {star <= review.rating ? (
                <StarIcon className="h-5 w-5 text-yellow-400" />
              ) : (
                <StarIconOutline className="h-5 w-5 text-gray-300" />
              )}
            </span>
          ))}
        </div>
        <span className="text-sm text-gray-600">
          {formatDate(review.created_at)}
        </span>
      </div>

      {review.comment && (
        <p className="text-gray-700 mt-2">
          &quot;{review.comment}&quot;
        </p>
      )}
    </div>
  );
};

export default ReviewDisplay;
