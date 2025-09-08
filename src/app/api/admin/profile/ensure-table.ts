import { query } from '@/lib/db';

export async function ensureAdminProfilesTableExists(): Promise<boolean> {
  try {
    const allowDDL = process.env.ALLOW_DDL === 'true';
    // Check if users table exists
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'users'
    `) as any[];

    if (tables.length === 0) {
      if (!allowDDL) {
        console.warn('DDL disabled in this environment. Skipping CREATE TABLE users.');
        return false;
      }
      // Create the table if it doesn't exist
      await query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          username VARCHAR(50) DEFAULT NULL,
          full_name VARCHAR(100) DEFAULT NULL,
          admin_role VARCHAR(50) DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY user_id (user_id),
          KEY username (username),
          CONSTRAINT users_ibfk_1 FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring users table exists:', error);
    return false;
  }
}
