'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  StarIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/navigation/AdminLayout';
import withAdminAuth from '@/components/withAdminAuth';
import { useToast } from '@/context/ToastContext';
import StarRating from '@/components/ui/StarRating';
import Modal from '@/components/Modal';

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
}

function AdminReviewsPage() {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterProvider, setFilterProvider] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [providers, setProviders] = useState<{id: number, name: string}[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<Review | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Flag to prevent multiple error toasts
    let isErrorShown = false;

    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/reviews');

        const data = await response.json();

        // Check if we have an error message from the API
        if (data.error) {
          throw new Error(data.error);
        }

        // Set reviews from the response (will be empty array if none found)
        setReviews(data.reviews || []);

        // Only try to extract providers if we have reviews with provider_name
        if (data.reviews && data.reviews.length > 0 && data.reviews[0].provider_name) {
          // Extract unique providers for filtering
          const uniqueProviders = Array.from(
            new Set(data.reviews.map((review: Review) => review.provider_name))
          ).map(name => {
            const provider = data.reviews.find((r: Review) => r.provider_name === name);
            return {
              id: provider?.service_provider_id || 0,
              name: name as string
            };
          });

          setProviders(uniqueProviders);
        } else {
          // Set empty providers array if no reviews or no provider names
          setProviders([]);
        }

        // Show message if API returned one
        if (data.message) {
          console.log('API message:', data.message);
        }
      } catch (error) {
        // Set error state
        const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching reviews';
        setError(errorMessage);

        // Only show toast once to prevent loops
        if (!isErrorShown) {
          isErrorShown = true;
          console.error('Error fetching reviews:', error);
          // Don't show toast to prevent potential re-render loops
          // showToast('Error loading reviews: ' + errorMessage, 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();

    // Cleanup function
    return () => {
      isErrorShown = true; // Prevent showing errors if component unmounts
    };
  }, []);

  const filteredReviews = reviews.filter((review) => {
    // Filter by rating if a filter is selected
    if (filterRating !== null && review.rating !== filterRating) {
      return false;
    }

    // Filter by provider if selected
    if (filterProvider && review.provider_name !== filterProvider) {
      return false;
    }

    // Filter by search term if provided
    if (searchTerm && !(
      review.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.provider_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )) {
      return false;
    }

    return true;
  });

  const handleFilterRatingChange = (rating: number | null) => {
    setFilterRating(rating);
  };

  const handleFilterProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterProvider(e.target.value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleDeleteClick = (review: Review) => {
    setReviewToDelete(review);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/admin/reviews/${reviewToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete review');
      }

      // Remove the deleted review from the state
      setReviews(reviews.filter(review => review.id !== reviewToDelete.id));
      showToast('Review deleted successfully', 'success');
      setIsDeleteModalOpen(false);
    } catch (error) {
      showToast('Error deleting review: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <AdminLayout activePage="reviews">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Customer Reviews</h1>
          <div className="mt-4 md:mt-0 flex items-center">
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

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <span className="text-sm font-medium text-gray-700">Provider:</span>
              <select
                value={filterProvider}
                onChange={handleFilterProviderChange}
                className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent"
              >
                <option value="">All Providers</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.name}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>

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
          <div className="flex justify-center items-center py-12">
            <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
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
              {searchTerm || filterRating !== null || filterProvider
                ? 'No reviews match your filters. Try adjusting your search criteria.'
                : 'There are no reviews in the system yet.'}
            </p>
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
                      <h3 className="font-medium text-gray-900 mr-2">{review.user_name}</h3>
                      <StarRating rating={review.rating} size="small" />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(review.created_at)}</p>
                  </div>
                  <div className="mt-2 md:mt-0 flex items-center">
                    <span className="text-sm text-gray-600 mr-4">
                      Provider: <span className="font-medium">{review.provider_name}</span>
                    </span>
                    <button
                      onClick={() => handleDeleteClick(review)}
                      className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                      title="Delete review"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {review.comment && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                )}
                <div className="mt-3 text-sm">
                  <a
                    href={`/admin/bookings/${review.booking_id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View Booking #{review.booking_id}
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Review"
        size="small"
      >
        <div className="p-4">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
          </div>
          <p className="mb-4 text-gray-600">
            Are you sure you want to delete this review? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <ArrowPathIcon className="animate-spin h-4 w-4 mr-1 inline-block" />
                  Deleting...
                </>
              ) : (
                'Delete Review'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}

export default withAdminAuth(AdminReviewsPage);
