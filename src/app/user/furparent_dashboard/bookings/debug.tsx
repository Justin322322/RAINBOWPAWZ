'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingsDebug() {
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/debug/auth');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  const checkServiceBookings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/debug/service-bookings');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Bookings Debug Tool</h2>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <button
            onClick={checkAuth}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Checking...' : 'Check Authentication'}
          </button>

          <button
            onClick={checkServiceBookings}
            disabled={isLoading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {isLoading ? 'Checking...' : 'Check Service Bookings'}
          </button>

          <button
            onClick={() => router.push('/user/furparent_dashboard/bookings')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Bookings Page
          </button>
        </div>

        <div className="mt-4 p-4 bg-gray-100 rounded-md">
          <h3 className="text-md font-medium mb-2">Direct Database Access</h3>
          <p className="text-sm text-gray-600 mb-2">
            If you have access to the database, you can check the service_bookings table directly:
          </p>
          <div className="bg-gray-800 text-white p-3 rounded text-sm font-mono">
            SELECT * FROM service_bookings WHERE user_id = [your_user_id];
          </div>
        </div>

        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-lg font-medium mb-2">Debug Information</h3>
            <pre className="text-xs overflow-auto max-h-96 bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
