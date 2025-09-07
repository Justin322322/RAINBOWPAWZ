'use client';

import { Suspense } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import { RefundList } from '@/components/refund/RefundList';
import { LoadingSpinner } from '@/components/ui/LoadingComponents';
import withBusinessVerification from '@/components/withBusinessVerification';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
  userData: any;
}

function CremationRefundsPage({ searchParams: _searchParams, userData }: PageProps) {
  // Get the cremation center ID from the authenticated user data
  const cremationCenterId = userData?.service_provider?.provider_id || userData?.business_id;

  // Show error if cremation center ID is not available
  if (!cremationCenterId) {
    return (
      <CremationDashboardLayout
        activePage="refunds"
        userData={userData}
        userName={`${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Cremation Provider'}
      >
        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-3xl font-bold text-gray-900">Refund Management</h1>
            <p className="mt-2 text-gray-600">
              Manage and monitor refund requests for your cremation services.
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-medium text-yellow-800 mb-2">Cremation Center Not Found</h3>
            <p className="text-yellow-700">
              Unable to load refund data. Please contact support if this issue persists.
            </p>
          </div>
        </div>
      </CremationDashboardLayout>
    );
  }

  return (
    <CremationDashboardLayout
      activePage="refunds"
      userData={userData}
      userName={`${userData?.first_name || ''} ${userData?.last_name || ''}`.trim() || 'Cremation Provider'}
    >
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-3xl font-bold text-gray-900">Refund Management</h1>
          <p className="mt-2 text-gray-600">
            Manage and monitor refund requests for your cremation services.
          </p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        }>
          <RefundList cremationCenterId={cremationCenterId} />
        </Suspense>
      </div>
    </CremationDashboardLayout>
  );
}

export default withBusinessVerification(CremationRefundsPage);
