'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ExclamationTriangleIcon,
  DocumentTextIcon,

  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useToast } from '@/context/ToastContext';

interface Appeal {
  appeal_id: number;
  subject: string;
  message: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  admin_response?: string;
  submitted_at: string;
  reviewed_at?: string;
  resolved_at?: string;
  evidence_files: string[];
  history?: AppealHistoryItem[];
}

interface AppealHistoryItem {
  history_id: number;
  previous_status?: string;
  new_status: string;
  admin_first_name?: string;
  admin_last_name?: string;
  admin_response?: string;
  changed_at: string;
  notes?: string;
}

export default function AppealsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [_selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [_userStatus, setUserStatus] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    appeal_type: 'restriction'
  });

  const checkUserStatusAndLoadAppeals = useCallback(async () => {
    try {
      // Try to check authentication using the general auth endpoint first
      let authResponse = await fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!authResponse.ok) {
        // If general auth fails, redirect to home page (not /login)
        router.push('/');
        return;
      }

      const authData = await authResponse.json();

      if (!authData.authenticated) {
        router.push('/');
        return;
      }

      // Now get detailed user status based on account type
      let userStatusResponse;
      if (authData.accountType === 'business') {
        userStatusResponse = await fetch('/api/auth/check-business-status');
      } else if (authData.accountType === 'user') {
        userStatusResponse = await fetch('/api/auth/check-user-status');
      } else {
        // Admin users shouldn't access appeals page
        router.push('/admin/dashboard');
        return;
      }

      if (!userStatusResponse.ok) {
        router.push('/');
        return;
      }

      const statusData = await userStatusResponse.json();

      // For business users, check service provider status
      if (authData.accountType === 'business') {
        const serviceProvider = statusData.serviceProvider;
        if (!serviceProvider) {
          router.push('/cremation/pending-verification');
          return;
        }

        const applicationStatus = serviceProvider.application_status ?
                                 String(serviceProvider.application_status).toLowerCase() : null;

        if (applicationStatus !== 'restricted') {
          // Not restricted, redirect to dashboard
          router.push('/cremation/dashboard');
          return;
        }

        setUserStatus('restricted');
      } else {
        // For personal users, check user status
        const user = statusData.user;
        if (!user || user.status !== 'restricted') {
          // Not restricted, redirect to dashboard
          router.push('/user/furparent_dashboard');
          return;
        }

        setUserStatus(user.status);
      }

      // Appeals will be loaded separately
    } catch (error) {
      console.error('Error checking user status:', error);
      showToast('Error loading page', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  const loadAppeals = useCallback(async () => {
    try {
      const response = await fetch('/api/appeals');
      if (response.ok) {
        const data = await response.json();
        const appealsWithHistory = await Promise.all(
          (data.appeals || []).map(async (appeal: Appeal) => {
            const history = await loadAppealHistory(appeal.appeal_id);
            return { ...appeal, history };
          })
        );
        setAppeals(appealsWithHistory);
      }
    } catch (error) {
      console.error('Error loading appeals:', error);
    }
  }, []);

  // Add useEffect after functions are defined
  useEffect(() => {
    const initializePage = async () => {
      await checkUserStatusAndLoadAppeals();
      await loadAppeals();
    };
    initializePage();
  }, [checkUserStatusAndLoadAppeals, loadAppeals]);

  const loadAppealHistory = async (appealId: number) => {
    try {
      const response = await fetch(`/api/appeals/${appealId}/history`);
      if (response.ok) {
        const data = await response.json();
        return data.history || [];
      }
    } catch (error) {
      console.error('Error loading appeal history:', error);
    }
    return [];
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/appeals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Appeal submitted successfully', 'success');
        setFormData({ subject: '', message: '', appeal_type: 'restriction' });
        setShowForm(false);
        await loadAppeals();
      } else {
        showToast(data.error || 'Failed to submit appeal', 'error');
      }
    } catch (error) {
      console.error('Error submitting appeal:', error);
      showToast('Failed to submit appeal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'under_review':
        return <EyeIcon className="h-5 w-5 text-blue-500" />;
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under_review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-green)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <Image
              src="/logo.png"
              alt="Rainbow Paws Logo"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Account Appeals</h1>
              <p className="text-gray-600">Submit and track your account restriction appeals</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Status Alert */}
        <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-medium text-red-800 mb-2">Account Restricted</h3>
              <p className="text-red-700 mb-4">
                Your account has been restricted. You can submit an appeal below to request a review of this decision.
              </p>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => setShowForm(true)}
                  disabled={appeals.some(appeal => ['pending', 'under_review'].includes(appeal.status))}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Submit New Appeal
                </button>
                {appeals.some(appeal => ['pending', 'under_review'].includes(appeal.status)) && (
                  <p className="text-sm text-red-600 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    You have a pending appeal
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Appeal Form */}
        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Submit New Appeal</h3>
              <p className="text-sm text-gray-600 mt-1">
                Please provide detailed information about why you believe your account should be unrestricted.
              </p>
            </div>
            <form onSubmit={handleSubmitAppeal} className="p-6 space-y-6">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                  placeholder="Brief description of your appeal"
                  maxLength={255}
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Explanation *
                </label>
                <textarea
                  id="message"
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-green)] focus:border-[var(--primary-green)]"
                  placeholder="Please explain in detail why you believe your account restriction should be lifted. Include any relevant information or context that might help with the review."
                  maxLength={5000}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.message.length}/5000 characters
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting Appeal...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                      </svg>
                      Submit Appeal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Appeals List */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Your Appeals</h3>
            <p className="text-sm text-gray-600 mt-1">
              Track the status of your submitted appeals
            </p>
          </div>

          {appeals.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No appeals submitted yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Submit your first appeal using the form above
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {appeals.map((appeal) => (
                <div key={appeal.appeal_id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(appeal.status)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appeal.status)}`}>
                          {appeal.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        {appeal.subject}
                      </h4>
                      <p className="text-gray-600 mb-3 line-clamp-3">
                        {appeal.message}
                      </p>
                      <div className="text-sm text-gray-500">
                        <p>Submitted: {formatDate(appeal.submitted_at)}</p>
                        {appeal.reviewed_at && (
                          <p>Reviewed: {formatDate(appeal.reviewed_at)}</p>
                        )}
                        {appeal.resolved_at && (
                          <p>Resolved: {formatDate(appeal.resolved_at)}</p>
                        )}
                      </div>
                      {appeal.admin_response && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm font-medium text-blue-800 mb-1">Admin Response:</p>
                          <p className="text-sm text-blue-700">{appeal.admin_response}</p>
                        </div>
                      )}

                      {/* Status History */}
                      {appeal.history && appeal.history.length > 1 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Status History:</p>
                          <div className="space-y-2">
                            {appeal.history.slice(-3).map((historyItem, _index) => (
                              <div key={historyItem.history_id} className="flex items-center text-xs text-gray-600">
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                  historyItem.new_status === 'approved' ? 'bg-green-500' :
                                  historyItem.new_status === 'rejected' ? 'bg-red-500' :
                                  historyItem.new_status === 'under_review' ? 'bg-blue-500' :
                                  'bg-yellow-500'
                                }`}></div>
                                <span className="capitalize">{historyItem.new_status.replace('_', ' ')}</span>
                                <span className="mx-2">•</span>
                                <span>{formatDate(historyItem.changed_at)}</span>
                                {historyItem.admin_first_name && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>by {historyItem.admin_first_name} {historyItem.admin_last_name}</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedAppeal(appeal)}
                      className="ml-4 text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
