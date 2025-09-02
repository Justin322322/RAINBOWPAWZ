'use client';

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';

// UserData interface kept local to this file for AuthStateContext functionality
// External usage should import from withUserAuth.tsx

interface UserData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_otp_verified: number;
  user_type: string;
  [key: string]: any;
}

interface AuthState {
  isAuthenticated: boolean;
  userData: UserData | null;
  isOtpVerified: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  setUserData: (userData: UserData | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsOtpVerified: (isVerified: boolean) => void;
  updateUserData: (updates: Partial<UserData>) => void;
  clearAuthState: () => void;
  syncFromStorage: () => void;
}

const AuthStateContext = createContext<AuthContextType | undefined>(undefined);



interface AuthStateProviderProps {
  children: ReactNode;
}

export function AuthStateProvider({ children }: AuthStateProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userData: null,
    isOtpVerified: false,
    isLoading: true,
  });

  // Centralized function to update storage
  const updateStorage = useCallback((userData: UserData | null, isOtpVerified: boolean) => {
    try {
      if (userData) {
        sessionStorage.setItem('user_data', JSON.stringify(userData));
        localStorage.setItem('user_verified', isOtpVerified ? 'true' : 'false');
        sessionStorage.setItem('otp_verified', isOtpVerified ? 'true' : 'false');
      } else {
        sessionStorage.removeItem('user_data');
        localStorage.removeItem('user_verified');
        sessionStorage.removeItem('otp_verified');
        sessionStorage.removeItem('needs_otp_verification');
      }
    } catch (error) {
      console.warn('Failed to update storage:', error);
    }
  }, []);

  // Sync state from storage
  const syncFromStorage = useCallback(() => {
    try {
      const cachedUserData = sessionStorage.getItem('user_data');
      const otpVerified = sessionStorage.getItem('otp_verified') === 'true';
      
      if (cachedUserData) {
        const parsedData = JSON.parse(cachedUserData);
        setAuthState({
          isAuthenticated: true,
          userData: parsedData,
          isOtpVerified: parsedData.is_otp_verified === 1 || otpVerified,
          isLoading: false,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          userData: null,
          isOtpVerified: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.warn('Failed to sync from storage:', error);
      setAuthState({
        isAuthenticated: false,
        userData: null,
        isOtpVerified: false,
        isLoading: false,
      });
    }
  }, []);

  // Initialize from storage on mount
  useEffect(() => {
    syncFromStorage();
  }, [syncFromStorage]);

  const setUserData = useCallback((userData: UserData | null) => {
    setAuthState(prev => {
      const newState = {
        ...prev,
        userData,
        isAuthenticated: !!userData,
        isOtpVerified: userData ? (userData.is_otp_verified === 1 || prev.isOtpVerified) : false,
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
      const newState = {
        ...prev,
        isOtpVerified: isVerified,
        userData: prev.userData ? { ...prev.userData, is_otp_verified: isVerified ? 1 : 0 } : null,
      };
      updateStorage(newState.userData, isVerified);
      return newState;
    });
  }, [updateStorage]);

  const updateUserData = useCallback((updates: Partial<UserData>) => {
    setAuthState(prev => {
      if (!prev.userData) return prev;
      
      const updatedUserData = { ...prev.userData, ...updates };
      const newState = {
        ...prev,
        userData: updatedUserData,
        isOtpVerified: updatedUserData.is_otp_verified === 1 || prev.isOtpVerified,
      };
      updateStorage(updatedUserData, newState.isOtpVerified);
      return newState;
    });
  }, [updateStorage]);

  const clearAuthState = useCallback(() => {
    setAuthState({
      isAuthenticated: false,
      userData: null,
      isOtpVerified: false,
      isLoading: false,
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
  };

  return (
    <AuthStateContext.Provider value={contextValue}>
      {children}
    </AuthStateContext.Provider>
  );
}
