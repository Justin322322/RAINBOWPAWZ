'use client';

import { useState, useEffect } from 'react';
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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from '@/components/ConfirmationModal';

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
  city?: string;
  province?: string;
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

        const response = await fetch('/api/admin/cremation-businesses');

        if (!response.ok) {
          throw new Error(`Failed to fetch cremation centers: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch cremation centers');
        }

        // Add default rating if not provided
        const centersWithRating = data.businesses.map((center: any) => ({
          ...center,
          rating: center.rating || Math.floor(Math.random() * 3) + 3, // Random rating between 3-5 if not provided
        }));

        setCremationCenters(centersWithRating);
      } catch (err) {
        console.error('Error fetching cremation centers:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        showToast('Failed to load cremation centers. Using sample data instead.', 'error');

        // Use sample data as fallback
        setCremationCenters([
          {
            id: 'CC001',
            name: 'Peaceful Paws Cremation',
            owner: 'John Smith',
            email: 'john@peacefulpaws.com',
            phone: '(555) 123-4567',
            address: 'Balanga City, Bataan, Philippines',
            registrationDate: 'May 10, 2023',
            status: 'active',
            activeServices: 5,
            totalBookings: 48,
            revenue: '₱5,680',
            rating: 4.8,
            description: 'We provide compassionate pet cremation services with personalized memorials.',
            verified: true
          },
          {
            id: 'CC002',
            name: 'Rainbow Bridge Memorial',
            owner: 'David Chen',
            email: 'david@rainbowbridge.com',
            phone: '(555) 345-6789',
            address: 'Tenejero, Balanga City, Bataan, Philippines',
            registrationDate: 'May 20, 2023',
            status: 'active',
            activeServices: 7,
            totalBookings: 61,
            revenue: '₱7,240',
            rating: 4.9,
            description: 'Providing pet cremation services with various memorial options and keepsakes.',
            verified: true
          },
          {
            id: 'CC003',
            name: "Heaven's Gateway Pet Services",
            owner: 'Maria Rodriguez',
            email: 'maria@heavensgateway.com',
            phone: '(555) 234-5678',
            address: 'Tuyo, Balanga City, Bataan, Philippines',
            registrationDate: 'June 5, 2023',
            status: 'active',
            activeServices: 4,
            totalBookings: 35,
            revenue: '₱4,120',
            rating: 4.7,
            description: 'Dignified pet cremation services with eco-friendly options and memorial keepsakes.',
            verified: true
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCremationCenters();
  }, [showToast]);

  // Filter cremation centers based on search term and status filter
  const filteredCenters = cremationCenters.filter(center => {
    const matchesSearch =
      center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(center.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      center.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || center.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (center: any) => {
    setSelectedCenter(center);
    setShowDetailsModal(true);
  };

  // Function to open the restrict modal
  const openRestrictModal = (center: CremationCenter) => {
    setCenterToAction(center);
    setShowRestrictModal(true);
  };

  // Function to open the restore modal
  const openRestoreModal = (center: CremationCenter) => {
    setCenterToAction(center);
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
          action: 'restrict'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to restrict cremation center');
      }

      // Update the center's status in the local state to ensure it shows as restricted
      setCremationCenters(prevCenters =>
        prevCenters.map(c =>
          c.id === center.id ? { ...c, status: 'restricted' } : c
        )
      );

      // If the center is currently selected in the modal, update it
      if (selectedCenter && selectedCenter.id === center.id) {
        setSelectedCenter({ ...selectedCenter, status: 'restricted' });
      }

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
      console.error('Error restricting cremation center:', err);
      showToast(err instanceof Error ? err.message : 'Failed to restrict cremation center', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle restoring a cremation center
  const handleRestoreCenter = async (center: CremationCenter) => {
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
          action: 'restore'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to restore cremation center');
      }

      // Update the center's status in the local state to ensure it shows as active
      setCremationCenters(prevCenters =>
        prevCenters.map(c =>
          c.id === center.id ? { ...c, status: 'active', verified: true } : c
        )
      );

      // If the center is currently selected in the modal, update it
      if (selectedCenter && selectedCenter.id === center.id) {
        setSelectedCenter({ ...selectedCenter, status: 'active', verified: true });
      }

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
    } catch (err) {
      console.error('Error restoring cremation center:', err);
      showToast(err instanceof Error ? err.message : 'Failed to restore cremation center', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status badge based on center status
  const getStatusBadge = (status: string, verified: boolean) => {
    // If status is explicitly 'restricted', show that first
    if (status === 'restricted') {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
          Restricted
        </span>
      );
    }

    // Then check verification status (only if not restricted)
    if (!verified) {
      return (
        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
          Pending
        </span>
      );
    }

    // Handle other statuses
    switch(status) {
      case 'active':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            Inactive
          </span>
        );
      case 'probation':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Probation
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 min-w-[90px] justify-center">
            {status}
          </span>
        );
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
                <option value="inactive">Inactive</option>
                <option value="probation">Probation</option>
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

      {/* Success Animation Overlays */}
      <AnimatePresence>
        {isRestrictSuccess && (
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
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
              <h3 className="text-xl font-medium text-gray-900 mb-2">Access Restored</h3>
              <p className="text-gray-600 mb-6">
                {successCenterName} has been restored successfully. They can now accept new bookings.
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
            <button className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors duration-300">
              Add New Center
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)] mb-4"></div>
            <p className="text-gray-600">Loading cremation centers...</p>
          </div>
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
                    const response = await fetch('/api/admin/cremation-businesses');
                    if (!response.ok) {
                      throw new Error(`Failed to fetch cremation centers: ${response.status} ${response.statusText}`);
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
                    console.error('Error fetching cremation centers:', err);
                    setError(err instanceof Error ? err.message : 'An unknown error occurred');
                    showToast('Failed to load cremation centers', 'error');
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
                        <div className="flex-shrink-0 h-10 w-10 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center">
                          <BuildingStorefrontIcon className="h-6 w-6" />
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
                      {getStatusBadge(center.status, center.verified)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(center)}
                        className="text-[var(--primary-green)] hover:text-[var(--primary-green)] hover:underline mr-4"
                      >
                        View
                      </button>
                      {center.status !== 'restricted' ? (
                        <button
                          onClick={() => openRestrictModal(center)}
                          disabled={isProcessing}
                          className="text-red-600 hover:text-red-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Processing...' : 'Restrict'}
                        </button>
                      ) : (
                        <button
                          onClick={() => openRestoreModal(center)}
                          disabled={isProcessing}
                          className="text-green-600 hover:text-green-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Processing...' : 'Restore'}
                        </button>
                      )}
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
        onConfirm={() => centerToAction && handleRestrictCenter(centerToAction)}
        title="Restrict Cremation Center"
        message={`Are you sure you want to restrict "${centerToAction?.name}"? This will prevent them from accepting new bookings.`}
        confirmText="Restrict Access"
        confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
        icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600" />}
      />

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={() => centerToAction && handleRestoreCenter(centerToAction)}
        title="Restore Cremation Center"
        message={`Are you sure you want to restore access for "${centerToAction?.name}"? This will allow them to accept new bookings again.`}
        confirmText="Restore Access"
        confirmButtonClass="bg-green-600 hover:bg-green-700 focus:ring-green-500"
        icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
      />

      {/* Center Details Modal */}
      {showDetailsModal && selectedCenter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                    <div className="h-16 w-16 bg-[var(--primary-green)] text-white rounded-full flex items-center justify-center mr-4">
                      <BuildingStorefrontIcon className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold text-gray-900">{selectedCenter.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-gray-600">ID: {selectedCenter.id}</span>
                        {selectedCenter.rating && (
                          <>
                            <span>•</span>
                            <span className="flex items-center">
                              <span className="text-amber-500 mr-1">{selectedCenter.rating}</span>
                              <svg className="h-4 w-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center">
                          {selectedCenter.verified ? (
                            <span className="flex items-center text-green-600 text-sm">
                              <ShieldCheckIcon className="h-4 w-4 mr-1" />
                              Verified
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600 text-sm">
                              <ShieldExclamationIcon className="h-4 w-4 mr-1" />
                              Unverified
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(selectedCenter.status, selectedCenter.verified)}
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
                      onClick={() => openRestoreModal(selectedCenter)}
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