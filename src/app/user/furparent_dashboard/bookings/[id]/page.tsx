'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Redirect page for old booking detail URLs
 * This page handles requests to /user/furparent_dashboard/bookings/[id]
 * and redirects them to /user/furparent_dashboard/bookings?bookingId=[id]
 * where the main bookings page will automatically open the modal
 */
export default function BookingRedirectPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const bookingId = params.id;
    
    if (bookingId) {
      // Redirect to the main bookings page with the booking ID as a query parameter
      router.replace(`/user/furparent_dashboard/bookings?bookingId=${bookingId}`);
    } else {
      // If no booking ID, just redirect to the main bookings page
      router.replace('/user/furparent_dashboard/bookings');
    }
  }, [params.id, router]);

  // Show a simple loading state while redirecting
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary-green)] mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to booking details...</p>
      </div>
    </div>
  );
}
