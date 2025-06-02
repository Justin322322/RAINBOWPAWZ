'use client';

import React from 'react';
import { CartProvider } from '@/contexts/CartContext';
import FurParentDashboardLayout from '@/components/navigation/FurParentDashboardLayout';

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <FurParentDashboardLayout>
        {children}
      </FurParentDashboardLayout>
    </CartProvider>
  );
}
