'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentsUploadPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile page
    router.push('/cremation/profile');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-xl text-gray-600">Redirecting to profile page...</h2>
        <p className="mt-2 text-gray-500">The documents section has been moved to your profile page.</p>
      </div>
    </div>
  );
} 
