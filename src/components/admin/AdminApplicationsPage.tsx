'use client';

import { useState, useEffect } from 'react';
import AdminDashboardLayout from '@/components/navigation/AdminDashboardLayout';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentMagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';

interface AdminApplicationsPageProps {
  adminData: any;
}

export default function AdminApplicationsPage({ adminData }: AdminApplicationsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewing: 0,
    approved: 0,
    declined: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineNote, setDeclineNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch applications data
  const fetchApplicationsData = async () => {
    setIsLoading(true);
    try {
      // Fetch applications
      const appResponse = await fetch('/api/businesses/applications');
      if (appResponse.ok) {
        const data = await appResponse.json();
        setApplications(data.applications || []);
      }

      // Fetch statistics
      const statsResponse = await fetch('/api/businesses/applications/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching applications data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationsData();
  }, []);

  // Filter applications based on search term and status filter
  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      app.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (application: any) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  const handleApproveApplication = async (businessId: number) => {
    if (!confirm('Are you sure you want to approve this application? This action cannot be undone.')) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/businesses/applications/${businessId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to approve application');
      }

      // Close any open modals
      setShowDetailsModal(false);

      // Refresh data
      await fetchApplicationsData();

      // Show success message
      alert('Application approved successfully! The business owner has been notified.');
    } catch (error) {
      console.error('Error approving application:', error);
      alert(error.message || 'An error occurred while approving the application. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openDeclineModal = (application: any) => {
    setSelectedApplication(application);
    setDeclineNote('');
    setShowDeclineModal(true);
  };

  const handleDeclineApplication = async () => {
    // Validate decline note
    if (!declineNote.trim()) {
      alert('Please provide a reason for declining this application. This will be sent to the applicant.');
      return;
    }

    if (declineNote.length < 10) {
      alert('Please provide a more detailed reason for declining the application.');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/businesses/applications/${selectedApplication.businessId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: declineNote.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to decline application');
      }

      // Close modals
      setShowDeclineModal(false);
      setShowDetailsModal(false);

      // Refresh data
      await fetchApplicationsData();

      // Show success message
      alert('Application declined successfully. The applicant has been notified via email.');
    } catch (error) {
      console.error('Error declining application:', error);
      alert(error.message || 'An error occurred while declining the application. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status badge based on application status
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 min-w-[90px] justify-center">
            Pending
          </span>
        );
      case 'reviewing':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 min-w-[90px] justify-center">
            Reviewing
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 min-w-[90px] justify-center">
            Approved
          </span>
        );
      case 'declined':
        return (
          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 min-w-[90px] justify-center">
            Declined
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
    <AdminDashboardLayout activePage="applications" adminData={adminData}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Application Management</h1>
            <p className="mt-1 text-sm text-gray-600">Review and manage business applications</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white p-4 shadow-sm rounded-xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)] sm:text-sm"
                placeholder="Search applications..."
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
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Application Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-800 mr-4">
                <DocumentMagnifyingGlassIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          {/* More stats components... */}
        </div>
        
        {/* More UI components... */}
      </div>
    </AdminDashboardLayout>
  );
}
