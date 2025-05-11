const fetch = require('node-fetch');

async function testApiRegistration() {
  console.log('Testing API registration endpoint...');
  
  // Create test user data
  const testUser = {
    firstName: 'API Test',
    lastName: 'User',
    email: `apitest${Date.now()}@example.com`,
    password: 'password123',
    phoneNumber: '1234567890',
    address: '123 Test St',
    sex: 'Male',
    account_type: 'personal'
  };
  
  console.log('Test user data:', {
    ...testUser,
    password: '[REDACTED]'
  });
  
  try {
    console.log('Sending registration request...');
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser)
    });
    
    console.log('Response status:', response.status);
    
    const responseData = await response.json();
    console.log('Response data:', responseData);
    
    if (response.ok) {
      console.log('Registration successful!');
    } else {
      console.error('Registration failed:', responseData.error || responseData.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error testing API registration:', error);
  }
}

// Run the function
testApiRegistration().catch(console.error); 