'use client';

import React, { useState, useEffect, useRef } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  BuildingStorefrontIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { getAuthToken } from '@/utils/auth';

import { LoadingSpinner } from '@/app/admin/services/client';

// Define the type for cremation center data
interface CremationCenter {
  id: number | string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  address: string;
  registrationDate: string;
  status: string;
  activeServices: number;
  totalBookings: number;
  revenue: string;
  rating?: number;
  description: string;
  verified: boolean;
  application_status: string; // Using application_status from the database
  verification_status?: string; // Optional for backward compatibility
  city?: string;
  province?: string;
  profile_picture?: string | null; // Add profile picture field
}

export default function AdminCremationCentersPage() {
  const [userName] = useState('System Administrator');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<CremationCenter | null>(null);
  const [cremationCenters, setCremationCenters] = useState<CremationCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestrictSuccess, setIsRestrictSuccess] = useState(false);
  const [isRestoreSuccess, setIsRestoreSuccess] = useState(false);
  const [successCenterName, setSuccessCenterName] = useState('');
  const [showRestrictModal, setShowRestrictModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const [centerToAction, setCenterToAction] = useState<CremationCenter | null>(null);

  const { showToast } = useToast();



  // Fetch cremation centers from the API
  useEffect(() => {
    const fetchCremationCenters = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get auth token for the request
        const authToken = getAuthToken();
        const headers: Record<string, string> = {
          'X-Requested-With': 'fetch',
          'X-Client-Time': new Date().toISOString()
        };

        // Add authorization header if token exists
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch('/api/admin/cremation-businesses', {
          // Add cache: 'no-store' to prevent caching
          cache: 'no-store',
          headers
        });


        if (!response.ok) {
          // Try to get the error message from the response
          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorDetails = errorData.details || errorData.error || '';
          } catch (parseError) {
          }

          throw new Error(`Failed to fetch cremation centers: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch cremation centers');
        }

        // Log the data we received for debugging

        // Add default rating and update active services count
        const centersWithRating = data.businesses.map((center: any) => {
          // Fetch active services count from service_packages table
          const fetchServicesCount = async (centerId: string | number) => {
            try {
              // Get auth token for the services request
              const authToken = getAuthToken();
              const serviceHeaders: Record<string, string> = {};

              // Add authorization header if token exists
              if (authToken) {
                serviceHeaders['Authorization'] = `Bearer ${authToken}`;
              }

              const serviceResponse = await fetch(`/api/admin/services?providerId=${centerId}`, {
                headers: serviceHeaders
              });
              if (serviceResponse.ok) {
                const serviceData = await serviceResponse.json();
                if (serviceData.success && serviceData.services) {
                  return serviceData.services.filter((s: any) => s.is_active).length;
                }
              }
              return center.activeServices || 0;
            } catch (error) {
              return center.activeServices || 0;
            }
          };

          // Execute the fetch and update centers
          fetchServicesCount(center.id).then(count => {
            setCremationCenters(prevCenters =>
              prevCenters.map(c =>
                c.id === center.id ? {...c, activeServices: count} : c
              )
            );
          });

          return {
            ...center,
            rating: center.rating || Math.floor(Math.random() * 3) + 3, // Random rating between 3-5 if not provided
          };
        });

        setCremationCenters(centersWithRating);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');

        // Show toast with error message
        showToast('Failed to load cremation centers: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');

        // Set empty array instead of mock data to ensure we're showing real data
        setCremationCenters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCremationCenters();
  }, [showToast]);

  // Filter cremation centers based on search term and status filter
  const filteredCenters = cremationCenters.filter(center => {
    const matchesSearch =
      center.name?.toLowerCase?.()?.includes(searchTerm.toLowerCase()) ||
      center.owner?.toLowerCase?.()?.includes(searchTerm.toLowerCase()) ||
      String(center.id)?.toLowerCase?.()?.includes(searchTerm.toLowerCase()) ||
      center.address?.toLowerCase?.()?.includes(searchTerm.toLowerCase());

    // Check all possible status fields
    const isRestricted =
      center.application_status === 'restricted' ||
      center.verification_status === 'restricted' ||
      center.status === 'restricted';

    const isVerified =
      center.verified === true ||
      center.application_status === 'approved' ||
      center.application_status === 'verified' ||
      center.verification_status === 'verified';

    // Determine actual status for filtering
    const actualStatus = isRestricted ? 'restricted' :
                        (isVerified ? 'active' :
                         center.application_status || center.status || 'pending');

    const matchesStatus = statusFilter === 'all'
      ? true
      : (actualStatus === statusFilter ||
         center.application_status === statusFilter ||
         center.verification_status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (center: any) => {
    setSelectedCenter(center);
    setShowDetailsModal(true);
  };

  // Function to open the restrict modal
  const openRestrictModal = (center: CremationCenter) => {
    setCenterToAction(center);
    // Close details modal if it's open to avoid modal conflicts
    if (showDetailsModal) {
      setShowDetailsModal(false);
    }
    setShowRestrictModal(true);
  };

  // Function to open the unrestrict modal
  const openUnrestrictModal = (center: CremationCenter) => {
    setCenterToAction(center);
    // Close details modal if it's open to avoid modal conflicts
    if (showDetailsModal) {
      setShowDetailsModal(false);
    }
    setShowRestoreModal(true);
  };





  // Handle restricting a cremation center
  const handleRestrictCenter = async (center: CremationCenter) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      // Get auth token for the request
      const authToken = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if token exists
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch('/api/admin/cremation-businesses/restrict', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          businessId: center.id,
          action: 'restrict'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to restrict cremation center');
      }

      // Update the center's status in the local state to ensure it shows as restricted
      // Set both status and verification_status to 'restricted'
      setCremationCenters(prevCenters =>
        prevCenters.map(c =>
          c.id === center.id ? {
            ...c,
            status: 'restricted',
            verified: false, // Set verified to false to ensure it's not shown as verified
            verification_status: 'restricted' // Add this to match the backend
          } : c
        )
      );

      // If the center is currently selected in the modal, update it
      if (selectedCenter && selectedCenter.id === center.id) {
        setSelectedCenter({
          ...selectedCenter,
          status: 'restricted',
          verified: false,
          verification_status: 'restricted'
        });
      }

      // Force a refresh of the UI to ensure the status is updated
      setTimeout(() => {
        // This will trigger a re-render
        setCremationCenters(prevCenters => [...prevCenters]);
      }, 100);

      // Set success state to trigger animation
      setSuccessCenterName(center.name);
      setIsRestrictSuccess(true);

      // Show success toast
      showToast(`${center.name} has been restricted successfully`, 'success', 5000);

      // Reset success state after animation completes
      setTimeout(() => {
        setIsRestrictSuccess(false);
        setSuccessCenterName('');
      }, 3000);

      // Close the modal
      setShowRestrictModal(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to restrict cremation center', 'error');
    } finally {
      setIsProcessing(false);
    }
  };



  // Handle unrestricting a cremation center
  const handleUnrestrictCenter = async (center: CremationCenter) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      // Get auth token for the request
      const authToken = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if token exists
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Try the cremation-businesses/restrict endpoint first with 'restore' action
      try {
        const response = await fetch('/api/admin/cremation-businesses/restrict', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            businessId: center.id,
            action: 'restore'
          }),
        });


        // Try to parse the response as JSON
        let data;
        try {
          data = await response.json();

          // Check if the response was successful
          if (response.ok && data.success) {
            // Successfully unrestricted using the primary endpoint
            handleSuccessfulUnrestrict(center);
            return;
          }
        } catch (jsonError) {
          // Continue to fallback if JSON parsing fails
        }

        // If we get here, the primary endpoint failed, so we'll try the fallback
      } catch (primaryError) {
        // Continue to fallback endpoint
      }

      // Try the dedicated unrestrict endpoint as fallback
      const fallbackResponse = await fetch('/api/admin/users/unrestrict', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: center.id,
          userType: 'cremation_center',
          businessId: center.id
        }),
      });


      // Try to parse the fallback response
      let fallbackData;
      try {
        fallbackData = await fallbackResponse.json();
      } catch (jsonError) {
        throw new Error('Both unrestrict endpoints failed - unable to parse response data');
      }

      // Check if the fallback was successful
      if (!fallbackResponse.ok) {
        throw new Error(`Server error on fallback endpoint: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
      }

      if (!fallbackData.success) {
        throw new Error(fallbackData.error || fallbackData.details || 'Failed to restore cremation center with fallback endpoint');
      }

      // Successfully unrestricted using fallback endpoint
      handleSuccessfulUnrestrict(center);

    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to restore cremation center', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to handle successful unrestrict/restore
  const handleSuccessfulUnrestrict = (center: CremationCenter) => {
    // Update the center's status in the local state to ensure it shows as active
    setCremationCenters(prevCenters =>
      prevCenters.map(c =>
        c.id === center.id ? {
          ...c,
          status: 'active',
          verified: true,
          verification_status: 'verified',
          application_status: 'approved' // Also update application_status for consistency
        } : c
      )
    );

    // If the center is currently selected in the modal, update it
    if (selectedCenter && selectedCenter.id === center.id) {
      setSelectedCenter({
        ...selectedCenter,
        status: 'active',
        verified: true,
        verification_status: 'verified',
        application_status: 'approved'
      });
    }

    // Force a refresh of the UI to ensure the status is updated
    setTimeout(() => {
      // This will trigger a re-render
      setCremationCenters(prevCenters => [...prevCenters]);
    }, 100);

    // Set success state to trigger animation
    setSuccessCenterName(center.name);
    setIsRestoreSuccess(true);

    // Show success toast
    showToast(`${center.name} has been restored successfully`, 'success', 5000);

    // Reset success state after animation completes
    setTimeout(() => {
      setIsRestoreSuccess(false);
      setSuccessCenterName('');
    }, 3000);

    // Close the modal
    setShowRestoreModal(false);
  };
  // Helper function to get status badge based on status
  const getStatusBadge = (status: string, verified: boolean, centerObj?: CremationCenter) => {
    // Use application_status as the primary source of truth
    const appStatus = centerObj?.application_status || status;

    // Use same styling as in applications page
    switch(appStatus) {
      case 'pending':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'approved':
      case 'active':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Active
          </span>
        );
      case 'declined':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Declined
          </span>
        );
      case 'restricted':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
            Restricted
          </span>
        );
      case 'inactive':
        return (
          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            Inactive
          </span>
        );
      default:
        // Fallback to verification_status if application_status is not recognized
        if (centerObj?.verification_status === 'verified' || verified) {
          return (
            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              Active
            </span>
          );
        } else if (centerObj?.verification_status === 'restricted') {
          return (
            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
              Restricted
            </span>
          );
        } else {
          return (
            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Pending
            </span>
          );
        }
    }
  };

  return (
    <AdminDashboardLayout activePage="cremation" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Cremation Centers</h1>
            <p className="text-gray-600 mt-1">Manage cremation service provider accounts</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search cremation centers..."
              />
            </div>
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="verified">Verified</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="documents_required">Documents Required</option>
                <option value="declined">Declined</option>
                <option value="restricted">Restricted</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Animation Overlays */}
      <AnimatePresence>
        {isRestrictSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-xl p-8 max-w-md w-full text-center"
            >
              <motion.div
                className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                <XCircleIcon className="h-12 w-12 text-red-500" />
              </motion.div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-600 mb-6">
                {successCenterName} has been restricted successfully. They will no longer be able to accept new bookings.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <motion.div
                  className="bg-red-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5 }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {isRestoreSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-xl p-8 max-w-md w-full text-center"
            >
              <motion.div
                className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6"
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircleIcon className="h-12 w-12 text-green-500" />
              </motion.div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Access Unrestricted</h3>
              <p className="text-gray-600 mb-6">
                {successCenterName} has been unrestricted successfully. They can now accept new bookings.
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <motion.div
                  className="bg-green-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5 }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-800">Cremation Center Accounts</h2>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading cremation centers..." className="px-6" />
        ) : error ? (
          <div className="px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
              <XMarkIcon className="h-6 w-6" />
            </div>
            <p className="text-red-600 font-medium mb-2">Error loading cremation centers</p>
            <p className="text-gray-500 text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                // Trigger a re-fetch without page reload
                const fetchCremationCenters = async () => {
                  try {
                    // Get auth token for the retry request
                    const authToken = getAuthToken();
                    const retryHeaders: Record<string, string> = {
                      'X-Requested-With': 'fetch-retry',
                      'X-Client-Time': new Date().toISOString()
                    };

                    // Add authorization header if token exists
                    if (authToken) {
                      retryHeaders['Authorization'] = `Bearer ${authToken}`;
                    }

                    const response = await fetch('/api/admin/cremation-businesses', {
                      // Add cache: 'no-store' to prevent caching
                      cache: 'no-store',
                      headers: retryHeaders
                    });


                    if (!response.ok) {
                      // Try to get the error message from the response
                      let errorDetails = '';
                      try {
                        const errorData = await response.json();
                        errorDetails = errorData.details || errorData.error || '';
                      } catch (parseError) {
                      }

                      throw new Error(`Failed to fetch cremation centers: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
                    }

                    const data = await response.json();

                    if (!data.success) {
                      throw new Error(data.error || 'Failed to fetch cremation centers');
                    }

                    const centersWithRating = data.businesses.map((center: any) => ({
                      ...center,
                      rating: center.rating || Math.floor(Math.random() * 3) + 3,
                    }));
                    setCremationCenters(centersWithRating);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'An unknown error occurred');

                    // Don't show toast for development mode to reduce notification spam
                    if (process.env.NODE_ENV !== 'development') {
                      showToast('Failed to load cremation centers', 'error');
                    }
                  } finally {
                    setLoading(false);
                  }
                };
                fetchCremationCenters();
              }}
              className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Center Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCenters.map((center) => (
                  <tr key={center.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center overflow-hidden">
                          {center.profile_picture ? (
                            <img
                              src={center.profile_picture.startsWith('/') ? center.profile_picture : `/uploads/profile-pictures/${center.id}/${center.profile_picture}`}
                              alt={`${center.name} profile`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                // Fallback to building icon if image fails to load
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent && !parent.querySelector('.fallback-icon')) {
                                  const icon = document.createElement('div');
                                  icon.className = 'fallback-icon';
                                  icon.innerHTML = '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                                  parent.appendChild(icon);
                                }
                              }}
                            />
                          ) : (
                            <BuildingStorefrontIcon className="h-6 w-6" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{center.name}</div>
                          <div className="text-sm text-gray-500">ID: {center.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{center.owner}</div>
                      <div className="text-sm text-gray-500">{center.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{center.address}</div>
                      <div className="text-sm text-gray-500">{center.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{center.activeServices} services</div>
                      <div className="text-sm text-gray-500">{center.totalBookings} bookings</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(center.status, center.verified, center)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-4">
                        <button
                          onClick={() => handleViewDetails(center)}
                          className="text-[var(--primary-green)] hover:text-[var(--primary-green)] hover:underline"
                        >
                          View
                        </button>



                        {/* Restrict/Unrestrict Button */}
                        {center.application_status !== 'restricted' &&
                          center.verification_status !== 'restricted' &&
                          center.status !== 'restricted' ? (
                          <button
                            onClick={() => openRestrictModal(center)}
                            disabled={isProcessing}
                            className="text-red-600 hover:text-red-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? 'Processing...' : 'Restrict'}
                          </button>
                        ) : (
                          <button
                            onClick={() => openUnrestrictModal(center)}
                            disabled={isProcessing}
                            className="text-green-600 hover:text-green-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isProcessing ? 'Processing...' : 'Unrestrict'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCenters.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500 text-sm">No cremation centers match your search criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restrict Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRestrictModal}
        onClose={() => setShowRestrictModal(false)}
        onConfirm={() => centerToAction ? handleRestrictCenter(centerToAction) : Promise.resolve()}
        title="Restrict Cremation Center"
        message={`Are you sure you want to restrict "${centerToAction?.name}"? This will prevent them from accepting new bookings.`}
        confirmText="Restrict Access"
        variant="danger"
        icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600" />}
      />

      {/* Unrestrict Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={() => centerToAction ? handleUnrestrictCenter(centerToAction) : Promise.resolve()}
        title="Unrestrict Cremation Center"
        message={`Are you sure you want to unrestrict "${centerToAction?.name}"? This will allow them to accept new bookings again.`}
        confirmText="Unrestrict Access"
        variant="success"
        icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
      />



      {/* Center Details Modal */}
      {showDetailsModal && selectedCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Cremation Center Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-col space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-16 w-16 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center mr-4 overflow-hidden">
                      {selectedCenter.profile_picture ? (
                        <img
                          src={selectedCenter.profile_picture.startsWith('/') ? selectedCenter.profile_picture : `/uploads/profile-pictures/${selectedCenter.id}/${selectedCenter.profile_picture}`}
                          alt={`${selectedCenter.name} profile`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Fallback to building icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent && !parent.querySelector('.fallback-icon')) {
                              const icon = document.createElement('div');
                              icon.className = 'fallback-icon';
                              icon.innerHTML = '<svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                              parent.appendChild(icon);
                            }
                          }}
                        />
                      ) : (
                        <BuildingStorefrontIcon className="h-10 w-10" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900">{selectedCenter.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-gray-600">ID: {selectedCenter.id}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          <span className="text-gray-600 mr-1">No ratings yet</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center">
                          {selectedCenter.verification_status === 'verified' || selectedCenter.application_status === 'approved' ? (
                            <span className="flex items-center text-green-600 text-sm">
                              <ShieldCheckIcon className="h-4 w-4 mr-1" />
                              Verified
                            </span>
                          ) : selectedCenter.verification_status === 'restricted' ? (
                            <span className="flex items-center text-orange-600 text-sm">
                              <ShieldExclamationIcon className="h-4 w-4 mr-1" />
                              Restricted
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(selectedCenter.status, selectedCenter.verified, selectedCenter)}
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{selectedCenter.description || 'No description provided.'}</p>
                </div>

                {/* Contact Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Owner Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex items-start">
                        <UserCircleIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Owner Name</p>
                          <p className="text-gray-900">{selectedCenter.owner}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <EnvelopeIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Email</p>
                          <p className="text-gray-900">{selectedCenter.email}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <PhoneIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Phone</p>
                          <p className="text-gray-900">{selectedCenter.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Business Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex items-start">
                        <MapPinIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Address</p>
                          <p className="text-gray-900">{selectedCenter.address}</p>
                          {(selectedCenter.city || selectedCenter.province) && (
                            <p className="text-gray-600 text-sm">
                              {[selectedCenter.city, selectedCenter.province].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Registration Date</p>
                          <p className="text-gray-900">{selectedCenter.registrationDate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Stats */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Business Performance</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Active Services</p>
                      <p className="text-2xl font-semibold text-[var(--primary-green)]">{selectedCenter.activeServices}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Total Bookings</p>
                      <p className="text-2xl font-semibold text-[var(--primary-green)]">{selectedCenter.totalBookings}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Total Revenue</p>
                      <p className="text-2xl font-semibold text-[var(--primary-green)]">{selectedCenter.revenue}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-8 border-t pt-6">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {selectedCenter.status === 'restricted' ? (
                    <button
                      onClick={() => openUnrestrictModal(selectedCenter)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Restore Access'}
                    </button>
                  ) : (
                    <button
                      onClick={() => openRestrictModal(selectedCenter)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Restrict Access'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardLayout>
  );
}