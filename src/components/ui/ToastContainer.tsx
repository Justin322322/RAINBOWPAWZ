'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export default function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) return null;

  // Use createPortal to render toasts at the document body level
  return createPortal(
    <div className="fixed top-4 left-0 right-0 mx-auto z-[9999] space-y-3 w-full flex flex-col items-center pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={true}
            onClose={() => onClose(toast.id)}
          />
        </div>
      ))}
    </div>,
    document.body
  );
}
