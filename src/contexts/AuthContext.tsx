'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Define the shape of user data for different user types
export interface BaseUserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
  role: string;
  [key: string]: any;
}

export interface AdminData extends BaseUserData {
  username: string;
  full_name: string;
  user_type: 'admin';
  role: 'admin';
}

export interface BusinessData extends BaseUserData {
  user_type: 'business';
  role: 'business';
  business_id?: number;
  business_name?: string;
  service_provider?: any;
  is_otp_verified: number;
}

export interface UserData extends BaseUserData {
  user_type: 'user';
  role: 'user' | 'fur_parent';
  is_otp_verified: number;
  is_verified: boolean;
  phone?: string;
  address?: string;
  created_at: string;
}

export type AuthUserData = AdminData | BusinessData | UserData;

interface AuthState {
  isAuthenticated: boolean;
  userData: AuthUserData | null;
  userType: 'admin' | 'business' | 'user' | null;
  isOtpVerified: boolean;
  isLoading: boolean;
  isBusinessVerified: boolean;
}

interface AuthContextType extends AuthState {
  setUserData: (userData: AuthUserData | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsOtpVerified: (isVerified: boolean) => void;
  updateUserData: (updates: Partial<AuthUserData>) => void;
  clearAuthState: () => void;
  syncFromStorage: () => void;
  checkAuthStatus: () => Promise<void>;
  redirectToDashboard: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userData: null,
    userType: null,
    isOtpVerified: false,
    isLoading: true,
    isBusinessVerified: false,
  });

  // Centralized function to update storage
  const updateStorage = useCallback((userData: AuthUserData | null, isOtpVerified: boolean) => {
    try {
      if (userData) {
        // Store user data based on type
        if (userData.user_type === 'admin') {
          sessionStorage.setItem('admin_data', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('user_data', JSON.stringify(userData));
        }
        
        // Store OTP verification status
        localStorage.setItem('user_verified', isOtpVerified ? 'true' : 'false');
        sessionStorage.setItem('otp_verified', isOtpVerified ? 'true' : 'false');
        
        // Store business verification cache if applicable
        if (userData.user_type === 'business' && userData.service_provider) {
          sessionStorage.setItem('business_verification_cache', JSON.stringify({
            verified: true,
            userData: userData,
            timestamp: Date.now()
          }));
          
          // Store user full name for navbar
          const fullName = `${userData.first_name} ${userData.last_name}`.trim();
          sessionStorage.setItem('user_full_name', fullName);
        }
      } else {
        // Clear all storage
        sessionStorage.removeItem('user_data');
        sessionStorage.removeItem('admin_data');
        sessionStorage.removeItem('business_verification_cache');
        localStorage.removeItem('user_verified');
        sessionStorage.removeItem('otp_verified');
        sessionStorage.removeItem('user_full_name');
      }
    } catch (error) {
      console.warn('Failed to update storage:', error);
    }
  }, []);

  // Sync state from storage
  const syncFromStorage = useCallback(() => {
    try {
      // Check for admin data first
      const cachedAdminData = sessionStorage.getItem('admin_data');
      if (cachedAdminData) {
        const parsedData = JSON.parse(cachedAdminData) as AdminData;
        
        setAuthState({
          isAuthenticated: true,
          userData: parsedData,
          userType: 'admin',
          isOtpVerified: true, // Admins don't need OTP verification
          isLoading: false,
          isBusinessVerified: true, // Admins are always verified
        });
        return;
      }

      // Check for user data
      const cachedUserData = sessionStorage.getItem('user_data');
      if (cachedUserData) {
        const parsedData = JSON.parse(cachedUserData) as BusinessData | UserData;
        const otpVerified = sessionStorage.getItem('otp_verified') === 'true';
        
        setAuthState({
          isAuthenticated: true,
          userData: parsedData,
          userType: parsedData.user_type as 'business' | 'user',
          isOtpVerified: parsedData.is_otp_verified === 1 || otpVerified,
          isLoading: false,
          isBusinessVerified: parsedData.user_type === 'business' && parsedData.service_provider?.application_status === 'approved',
        });
        return;
      }

      // No cached data
      setAuthState({
        isAuthenticated: false,
        userData: null,
        userType: null,
        isOtpVerified: false,
        isLoading: false,
        isBusinessVerified: false,
      });
    } catch (error) {
      console.warn('Failed to sync from storage:', error);
      setAuthState({
        isAuthenticated: false,
        userData: null,
        userType: null,
        isOtpVerified: false,
        isLoading: false,
        isBusinessVerified: false,
      });
    }
  }, []);

  // Check authentication status from API
  const checkAuthStatus = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      // Check admin auth first
      try {
        const adminResponse = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
        });

        if (adminResponse.ok) {
          const adminResult = await adminResponse.json();
          if (adminResult.authenticated && adminResult.accountType === 'admin' && adminResult.userId) {
            // Fetch admin data
            const adminDataResponse = await fetch(`/api/admins/${adminResult.userId}`);
            if (adminDataResponse.ok) {
              const adminData = await adminDataResponse.json() as AdminData;
              if (adminData.user_type === 'admin') {
                setAuthState({
                  isAuthenticated: true,
                  userData: adminData,
                  userType: 'admin',
                  isOtpVerified: true,
                  isLoading: false,
                  isBusinessVerified: true,
                });
                updateStorage(adminData, true);
                return;
              }
            }
          }
        }
      } catch {
        // Continue to check other auth types
      }

      // Check business auth
      try {
        const businessResponse = await fetch('/api/auth/check-business-status', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
        });

        if (businessResponse.ok) {
          const businessResult = await businessResponse.json();
          if (businessResult.success && businessResult.user && businessResult.serviceProvider) {
            const user = businessResult.user;
            const serviceProvider = businessResult.serviceProvider;

            if (user.user_type === 'business' && serviceProvider.application_status === 'approved') {
              const businessData: BusinessData = {
                ...user,
                business_id: serviceProvider.provider_id,
                business_name: serviceProvider.name,
                service_provider: serviceProvider,
                is_otp_verified: 1, // Business users don't need OTP
              };

              setAuthState({
                isAuthenticated: true,
                userData: businessData,
                userType: 'business',
                isOtpVerified: true,
                isLoading: false,
                isBusinessVerified: true,
              });
              updateStorage(businessData, true);
              return;
            }
          }
        }
      } catch {
        // Continue to check user auth
      }

      // Check user auth
      try {
        const userResponse = await fetch('/api/auth/check-user-status', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
        });

        if (userResponse.ok) {
          const userResult = await userResponse.json();
          if (userResult.success && userResult.user) {
            const userData = userResult.user as UserData;
            if (userData.user_type === 'user' || userData.role === 'fur_parent') {
              const otpVerified = sessionStorage.getItem('otp_verified') === 'true';
              
              setAuthState({
                isAuthenticated: true,
                userData: userData,
                userType: 'user',
                isOtpVerified: userData.is_otp_verified === 1 || otpVerified,
                isLoading: false,
                isBusinessVerified: false,
              });
              updateStorage(userData, userData.is_otp_verified === 1 || otpVerified);
              return;
            }
          }
        }
      } catch {
        // Auth check failed
      }

      // No valid auth found
      setAuthState({
        isAuthenticated: false,
        userData: null,
        userType: null,
        isOtpVerified: false,
        isLoading: false,
        isBusinessVerified: false,
      });
      updateStorage(null, false);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthState({
        isAuthenticated: false,
        userData: null,
        userType: null,
        isOtpVerified: false,
        isLoading: false,
        isBusinessVerified: false,
      });
    }
  }, [updateStorage]);

  // Redirect to appropriate dashboard
  const redirectToDashboard = useCallback(() => {
    if (!authState.userType) return;
    
    switch (authState.userType) {
      case 'admin':
        router.push('/admin/dashboard');
        break;
      case 'business':
        router.push('/cremation/dashboard');
        break;
      case 'user':
        router.push('/user/furparent_dashboard');
        break;
      default:
        router.push('/');
    }
  }, [authState.userType, router]);

  // Initialize from storage on mount
  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  const setUserData = useCallback((userData: AuthUserData | null) => {
    setAuthState(prev => {
      const newState = {
        ...prev,
        userData,
        isAuthenticated: !!userData,
        userType: userData?.user_type as 'admin' | 'business' | 'user' | null,
        isOtpVerified: userData ? 
          (userData.user_type === 'admin' || userData.user_type === 'business' || userData.is_otp_verified === 1) : 
          false,
        isBusinessVerified: userData ? 
          (userData.user_type === 'admin' || (userData.user_type === 'business' && userData.service_provider?.application_status === 'approved')) : 
          false,
      };
      updateStorage(userData, newState.isOtpVerified);
      return newState;
    });
  }, [updateStorage]);

  const setIsAuthenticated = useCallback((isAuthenticated: boolean) => {
    setAuthState(prev => ({
      ...prev,
      isAuthenticated,
    }));
  }, []);

  const setIsOtpVerified = useCallback((isVerified: boolean) => {
    setAuthState(prev => {
      if (!prev.userData) return prev;
      
      const newState = {
        ...prev,
        isOtpVerified: isVerified,
        userData: prev.userData.user_type === 'user' ? 
          { ...prev.userData, is_otp_verified: isVerified ? 1 : 0 } : 
          prev.userData,
      };
      updateStorage(newState.userData, isVerified);
      return newState;
    });
  }, [updateStorage]);

  const updateUserData = useCallback((updates: Partial<AuthUserData>) => {
    setAuthState(prev => {
      if (!prev.userData) return prev;
      
      const updatedUserData = { ...prev.userData, ...updates };
      const newState = {
        ...prev,
        userData: updatedUserData,
        isOtpVerified: updatedUserData.user_type === 'admin' || 
                      updatedUserData.user_type === 'business' || 
                      updatedUserData.is_otp_verified === 1,
        isBusinessVerified: updatedUserData.user_type === 'admin' || 
                           (updatedUserData.user_type === 'business' && updatedUserData.service_provider?.application_status === 'approved'),
      };
      updateStorage(updatedUserData, newState.isOtpVerified);
      return newState;
    });
  }, [updateStorage]);

  const clearAuthState = useCallback(() => {
    setAuthState({
      isAuthenticated: false,
      userData: null,
      userType: null,
      isOtpVerified: false,
      isLoading: false,
      isBusinessVerified: false,
    });
    updateStorage(null, false);
  }, [updateStorage]);

  const contextValue: AuthContextType = {
    ...authState,
    setUserData,
    setIsAuthenticated,
    setIsOtpVerified,
    updateUserData,
    clearAuthState,
    syncFromStorage,
    checkAuthStatus,
    redirectToDashboard,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
