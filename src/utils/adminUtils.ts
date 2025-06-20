import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getAuthTokenFromRequest } from '@/utils/auth';

/**
 * Gets the admin ID from the request
 * @param request The Next.js request object
 * @returns The admin ID or null if not found or not an admin
 */
export const getAdminIdFromRequest = async (request: NextRequest): Promise<number | null> => {
  try {
    // Get auth token from request
    const authToken = getAuthTokenFromRequest(request);

    if (!authToken) {
      console.log('No auth token found in request');
      return null;
    }

    // Parse the token
    let userId: string | null = null;
    let accountType: string | null = null;

    // Check if it's a JWT token or old format
    if (authToken.includes('.')) {
      // JWT token format
      try {
        const { decodeTokenUnsafe } = await import('@/lib/jwt');
        const payload = decodeTokenUnsafe(authToken);
        userId = payload?.userId?.toString() || null;
        accountType = payload?.accountType || null;
      } catch (error) {
        console.error('Error decoding JWT token:', error);
        return null;
      }
    } else {
      // Old format fallback
      const parts = authToken.split('_');
      if (parts.length === 2) {
        userId = parts[0];
        accountType = parts[1];
      }
    }

    // Check if this is an admin account
    if (!userId || accountType !== 'admin') {
      console.log(`User is not admin. UserId: ${userId}, AccountType: ${accountType}`);
      return null;
    }

    // Get the admin ID from the database
    const userData = await query(
      'SELECT user_id FROM users WHERE user_id = ? AND role = ?',
      [userId, 'admin']
    ) as any[];

    if (!userData || userData.length === 0) {
      console.log('No admin user found in database for ID:', userId);
      return null;
    }

    console.log('Admin authorization successful for ID:', userId);
    return parseInt(userData[0].user_id);
  } catch (error) {
    console.error('Error getting admin ID from request:', error);
    return null;
  }
};

/**
 * Ensures that the admin_logs table exists in the database
 * @returns True if the table exists or was created successfully, false otherwise
 */
export const ensureAdminLogsTable = async (): Promise<boolean> => {
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
          admin_id INT NOT NULL,
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
    }

    return true;
  } catch (error) {
    console.error('Error ensuring admin_logs table exists:', error);
    return false;
  }
};

/**
 * Logs an admin action to the admin_logs table
 * @param adminId The ID of the admin performing the action
 * @param action The action being performed
 * @param entityType The type of entity being acted upon
 * @param entityId The ID of the entity being acted upon
 * @param details Additional details about the action
 * @param ipAddress The IP address of the admin
 * @returns True if the action was logged successfully, false otherwise
 */
export const logAdminAction = async (
  adminId: number | null,
  action: string,
  entityType: string,
  entityId: number,
  details: any,
  ipAddress?: string
): Promise<boolean> => {
  try {
    // Ensure the admin_logs table exists
    const tableExists = await ensureAdminLogsTable();

    if (!tableExists) {
      // Failed to ensure admin_logs table exists
      return false;
    }

    // If adminId is null, use a default value for system actions
    const finalAdminId = adminId || 0;

    // Log the action
    await query(
      `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        finalAdminId,
        action,
        entityType,
        entityId,
        JSON.stringify(details),
        ipAddress || null
      ]
    );

    return true;
  } catch {
    // Error logging admin action
    return false;
  }
};
