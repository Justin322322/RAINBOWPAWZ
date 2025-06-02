import { query } from '@/lib/db';

/**
 * Ensures that the admin_logs table exists in the database
 */
export async function ensureAdminLogsTable(): Promise<boolean> {
  try {
    // Check if the table exists
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'admin_logs'
    `) as any[];

    if (tables.length === 0) {
      // Create the table if it doesn't exist
      await query(`
        CREATE TABLE admin_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          admin_id INT,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INT NOT NULL,
          details TEXT,
          ip_address VARCHAR(45),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX (admin_id),
          INDEX (entity_type, entity_id),
          INDEX (action)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      
      return true;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
