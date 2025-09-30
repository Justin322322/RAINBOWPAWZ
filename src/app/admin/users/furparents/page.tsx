'use client';

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import Image from 'next/image';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

import { getProfilePictureUrl } from '@/utils/imageUtils';

import { LoadingSpinner } from '@/app/admin/services/client';


// Types and interfaces
type UserStatus = 'active' | 'restricted' | 'suspended' | 'inactive';

interface User {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  address?: string;
  created_at: string;
  status: UserStatus;
  is_verified: boolean;
  profile_picture?: string;
  pets?: number;
  completedBookings?: number;
  restriction?: {
    reason: string;
    restriction_date: string;
  };
  appeals?: Appeal[];
  bio?: string;
  last_login?: string;
  verified?: boolean;
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

const AdminFurParentsPage = React.memo(function AdminFurParentsPage() {
  const [userName] = useState('System Administrator');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestrictSuccess, setIsRestrictSuccess] = useState(false);
  const [isRestoreSuccess, setIsRestoreSuccess] = useState(false);
  const [successUserName, setSuccessUserName] = useState('');
  const [showRestrictModal, setShowRestrictModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [userToAction, setUserToAction] = useState<User | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | number | null>(null);
  const [restrictReason, setRestrictReason] = useState('');
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [appealResponse, setAppealResponse] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch fur parents from the API
  useEffect(() => {
    let isMounted = true; // Track if component is still mounted

    const fetchUsers = async () => {
      try {
        // Don't make API calls if component is unmounted (e.g., during logout)
        if (!isMounted) return;

        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          status: statusFilter !== 'all' ? statusFilter : '',
          search: searchTerm,
          role: 'fur_parent'
        });

        const response = await fetch(`/api/users?${params.toString()}`, {
          cache: 'no-store',
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

          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorDetails = errorData.details || errorData.error || '';
          } catch {
            // Ignore parsing error
          }

          throw new Error(`Failed to fetch fur parents: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
        }

        const data = await response.json();

        // Log the data we received for debugging
        console.log('Fur parents data:', data.users);

        // Check for appeals in the data
        data.users.forEach((user: any) => {
          if (user.appeals && user.appeals.length > 0) {
            console.log(`User ${user.first_name} ${user.last_name} has ${user.appeals.length} appeals:`, user.appeals);
            const pendingAppeals = user.appeals.filter((appeal: any) => appeal.status === 'pending');
            if (pendingAppeals.length > 0) {
              console.log(`User ${user.first_name} ${user.last_name} has ${pendingAppeals.length} pending appeals`);
            }
          }
        });

        // Map the users to match our interface
        const mappedUsers = (data.users || []).map((user: any) => ({
          ...user,
          user_id: user.user_id || user.id, // Support both field names
          phone: user.phone || user.phone_number, // Support both field names
        }));

        // Only update state if component is still mounted
        if (isMounted) {
          setUsers(mappedUsers);
          setPagination({
            page: data.pagination?.page || 1,
            limit: data.pagination?.limit || 10,
            total: data.pagination?.total || mappedUsers.length,
            totalPages: data.pagination?.totalPages || 1
          });
        }
      } catch (err) {
        // Only handle errors if component is still mounted
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred');
          showToast('Failed to load fur parents. Please try again.', 'error');
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    // Cleanup function to prevent state updates after component unmounts
    return () => {
      isMounted = false;
    };
  }, [pagination.page, pagination.limit, statusFilter, searchTerm, showToast]);

  // Handle appeal notification from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const appealId = urlParams.get('appealId');
      const userId = urlParams.get('userId');

      // This logic is now handled after handleViewDetails is defined
      const _appealId = appealId;
      const _userId = userId;
    }
  }, [users]); // handleViewDetails will be added after its definition



  // Filter users based on search term and status (memoized for performance)
  const filteredUsers = useMemo(() => {
    if (!searchTerm && statusFilter === 'all') return users;

    const searchLower = searchTerm.toLowerCase();
    return users.filter(user => {
      const matchesSearch = !searchTerm ||
        user.first_name?.toLowerCase().includes(searchLower) ||
        user.last_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        (user.user_id?.toString() || '').includes(searchTerm);

      const matchesStatus = statusFilter === 'all' ? true : user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const handleViewDetails = useCallback(async (user: User) => {
    // Load user appeals when viewing details
    const appeals = await loadUserAppeals(user.user_id);
    setSelectedUser({ ...user, appeals });
    setShowDetailsModal(true);
  }, []);

  // Add useEffect after handleViewDetails is defined
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const appealId = urlParams.get('appealId');
    const userId = urlParams.get('userId');

    if (appealId && userId && users.length > 0) {
      // Find the user and open their details modal, then the appeal modal
      const targetUser = users.find(user => user.user_id.toString() === userId);
      
      if (targetUser) {
        // Load user details and appeals
        handleViewDetails(targetUser).then(() => {
          // Find the specific appeal and open the modal
          const appeal = targetUser.appeals?.find(a => a.appeal_id.toString() === appealId);
          if (appeal) {
            setSelectedAppeal(appeal);
            setShowAppealModal(true);
            // Clear URL parameters after opening modal
            window.history.replaceState({}, '', window.location.pathname);
          }
        });
      }
    }
  }, [users, handleViewDetails]);

  const loadUserAppeals = async (userId: number) => {
    try {
      const response = await fetch(`/api/appeals?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        return data.appeals || [];
      }
    } catch (error) {
      console.error('Error loading user appeals:', error);
    }
    return [];
  };

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

        // Refresh user details if modal is open
        if (selectedUser) {
          const appeals = await loadUserAppeals(selectedUser.user_id);
          setSelectedUser({ ...selectedUser, appeals });
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
  const openRestrictModal = (user: User) => {
    setUserToAction(user);
    setRestrictReason('');
    // Close details modal if it's open to avoid modal conflicts
    if (showDetailsModal) {
      setShowDetailsModal(false);
      // Use setTimeout to ensure the details modal closes before opening restrict modal
      setTimeout(() => {
        setShowRestrictModal(true);
        setOpenDropdownId(null);
      }, 150);
    } else {
      setShowRestrictModal(true);
      setOpenDropdownId(null);
    }
  };

  // Function to open the unrestrict modal
  const openUnrestrictModal = (user: User) => {
    setUserToAction(user);
    // Close details modal if it's open to avoid modal conflicts
    if (showDetailsModal) {
      setShowDetailsModal(false);
      // Use setTimeout to ensure the details modal closes before opening restore modal
      setTimeout(() => {
        setShowRestoreModal(true);
        setOpenDropdownId(null);
      }, 150);
    } else {
      setShowRestoreModal(true);
      setOpenDropdownId(null);
    }
  };

  // Function to toggle dropdown
  const _toggleDropdown = (id: string | number) => {
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  // Handle restricting a user
  const handleRestrictUser = async () => {
    if (!userToAction || isProcessing) return;

    try {
      setIsProcessing(true);

      const response = await fetch(`/api/users/${userToAction.user_id}/restrict`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restricted: true,
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
        throw new Error(data.error || 'Failed to restrict user');
      }

      // Update the user's status in the local state
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.user_id === userToAction.user_id ? {
            ...u,
            status: 'restricted',
            restriction: data.user?.restriction || {
              reason: restrictReason || 'Restricted by admin',
              restriction_date: new Date().toISOString()
            }
          } : u
        )
      );

      // If the user is currently selected in the modal, update it
      if (selectedUser && selectedUser.user_id === userToAction.user_id) {
        setSelectedUser({
          ...selectedUser,
          status: 'restricted',
          restriction: data.user?.restriction || {
            reason: restrictReason || 'Restricted by admin',
            restriction_date: new Date().toISOString()
          }
        });
      }

      // Show success message
      setSuccessUserName(`${userToAction.first_name} ${userToAction.last_name}`);
      setIsRestrictSuccess(true);
      setTimeout(() => setIsRestrictSuccess(false), 3000);

      // Close the modal
      setShowRestrictModal(false);
      setRestrictReason('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to restrict user', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle unrestricting a user
  const handleUnrestrictUser = async () => {
    if (!userToAction || isProcessing) return;

    try {
      setIsProcessing(true);

      const response = await fetch(`/api/users/${userToAction.user_id}/restrict`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restricted: false
        }),
      });

      // Handle 401 Unauthorized specifically (likely due to logout)
      if (response.status === 401) {
        // Don't show error for 401 during logout - just return silently
        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to unrestrict user');
      }

      // Update the user's status in the local state
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.user_id === userToAction.user_id ? {
            ...u,
            status: 'active',
            restriction: undefined
          } : u
        )
      );

      // If the user is currently selected in the modal, update it
      if (selectedUser && selectedUser.user_id === userToAction.user_id) {
        setSelectedUser({
          ...selectedUser,
          status: 'active',
          restriction: undefined
        });
      }

      // Show success message
      setSuccessUserName(`${userToAction.first_name} ${userToAction.last_name}`);
      setIsRestoreSuccess(true);
      setTimeout(() => setIsRestoreSuccess(false), 3000);

      // Close the modal
      setShowRestoreModal(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to unrestrict user', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge based on user status
  const getStatusBadge = (status: UserStatus, _isVerified: boolean) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="success" size="sm">
            Active
          </Badge>
        );
      case 'restricted':
        return (
          <Badge variant="danger" size="sm">
            Restricted
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="warning" size="sm">
            Suspended
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="default" size="sm">
            Inactive
          </Badge>
        );
      default:
        return (
          <Badge variant="default" size="sm">
            Unknown
          </Badge>
        );
    }
  };

  // Handle retry when loading fails
  const handleRetry = () => {
    // Reset pagination to first page
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
    // The useEffect will trigger a reload
  };

  const RestrictModal = memo(function RestrictModal({
    isOpen,
    onClose,
    userToAction,
    initialReason,
    onConfirm,
    customZIndex,
  }: {
    isOpen: boolean;
    onClose: () => void;
    userToAction: { first_name?: string; last_name?: string } | null;
    initialReason: string;
    onConfirm: (reason: string) => void;
    customZIndex?: string;
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
        title="Restrict Fur Parent"
        size="medium"
        variant="danger"
        customZIndex={customZIndex}
      >
        <div className="flex items-start mb-4">
          <div className="mr-3 flex-shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="text-sm text-gray-600 flex-1">
            <p className="mb-4">Are you sure you want to restrict &quot;{userToAction?.first_name} {userToAction?.last_name}&quot;? This will prevent them from making new bookings.</p>
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
            Restrict User
          </Button>
        </div>
      </Modal>
    );
  });

  return (
    <AdminDashboardLayout activePage="furparents" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Fur Parents</h1>
            <p className="text-gray-600 mt-1">Manage fur parent accounts</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-1 min-w-0 sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search fur parents..."
              />
            </div>
            <div className="relative flex-1 min-w-0 sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm appearance-none min-w-0"
              >
                <option value="all" className="text-gray-900">All Statuses</option>
                <option value="active" className="text-gray-900">Active</option>
                <option value="restricted" className="text-gray-900">Restricted</option>
                <option value="suspended" className="text-gray-900">Suspended</option>
                <option value="inactive" className="text-gray-900">Inactive</option>
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

      {/* Search Results Summary */}
      {(searchTerm || statusFilter !== 'all') && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-blue-700">
                <MagnifyingGlassIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''} found
                </span>
              </div>
              {searchTerm && (
                <span className="text-sm text-blue-600">
                  for &quot;{searchTerm}&quot;
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="text-sm text-blue-600">
                  with status &quot;{statusFilter}&quot;
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

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
                {successUserName} has been restricted successfully. They will no longer be able to make new bookings.
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
                {successUserName} has been unrestricted successfully. They can now make new bookings.
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
            <h2 className="text-lg font-medium text-gray-800">Fur Parent Accounts</h2>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <LoadingSpinner message="Loading fur parents..." className="px-6" />
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4">
              <XMarkIcon className="h-6 w-6" />
            </div>
            <p className="text-red-600 font-medium mb-2">Error loading fur parents</p>
            <p className="text-gray-500 text-sm">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredUsers.length === 0 && (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500 text-sm">No fur parents match your search criteria.</p>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Users table */}
        {!loading && !error && filteredUsers.length > 0 && (
          <>
            {/* Mobile Card View */}
            <div className="block sm:hidden">
              <div className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className={`p-4 hover:bg-gray-50 transition-all duration-300 border border-gray-200 rounded-lg ${
                      user.appeals && user.appeals.some(appeal => appeal.status === 'pending')
                        ? 'animate-pulse-border'
                        : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center overflow-hidden">
                        {user.profile_picture ? (
                          <Image
                            src={getProfilePictureUrl(user.profile_picture)}
                            alt={`${user.first_name} ${user.last_name}`}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>';
                              }
                            }}
                          />
                        ) : (
                          <UserCircleIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {user.first_name} {user.last_name}
                              </h3>
                              {getStatusBadge(user.status, user.is_verified)}
                              {user.appeals && user.appeals.some(appeal => appeal.status === 'pending') && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Appeal Pending
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="flex items-center">
                                <EnvelopeIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </div>
                              {user.phone_number && (
                                <div className="flex items-center">
                                  <PhoneIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <span className="truncate">{user.phone_number}</span>
                                </div>
                              )}
                              {/* Location intentionally hidden from admin view */}
                              <div className="text-xs text-gray-500 mt-2">
                                {user.completedBookings || 0} bookings • Joined {formatDate(user.created_at)}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2 ml-3">
                            <button
                              onClick={() => handleViewDetails(user)}
                              className="px-3 py-2 bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)] text-sm font-medium min-w-[70px] text-center transition-colors"
                            >
                              View
                            </button>
                            {user.status === 'active' ? (
                              <button
                                onClick={() => openRestrictModal(user)}
                                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium min-w-[70px] text-center transition-colors"
                              >
                                Restrict
                              </button>
                            ) : user.status === 'restricted' ? (
                              <button
                                onClick={() => openUnrestrictModal(user)}
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
                ))}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration Date
                    </th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bookings
                    </th>
                    <th scope="col" className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.user_id}
                        className={`hover:bg-gray-50 transition-all duration-300 ${
                          user.appeals && user.appeals.some(appeal => appeal.status === 'pending')
                            ? 'animate-pulse-border'
                            : ''
                        }`}
                      >
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center overflow-hidden">
                              {user.profile_picture ? (
                                <Image
                                  src={getProfilePictureUrl(user.profile_picture)}
                                  alt={`${user.first_name} ${user.last_name}`}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to icon if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>';
                                    }
                                  }}
                                />
                              ) : (
                                <UserCircleIcon className="h-6 w-6" />
                              )}
                            </div>
                            <div className="ml-4 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{user.first_name} {user.last_name}</div>
                              <div className="text-sm text-gray-500">ID: {user.user_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 truncate">{user.email}</div>
                          {user.phone_number && (
                            <div className="text-sm text-gray-500 truncate">{user.phone_number}</div>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(user.status, user.is_verified)}
                            {user.appeals && user.appeals.some(appeal => appeal.status === 'pending') && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Appeal
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.completedBookings || 0}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2 sm:space-x-4">
                            <button
                              onClick={() => handleViewDetails(user)}
                              className="text-[var(--primary-green)] hover:text-[var(--primary-green)] hover:underline"
                            >
                              View
                            </button>

                            {/* Restrict/Unrestrict Button */}
                            {user.status !== 'restricted' ? (
                              <button
                                onClick={() => openRestrictModal(user)}
                                disabled={isProcessing}
                                className="text-red-600 hover:text-red-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="hidden sm:inline">{isProcessing ? 'Processing...' : 'Restrict'}</span>
                                <span className="sm:hidden">Restrict</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => openUnrestrictModal(user)}
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
                    ))}
                  </tbody>
                </table>
              </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      pagination.page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      pagination.page === pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                          pagination.page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>

                      {/* Page numbers */}
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current page
                          return (
                            page === 1 ||
                            page === pagination.totalPages ||
                            Math.abs(page - pagination.page) <= 1
                          );
                        })
                        .map((page, index, array) => {
                          // Add ellipsis if there are gaps
                          const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;

                          return (
                            <React.Fragment key={page}>
                              {showEllipsisBefore && (
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                  ...
                                </span>
                              )}
                              <button
                                onClick={() => setPagination(prev => ({ ...prev, page }))}
                                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                                  page === pagination.page
                                    ? 'z-10 bg-[var(--primary-green-light)] border-[var(--primary-green)] text-[var(--primary-green)]'
                                    : 'bg-white text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}

                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                        disabled={pagination.page === pagination.totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                          pagination.page === pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Restrict Confirmation Modal */}
      <RestrictModal
        isOpen={showRestrictModal}
        onClose={() => setShowRestrictModal(false)}
        userToAction={userToAction}
        initialReason={restrictReason}
        onConfirm={(reason) => { setRestrictReason(reason); handleRestrictUser(); }}
        customZIndex="z-[99999]"
      />

      {/* Unrestrict Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={handleUnrestrictUser}
        title="Unrestrict Fur Parent"
        message={`Are you sure you want to unrestrict ${userToAction?.first_name} ${userToAction?.last_name}? This will allow them to make bookings again.`}
        confirmText="Unrestrict Access"
        variant="success"
        icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
      />

      {/* Fur Parent Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Fur Parent Details"
        size="large"
        className="max-w-2xl mx-4 sm:mx-auto"
        contentClassName="max-h-[85vh] overflow-y-auto"
      >
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-20">
          {/* Header with overlapping avatar */}
          <div className="relative bg-green-800 px-6 py-4 rounded-t-xl">
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10">
              <div className="h-24 w-24 rounded-full ring-4 ring-white ring-offset-4 overflow-hidden bg-white flex-shrink-0 shadow-lg">
                {selectedUser?.profile_picture ? (
                  <Image
                    src={getProfilePictureUrl(selectedUser.profile_picture)}
                    alt={`${selectedUser?.first_name} ${selectedUser?.last_name}`}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <UserCircleIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="pt-20">
              <h1 className="text-2xl font-bold text-white tracking-tight text-center">
                {selectedUser?.first_name} {selectedUser?.last_name}
              </h1>
              <p className="text-green-100 text-sm mt-1 text-center">Fur Parent</p>
            </div>
          </div>

          {/* Content area */}
          <div className="p-6 space-y-6">
            {/* Stats Row */}
            <div className="flex justify-center space-x-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">-</div>
                <div className="text-sm text-gray-600">Pets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">-</div>
                <div className="text-sm text-gray-600">Bookings</div>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200"></div>

            {/* About Section */}
            <div>
              <p className="text-gray-700 leading-relaxed">
                {selectedUser?.bio || 'No bio available for this user.'}
              </p>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200"></div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">{selectedUser?.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-gray-700">{selectedUser?.phone_number || 'No phone number'}</span>
              </div>
              {/* Location intentionally hidden from admin view */}
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200"></div>

                         {/* Account Details */}
             <div className="space-y-3">
               <div className="flex items-center gap-3">
                 <span className="text-sm font-medium text-gray-600 min-w-[100px]">ID:</span>
                 <span className="text-sm text-gray-900">{selectedUser?.user_id}</span>
               </div>
               <div className="flex items-center gap-3">
                 <span className="text-sm font-medium text-gray-600 min-w-[100px]">Status:</span>
                                  {getStatusBadge(selectedUser?.status || 'inactive', selectedUser?.is_verified || false)}
               </div>
               <div className="flex items-center gap-3">
                 <span className="text-sm font-medium text-gray-600 min-w-[100px]">Joined:</span>
                 <span className="text-sm text-gray-900">{selectedUser?.created_at ? formatDate(selectedUser.created_at) : 'N/A'}</span>
               </div>
               {selectedUser?.last_login && (
                 <div className="flex items-center gap-3">
                   <span className="text-sm font-medium text-gray-600 min-w-[100px]">Last Login:</span>
                   <span className="text-sm text-gray-900">{formatDate(selectedUser.last_login)}</span>
                 </div>
               )}
             </div>

             {/* Restriction Information */}
             {selectedUser?.restriction && (
               <>
                 <div className="border-t border-gray-200"></div>
                 <div className="space-y-3">
                   <h3 className="text-sm font-semibold text-gray-900">Restriction Details</h3>
                   <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                     <div className="flex items-start gap-3">
                       <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                       <div className="space-y-2">
                         <div className="text-sm text-red-800">
                           <span className="font-medium">Reason:</span> {selectedUser.restriction.reason}
                         </div>
                         <div className="text-sm text-red-700">
                           <span className="font-medium">Restricted on:</span> {formatDate(selectedUser.restriction.restriction_date)}
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               </>
             )}

             {/* Appeals Section */}
             {selectedUser?.appeals && selectedUser.appeals.length > 0 && (
               <>
                 <div className="border-t border-gray-200"></div>
                 <div className="space-y-3">
                   <h3 className="text-sm font-semibold text-gray-900">Appeals ({selectedUser.appeals.length})</h3>
                   <div className="space-y-3">
                     {selectedUser.appeals.map((appeal) => (
                       <div key={appeal.appeal_id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                         <div className="flex items-start justify-between mb-2">
                           <h4 className="text-sm font-medium text-gray-900">{appeal.subject}</h4>
                           <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                             appeal.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                             appeal.status === 'approved' ? 'bg-green-100 text-green-800' :
                             appeal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                             'bg-blue-100 text-blue-800'
                           }`}>
                             {appeal.status.replace('_', ' ')}
                           </span>
                         </div>
                         <p className="text-sm text-gray-700 mb-2">{appeal.message}</p>
                         <div className="text-xs text-gray-500 space-y-1">
                           <div>Submitted: {formatDate(appeal.submitted_at)}</div>
                           {appeal.reviewed_at && (
                             <div>Reviewed: {formatDate(appeal.reviewed_at)}</div>
                           )}
                           {appeal.admin_response && (
                             <div className="mt-2">
                               <span className="font-medium">Admin Response:</span> {appeal.admin_response}
                             </div>
                           )}
                         </div>
                         {appeal.status === 'pending' && (
                           <div className="mt-3 flex gap-2">
                             <button
                               onClick={() => {
                                 setSelectedAppeal(appeal);
                                 setShowAppealModal(true);
                               }}
                               className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                             >
                               Review Appeal
                             </button>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 </div>
               </>
             )}

             {/* Administrative Actions */}
             <div className="border-t border-gray-200"></div>
             <div className="space-y-3">
               <h3 className="text-sm font-semibold text-gray-900">Administrative Actions</h3>
               <div className="flex gap-3">
                 {selectedUser?.status !== 'restricted' ? (
                   <button
                     onClick={() => {
                       setUserToAction(selectedUser);
                       setRestrictReason('');
                       setShowRestrictModal(true);
                     }}
                     className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                   >
                     Restrict User
                   </button>
                 ) : (
                   <button
                     onClick={() => {
                       setUserToAction(selectedUser);
                       setShowRestoreModal(true);
                     }}
                     className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                   >
                     Unrestrict User
                   </button>
                 )}
               </div>
             </div>
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
});

export default AdminFurParentsPage;
