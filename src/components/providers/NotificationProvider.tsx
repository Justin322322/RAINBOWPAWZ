'use client';

import React from 'react';
import { NotificationProvider as NotificationContextProvider } from '@/context/NotificationContext';

export default function NotificationProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return <NotificationContextProvider>{children}</NotificationContextProvider>;
}
