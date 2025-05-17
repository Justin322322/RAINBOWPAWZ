'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OTPVerificationModal from '@/components/OTPVerificationModal';
import Image from 'next/image';

export default function VerifyOTPPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if we need OTP verification
    const needsVerification = sessionStorage.getItem('needs_otp_verification');
    
    // Get user data
    const userDataStr = sessionStorage.getItem('user_data');
    
    if (!needsVerification || !userDataStr) {
      // If not, redirect to home
      router.replace('/');
      return;
    }
    
    try {
      const parsedData = JSON.parse(userDataStr);
      setUserData(parsedData);
    } catch (e) {
      // If parsing fails, redirect to home
      router.replace('/');
      return;
    }
    
    setLoading(false);
  }, [router]);
  
  const handleVerificationSuccess = () => {
    // Update user data to reflect verification
    if (userData) {
      const updatedUserData = {
        ...userData,
        is_otp_verified: 1
      };
      
      // Update all persistence mechanisms in synchronized way
      try {
        // 1. Update session storage
        sessionStorage.setItem('user_data', JSON.stringify(updatedUserData));
        sessionStorage.setItem('otp_verified', 'true');
        sessionStorage.removeItem('needs_otp_verification');
        
        // 2. Update global state to ensure HOC doesn't redirect
        try {
          // @ts-ignore - access global variable from HOC
          if (typeof globalUserAuthState !== 'undefined') {
            // @ts-ignore
            globalUserAuthState.verified = true;
            // @ts-ignore
            globalUserAuthState.userData = updatedUserData;
          }
        } catch (e) {
        }
        
        // 3. Additional localStorage backup
        localStorage.setItem('user_verified', 'true');
        
        
        // Use timeout to ensure all states have been properly updated before navigating
        setTimeout(() => {
          router.push('/user/furparent_dashboard');
        }, 100);
      } catch (e) {
        // If there's an error, still try to redirect
        router.push('/user/furparent_dashboard');
      }
    } else {
      router.push('/');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="mb-6">
          <Image
            src="/logo.png"
            alt="Rainbow Paws Logo"
            width={80}
            height={80}
            className="mx-auto"
          />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-4">OTP Verification Required</h2>
        <p className="text-gray-600 mb-6">
          For your security, we need to verify your account with a one-time password (OTP) 
          before you can access the dashboard.
        </p>
        
        {userData && (
          <OTPVerificationModal
            isOpen={true}
            onVerificationSuccess={handleVerificationSuccess}
            userEmail={userData.email}
            userId={userData.id}
            onClose={() => {
              // If user closes the modal without verifying, send them back to home
              router.replace('/');
            }}
          />
        )}
      </div>
    </div>
  );
} 