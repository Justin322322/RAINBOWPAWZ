'use client';

import React, { useState, useEffect, useRef } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserCircleIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EllipsisVerticalIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import Image from 'next/image';
import { Badge, Button, Input } from '@/components/ui';

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
  pets?: number;
  completedBookings?: number;
  restriction?: {
    reason: string;
    restriction_date: string;
  };
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [isRetrying, setIsRetrying] = useState(false);

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
    const fetchUsers = async () => {
      try {
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

        if (!response.ok) {
          let errorDetails = '';
          try {
            const errorData = await response.json();
            errorDetails = errorData.details || errorData.error || '';
          } catch (parseError) {
            // Ignore parsing error
          }

          throw new Error(`Failed to fetch fur parents: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
        }

        const data = await response.json();

        // Map the users to match our interface
        const mappedUsers = (data.users || []).map((user: any) => ({
          ...user,
          user_id: user.user_id || user.id, // Support both field names
          phone: user.phone || user.phone_number, // Support both field names
        }));

        setUsers(mappedUsers);
        setPagination({
          page: data.pagination?.page || 1,
          limit: data.pagination?.limit || 10,
          total: data.pagination?.total || mappedUsers.length,
          totalPages: data.pagination?.totalPages || 1
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        showToast('Failed to load fur parents. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [pagination.page, pagination.limit, statusFilter, searchTerm, showToast]);

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

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
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
  const toggleDropdown = (id: string | number) => {
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
    setIsRetrying(true);
    // Reset pagination to first page
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
    // The useEffect will trigger a reload
    setTimeout(() => setIsRetrying(false), 500);
  };

  return (
    <AdminDashboardLayout activePage="furparents" userName={userName}>
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Fur Parents</h1>
            <p className="text-gray-600 mt-1">Manage fur parent accounts</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-grow sm:max-w-xs">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search fur parents..."
                leftIcon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registration Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pets
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bookings
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center">
                            <UserCircleIcon className="h-6 w-6" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-gray-500">ID: {user.user_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                        {user.phone_number && (
                          <div className="text-sm text-gray-500">{user.phone_number}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.pets || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.completedBookings || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-4">
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
                              {isProcessing ? 'Processing...' : 'Restrict'}
                            </button>
                          ) : (
                            <button
                              onClick={() => openUnrestrictModal(user)}
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
      <ConfirmationModal
        isOpen={showRestrictModal}
        onClose={() => setShowRestrictModal(false)}
        onConfirm={handleRestrictUser}
        title="Restrict Fur Parent"
        message={
          <div className="space-y-4">
            <p>Are you sure you want to restrict &quot;{userToAction?.first_name} {userToAction?.last_name}&quot;? This will prevent them from making new bookings.</p>
            <div>
              <label htmlFor="restrict-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for restriction (optional)
              </label>
              <textarea
                id="restrict-reason"
                value={restrictReason}
                onChange={(e) => setRestrictReason(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Enter reason for restriction"
                rows={3}
              />
            </div>
          </div>
        }
        confirmText="Restrict Access"
        variant="danger"
        icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600" />}
      />

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
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Fur Parent Details</h2>
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
                    <div className="h-16 w-16 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center mr-4">
                      <UserCircleIcon className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900">{selectedUser.first_name} {selectedUser.last_name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-gray-600">ID: {selectedUser.user_id}</span>
                        <span>•</span>
                        <span className="flex items-center">
                          {getStatusBadge(selectedUser.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Contact Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex items-start">
                        <EnvelopeIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Email</p>
                          <p className="text-gray-900">{selectedUser.email}</p>
                        </div>
                      </div>
                      {selectedUser.phone_number && (
                        <div className="flex items-start">
                          <PhoneIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Phone</p>
                            <p className="text-gray-900">{selectedUser.phone_number}</p>
                          </div>
                        </div>
                      )}
                      {selectedUser.address && (
                        <div className="flex items-start">
                          <MapPinIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Address</p>
                            <p className="text-gray-900">{selectedUser.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Account Details</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Registration Date</p>
                          <p className="text-gray-900">{formatDate(selectedUser.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <div className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex items-center justify-center">
                          <span className="text-xs font-bold">✓</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Verification Status</p>
                          <p className="text-gray-900">
                            {selectedUser.is_verified ? (
                              <span className="inline-flex items-center text-green-600">
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-yellow-600">
                                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                Not Verified
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Stats */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">User Activity</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Registered Pets</p>
                      <p className="text-2xl font-semibold text-[var(--primary-green)]">{selectedUser.pets || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Completed Bookings</p>
                      <p className="text-2xl font-semibold text-[var(--primary-green)]">{selectedUser.completedBookings || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Restriction information if applicable */}
                {selectedUser.status === 'restricted' && selectedUser.restriction && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h4 className="text-lg font-medium text-red-800 mb-3 flex items-center">
                      <ShieldExclamationIcon className="h-5 w-5 mr-2" />
                      Restriction Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="w-32 text-red-700">Date Restricted:</div>
                        <div className="text-red-900">{formatDate(selectedUser.restriction.restriction_date)}</div>
                      </div>
                      {selectedUser.restriction.reason && (
                        <div className="flex items-start">
                          <div className="w-32 text-red-700">Reason:</div>
                          <div className="text-red-900">{selectedUser.restriction.reason}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-8 border-t pt-6">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDetailsModal(false)}
                  >
                    Close
                  </Button>
                  {selectedUser.status === 'restricted' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setShowDetailsModal(false);
                        openUnrestrictModal(selectedUser);
                      }}
                      disabled={isProcessing}
                      isLoading={isProcessing}
                    >
                      Restore Access
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setShowDetailsModal(false);
                        openRestrictModal(selectedUser);
                      }}
                      disabled={isProcessing}
                      isLoading={isProcessing}
                    >
                      Restrict Access
                    </Button>
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
