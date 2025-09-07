import { Suspense } from 'react';
import CremationDashboardLayout from '@/components/navigation/CremationDashboardLayout';
import { RefundList } from '@/components/refund/RefundList';
import { LoadingSpinner } from '@/components/ui/LoadingComponents';

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function CremationRefundsPage({ searchParams: _searchParams }: PageProps) {
  // In a real app, you'd get the cremation center ID from the authenticated user
  // For now, we'll use a placeholder - this should be fetched from the user's session
  const cremationCenterId = 1; // This should come from authentication context

  return (
    <CremationDashboardLayout>
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

export const metadata = {
  title: 'Refund Management - Rainbow Paws Cremation',
  description: 'Manage and monitor refund requests for cremation services'
};
