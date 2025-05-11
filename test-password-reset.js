// Test script for password reset functionality
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('./src/lib/simpleEmailService');

// Get the test email from command line arguments or use a known valid email
const testEmail = process.argv[2] || 'justinmarlosibonga@mail.com';

console.log('=== PASSWORD RESET TEST ===');
console.log('Test email:', testEmail);
console.log('Simulation mode:', process.env.SIMULATE_EMAIL_SUCCESS === 'true' ? 'Enabled' : 'Disabled');
console.log('');

async function testPasswordReset() {
  let connection;

  try {
    // Create database connection
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbow_paws',
      port: parseInt(process.env.DB_PORT || '3306')
    };

    console.log(`Connecting to database ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}...`);
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');

    // Check if the user exists
    console.log(`Checking if user with email ${testEmail} exists...`);
    const [userResult] = await connection.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [testEmail]
    );

    if (!userResult || userResult.length === 0) {
      console.error(`User with email ${testEmail} not found. Please use a valid email.`);
      return;
    }

    const userId = userResult[0].id;
    console.log(`User found with ID: ${userId}`);

    // Check if the password_reset_tokens table exists
    console.log('Checking if password_reset_tokens table exists...');
    const [tableResult] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'password_reset_tokens'`
    );

    if (tableResult[0].count === 0) {
      console.log('Creating password_reset_tokens table...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          token VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          is_used TINYINT(1) DEFAULT 0,
          UNIQUE KEY unique_token (token),
          INDEX idx_user_id (user_id),
          INDEX idx_token (token),
          INDEX idx_expires_at (expires_at),
          INDEX idx_is_used (is_used),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('Password reset tokens table created');
    } else {
      console.log('Password reset tokens table exists');
    }

    // Invalidate existing tokens
    console.log(`Invalidating existing tokens for user ${userId}...`);
    await connection.execute(
      'UPDATE password_reset_tokens SET is_used = 1 WHERE user_id = ?',
      [userId]
    );

    // Generate a new token
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log(`Generated reset token: ${resetToken}`);

    // Set expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store the token
    console.log(`Storing token in database...`);
    await connection.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at, is_used) VALUES (?, ?, ?, 0)',
      [userId, resetToken, expiresAt]
    );
    console.log('Token stored successfully');

    // Send the email
    console.log(`Sending password reset email to ${testEmail}...`);
    const emailResult = await sendPasswordResetEmail(testEmail, resetToken);

    if (emailResult.success) {
      console.log(`Email sent successfully. Message ID: ${emailResult.messageId}`);
      console.log(`Reset link: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);
    } else {
      console.error(`Failed to send email: ${emailResult.error}`);
    }

    // Check if the token was stored correctly
    console.log('Verifying token in database...');
    const [tokenResult] = await connection.execute(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND is_used = 0',
      [resetToken]
    );

    if (tokenResult && tokenResult.length > 0) {
      console.log('Token verified in database');
      console.log('Token details:', {
        id: tokenResult[0].id,
        user_id: tokenResult[0].user_id,
        created_at: tokenResult[0].created_at,
        expires_at: tokenResult[0].expires_at,
        is_used: tokenResult[0].is_used
      });
    } else {
      console.error('Token not found in database or already used');
    }

  } catch (error) {
    console.error('Error testing password reset:', error);
  } finally {
    if (connection) {
      console.log('Closing database connection...');
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

testPasswordReset();
