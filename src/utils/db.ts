import mysql from 'mysql2/promise';

export async function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rainbow_paws',
    port: parseInt(process.env.DB_PORT || '3306'),
    // Allow connections from any host/port
    socketPath: undefined,
    // Removed insecureAuth for security
  });
}

export async function executeQuery(query: string, params: any[] = []) {
  const connection = await createConnection();
  try {
    const [results] = await connection.execute(query, params);
    return results;
  } finally {
    await connection.end();
  }
}