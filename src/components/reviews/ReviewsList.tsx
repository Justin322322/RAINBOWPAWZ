'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
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
  user_name?: string; // Added from join
}

interface ReviewsListProps {
  providerId: number;
  className?: string;
}

const ReviewsList: React.FC<ReviewsListProps> = ({ providerId, className = '' }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/reviews/provider/${providerId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }
        
        const data = await response.json();
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || 0);
        setTotalReviews(data.totalReviews || 0);
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
      <div className="mb-6">
        <div className="flex items-center">
          <StarRating rating={averageRating} size="large" />
          <span className="ml-2 text-lg font-medium">
            {averageRating.toFixed(1)} out of 5
          </span>
        </div>
        <p className="text-gray-600 mt-1">{totalReviews} customer reviews</p>
      </div>
      
      <div className="space-y-6">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-200 pb-6">
            <div className="flex items-center mb-2">
              <StarRating rating={review.rating} size="small" />
              <span className="ml-2 font-medium">{review.user_name || 'Anonymous'}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              {format(new Date(review.created_at), 'MMMM d, yyyy')}
            </p>
            {review.comment && (
              <p className="text-gray-700">{review.comment}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsList;
