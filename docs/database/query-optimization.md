# Database Query Optimization

This document outlines the query optimization techniques used in the Rainbow Paws application to ensure efficient database operations.

## Table of Contents

1. [Database Indexes](#database-indexes)
2. [Query Optimization Strategies](#query-optimization-strategies)
3. [Connection Management](#connection-management)
4. [Performance Monitoring](#performance-monitoring)
5. [Best Practices](#best-practices)

## Database Indexes

Indexes are crucial for optimizing query performance. The Rainbow Paws database uses several types of indexes to speed up data retrieval.

### Primary Key Indexes

Every table in the database has a primary key that is automatically indexed by MySQL:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- other columns
);
```

### Foreign Key Indexes

Foreign key columns are indexed to optimize join operations:

```sql
CREATE TABLE pets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  -- other columns
  INDEX (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Composite Indexes

Composite indexes are used for columns that are frequently queried together:

```sql
CREATE TABLE provider_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  -- other columns
  UNIQUE KEY provider_date_unique (provider_id, date)
);
```

### Specialized Indexes

Specialized indexes are created for specific query patterns:

```sql
CREATE TABLE admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NOT NULL,
  -- other columns
  INDEX (admin_id),
  INDEX (entity_type, entity_id),
  INDEX (action)
);
```

## Query Optimization Strategies

The Rainbow Paws application employs several strategies to optimize database queries.

### Selective Column Retrieval

Instead of retrieving all columns with `SELECT *`, the application selects only the columns that are needed:

```sql
-- Instead of: SELECT * FROM users
SELECT id, first_name, last_name, email FROM users WHERE id = ?
```

This reduces the amount of data transferred from the database to the application, improving performance.

### Limiting Result Sets

The application uses `LIMIT` and `OFFSET` to paginate results and restrict the number of rows returned:

```sql
SELECT * FROM service_providers 
ORDER BY created_at DESC 
LIMIT ? OFFSET ?
```

This is particularly important for tables with a large number of rows.

### Optimized JOIN Operations

The application uses appropriate join types based on the data requirements:

```sql
-- Using LEFT JOIN when data might not exist in the joined table
SELECT u.*, ap.username, ap.admin_role
FROM users u
LEFT JOIN admin_profiles ap ON u.id = ap.user_id
WHERE u.id = ?

-- Using INNER JOIN when data must exist in both tables
SELECT sp.*, u.first_name, u.last_name, u.email
FROM service_providers sp
JOIN users u ON sp.user_id = u.id
WHERE sp.provider_type = 'cremation'
```

### Early Filtering

The application applies WHERE clauses early in the query to reduce the number of rows processed:

```sql
-- Filter early to reduce the number of rows processed
SELECT COUNT(*) as count 
FROM service_providers 
WHERE application_status = 'pending' 
AND MONTH(created_at) = MONTH(CURRENT_DATE()) 
AND YEAR(created_at) = YEAR(CURRENT_DATE())
```

### Using Prepared Statements

The application uses prepared statements with parameterized queries to improve security and enable query plan caching:

```typescript
const results = await query(
  'SELECT * FROM users WHERE email = ? AND status = ?',
  [email, 'active']
);
```

### Avoiding Subqueries

The application avoids subqueries when possible, preferring joins for better performance:

```sql
-- Instead of:
-- SELECT * FROM users WHERE id IN (SELECT user_id FROM service_providers WHERE provider_type = 'cremation')

-- Use a join:
SELECT u.* 
FROM users u
JOIN service_providers sp ON u.id = sp.user_id
WHERE sp.provider_type = 'cremation'
```

## Connection Management

Efficient connection management is essential for database performance.

### Connection Pooling

The application uses a connection pool to manage database connections efficiently:

```typescript
// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rainbow_paws',
  port: MYSQL_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

Connection pooling provides several benefits:
- Reuses connections instead of creating new ones for each query
- Reduces connection overhead
- Manages connection limits to prevent database overload
- Handles connection timeouts and errors

### Connection Release

The application ensures that connections are always released back to the pool after use:

```typescript
export async function query(sql: string, params: any[] = []) {
  try {
    // Get a connection from the pool
    const connection = await pool.getConnection();
    try {
      // Execute the query
      const [results] = await connection.query(sql, params);
      return results;
    } finally {
      // Always release the connection back to the pool
      connection.release();
    }
  } catch (error) {
    // Handle error
    throw error;
  }
}
```

## Performance Monitoring

The application includes mechanisms for monitoring database performance.

### Query Timing

Critical queries can be timed to identify performance bottlenecks:

```typescript
const startTime = Date.now();
const results = await query(sql, params);
const endTime = Date.now();
const queryTime = endTime - startTime;

if (queryTime > 1000) {
  console.warn(`Slow query detected (${queryTime}ms):`, sql);
}
```

### Connection Pool Monitoring

The connection pool can be monitored to ensure it's functioning correctly:

```typescript
// Get pool statistics
const stats = pool.getStats();
console.log('Connection pool stats:', {
  used: stats.used,
  free: stats.free,
  pending: stats.pending,
  max: stats.max
});
```

## Best Practices

When working with the Rainbow Paws database, follow these best practices for optimal performance:

1. **Use Indexes Wisely**: Create indexes for columns used in WHERE, JOIN, and ORDER BY clauses, but avoid over-indexing as it can slow down write operations.

2. **Select Only Needed Columns**: Avoid `SELECT *` and only retrieve the columns you need.

3. **Limit Result Sets**: Use LIMIT and OFFSET for pagination to reduce the amount of data transferred.

4. **Use Appropriate Join Types**: Choose the right join type (INNER, LEFT, RIGHT) based on your data requirements.

5. **Parameterize Queries**: Always use parameterized queries to prevent SQL injection and enable query plan caching.

6. **Release Connections**: Ensure connections are always released back to the pool after use.

7. **Use Transactions Appropriately**: Use transactions for operations that require multiple queries to maintain data consistency, but keep transactions as short as possible.

8. **Monitor Query Performance**: Identify and optimize slow queries.

9. **Consider Denormalization**: For read-heavy operations, consider denormalizing data to reduce the need for complex joins.

10. **Regular Maintenance**: Regularly analyze and optimize tables to maintain performance.

By following these practices, you can ensure that the Rainbow Paws application maintains optimal database performance even as the data volume grows.
