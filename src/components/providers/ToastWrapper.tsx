'use client';

import React from 'react';
import { ToastProvider } from '@/contexts/ToastContext';

export default function ToastWrapper() {
  return (
    <ToastProvider>
      {null}
    </ToastProvider>
  );
}
