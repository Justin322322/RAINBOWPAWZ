'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import {
  StarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import withBusinessVerification from '@/components/withBusinessVerification';
import { useToast } from '@/context/ToastContext';
import StarRating from '@/components/ui/StarRating';
import { LoadingSpinner } from '@/app/cremation/components/LoadingComponents';

interface ReviewsPageProps {
  userData?: any;
}

interface Review {
  id: number;
  user_id: number;
  service_provider_id: number;
  booking_id: number;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  provider_name: string;
  booking_date?: string;
  service_name?: string;
  user_email?: string;
}

function ReviewsPage({ userData }: ReviewsPageProps) {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [services, setServices] = useState<{id: number, name: string}[]>([]);
  const [filterService, setFilterService] = useState<string>('');

  // Ref to track if we've already shown an error toast
  const hasShownErrorRef = useRef(false);

  useEffect(() => {
    // Flag to prevent multiple error toasts
    let isErrorShown = false;
    let isMounted = true;

    const fetchReviews = async () => {
      if (!userData || !isMounted) return;

      // Add a small delay to prevent rapid re-execution
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        setLoading(true);
        setError(null);

        // Get the provider ID from the user data - prioritize business_id first
        let effectiveProviderId = userData.business_id || userData.provider_id || userData.service_provider_id || userData.id;

        if (!effectiveProviderId) {
          throw new Error('Provider ID not found');
        }

        console.log(`Fetching reviews for provider ID: ${effectiveProviderId} (from userData:`, {
          business_id: userData.business_id,
          provider_id: userData.provider_id,
          service_provider_id: userData.service_provider_id,
          id: userData.id,
          role: userData.role
        });

        const response = await fetch(`/api/reviews/provider/${effectiveProviderId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }

        const data = await response.json();
        console.log('Reviews API response:', data);

        // Only update state if component is still mounted
        if (!isMounted) return;

        // Check if we have reviews data
        if (data.reviews && Array.isArray(data.reviews)) {
          console.log(`Found ${data.reviews.length} reviews in API response`);

          // Log the first few reviews for debugging
          if (data.reviews.length > 0) {
            console.log('First review sample:', {
              id: data.reviews[0].id,
              user_id: data.reviews[0].user_id,
              service_provider_id: data.reviews[0].service_provider_id,
              booking_id: data.reviews[0].booking_id,
              rating: data.reviews[0].rating,
              comment: data.reviews[0].comment ? data.reviews[0].comment.substring(0, 20) + '...' : 'No comment'
            });
          }

          setReviews(data.reviews);

          // Extract unique services for filtering
          if (data.reviews.length > 0) {
            const uniqueServices = Array.from(
              new Set(data.reviews.filter((r: Review) => r.service_name).map((r: Review) => r.service_name))
            ).map(name => {
              return {
                id: 0, // We don't need the ID for filtering
                name: name as string
              };
            });

            console.log(`Found ${uniqueServices.length} unique services for filtering`);
            setServices(uniqueServices);
          }
        } else {
          console.warn('No reviews array in API response:', data);
          setReviews([]);
        }

        // Ensure averageRating is a number
        const numericRating = typeof data.averageRating === 'number'
          ? data.averageRating
          : parseFloat(data.averageRating) || 0;

        setAverageRating(numericRating);
        setTotalReviews(data.totalReviews || 0);
        console.log(`Set average rating: ${numericRating} (type: ${typeof numericRating}) from ${data.totalReviews} reviews`);

        // Reset error flag on successful load
        hasShownErrorRef.current = false;
      } catch (error) {
        // Only update state and show error if component is still mounted
        if (!isMounted) return;

        const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching reviews';
        setError(errorMessage);

        // Only show toast once to prevent loops
        if (!isErrorShown && !hasShownErrorRef.current) {
          isErrorShown = true;
          hasShownErrorRef.current = true;
          console.error('Error fetching reviews:', error);
          showToast('Error loading reviews: ' + errorMessage, 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReviews();

    // Cleanup function
    return () => {
      isMounted = false; // Prevent state updates after unmount
      isErrorShown = true; // Prevent showing errors if component unmounts
    };
  }, [userData, showToast]);

  const filteredReviews = reviews.filter((review) => {
    // Filter by rating if a filter is selected
    if (filterRating !== null && review.rating !== filterRating) {
      return false;
    }

    // Filter by service if selected
    if (filterService && review.service_name !== filterService) {
      return false;
    }

    // Filter by search term if provided
    if (searchTerm && !(
      review.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.service_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )) {
      return false;
    }

    return true;
  });

  const handleFilterRatingChange = (rating: number | null) => {
    setFilterRating(rating);
  };

  const handleFilterServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterService(e.target.value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch (_error) {
      return dateString;
    }
  };

  return (
    <CremationDashboardLayout activePage="reviews" userData={userData}>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Customer Reviews</h1>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <div className="flex items-center bg-yellow-100 px-3 py-1 rounded-full">
              <StarIcon className="h-5 w-5 text-yellow-500 mr-1" />
              <span className="font-medium">{(typeof averageRating === 'number' ? averageRating : 0).toFixed(1)}</span>
              <span className="text-gray-600 ml-1">({totalReviews} reviews)</span>
            </div>
            <span className="text-gray-600">
              {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'} found
            </span>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filter by rating:</span>
              <div className="flex space-x-2">
                {[null, 5, 4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating === null ? 'all' : rating}
                    onClick={() => handleFilterRatingChange(rating)}
                    className={`px-2 py-1 rounded-md text-sm ${
                      filterRating === rating
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {rating === null ? 'All' : `${rating} ★`}
                  </button>
                ))}
              </div>
            </div>

            {services.length > 0 && (
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <span className="text-sm font-medium text-gray-700">Service:</span>
                <select
                  value={filterService}
                  onChange={handleFilterServiceChange}
                  className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent"
                >
                  <option value="">All Services</option>
                  {services.map((service) => (
                    <option key={service.name} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent"
              />
            </div>
          </div>
        </div>



        {/* Reviews List */}
        {loading ? (
          <LoadingSpinner
            message="Loading reviews..."
            className="py-12"
          />
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Error loading reviews: {error}</p>
                <p className="text-red-600 mt-2">
                  This could be due to a database connection issue or missing tables.
                  Please try refreshing the page or contact support if the problem persists.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <StarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No reviews found</h3>
            <p className="text-gray-500">
              {searchTerm || filterRating !== null || filterService
                ? 'No reviews match your filters. Try adjusting your search criteria.'
                : 'You haven\'t received any reviews yet. Reviews will appear here when customers rate their experience.'}
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left max-w-lg mx-auto">
              <h4 className="text-sm font-medium text-blue-800 mb-2">How do customers leave reviews?</h4>
              <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
                <li>Customers can leave reviews after completing a booking</li>
                <li>They&apos;ll see a review prompt in their booking details</li>
                <li>Reviews help build trust with potential customers</li>
                <li>Higher ratings can improve your visibility in search results</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                  <div>
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2 overflow-hidden">
                        <span className="text-gray-500 text-sm font-medium">
                          {review.user_name ? review.user_name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 mr-2">{review.user_name || 'Anonymous User'}</h3>
                      <StarRating rating={review.rating} size="small" />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(review.created_at)}</p>
                  </div>
                  <div className="mt-2 md:mt-0 flex items-center">
                    {review.service_name && (
                      <span className="text-sm text-gray-600 mr-4">
                        Service: <span className="font-medium">{review.service_name}</span>
                      </span>
                    )}
                  </div>
                </div>
                {review.comment && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                )}
                {review.booking_id && (
                  <div className="mt-3 text-sm">
                    <a
                      href={`/cremation/bookings/${review.booking_id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View Booking #{review.booking_id}
                    </a>
                    {review.booking_date && (
                      <span className="text-gray-500 ml-2">
                        ({formatDate(review.booking_date)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(ReviewsPage);
