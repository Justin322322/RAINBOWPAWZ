'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UserPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the fur parent dashboard
    router.push('/user/furparent_dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-medium text-[var(--primary-green)] mb-4">Redirecting to Fur Parent Dashboard...</h1>
        <p className="text-gray-500">Please wait while we redirect you to your dashboard.</p>
      </div>
    </div>
  );
}