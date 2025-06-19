'use client';

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import ToastContainer, { ToastMessage, ToastType } from '@/components/ui/ToastContainer';

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Track all timeout IDs for proper cleanup
  const timeoutIdsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const showToast = (message: string, type: ToastType = 'info', duration: number = 4000) => {
    // Check if a similar toast already exists to prevent duplicates
    const existingToast = toasts.find(toast => 
      toast.message === message && toast.type === type
    );
    
    if (existingToast) {
      // Update the existing toast's timeout
      hideToast(existingToast.id);
    }

    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };
    
    setToasts((prev) => {
      // Limit maximum number of toasts shown at once
      const maxToasts = 3;
      const filteredToasts = prev.slice(-(maxToasts - 1));
      return [...filteredToasts, newToast];
    });

    // Auto-remove toast after specified duration (default 4 seconds)
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        hideToast(id);
      }, duration);
      
      // Track timeout for cleanup
      timeoutIdsRef.current.set(id, timeoutId);
    }

    return id;
  };

  const hideToast = (id: string) => {
    // Clear associated timeout if it exists
    const timeoutId = timeoutIdsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(id);
    }
    
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Cleanup all timeouts on component unmount
  useEffect(() => {
    return () => {
      // Clear all pending timeouts
      timeoutIdsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutIdsRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}
