// Script to fix the user-provider link in session data
const mysql = require('mysql2/promise');

async function fixUserProviderLink() {
  console.log('Starting user-provider link fix script...');
  let connection;
  
  try {
    console.log('Connecting to database...');
    // Create connection to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'rainbow_paws'
    });
    
    console.log('Connected to database successfully');
    
    // Get the service provider ID for user 44
    console.log('Fetching service provider ID for user 44...');
    const [providers] = await connection.query(
      'SELECT id, name, provider_type FROM service_providers WHERE user_id = ?',
      [44]
    );
    
    if (providers.length === 0) {
      console.error('Error: No service provider found for user 44');
      return;
    }
    
    const provider = providers[0];
    console.log(`Found service provider: ID=${provider.id}, Name=${provider.name}, Type=${provider.provider_type}`);
    
    // Update user data in session storage if running in browser
    if (typeof window !== 'undefined' && window.sessionStorage) {
      console.log('Updating session storage with business_id...');
      try {
        const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
        userData.business_id = provider.id;
        sessionStorage.setItem('user_data', JSON.stringify(userData));
        console.log('Updated session storage successfully');
      } catch (sessionError) {
        console.error('Error updating session storage:', sessionError);
      }
    } else {
      console.log('Running in Node.js environment, cannot update session storage');
      console.log('To fix the issue:');
      console.log('1. Log out of the application');
      console.log('2. Log back in - the system will now properly associate your user with service provider ID ' + provider.id);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
  
  console.log('Script completed');
}

// Run the function
fixUserProviderLink(); 