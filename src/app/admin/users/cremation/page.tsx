'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import Image from 'next/image';
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
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
  import { MetricGrid } from '@/components/ui/MetricGrid';
import {
  ProfileCard,
  ProfileSection,
  ProfileField,

  ProfileFormGroup
} from '@/components/ui/ProfileLayout';
import { ProfileButton } from '@/components/ui/ProfileFormComponents';
import { getProfilePictureUrl } from '@/utils/imageUtils';
import DocumentThumbnailGrid from '@/components/admin/DocumentThumbnailGrid';

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
  profile_picture?: string;
  appeals?: Appeal[];
  documents?: any[]; // Use any[] for now to avoid interface conflicts
}

interface Appeal {
  appeal_id: number;
  subject: string;
  message: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  admin_response?: string;
  submitted_at: string;
  reviewed_at?: string;
  resolved_at?: string;
}

const RestrictModal = memo(function RestrictModal({
  isOpen,
  onClose,
  centerToAction,
  initialReason,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  centerToAction: { name?: string } | null;
  initialReason: string;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState(initialReason);

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason || '');
    }
  }, [isOpen, initialReason]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Restrict Cremation Center"
      size="medium"
      variant="danger"
    >
      <div className="flex items-start mb-4">
        <div className="mr-3 flex-shrink-0">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
        </div>
        <div className="text-sm text-gray-600 flex-1">
          <p className="mb-4">Are you sure you want to restrict &quot;{centerToAction?.name}&quot;? This will prevent them from accepting new bookings.</p>
          <div>
            <label htmlFor="restrict-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for restriction (optional)
            </label>
            <textarea
              id="restrict-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="shadow-sm focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-2 border-gray-400 rounded-md p-3 bg-white text-gray-900 placeholder-gray-500"
              placeholder="Enter reason for restriction"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse sm:grid sm:grid-cols-2 gap-3">
        <Button
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => onConfirm(reason)}
        >
          Restrict Center
        </Button>
      </div>
    </Modal>
  );
});

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
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [appealResponse, setAppealResponse] = useState('');
  const [restrictReason, setRestrictReason] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [centerImageErrors, setCenterImageErrors] = useState<Set<string | number>>(new Set());

  const { showToast } = useToast();

  // Helper function to handle image load errors for center list items
  const handleCenterImageError = (centerId: string | number) => {
    setCenterImageErrors(prev => new Set(prev).add(centerId));
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch cremation centers from the API
  useEffect(() => {
    let isMounted = true; // Track if component is still mounted

    const fetchCremationCenters = async () => {
      try {
        // Don't make API calls if component is unmounted (e.g., during logout)
        if (!isMounted) return;

        setLoading(true);
        setError(null);

        const response = await fetch('/api/admin/cremation-businesses', {
          // Add cache: 'no-store' to prevent caching
          cache: 'no-store',
          // Add headers for debugging
          headers: {
            'X-Requested-With': 'fetch',
            'X-Client-Time': new Date().toISOString()
          }
        });

        // Check if component is still mounted before processing response
        if (!isMounted) return;

        if (!response.ok) {
          // Handle 401 Unauthorized specifically (likely due to logout)
          if (response.status === 401) {
            // Don't show error for 401 during logout - just return silently
            return;
          }

          // Try to get the error message from the response
          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorDetails = errorData.details || errorData.error || '';
          } catch {
          }

          throw new Error(`Failed to fetch cremation centers: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch cremation centers');
        }

        // Log the data we received for debugging
        console.log('Cremation centers data:', data.businesses);

        // Check for appeals in the data
        data.businesses.forEach((center: any) => {
          if (center.appeals && center.appeals.length > 0) {
            console.log(`Center ${center.name} has ${center.appeals.length} appeals:`, center.appeals);
            const pendingAppeals = center.appeals.filter((appeal: any) => appeal.status === 'pending');
            if (pendingAppeals.length > 0) {
              console.log(`Center ${center.name} has ${pendingAppeals.length} pending appeals`);
            }
          }
        });

        // Add default rating and update active services count
        const centersWithRating = data.businesses.map((center: any) => {
          // Fetch active services count from service_packages table
          const fetchServicesCount = async (centerId: string | number) => {
            try {
              const serviceResponse = await fetch(`/api/admin/services?providerId=${centerId}`);
              if (serviceResponse.ok) {
                const serviceData = await serviceResponse.json();
                if (serviceData.success && serviceData.services) {
                  return serviceData.services.filter((s: any) => s.is_active).length;
                }
              }
              return center.activeServices || 0;
            } catch {
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

        // Only update state if component is still mounted
        if (isMounted) {
          setCremationCenters(centersWithRating);
        }
      } catch (err) {
        // Only handle errors if component is still mounted
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');

          // Show toast with error message
          showToast('Failed to load cremation centers: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');

          // Set empty array instead of mock data to ensure we're showing real data
          setCremationCenters([]);
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCremationCenters();

    // Cleanup function to prevent state updates after component unmounts
    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // Handle appeal notification from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const _appealId = urlParams.get('appealId');
      const _userId = urlParams.get('userId');
      // This useEffect logic is now handled after handleViewDetails is defined
    }
  }, []);

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

  const loadCenterAppeals = useCallback(async (centerId: number | string) => {
    try {
      // For cremation centers, we need to find the user_id associated with the business
      const response = await fetch(`/api/appeals?business_id=${centerId}`);
      if (response.ok) {
        const data = await response.json();
        return data.appeals || [];
      }
    } catch (error) {
      console.error('Error loading center appeals:', error);
    }
    return [];
  }, []);

  const handleViewDetails = useCallback(async (center: CremationCenter) => {
    // Load center appeals when viewing details
    const appeals = await loadCenterAppeals(center.id);
    setSelectedCenter({ ...center, appeals });
    setImageLoadError(false); // Reset image error state when viewing new center
    setShowDetailsModal(true);
    return appeals;
  }, [loadCenterAppeals]);

  // Move the useEffect here after handleViewDetails is defined
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const appealId = urlParams.get('appeal_id');
    const centerId = urlParams.get('center_id');
    
    if (appealId && centerId && cremationCenters.length > 0) {
      const targetCenter = cremationCenters.find(center => center.id.toString() === centerId);
      
      if (targetCenter) {
        // Load center details and appeals
        handleViewDetails(targetCenter).then((appeals) => {
          // Find the specific appeal from the returned appeals list
          const appeal = appeals?.find((a: Appeal) => a.appeal_id.toString() === appealId);
          if (appeal) {
            setSelectedAppeal(appeal);
            // Close details modal before opening appeal modal to avoid dual stacking
            setShowDetailsModal(false);
            setShowAppealModal(true);
            // Clear URL parameters after opening modal
            window.history.replaceState({}, '', window.location.pathname);
          }
        });
      }
    }
  }, [cremationCenters, handleViewDetails]);

  const handleAppealAction = async (appealId: number, status: string, response?: string) => {
    try {
      setIsProcessing(true);
      const apiResponse = await fetch(`/api/appeals/${appealId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          admin_response: response
        }),
      });

      const data = await apiResponse.json();

      if (apiResponse.ok) {
        showToast(`Appeal ${status} successfully`, 'success');
        setShowAppealModal(false);
        setSelectedAppeal(null);
        setAppealResponse('');

        // Refresh center details if modal is open
        if (selectedCenter) {
          const appeals = await loadCenterAppeals(selectedCenter.id);
          setSelectedCenter({ ...selectedCenter, appeals });
        }
      } else {
        throw new Error(data.error || `Failed to ${status} appeal`);
      }
    } catch (error) {
      console.error(`Error ${status} appeal:`, error);
      showToast(error instanceof Error ? error.message : `Failed to ${status} appeal`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to open the restrict modal
  const openRestrictModal = (center: CremationCenter) => {
    setCenterToAction(center);
    setRestrictReason('');
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

      const response = await fetch('/api/admin/cremation-businesses/restrict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: center.id,
          action: 'restrict',
          reason: restrictReason || 'Restricted by admin'
        }),
      });

      // Handle 401 Unauthorized specifically (likely due to logout)
      if (response.status === 401) {
        // Don't show error for 401 during logout - just return silently
        return;
      }

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

      // Try the cremation-businesses/restrict endpoint first with 'restore' action
      try {
        const response = await fetch('/api/admin/cremation-businesses/restrict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            businessId: center.id,
            action: 'restore'
          }),
        });


        // Handle 401 Unauthorized specifically (likely due to logout)
        if (response.status === 401) {
          // Don't show error for 401 during logout - just return silently
          return;
        }

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
        } catch {
          // Continue to fallback if JSON parsing fails
        }

        // If we get here, the primary endpoint failed, so we'll try the fallback
      } catch {
        // Continue to fallback endpoint
      }

      // Try the dedicated unrestrict endpoint as fallback
      const fallbackResponse = await fetch('/api/admin/users/unrestrict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: center.id,
          userType: 'cremation_center',
          businessId: center.id
        }),
      });


      // Handle 401 Unauthorized specifically for fallback (likely due to logout)
      if (fallbackResponse.status === 401) {
        // Don't show error for 401 during logout - just return silently
        return;
      }

      // Try to parse the fallback response
      let fallbackData;
      try {
        fallbackData = await fallbackResponse.json();
      } catch {
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
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
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
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center"
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
              className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center"
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
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
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
                    const response = await fetch('/api/admin/cremation-businesses', {
                      // Add cache: 'no-store' to prevent caching
                      cache: 'no-store',
                      // Add headers for debugging
                      headers: {
                        'X-Requested-With': 'fetch-retry',
                        'X-Client-Time': new Date().toISOString()
                      }
                    });


                    if (!response.ok) {
                      // Handle 401 Unauthorized specifically (likely due to logout)
                      if (response.status === 401) {
                        // Don't show error for 401 during logout - just return silently
                        return;
                      }

                      // Try to get the error message from the response
                      let errorDetails = '';
                      try {
                        const errorData = await response.json();
                        errorDetails = errorData.details || errorData.error || '';
                      } catch {
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
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              <div className="divide-y divide-gray-200">
                {filteredCenters.map((center) => {
                  const hasPendingAppeal = center.appeals && center.appeals.some(appeal => appeal.status === 'pending');
                  return (
                    <div
                      key={center.id}
                      className={`p-4 hover:bg-gray-50 transition-all duration-300 border border-gray-200 rounded-lg ${
                        hasPendingAppeal
                          ? 'animate-pulse-border'
                          : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center overflow-hidden">
                          {center.profile_picture && !centerImageErrors.has(center.id) ? (
                            <Image
                              src={getProfilePictureUrl(center.profile_picture)}
                              alt={center.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                              onError={() => {
                                handleCenterImageError(center.id);
                              }}
                            />
                          ) : (
                            <BuildingStorefrontIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                  {center.name}
                                </h3>
                                {getStatusBadge(center.status, center.verified, center)}
                                {center.appeals && center.appeals.some(appeal => appeal.status === 'pending') && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    Appeal Pending
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-600 space-y-1">
                                <div className="flex items-center">
                                  <UserCircleIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{center.owner}</span>
                                </div>
                                <div className="flex items-center">
                                  <EnvelopeIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{center.email}</span>
                                </div>
                                <div className="flex items-center">
                                  <PhoneIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{center.phone}</span>
                                </div>
                                <div className="flex items-center">
                                  <MapPinIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{center.address}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                  {center.activeServices} services • {center.totalBookings} bookings
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col space-y-2 ml-3">
                              <button
                                onClick={() => handleViewDetails(center)}
                                className="px-3 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] text-sm font-medium min-w-[70px] text-center transition-colors"
                              >
                                View
                              </button>
                              {center.status === 'active' ? (
                                <button
                                  onClick={() => openRestrictModal(center)}
                                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium min-w-[70px] text-center transition-colors"
                                >
                                  Restrict
                                </button>
                              ) : center.status === 'restricted' ? (
                                <button
                                  onClick={() => openUnrestrictModal(center)}
                                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium min-w-[70px] text-center transition-colors"
                                >
                                  Restore
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Center Details
                    </th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCenters.map((center) => {
                  const hasPendingAppeal = center.appeals && center.appeals.some(appeal => appeal.status === 'pending');
                  // console.log(`Table row - Center ${center.name}: appeals=${center.appeals?.length || 0}, hasPendingAppeal=${hasPendingAppeal}`);
                  return (
                  <tr
                    key={center.id}
                    className={`hover:bg-gray-50 transition-all duration-300 ${
                      hasPendingAppeal
                        ? 'animate-pulse-border'
                        : ''
                    }`}
                  >
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center overflow-hidden">
                            {center.profile_picture && !centerImageErrors.has(center.id) ? (
                              <Image
                                src={getProfilePictureUrl(center.profile_picture)}
                                alt={center.name}
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                                onError={() => {
                                  handleCenterImageError(center.id);
                                }}
                              />
                            ) : (
                              <BuildingStorefrontIcon className="h-6 w-6" />
                            )}
                          </div>
                          <div className="ml-4 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{center.name}</div>
                            <div className="text-sm text-gray-500">ID: {center.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 truncate">{center.owner}</div>
                        <div className="text-sm text-gray-500 truncate">{center.email}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 truncate">{center.address}</div>
                        <div className="text-sm text-gray-500 truncate">{center.phone}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{center.activeServices} services</div>
                        <div className="text-sm text-gray-500">{center.totalBookings} bookings</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(center.status, center.verified, center)}
                          {center.appeals && center.appeals.some(appeal => appeal.status === 'pending') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Appeal
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2 sm:space-x-4">
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
                              <span className="hidden sm:inline">{isProcessing ? 'Processing...' : 'Restrict'}</span>
                              <span className="sm:hidden">Restrict</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openUnrestrictModal(center)}
                              disabled={isProcessing}
                              className="text-green-600 hover:text-green-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="hidden sm:inline">{isProcessing ? 'Processing...' : 'Unrestrict'}</span>
                              <span className="sm:hidden">Restore</span>
                            </button>
                          )}
                        </div>
                      </td>
                  </tr>
                  );
                })}
                </tbody>
              </table>
              {filteredCenters.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500 text-sm">No cremation centers match your search criteria.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Restrict Confirmation Modal */}
      <RestrictModal
        isOpen={showRestrictModal}
        onClose={() => setShowRestrictModal(false)}
        centerToAction={centerToAction}
        initialReason={restrictReason}
        onConfirm={(reason) => { setRestrictReason(reason); centerToAction && handleRestrictCenter(centerToAction); }}
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
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Cremation Center Details"
        size="xlarge"
        className="max-w-6xl mx-4 sm:mx-auto"
        contentClassName="max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-6">
          {/* Overview Header */}
          <ProfileCard>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="h-14 w-14 rounded-full ring-2 ring-[var(--primary-green)] ring-offset-2 overflow-hidden bg-gray-100 flex-shrink-0">
                    {selectedCenter?.profile_picture && !imageLoadError ? (
                      <Image
                        src={getProfilePictureUrl(selectedCenter.profile_picture)}
                        alt={selectedCenter.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        onError={() => {
                          setImageLoadError(true);
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <BuildingStorefrontIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                        {selectedCenter?.name}
                      </h1>
                      {selectedCenter?.verification_status === 'verified' || selectedCenter?.application_status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs">
                          <ShieldCheckIcon className="h-4 w-4" />
                          Verified
                        </span>
                      ) : selectedCenter?.verification_status === 'restricted' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-xs">
                          <ShieldExclamationIcon className="h-4 w-4" />
                          Restricted
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
                      <span className="font-mono bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded">
                        ID: {selectedCenter?.id}
                      </span>
                      {selectedCenter && (
                        <span>
                          {getStatusBadge(selectedCenter.status, selectedCenter.verified, selectedCenter)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {selectedCenter?.email && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700">
                      <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                      <span className="truncate max-w-[180px]">{selectedCenter.email}</span>
                    </span>
                  )}
                  {selectedCenter?.phone && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700">
                      <PhoneIcon className="h-4 w-4 text-gray-500" />
                      <span>{selectedCenter.phone}</span>
                    </span>
                  )}
                  {(selectedCenter?.city || selectedCenter?.province) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700">
                      <MapPinIcon className="h-4 w-4 text-gray-500" />
                      <span className="truncate max-w-[70vw] sm:max-w-[180px]">
                        {[selectedCenter?.city, selectedCenter?.province].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </ProfileCard>

          {/* Description Section */}
          <ProfileSection
            title="Business Description"
            subtitle="Overview of the cremation center's services and facilities"
          >
            <ProfileCard>
              <p className="text-gray-700 leading-relaxed text-base">
                {selectedCenter?.description || (
                  <span className="italic text-gray-500">
                    No description provided for this cremation center.
                  </span>
                )}
              </p>
            </ProfileCard>
          </ProfileSection>

          {/* Business Documents */}
          <ProfileSection
            title="Business Documents"
            subtitle="Verification documents submitted by this cremation center"
          >
            <ProfileCard>
              {selectedCenter?.documents && selectedCenter.documents.length > 0 ? (
                <DocumentThumbnailGrid
                  documents={selectedCenter.documents}
                  onDocumentClick={(documentUrl, _documentType) => {
                    // Open document in new tab for viewing
                    if (documentUrl) {
                      window.open(documentUrl, '_blank');
                    }
                  }}
                />
              ) : (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No documents have been submitted yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Documents will appear here once uploaded by the business owner.</p>
                </div>
              )}
            </ProfileCard>
          </ProfileSection>

          {/* Contact Information */}
          <ProfileSection
            title="Contact Information"
            subtitle="Owner and business contact details"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProfileCard className="border border-gray-200">
                <ProfileFormGroup title="Owner Details" subtitle="Primary contact person">
                  <div className="space-y-4">
                    <ProfileField
                      label="Owner Name"
                      value={selectedCenter?.owner}
                      icon={<UserCircleIcon className="h-5 w-5" />}
                      className="bg-white border border-gray-200"
                      valueClassName="text-gray-800"
                    />
                    <ProfileField
                      label="Email Address"
                      value={selectedCenter?.email}
                      icon={<EnvelopeIcon className="h-5 w-5" />}
                      className="bg-white border border-gray-200"
                      valueClassName="text-gray-800"
                    />
                    <ProfileField
                      label="Phone Number"
                      value={selectedCenter?.phone}
                      icon={<PhoneIcon className="h-5 w-5" />}
                      className="bg-white border border-gray-200"
                      valueClassName="text-gray-800"
                    />
                  </div>
                </ProfileFormGroup>
              </ProfileCard>

              <ProfileCard className="border border-gray-200">
                <ProfileFormGroup title="Business Details" subtitle="Location and registration information">
                  <div className="space-y-4">
                    <ProfileField
                      label="Business Address"
                      value={
                        <div>
                          <div className="break-words">{selectedCenter?.address}</div>
                          {(selectedCenter?.city || selectedCenter?.province) && (
                            <div className="text-sm text-gray-600 mt-1">
                              {[selectedCenter?.city, selectedCenter?.province].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      }
                      icon={<MapPinIcon className="h-5 w-5" />}
                      className="bg-white border border-gray-200"
                      valueClassName="text-gray-800"
                    />
                    <ProfileField
                      label="Registration Date"
                      value={selectedCenter?.registrationDate}
                      icon={<CalendarIcon className="h-5 w-5" />}
                      className="bg-white border border-gray-200"
                      valueClassName="text-gray-800"
                    />
                  </div>
                </ProfileFormGroup>
              </ProfileCard>
            </div>
          </ProfileSection>

          {/* Business Performance */}
          <ProfileSection
            title="Business Performance"
            subtitle="Key metrics and statistics for this cremation center"
          >
            <MetricGrid
              cols={3}
              metrics={[
                {
                  id: 'active-services',
                  label: 'Active Services',
                  value: selectedCenter?.activeServices ?? 0,
                  icon: <ChartBarIcon className="h-5 w-5" />,
                },
                {
                  id: 'total-bookings',
                  label: 'Total Bookings',
                  value: selectedCenter?.totalBookings ?? 0,
                  icon: <CalendarIcon className="h-5 w-5" />,
                },
                {
                  id: 'total-revenue',
                  label: 'Total Revenue',
                  value: selectedCenter?.revenue ?? '₱0.00',
                  icon: <CurrencyDollarIcon className="h-5 w-5" />,
                },
              ]}
            />
          </ProfileSection>

          {/* Appeals Section */}
          {selectedCenter?.appeals && selectedCenter.appeals.length > 0 && (
            <ProfileSection
              title="Business Appeals"
              subtitle="Appeals submitted by this cremation center"
            >
              <div className="space-y-4">
                {selectedCenter.appeals.map((appeal) => (
                  <ProfileCard key={appeal.appeal_id} className="border-l-4 border-l-blue-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            appeal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            appeal.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                            appeal.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {appeal.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(appeal.submitted_at)}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2">{appeal.subject}</h4>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{appeal.message}</p>
                        {appeal.admin_response && (
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm font-medium text-gray-700 mb-1">Admin Response:</p>
                            <p className="text-sm text-gray-600">{appeal.admin_response}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {appeal.status === 'pending' || appeal.status === 'under_review' ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedAppeal(appeal);
                                setShowAppealModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Review
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">
                            {appeal.status === 'approved' ? 'Approved' : 'Rejected'}
                          </span>
                        )}
                      </div>
                    </div>
                  </ProfileCard>
                ))}
              </div>
            </ProfileSection>
          )}

          {/* Action Buttons */}
          <div className="border-t border-gray-200 pt-6">
            <ProfileSection
              title="Administrative Actions"
              subtitle="Manage cremation center access and permissions"
              className="mb-0"
            >
              <ProfileCard className="bg-gray-50 border-2 border-dashed border-gray-200">
                <div className="flex flex-col space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Use the buttons below to manage this cremation center&apos;s access to the platform.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                    <ProfileButton
                      onClick={() => setShowDetailsModal(false)}
                      variant="secondary"
                      size="lg"
                      className="order-2 sm:order-1 w-full sm:w-auto"
                    >
                      Close Details
                    </ProfileButton>
                    {selectedCenter?.status === 'restricted' ? (
                      <ProfileButton
                        onClick={() => selectedCenter && openUnrestrictModal(selectedCenter)}
                        disabled={isProcessing}
                        loading={isProcessing}
                        variant="success"
                        size="lg"
                        className="order-1 sm:order-2 w-full sm:w-auto"
                      >
                        {isProcessing ? 'Processing...' : 'Restore Access'}
                      </ProfileButton>
                    ) : (
                      <ProfileButton
                        onClick={() => selectedCenter && openRestrictModal(selectedCenter)}
                        disabled={isProcessing}
                        loading={isProcessing}
                        variant="danger"
                        size="lg"
                        className="order-1 sm:order-2 w-full sm:w-auto"
                      >
                        {isProcessing ? 'Processing...' : 'Restrict Access'}
                      </ProfileButton>
                    )}
                  </div>
                </div>
              </ProfileCard>
            </ProfileSection>
          </div>
        </div>
      </Modal>

      {/* Appeal Review Modal */}
      <Modal
        isOpen={showAppealModal}
        onClose={() => {
          setShowAppealModal(false);
          setSelectedAppeal(null);
          setAppealResponse('');
        }}
        title="Review Appeal"
        size="large"
      >
        {selectedAppeal && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">{selectedAppeal.subject}</h3>
              <p className="text-gray-700 mb-3">{selectedAppeal.message}</p>
              <div className="text-sm text-gray-500">
                <p>Submitted: {formatDate(selectedAppeal.submitted_at)}</p>
                <p>Status: <span className="capitalize">{selectedAppeal.status.replace('_', ' ')}</span></p>
              </div>
            </div>

            <div>
              <label htmlFor="appealResponse" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Response (Optional)
              </label>
              <textarea
                id="appealResponse"
                rows={4}
                value={appealResponse}
                onChange={(e) => setAppealResponse(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                placeholder="Provide additional context or explanation for your decision..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAppealModal(false);
                  setSelectedAppeal(null);
                  setAppealResponse('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedAppeal && handleAppealAction(selectedAppeal.appeal_id, 'rejected', appealResponse)}
                disabled={isProcessing}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Reject Appeal'}
              </button>
              <button
                onClick={() => selectedAppeal && handleAppealAction(selectedAppeal.appeal_id, 'approved', appealResponse)}
                disabled={isProcessing}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Approve Appeal'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminDashboardLayout>
  );
}
