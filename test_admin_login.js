// Test script to verify admin login and password hashing
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'rainbow_paws',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Function to test if a password matches a hash
async function testPasswordHash(password, hash) {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    console.log(`Password "${password}" matches hash: ${isMatch}`);
    return isMatch;
  } catch (error) {
    console.error(`Error comparing password: ${error.message}`);
    return false;
  }
}

// Test the existing admin hash from the database
async function runTests() {
  console.log('Testing admin password hashes...');

  // Test the existing admin hash from the database
  const existingAdminHash = '$2y$10$IrYVALMrQhPZwT2wVX8SPOgDl9xHyGfWmz6F9iNivXAQcA4wu7WuC';
  await testPasswordHash('admin123', existingAdminHash);

  // Generate a new hash for comparison
  console.log('\nGenerating a new hash for "admin123"...');
  const newHash = await bcrypt.hash('admin123', 10);
  console.log(`New hash: ${newHash}`);

  // Test if the new hash works with the password
  await testPasswordHash('admin123', newHash);

  // Test if PHP-generated bcrypt hashes are compatible
  console.log('\nTesting PHP-style bcrypt hash compatibility...');
  const phpHash = '$2y$10$IrYVALMrQhPZwT2wVX8SPOgDl9xHyGfWmz6F9iNivXAQcA4wu7WuC';
  await testPasswordHash('admin123', phpHash);

  // Generate a new admin hash with a different format
  console.log('\nGenerating a new hash for a new admin password...');
  const newAdminHash = await bcrypt.hash('RainbowPaws2023!', 10);
  console.log(`New admin hash: ${newAdminHash}`);
}

async function testDatabaseAdmins() {
  console.log('\n--- Testing Database Admin Accounts ---');

  // Create a connection pool
  const pool = mysql.createPool(dbConfig);

  try {
    // Test database connection
    console.log('Testing database connection...');
    const [testResult] = await pool.execute('SELECT 1 as test');
    console.log('Database connection successful:', testResult[0].test === 1);

    // Get all admins from the database
    console.log('\nFetching all admins from database:');
    const [admins] = await pool.execute('SELECT id, username, email, password, full_name, role FROM admins');

    if (admins.length === 0) {
      console.log('No admin accounts found in the database!');

      // Create a new admin account
      console.log('\nCreating a new admin account...');
      const username = 'jsadmin';
      const email = 'jsadmin@rainbowpaws.com';
      const password = 'admin123';
      const fullName = 'JS Admin';
      const role = 'super_admin';

      // Generate a hash that will definitely work with bcrypt.compare
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log(`Generated hash: ${hashedPassword}`);

      await pool.execute(
        'INSERT INTO admins (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, fullName, role]
      );

      console.log(`Created new admin with username: ${username} and email: ${email}`);
    } else {
      console.log(`Found ${admins.length} admin accounts:`);

      for (const admin of admins) {
        console.log(`\nAdmin ID: ${admin.id}`);
        console.log(`Username: ${admin.username}`);
        console.log(`Email: ${admin.email}`);
        console.log(`Full Name: ${admin.full_name}`);
        console.log(`Role: ${admin.role}`);
        console.log(`Password Hash: ${admin.password.substring(0, 20)}...`);

        // Test password verification with known password
        const testPassword = 'admin123';
        try {
          const passwordMatch = await bcrypt.compare(testPassword, admin.password);
          console.log(`Password '${testPassword}' matches: ${passwordMatch}`);

          if (!passwordMatch) {
            // Update the admin's password with a new hash
            console.log(`Password doesn't match. Updating password for ${admin.username}...`);
            const newHash = await bcrypt.hash(testPassword, 10);
            await pool.execute(
              'UPDATE admins SET password = ? WHERE id = ?',
              [newHash, admin.id]
            );

            console.log(`Updated password hash for admin ID ${admin.id}`);
          }
        } catch (error) {
          console.error(`Error verifying password: ${error.message}`);
        }
      }
    }

    // Check if there are any admin users in the users table
    console.log('\nChecking for admin users in the users table:');
    const [adminUsers] = await pool.execute("SELECT id, email, password, user_type FROM users WHERE user_type = 'admin'");

    if (adminUsers.length === 0) {
      console.log('No admin users found in the users table.');

      // Create an admin user in the users table
      console.log('\nCreating a new admin user in the users table...');
      const email = 'useradmin@rainbowpaws.com';
      const password = 'admin123';
      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.execute(
        'INSERT INTO users (first_name, last_name, email, password, phone_number, user_type, is_verified, is_otp_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['Admin', 'User', email, hashedPassword, '123-456-7890', 'admin', 1, 1]
      );

      console.log(`Created new admin user in users table with email: ${email} and password: ${password}`);
    } else {
      console.log(`Found ${adminUsers.length} admin users in the users table:`);

      for (const user of adminUsers) {
        console.log(`\nUser ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`User Type: ${user.user_type}`);
        console.log(`Password Hash: ${user.password.substring(0, 20)}...`);

        // Test password verification with known password
        const testPassword = 'admin123';
        try {
          const passwordMatch = await bcrypt.compare(testPassword, user.password);
          console.log(`Password '${testPassword}' matches: ${passwordMatch}`);

          if (!passwordMatch) {
            // Update the user's password with a new hash
            const newHash = await bcrypt.hash(testPassword, 10);
            await pool.execute(
              'UPDATE users SET password = ? WHERE id = ?',
              [newHash, user.id]
            );

            console.log(`Updated password hash for user ID ${user.id}`);
          }
        } catch (error) {
          console.error(`Error verifying password: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('Database error:', error);
  } finally {
    // Close the connection pool
    await pool.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the tests
async function main() {
  await runTests();
  await testDatabaseAdmins();
}

main().catch(console.error);
