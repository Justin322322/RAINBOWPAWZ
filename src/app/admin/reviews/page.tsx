'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import {
  StarIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import withAdminAuth from '@/components/withAdminAuth';
import { useToast } from '@/context/ToastContext';
import StarRating from '@/components/ui/StarRating';
import { Modal } from '@/components/ui/Modal';
import { SectionLoader } from '@/components/ui/SectionLoader';

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
  report_reason?: string;
  report_status?: 'none' | 'pending' | 'reviewed' | 'dismissed';
  reported_by?: number;
  reported_at?: string;
  images?: string[];
}

interface BookingDetails {
  id: number;
  pet_name: string;
  pet_type: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  price: number;
  payment_method: string;
  payment_status: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
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
  const [userName, _setUserName] = useState('Admin');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportReview, setSelectedReportReview] = useState<Review | null>(null);

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
          // API message logged for debugging
        }
      } catch (error) {
        // Set error state
        const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching reviews';
        setError(errorMessage);

        // Only show toast once to prevent loops
        if (!isErrorShown) {
          isErrorShown = true;
          // Error logged for debugging
          // Don't show toast to prevent potential re-render loops
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

  const handleReportBadgeClick = (review: Review) => {
    setSelectedReportReview(review);
    setIsReportModalOpen(true);
  };

  const handleDismissReport = async () => {
    if (!selectedReportReview) return;

    try {
      const response = await fetch(`/api/admin/reviews/${selectedReportReview.id}/dismiss-report`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to dismiss report');
      }

      // Update the review in the state
      setReviews(reviews.map(review => 
        review.id === selectedReportReview.id 
          ? { ...review, report_status: 'dismissed' as const }
          : review
      ));
      showToast('Report dismissed successfully', 'success');
      setIsReportModalOpen(false);
    } catch (error) {
      showToast('Error dismissing report: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
    }
  };

  const handleBookingClick = async (bookingId: number) => {
    setSelectedBookingId(bookingId);
    setIsBookingModalOpen(true);
    setLoadingBooking(true);
    setBookingDetails(null);

    try {
      const response = await fetch(`/api/cremation/bookings/${bookingId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch booking details`);
      }
      const data = await response.json();
      setBookingDetails(data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to load booking details',
        'error'
      );
      // Close modal on error
      setIsBookingModalOpen(false);
    } finally {
      setLoadingBooking(false);
    }
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
    } catch {
      return dateString;
    }
  };

  return (
    <AdminDashboardLayout activePage="reviews" userName={userName}>
      <div className="space-y-6">
        {/* Header section */}
        <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Customer Reviews</h1>
              <p className="text-gray-600 mt-1">
                {filteredReviews.length} {filteredReviews.length === 1 ? 'review' : 'reviews'} found
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] transition-colors flex items-center justify-center"
              disabled={loading}
            >
              <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full mb-6">
          <div className="relative flex-grow sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
            />
          </div>

          <div className="relative flex-grow sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={filterProvider}
              onChange={handleFilterProviderChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
            >
              <option value="">All Providers</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.name}>
                  {provider.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Rating Filter */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <StarIcon className="h-5 w-5 text-yellow-400" />
            <span className="text-sm font-medium text-gray-700">Filter by rating:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[null, 5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating === null ? 'all' : rating}
                onClick={() => handleFilterRatingChange(rating)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filterRating === rating
                    ? 'bg-[var(--primary-green)] text-white font-medium'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rating === null ? 'All Ratings' : `${rating} ★`}
              </button>
            ))}
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <SectionLoader
            message="Loading reviews..."
            minHeight="min-h-[300px]"
            withBackground={true}
            withShadow={true}
            rounded={true}
          />
        ) : error ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="px-6 py-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
                <XCircleIcon className="h-6 w-6" />
              </div>
              <p className="text-red-600 font-medium text-center mb-2">Error loading reviews</p>
              <p className="text-gray-500 text-sm text-center mb-4">{error}</p>
              <p className="text-gray-500 text-sm text-center mb-4">
                This could be due to a database connection issue or missing tables.
                Please try refreshing the page or contact support if the problem persists.
              </p>
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 text-center">
            <div className="w-48 h-48 mx-auto mb-6 flex items-center justify-center">
              <Image
                src="/no-reviews.png"
                alt="No reviews found"
                width={192}
                height={192}
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-gray-500 text-sm">
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
                className="bg-white rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200 p-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium text-gray-900 mr-2">{review.user_name}</h3>
                      <StarRating rating={review.rating} size="small" />
                      {review.report_status === 'pending' && (
                        <button
                          onClick={() => handleReportBadgeClick(review)}
                          className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                          title="View report"
                        >
                          <FlagIcon className="h-3 w-3 mr-1" />
                          Reported
                        </button>
                      )}
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
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{review.comment}</p>
                  </div>
                )}
                {review.images && review.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {review.images.map((imageUrl, index) => (
                      <div key={index} className="relative w-full h-24">
                        <Image
                          src={imageUrl}
                          alt={`Review image ${index + 1}`}
                          fill
                          className="object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(imageUrl, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 text-sm">
                  <button
                    onClick={() => handleBookingClick(review.booking_id)}
                    className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] hover:underline"
                  >
                    View Booking #{review.booking_id}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={`Booking Details #${selectedBookingId}`}
        size="medium"
      >
        <div className="p-6">
          {loadingBooking ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-green)]"></div>
              <span className="ml-3 text-gray-600">Loading booking details...</span>
            </div>
          ) : bookingDetails ? (
            <div className="space-y-6">
              {/* Pet Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Pet Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Pet Name</p>
                    <p className="text-gray-900">{bookingDetails.pet_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Pet Type</p>
                    <p className="text-gray-900">{bookingDetails.pet_type}</p>
                  </div>
                </div>
              </div>

              {/* Service Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Service Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Service</p>
                    <p className="text-gray-900">{bookingDetails.service_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      bookingDetails.status === 'completed' ? 'bg-green-100 text-green-800' :
                      bookingDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      bookingDetails.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {bookingDetails.status.charAt(0).toUpperCase() + bookingDetails.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Booking Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Booking Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Date</p>
                    <p className="text-gray-900">{format(new Date(bookingDetails.booking_date), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Time</p>
                    <p className="text-gray-900">{bookingDetails.booking_time}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Price</p>
                    <p className="text-gray-900">₱{bookingDetails.price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Payment</p>
                    <p className="text-gray-900">{bookingDetails.payment_method} - {bookingDetails.payment_status}</p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <p className="text-gray-900">{bookingDetails.first_name} {bookingDetails.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-gray-900">{bookingDetails.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone</p>
                    <p className="text-gray-900">{bookingDetails.phone}</p>
                  </div>
                </div>
              </div>

              {/* Special Notes */}
              {bookingDetails.notes && bookingDetails.notes !== 'No special notes' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Special Notes</h3>
                  <p className="text-gray-700">{bookingDetails.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Failed to load booking details.</p>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
            <button
              onClick={() => setIsBookingModalOpen(false)}
              className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Review"
        size="small"
      >
        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600">
              <ExclamationTriangleIcon className="h-6 w-6" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Confirm Deletion</h3>
          <p className="mb-6 text-gray-600 text-center">
            Are you sure you want to delete this review? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
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

      {/* Report Review Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Reported Review"
        size="medium"
      >
        <div className="p-6">
          {selectedReportReview && (
            <>
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600">
                    <FlagIcon className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Review Report Details</h3>
              </div>

              {/* Review Information */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Review Content</h4>
                <div className="flex items-center mb-2">
                  <span className="text-sm text-gray-600 mr-2">By:</span>
                  <span className="font-medium">{selectedReportReview.user_name}</span>
                  <span className="ml-2">
                    <StarRating rating={selectedReportReview.rating} size="small" />
                  </span>
                </div>
                {selectedReportReview.comment && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 italic">&quot;{selectedReportReview.comment}&quot;</p>
                  </div>
                )}
              </div>

              {/* Report Reason */}
              <div className="bg-red-50 p-4 rounded-lg mb-6">
                <h4 className="text-sm font-medium text-red-800 mb-2">Report Reason</h4>
                <p className="text-sm text-red-700">{selectedReportReview.report_reason}</p>
                {selectedReportReview.reported_at && (
                  <p className="text-xs text-red-600 mt-2">
                    Reported on {formatDate(selectedReportReview.reported_at)}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleDismissReport}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Dismiss Report
                </button>
                <button
                  onClick={() => {
                    setIsReportModalOpen(false);
                    handleDeleteClick(selectedReportReview);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  Delete Review
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </AdminDashboardLayout>
  );
}

export default withAdminAuth(AdminReviewsPage);
