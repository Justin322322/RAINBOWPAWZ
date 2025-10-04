'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LoadingSpinner } from '@/app/admin/services/client';

export default function RestrictedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [restrictionReason, setRestrictionReason] = useState<string | null>(null);

  useEffect(() => {
    // Check if user should be on this page
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/auth/check-business-status');
        const result = await response.json();

        if (result.success) {
          const serviceProvider = result.serviceProvider;

          // If no service provider data, redirect to pending verification
          if (!serviceProvider) {
            router.push('/cremation/pending-verification');
            return;
          }

          const applicationStatus = serviceProvider.application_status ?
                                   String(serviceProvider.application_status).toLowerCase() : null;

          // If not restricted, redirect to appropriate page
          if (applicationStatus === 'approved') {
            router.push('/cremation/dashboard');
            return;
          } else if (applicationStatus !== 'restricted') {
            router.push('/cremation/pending-verification');
            return;
          }

          // Set restriction reason if available
          if (serviceProvider.restriction && serviceProvider.restriction.reason) {
            setRestrictionReason(serviceProvider.restriction.reason);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking status:', error);
        setLoading(false);
      }
    };

    checkStatus();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md overflow-hidden text-center">
        <div className="bg-red-600 p-6 mb-4">
          <Image
            src="/logo.png"
            alt="Rainbow Paws Logo"
            width={120}
            height={120}
            className="mx-auto"
          />
          <h1 className="text-2xl font-semibold text-white mt-4">Account Restricted</h1>
        </div>

        <div className="px-8 pb-8">
          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <p className="text-gray-700 mb-2">
                Your business account has been restricted by our administrators.
              </p>
              {restrictionReason && (
                <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-md">
                  <p className="text-sm font-medium text-red-800 mb-1">Restriction Reason:</p>
                  <p className="text-sm text-red-700">{restrictionReason}</p>
                </div>
              )}
              <p className="text-gray-700">
                Please submit an appeal to request a review of your account status.
              </p>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-800 mb-2">What can you do?</h2>
            <ul className="text-left text-gray-600 space-y-2">
                             <li className="flex items-start">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                 </svg>
                 <span>Submit an appeal to request account review</span>
               </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Review our terms of service and policies</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Submit an appeal to request account review</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Wait for admin review of your account status</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => router.push('/appeals')}
              className="w-full px-4 py-2 bg-[var(--primary-green)] text-white rounded-lg hover:bg-[var(--primary-green-hover)] transition-all duration-300 font-medium"
            >
              Submit Appeal
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all duration-300"
            >
              Return to Home
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300"
            >
              Check Status Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
