'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  ArrowPathIcon, 
  UserCircleIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import AdminDashboardLayout from '@/app/components/layout/AdminDashboardLayout';
import ConfirmationModal from '@/components/ConfirmationModal';

// Types and interfaces
type UserStatus = 'active' | 'restricted' | 'suspended' | 'inactive';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_number?: string; // Alias for phone
  address?: string;
  status: UserStatus;
  created_at: string;
  is_verified: number | boolean;
  pets?: number;
  completedBookings?: number;
  last_login?: string;
  restriction?: {
    reason: string;
    restricted_at: string;
    restricted_by: number;
    restriction_date?: string; // Alias for restricted_at
    duration?: string;
    report_count?: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Main component
export default function AdminFurParentsPage() {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  // Form and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showRestrictModal, setShowRestrictModal] = useState<boolean>(false);
  const [showUnrestrictModal, setShowUnrestrictModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [restrictReason, setRestrictReason] = useState<string>('');
  
  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Placeholder for fetchPackages - replace with actual implementation or import
  const fetchPackages = useCallback(async () => {
    // console.log('Fetching packages...');
    // Example: const response = await fetch('/api/packages');
    // const data = await response.json();
    // setPackages(data);
  }, []);

  // Status badge component
  const getStatusBadge = useCallback((status: UserStatus) => {
    switch(status) {
      case 'active':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Active
          </span>
        );
      case 'restricted':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
            Restricted
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
    }
  }, []);

  // Handle user restriction
  const handleRestriction = useCallback(async (userId: number, restrict: boolean, reason: string = ''): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/users/${userId}/restrict`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restrict,
          reason
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user restriction');
      }

      const data = await response.json();
      
      // Update users list
      setUsers((prevUsers: User[]) => 
        prevUsers.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                status: restrict ? 'restricted' : 'active', 
                restriction: data.restriction 
              } 
            : user
        )
      );
      
      // Update selected user if it's the one being modified
      setSelectedUser(prev => 
        prev?.id === userId 
          ? { 
              ...prev, 
              status: restrict ? 'restricted' : 'active',
              restriction: data.restriction
            } 
          : prev
      );
      
      return true;
    } catch (err) {
      console.error('Error updating user restriction:', err);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Fetch users with filters
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
        search: searchTerm,
        role: 'fur_parent'
      });

      const response = await fetch(`/api/users?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      
      setUsers(data.users || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
        total_pages: data.total_pages || 1,
        hasNextPage: data.page < data.total_pages,
        hasPrevPage: data.page > 1
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchTerm]);

  // Debounce search and filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm || statusFilter !== 'all') {
        setPagination(prev => ({
          ...prev,
          page: 1
        }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
    fetchPackages();
  }, [fetchUsers, fetchPackages]);

  // Open restrict modal
  const openRestrictModal = useCallback((user: User) => {
    setSelectedUser(user);
    setRestrictReason('');
    setShowRestrictModal(true);
  }, []);

  // Open unrestrict modal
  const openUnrestrictModal = useCallback((user: User) => {
    setSelectedUser(user);
    setShowUnrestrictModal(true);
  }, []);

  // Confirm restriction
  const confirmRestriction = useCallback(async () => {
    if (!selectedUser) return;
    
    const success = await handleRestriction(
      selectedUser.id, 
      true, 
      restrictReason || 'Restricted by admin'
    );
    
    if (success) {
      setShowRestrictModal(false);
      setRestrictReason('');
    }
  }, [selectedUser, restrictReason, handleRestriction]);
  
  // Confirm unrestriction
  const confirmUnrestriction = useCallback(async () => {
    if (!selectedUser) return;
    
    const success = await handleRestriction(selectedUser.id, false);
    if (success) {
      setShowUnrestrictModal(false);
    }
  }, [selectedUser, handleRestriction]);
  
  // Handle page change with proper type safety and pagination
  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => {
      const totalPages = prev.total_pages || 1;
      const page = Math.max(1, Math.min(newPage, totalPages));
      return {
        ...prev,
        page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    });
  }, []);

  // View user details
  const handleViewDetails = useCallback(async (user: User): Promise<void> => {
    setSelectedUser(user);
    
    // Optional: Fetch additional user details if needed
    try {
      const response = await fetch(`/api/users/${user.id}`);
      if (response.ok) {
        const userData = await response.json();
        setSelectedUser(prev => ({
          ...prev,
          ...userData,
          id: user.id // Ensure ID remains the same
        }));
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
    }
  }, []);

  // Get the safe date value for display
  const getSafeDate = useCallback((dateString: string | Date | undefined | null): Date | null => {
    if (!dateString) return null;
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }, []);

  // Format date for display with null/undefined safety
  const formatDate = useCallback((dateString: string | Date | null | undefined): string => {
    const date = getSafeDate(dateString);
    if (!date) return 'N/A';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [getSafeDate]);

  // Format report count with fallback
  const formatReportCount = useCallback((count?: number): string => {
    return count !== undefined ? count.toString() : '0';
  }, []);
  
  // Handle search input change with debounce
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  return (
    <AdminDashboardLayout activePage="furparents" userName="System Administrator">
      {/* Header section */}
      <div className="mb-8 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Fur Parents</h1>
            <p className="text-gray-600 mt-1">Manage pet owners who use our services</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <div className="relative flex-grow sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
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

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-800">
              Fur Parent Accounts
              {loading && (
                <ArrowPathIcon className="ml-2 h-5 w-5 inline animate-spin text-gray-500" />
              )}
            </h2>
            <button className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors duration-300">
              Export Data
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b border-red-100">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium flex items-center"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" /> Try Again
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pets
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
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
              {loading && users.length === 0 ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="ml-4">
                          <div className="h-4 bg-gray-200 rounded w-24"></div>
                          <div className="h-3 bg-gray-200 rounded w-16 mt-2"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24 mt-2"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-5 bg-gray-200 rounded-full w-5"></div>
                    </td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <UserCircleIcon className="h-6 w-6 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                          <div className="text-sm text-gray-500">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center">
                        <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-500" />
                        {user.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <PhoneIcon className="h-4 w-4 mr-1 text-gray-500" />
                        {user.phone_number || 'Not provided'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.pets ?? 0} pets
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.completedBookings ?? 0} completed
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.last_login)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(user)}
                        className="text-[var(--primary-green)] hover:text-[var(--primary-green)] hover:underline mr-4"
                      >
                        View
                      </button>
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
                          onClick={() => {
                            setShowUnrestrictModal(true);
                            setSelectedUser(user);
                          }}
                          disabled={isProcessing}
                          className="text-green-600 hover:text-green-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Processing...' : 'Unrestrict'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No fur parents found matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                  {' '}to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
                  {' '}of <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button onClick={() => handlePageChange(pagination.page - 1)} disabled={!pagination.hasPrevPage} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                  {/* Page numbers */} 
                  {pagination.total_pages > 1 && Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((pageNumber) => {
                    // Display first page, last page, current page, and pages around current page
                    const showPage = pageNumber === 1 || 
                                     pageNumber === pagination.total_pages || 
                                     (pageNumber >= pagination.page - 1 && pageNumber <= pagination.page + 1) ||
                                     (pagination.page < 3 && pageNumber <= 3) || // Show first 3 if current page is 1 or 2
                                     (pagination.page > pagination.total_pages - 2 && pageNumber >= pagination.total_pages - 2); // Show last 3 if current page is near end

                    const showEllipsis = (pageNumber === 2 && pagination.page > 3) || 
                                         (pageNumber === pagination.total_pages - 1 && pagination.page < pagination.total_pages - 2);

                    if (showEllipsis) {
                      return <span key={`ellipsis-${pageNumber}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                    }

                    if (showPage) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => handlePageChange(pageNumber)}
                          aria-current={pagination.page === pageNumber ? 'page' : undefined}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pagination.page === pageNumber ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                    return null;
                  })}
                  <button onClick={() => handlePageChange(pagination.page + 1)} disabled={!pagination.hasNextPage} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )} 

        {/* Mobile Pagination (Simplified) */}
        {users.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Success Animation Overlays */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
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
                <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />
              </motion.div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Processing...</h3>
              <p className="text-gray-600 mb-6">
                Please wait while we process your request.
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
      </AnimatePresence>

      {/* Restrict Confirmation Modal */}
      <ConfirmationModal
        isOpen={showUnrestrictModal}
        onClose={() => setShowUnrestrictModal(false)}
        onConfirm={() => handleRestriction(selectedUser?.id || 0, false)}
        title="Remove Restrictions"
        message={`Are you sure you want to remove restrictions from "${selectedUser?.first_name} ${selectedUser?.last_name}"? This will allow them to make bookings again.`}
        confirmText="Remove Restrictions"
        confirmButtonClass="bg-green-600 hover:bg-green-700 focus:ring-green-500"
        icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
      />

      {/* Restrict Modal with Reason Input */}
      {showRestrictModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Restrict User</h2>
              <button
                onClick={() => setShowRestrictModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="mb-4 text-gray-600">
                You are about to restrict <span className="font-semibold">{selectedUser.first_name} {selectedUser.last_name}</span>.
                This will prevent them from making new bookings.
              </p>
              <div className="mb-4">
                <label htmlFor="restrict-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Please provide a reason for restricting this user:
                </label>
                <textarea
                  id="restrict-reason"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                  value={restrictReason}
                  onChange={(e) => setRestrictReason(e.target.value)}
                  placeholder="Enter your reason here..."
                  disabled={isProcessing}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRestrictModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRestriction}
                  disabled={isProcessing || !restrictReason.trim() || restrictReason.trim().length < 5}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Processing...
                    </>
                  ) : (
                    'Restrict User'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                        <span className="text-gray-600">ID: {selectedUser.id}</span>
                        <span>•</span>
                        <span className="text-gray-600">Member since {formatDate(selectedUser.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(selectedUser.status)}
                  </div>
                </div>

                {/* Contact Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-3">Contact Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                      <div className="flex items-start">
                        <EnvelopeIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Email</p>
                          <p className="text-gray-900">{selectedUser.email}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <PhoneIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Phone</p>
                          <p className="text-gray-900">{selectedUser.phone_number || 'Not provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPinIcon className="h-5 w-5 text-gray-500 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Address</p>
                          <p className="text-gray-900">{selectedUser.address || 'Not provided'}</p>
                        </div>
                      </div>
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
                        <svg className="h-5 w-5 text-gray-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Last Activity</p>
                          <p className="text-gray-900">{formatDate(selectedUser.last_login)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Stats */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">User Statistics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Registered Pets</p>
                      <p className="text-2xl font-semibold text-[var(--primary-green)]">{selectedUser.pets ?? 0}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Completed Bookings</p>
                      <p className="text-2xl font-semibold text-[var(--primary-green)]">{selectedUser.completedBookings ?? 0}</p>
                    </div>
                  </div>
                </div>

                {/* Restriction Information (if restricted) */}
                {selectedUser.status === 'restricted' && selectedUser.restriction && (
                  <div>
                    <h4 className="text-lg font-medium text-red-800 mb-3">Restriction Information</h4>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 space-y-3">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-red-700">Reason</p>
                          <p className="text-red-900">{selectedUser.restriction?.reason || 'Administrative action'}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-red-700">Date</p>
                          <p className="text-red-900">{formatDate(selectedUser.restriction?.restriction_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-red-700">Duration</p>
                          <p className="text-red-900">{selectedUser.restriction?.duration}</p>
                        </div>
                      </div>
                      {selectedUser.restriction && selectedUser.restriction.report_count > 0 && (
                        <div className="flex items-start">
                          <svg className="h-5 w-5 text-red-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-red-700">Reports</p>
                            <p className="text-red-900">{formatReportCount(selectedUser.restriction?.report_count)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-8 border-t pt-6">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                    Send Message
                  </button>
                  {selectedUser.status === 'restricted' ? (
                    <button
                      onClick={() => setShowUnrestrictModal(true)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-opacity-90 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Remove Restrictions'}
                    </button>
                  ) : (
                    <button
                      onClick={() => openRestrictModal(selectedUser)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Restrict User'}
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