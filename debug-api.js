// Debug script to test the offline payment confirm API
// Run with: node debug-api.js

const fetch = require('node-fetch');

async function testOfflineConfirmAPI() {
  const baseUrl = 'https://rainbowpaw-git-feature-manual-pay-d91361-justin322322s-projects.vercel.app';

  // Test data - replace with actual values
  const testData = {
    bookingId: 123, // Replace with actual booking ID
    action: 'confirm', // or 'reject'
    reason: null // only needed for reject
  };

  try {
    console.log('Testing offline payment confirmation API...');
    console.log('URL:', `${baseUrl}/api/payments/offline/confirm`);
    console.log('Payload:', JSON.stringify(testData, null, 2));

    const response = await fetch(`${baseUrl}/api/payments/offline/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if needed
        // 'Authorization': 'Bearer your-token-here'
      },
      credentials: 'include',
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.status === 500) {
      console.error('❌ 500 Internal Server Error detected!');
      console.error('This indicates a server-side error in the API route.');
    } else if (response.status === 401) {
      console.log('ℹ️ 401 Unauthorized - Check authentication');
    } else if (response.status === 400) {
      console.log('ℹ️ 400 Bad Request - Check request format');
    } else if (response.ok) {
      console.log('✅ API call successful');
    }

  } catch (error) {
    console.error('Network error:', error.message);
  }
}

// Run the test
testOfflineConfirmAPI().catch(console.error);
