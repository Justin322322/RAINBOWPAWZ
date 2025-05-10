'use client';

import { useEffect, useState } from 'react';
import { checkAuthStatus, getAuthToken, clearAuthToken } from '@/utils/auth';
import Link from 'next/link';

export default function AuthTestPage() {
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    userId?: string;
    accountType?: string;
  }>({ authenticated: false });
  
  const [cookies, setCookies] = useState<string>('');
  
  useEffect(() => {
    const checkAuth = async () => {
      const status = await checkAuthStatus();
      setAuthStatus(status);
      setCookies(document.cookie);
    };
    
    checkAuth();
  }, []);
  
  const handleLogout = () => {
    clearAuthToken();
    window.location.reload();
  };
  
  const handleSetTestCookie = () => {
    document.cookie = 'test_cookie=test_value; path=/; max-age=3600';
    setCookies(document.cookie);
  };
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
        <div className="space-y-2">
          <p>
            <span className="font-medium">Authenticated:</span>{' '}
            <span className={authStatus.authenticated ? 'text-green-600' : 'text-red-600'}>
              {authStatus.authenticated ? 'Yes' : 'No'}
            </span>
          </p>
          {authStatus.authenticated && (
            <>
              <p><span className="font-medium">User ID:</span> {authStatus.userId}</p>
              <p><span className="font-medium">Account Type:</span> {authStatus.accountType}</p>
            </>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Cookie Information</h2>
        <div className="bg-gray-100 p-4 rounded overflow-x-auto">
          <pre className="text-sm">{cookies || 'No cookies found'}</pre>
        </div>
        <div className="mt-4 space-x-4">
          <button 
            onClick={handleSetTestCookie}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Set Test Cookie
          </button>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Authentication Actions</h2>
        <div className="space-x-4">
          {authStatus.authenticated ? (
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          ) : (
            <Link href="/" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 inline-block">
              Go to Login
            </Link>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Protected Routes</h2>
        <div className="space-y-2">
          <Link href="/user/furparent_dashboard" className="text-blue-500 hover:underline block">
            User Dashboard
          </Link>
          <Link href="/admin/dashboard" className="text-blue-500 hover:underline block">
            Admin Dashboard
          </Link>
          <Link href="/cremation/dashboard" className="text-blue-500 hover:underline block">
            Business Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
