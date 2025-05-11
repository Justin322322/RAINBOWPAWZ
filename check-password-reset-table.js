// Script to check and create the password reset tokens table
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  let connection;

  try {
    // Create a connection to the database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rainbow_paws'
    });

    console.log('Connected to the database');

    // Check if the password_reset_tokens table exists
    const [passwordResetTable] = await connection.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'password_reset_tokens'
    `);

    if (passwordResetTable[0].count === 0) {
      console.log('Creating password_reset_tokens table...');
      await connection.query(`
        CREATE TABLE password_reset_tokens (
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
      console.log('password_reset_tokens table created successfully');
    } else {
      console.log('password_reset_tokens table already exists');
    }

    console.log('Password reset table setup completed');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

main().catch(console.error);
