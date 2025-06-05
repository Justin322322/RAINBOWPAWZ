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
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setPortalElement(document.body);
    return () => setIsMounted(false);
  }, []);

  // Don't render anything on the server or before mounting
  if (!isMounted || !portalElement) {
    return null;
  }

  // Use createPortal to render toasts at the document body level
  return createPortal(
    <div
      className="toast-container fixed top-4 left-4 right-4 mx-auto space-y-2 sm:space-y-3 w-auto sm:w-full flex flex-col items-center pointer-events-none z-[999999]"
      style={{ zIndex: 999999 }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full max-w-sm sm:max-w-md">
          <Toast
            message={toast.message}
            type={toast.type}
            isVisible={true}
            onClose={() => onClose(toast.id)}
          />
        </div>
      ))}
    </div>,
    portalElement
  );
}
