'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TestAuth() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get auth token from cookie
    const cookies = document.cookie.split(';');
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
    
    if (authCookie) {
      const authValue = authCookie.split('=')[1];
      setAuthToken(authValue);
      
      // Extract user ID and account type
      const [id, type] = authValue.split('_');
      setUserId(id);
      setAccountType(type);
    }
  }, []);

  const fetchUserData = async () => {
    if (!userId) {
      setError('No user ID found');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user data');
      }
      
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const setTestAuthToken = () => {
    document.cookie = `auth_token=1_user; path=/; max-age=86400; SameSite=Strict`;
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Authentication Test Page</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Auth Token Information</h2>
          {authToken ? (
            <div className="bg-gray-100 p-4 rounded-md">
              <p><strong>Auth Token:</strong> {authToken}</p>
              <p><strong>User ID:</strong> {userId}</p>
              <p><strong>Account Type:</strong> {accountType}</p>
            </div>
          ) : (
            <div className="bg-yellow-100 p-4 rounded-md">
              <p>No auth token found</p>
              <button 
                onClick={setTestAuthToken}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Set Test Auth Token
              </button>
            </div>
          )}
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">User Data</h2>
          <button 
            onClick={fetchUserData}
            disabled={!userId || loading}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed mb-4"
          >
            {loading ? 'Loading...' : 'Fetch User Data'}
          </button>
          
          {error && (
            <div className="bg-red-100 p-4 rounded-md mb-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          {userData && (
            <div className="bg-gray-100 p-4 rounded-md">
              <pre className="whitespace-pre-wrap">{JSON.stringify(userData, null, 2)}</pre>
            </div>
          )}
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Navigation Links</h2>
          <div className="flex flex-col space-y-2">
            <Link href="/" className="text-blue-500 hover:underline">Home</Link>
            <Link href="/user/furparent_dashboard" className="text-blue-500 hover:underline">Fur Parent Dashboard</Link>
            <Link href="/admin/dashboard" className="text-blue-500 hover:underline">Admin Dashboard</Link>
            <Link href="/cremation/dashboard" className="text-blue-500 hover:underline">Cremation Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
