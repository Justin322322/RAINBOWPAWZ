'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LoadingSpinner } from '@/app/cremation/components/LoadingComponents';

export default function PendingVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Check verification status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // With JWT authentication, we don't need to parse cookies client-side
        // Just make the API call and let the server handle authentication

        // Use our new business status API endpoint
        const response = await fetch('/api/auth/check-business-status', {
          credentials: 'include', // Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // If unauthorized, redirect to home
          if (response.status === 401) {
            router.push('/');
            return;
          }
          setLoading(false);
          return;
        }

        const result = await response.json();

        if (!result.success) {
          setLoading(false);
          return;
        }

        const serviceProvider = result.serviceProvider;

        // If no service provider data exists, stay on pending page
        if (!serviceProvider) {
          setLoading(false);
          return;
        }

        // Check application_status
        const applicationStatus = serviceProvider.application_status ?
                                 String(serviceProvider.application_status).toLowerCase() : null;

        // If approved, redirect to dashboard
        if (applicationStatus === 'approved') {
          router.push('/cremation/dashboard');
          return;
        }

        // If restricted, redirect to restricted page
        if (applicationStatus === 'restricted') {
          router.push('/cremation/restricted');
          return;
        }

        // Otherwise, stay on this pending page
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
        <div className="bg-[var(--primary-green)] p-6 mb-4">
          <Image
            src="/logo.png"
            alt="Rainbow Paws Logo"
            width={120}
            height={120}
            className="mx-auto"
          />
          <h1 className="text-2xl font-semibold text-white mt-4">Account Pending Verification</h1>
        </div>

        <div className="px-8 pb-8">

        {loading ? (
          <LoadingSpinner className="py-8" />
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <p className="text-gray-700 mb-2">
              Your business account is currently under review by our administrators.
            </p>
            <p className="text-gray-700">
              You will receive an email notification once your account has been verified.
            </p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-800 mb-2">What happens next?</h2>
          <ul className="text-left text-gray-600 space-y-2">
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Our admin team will review your business information and documents</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>You&apos;ll receive an email notification when your account is verified</span>
            </li>
            <li className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Once verified, you&apos;ll have full access to the cremation center dashboard</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col space-y-3">
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
