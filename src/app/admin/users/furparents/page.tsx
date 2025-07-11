'use client';

import React, { useState, useEffect, useRef } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import Image from 'next/image';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserCircleIcon,
  XMarkIcon,
  ShieldExclamationIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  HeartIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Badge, Button, Input } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import {
  ProfileCard,
  ProfileSection,
  ProfileField,
  ProfileGrid,
  ProfileFormGroup
} from '@/components/ui/ProfileLayout';
import { ProfileButton } from '@/components/ui/ProfileFormComponents';
import { getProfilePictureUrl } from '@/utils/imageUtils';



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

export default function AdminFurParentsPage() {
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
    }
  }, [users]);

  // Filter users based on search term and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.user_id?.toString() || '').includes(searchTerm);

    const matchesStatus = statusFilter === 'all' ? true : user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = async (user: User) => {
    // Load user appeals when viewing details
    const appeals = await loadUserAppeals(user.user_id);
    setSelectedUser({ ...user, appeals });
    setShowDetailsModal(true);
  };

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
    }
    setShowRestrictModal(true);
    // Close dropdown if open
    setOpenDropdownId(null);
  };

  // Function to open the unrestrict modal
  const openUnrestrictModal = (user: User) => {
    setUserToAction(user);
    // Close details modal if it's open to avoid modal conflicts
    if (showDetailsModal) {
      setShowDetailsModal(false);
    }
    setShowRestoreModal(true);
    // Close dropdown if open
    setOpenDropdownId(null);
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
  const getStatusBadge = (status: UserStatus) => {
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
            <div className="relative flex-grow sm:max-w-xs">
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
                <option value="restricted">Restricted</option>
                <option value="suspended">Suspended</option>
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
                  for "{searchTerm}"
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="text-sm text-blue-600">
                  with status "{statusFilter}"
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
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)] mb-4"></div>
            <p className="text-gray-600">Loading fur parents...</p>
          </div>
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
                {filteredUsers.map((user) => {
                  const hasPendingAppeal = user.appeals && user.appeals.some(appeal => appeal.status === 'pending');
                  return (
                  <div
                    key={user.user_id}
                    className={`p-4 hover:bg-gray-50 transition-all duration-300 border border-gray-200 rounded-lg ${
                      hasPendingAppeal
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
                              {getStatusBadge(user.status)}
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
                              <div className="flex items-center">
                                <MapPinIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{user.address || 'No address provided'}</span>
                              </div>
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
                    {filteredUsers.map((user) => {
                      const hasPendingAppeal = user.appeals && user.appeals.some(appeal => appeal.status === 'pending');
                      return (
                      <tr
                        key={user.user_id}
                        className={`hover:bg-gray-50 transition-all duration-300 ${
                          hasPendingAppeal
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
                            {getStatusBadge(user.status)}
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
                      );
                    })}
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
      <Modal
        isOpen={showRestrictModal}
        onClose={() => setShowRestrictModal(false)}
        title="Restrict Fur Parent"
        size="medium"
        variant="danger"
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
                value={restrictReason}
                onChange={(e) => setRestrictReason(e.target.value)}
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
            onClick={() => setShowRestrictModal(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleRestrictUser}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Restricting...
              </>
            ) : (
              'Restrict Access'
            )}
          </Button>
        </div>
      </Modal>

      {/* Unrestrict Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={handleUnrestrictUser}
        title="Unrestrict Fur Parent"
        message={`Are you sure you want to unrestrict;${userToAction?.first_name} ${userToAction?.last_name};? This will allow them to make bookings again.`}
        confirmText="Unrestrict Access"
        variant="success"
        icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
      />

      {/* User Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Fur Parent Details"
        size="xlarge"
        className="max-w-6xl mx-4 sm:mx-auto"
        contentClassName="max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-6">
          {/* Header Section */}
          <ProfileCard className="bg-gradient-to-r from-[var(--primary-green)] to-[var(--primary-green-hover)]">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-start space-x-4">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 flex-shrink-0 overflow-hidden">
                    {selectedUser?.profile_picture ? (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-white">
                        <Image
                          src={getProfilePictureUrl(selectedUser.profile_picture)}
                          alt={`${selectedUser.first_name} ${selectedUser.last_name}`}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<svg class="h-8 w-8 sm:h-10 sm:w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>';
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <UserCircleIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    )}
                  </div>
                  <div className="text-white min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 break-words">
                      {selectedUser?.first_name} {selectedUser?.last_name}
                    </h1>
                    <div className="space-y-1 text-white/90 text-sm">
                      <div>ID: {selectedUser?.user_id}</div>
                      <div className="flex items-center">
                        <span className="mr-2">Account Status:</span>
                        <div className="bg-white/20 rounded-full px-2 py-1">
                          {selectedUser?.status === 'active' ? (
                            <span className="text-green-200">Active</span>
                          ) : selectedUser?.status === 'restricted' ? (
                            <span className="text-red-200">Restricted</span>
                          ) : (
                            <span className="text-yellow-200">Inactive</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 self-start">
                  {selectedUser && getStatusBadge(selectedUser.status)}
                </div>
              </div>
            </div>
          </ProfileCard>

          {/* Contact Information */}
          <ProfileSection
            title="Contact Information"
            subtitle="Personal contact details and account information"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProfileCard>
                <ProfileFormGroup title="Contact Details" subtitle="Primary contact information">
                  <div className="space-y-4">
                    <ProfileField
                      label="Email Address"
                      value={selectedUser?.email}
                      icon={<EnvelopeIcon className="h-5 w-5" />}
                    />
                    {selectedUser?.phone_number && (
                      <ProfileField
                        label="Phone Number"
                        value={selectedUser.phone_number}
                        icon={<PhoneIcon className="h-5 w-5" />}
                      />
                    )}
                    {selectedUser?.address && (
                      <ProfileField
                        label="Home Address"
                        value={<div className="break-words">{selectedUser.address}</div>}
                        icon={<MapPinIcon className="h-5 w-5" />}
                      />
                    )}
                  </div>
                </ProfileFormGroup>
              </ProfileCard>

              <ProfileCard>
                <ProfileFormGroup title="Account Details" subtitle="Registration and verification status">
                  <div className="space-y-4">
                    <ProfileField
                      label="Registration Date"
                      value={selectedUser ? formatDate(selectedUser.created_at) : 'N/A'}
                      icon={<CalendarIcon className="h-5 w-5" />}
                    />
                    <ProfileField
                      label="Verification Status"
                      value={
                        selectedUser?.is_verified ? (
                          <span className="inline-flex items-center text-green-600 font-medium">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Verified Account
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-yellow-600 font-medium">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            Not Verified
                          </span>
                        )
                      }
                      icon={<CheckCircleIcon className="h-5 w-5" />}
                    />
                  </div>
                </ProfileFormGroup>
              </ProfileCard>
            </div>
          </ProfileSection>

          {/* User Activity */}
          <ProfileSection
            title="User Activity"
            subtitle="Pet registrations and booking history"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <ProfileField
                label="Registered Pets"
                value={selectedUser?.pets || 0}
                icon={<HeartIcon className="h-5 w-5" />}
                valueClassName="text-xl sm:text-2xl font-bold text-[var(--primary-green)]"
                className="text-center sm:text-left"
              />
              <ProfileField
                label="Completed Bookings"
                value={selectedUser?.completedBookings || 0}
                icon={<ChartBarIcon className="h-5 w-5" />}
                valueClassName="text-xl sm:text-2xl font-bold text-[var(--primary-green)]"
                className="text-center sm:text-left"
              />
            </div>
          </ProfileSection>

          {/* Restriction Information */}
          {selectedUser?.status === 'restricted' && selectedUser?.restriction && (
            <ProfileSection
              title="Restriction Information"
              subtitle="Details about account restrictions"
            >
              <ProfileCard className="bg-red-50 border-red-200 border-2">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <ShieldExclamationIcon className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="text-lg font-medium text-red-800 mb-3">Account Restricted</h4>
                      <div className="space-y-3">
                        <ProfileField
                          label="Date Restricted"
                          value={formatDate(selectedUser.restriction.restriction_date)}
                          className="bg-red-100/50"
                          valueClassName="text-red-900 font-medium"
                        />
                        {selectedUser.restriction.reason && (
                          <ProfileField
                            label="Restriction Reason"
                            value={selectedUser.restriction.reason}
                            className="bg-red-100/50"
                            valueClassName="text-red-900"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </ProfileCard>
            </ProfileSection>
          )}

          {/* Appeals Section */}
          {selectedUser?.appeals && selectedUser.appeals.length > 0 && (
            <ProfileSection
              title="User Appeals"
              subtitle="Appeals submitted by this user"
            >
              <div className="space-y-4">
                {selectedUser.appeals.map((appeal) => (
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
              subtitle="Manage fur parent account access and permissions"
              className="mb-0"
            >
              <ProfileCard className="bg-gray-50 border-2 border-dashed border-gray-200">
                <div className="flex flex-col space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Use the buttons below to manage this fur parent's access to the platform.
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
                    {selectedUser?.status === 'restricted' ? (
                      <ProfileButton
                        onClick={() => {
                          setShowDetailsModal(false);
                          selectedUser && openUnrestrictModal(selectedUser);
                        }}
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
                        onClick={() => {
                          setShowDetailsModal(false);
                          selectedUser && openRestrictModal(selectedUser);
                        }}
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
