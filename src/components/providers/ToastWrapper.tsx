'use client';

import React from 'react';
import { ToastProvider } from '@/context/ToastContext';

export default function ToastWrapper() {
  return (
    <ToastProvider>
      {null}
    </ToastProvider>
  );
}
