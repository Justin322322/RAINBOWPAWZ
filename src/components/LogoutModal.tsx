'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { clearAuthToken } from '@/utils/auth';
import { useToast } from '@/context/ToastContext';

import { clearGlobalAdminAuthState } from '@/components/withAdminAuth';
import { clearGlobalBusinessAuthState } from '@/components/withBusinessVerification';
import { clearGlobalUserAuthState } from '@/components/withUserAuth';
import { Modal } from '@/components/ui/Modal';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export default function LogoutModal({ isOpen, onClose, userName = 'User' }: LogoutModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutSuccess, setLogoutSuccess] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      // Call the logout API
      const _response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Show success state
      setLogoutSuccess(true);

      // Show toast notification
      showToast('Logged out successfully. See you soon!', 'success');

      // Clear client-side auth data
      clearAuthToken();

      // Clear business verification cache (functionality removed)
      
      // Clear global admin auth state
      clearGlobalAdminAuthState();
      
      // Clear global business auth state
      clearGlobalBusinessAuthState();
      
      // Clear global user auth state
      clearGlobalUserAuthState();

      // Set logout flag to prevent 401 modal errors during logout
      sessionStorage.setItem('is_logging_out', 'true');

      // Clear session storage - be more thorough for cremation users
      sessionStorage.removeItem('user_data');
      sessionStorage.removeItem('admin_data');
      sessionStorage.removeItem('otp_verified');
      sessionStorage.removeItem('auth_user_id');
      sessionStorage.removeItem('auth_account_type');
      
      // Clear cremation-specific session storage keys
      sessionStorage.removeItem('business_verification_cache');
      sessionStorage.removeItem('verified_business');
      sessionStorage.removeItem('cremation_user_name');
      sessionStorage.removeItem('user_full_name');
      
      // Clear any localStorage auth tokens (for development)
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_token_3000');
        localStorage.removeItem('cremation_user_name');
      }

      // Redirect to home page after a short delay
      setTimeout(() => {
        // Clear the logout flag after redirect
        sessionStorage.removeItem('is_logging_out');
        router.push('/');
      }, 1500);
    } catch {
      // Set logout flag to prevent 401 modal errors during logout
      sessionStorage.setItem('is_logging_out', 'true');

      // Still clear the token and redirect even if the API call fails
      clearAuthToken();

      // Clear business verification cache even on error (functionality removed)
      clearGlobalAdminAuthState();
      clearGlobalBusinessAuthState();
      clearGlobalUserAuthState();

      showToast('Logged out successfully', 'success');
      router.push('/');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={!isLoggingOut ? onClose : () => {}}
      title={logoutSuccess ? "Logged Out Successfully" : "Confirm Logout"}
      size="small"
      dialogClassName="bg-white"
    >
      <AnimatePresence mode="wait">
        {logoutSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="py-8 flex flex-col items-center justify-center text-center"
          >
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Goodbye{userName ? `, ${userName}` : ''}!</h2>
            <p className="text-gray-600 mb-6">You&apos;ve been successfully logged out. Redirecting to home page...</p>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-green-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-6 text-center"
          >
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Are you sure you want to log out?</h3>
              <p className="text-gray-600">You will need to log in again to access your account.</p>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoggingOut}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 disabled:opacity-50 flex items-center"
              >
                {isLoggingOut ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging out...
                  </>
                ) : (
                  'Log out'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
