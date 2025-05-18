# Rainbow Paws Database Documentation

This documentation provides a comprehensive overview of the database structure, interactions, and implementation details for the Rainbow Paws application, with a focus on the admin side.

## Table of Contents

1. [Database Schema and Table Relationships](#database-schema-and-table-relationships)
2. [Data Joins Implementation](#data-joins-implementation)
3. [Database-Related Functions](#database-related-functions)
4. [Data Flow Between Application and Database](#data-flow-between-application-and-database)
5. [Query Optimization Techniques](#query-optimization-techniques)
6. [Error Handling for Database Operations](#error-handling-for-database-operations)

## Additional Documentation

For more detailed information on specific aspects of the database, please refer to these additional documents:

- [Entity Relationship Diagram (ERD)](./ERD.md) - Visual representation of database tables and relationships
- [Admin Database Operations](./admin-operations.md) - Detailed documentation of admin-specific database operations
- [Schema Management](./schema-management.md) - Information about database initialization and schema migrations
- [Query Optimization](./query-optimization.md) - Detailed strategies for optimizing database queries
- [Error Handling](./error-handling.md) - Comprehensive guide to database error handling patterns

## Database Schema and Table Relationships

### Core Tables

#### User Management

1. **`users`**
   - **Purpose**: Central table storing all user accounts
   - **Primary Key**: `user_id` (INT, auto-increment)
   - **Columns**:
     - `email` (VARCHAR(100), unique): User's email address
     - `password` (VARCHAR(255)): Bcrypt-hashed password
     - `first_name` (VARCHAR(50)): User's first name
     - `last_name` (VARCHAR(50)): User's last name
     - `phone_number` (VARCHAR(20), nullable): User's contact number
     - `address` (TEXT, nullable): User's physical address
     - `sex` (VARCHAR(20), nullable): User's gender
     - `role` (ENUM): User role ('fur_parent', 'business', 'admin')
     - `status` (ENUM): Account status ('active', 'inactive', 'suspended', 'restricted')
     - `is_verified` (BOOLEAN): Email verification status
     - `is_otp_verified` (BOOLEAN): OTP verification status
     - `created_at` (TIMESTAMP): Account creation timestamp
     - `updated_at` (TIMESTAMP): Last update timestamp
     - `last_login` (TIMESTAMP, nullable): Last login timestamp

2. **`admin_profiles`**
   - **Purpose**: Stores additional information for admin users
   - **Primary Key**: `admin_profile_id` (INT, auto-increment)
   - **Foreign Key**: `user_id` references `users.user_id`
   - **Columns**:
     - `username` (VARCHAR(50)): Admin username
     - `full_name` (VARCHAR(100)): Admin's full name
     - `admin_role` (ENUM): Admin role type ('super_admin', 'admin', 'moderator')
     - `created_at` (TIMESTAMP): Profile creation timestamp
     - `updated_at` (TIMESTAMP): Last update timestamp

3. **`user_restrictions`**
   - **Purpose**: Tracks restrictions placed on user accounts
   - **Primary Key**: `restriction_id` (INT, auto-increment)
   - **Foreign Key**: `user_id` references `users.user_id`
   - **Columns**:
     - `reason` (TEXT): Reason for restriction
     - `restriction_date` (TIMESTAMP): When restriction was applied
     - `duration` (VARCHAR): Duration of restriction
     - `report_count` (INT): Number of reports against user
     - `is_active` (BOOLEAN): Whether restriction is currently active
     - `created_at` (TIMESTAMP): Record creation timestamp
     - `updated_at` (TIMESTAMP): Last update timestamp

#### Authentication and Security

1. **`otp_codes`**
   - **Purpose**: Stores one-time password codes for user verification
   - **Primary Key**: `otp_id` (INT, auto-increment)
   - **Foreign Key**: `user_id` references `users.user_id`
   - **Columns**:
     - `otp_code` (VARCHAR(6)): The OTP code
     - `expires_at` (DATETIME): Expiration timestamp
     - `is_used` (BOOLEAN): Whether code has been used
     - `created_at` (TIMESTAMP): Code creation timestamp

2. **`otp_attempts`**
   - **Purpose**: Tracks attempts to generate or verify OTP codes
   - **Primary Key**: `attempt_id` (INT, auto-increment)
   - **Foreign Key**: `user_id` references `users.user_id`
   - **Columns**:
     - `attempt_type` (VARCHAR): Type of attempt ('generation', 'verification')
     - `attempt_time` (TIMESTAMP): When attempt was made
     - `ip_address` (VARCHAR): IP address of attempt

#### Service Management

1. **`service_providers`**
   - **Purpose**: Stores information about service providers (cremation centers)
   - **Primary Key**: `provider_id` (INT, auto-increment)
   - **Foreign Key**: `user_id` references `users.user_id`
   - **Columns**:
     - `name` (VARCHAR): Business name
     - `description` (TEXT): Business description
     - `address` (TEXT): Business address
     - `phone` (VARCHAR): Business contact number
     - `email` (VARCHAR): Business email
     - `provider_type` (VARCHAR): Type of provider (e.g., 'cremation')
     - `application_status` (VARCHAR): Status of application
     - `verification_status` (VARCHAR): Verification status
     - `created_at` (TIMESTAMP): Record creation timestamp
     - `updated_at` (TIMESTAMP): Last update timestamp

2. **`service_packages`**
   - **Purpose**: Stores service packages offered by providers
   - **Primary Key**: `package_id` (INT, auto-increment)
   - **Foreign Key**: `service_provider_id` or `provider_id` references `service_providers.provider_id`
   - **Columns**:
     - `name` (VARCHAR): Package name
     - `description` (TEXT): Package description
     - `price` (DECIMAL): Package price
     - `category` (VARCHAR): Package category
     - `cremation_type` (VARCHAR): Type of cremation
     - `processing_time` (VARCHAR): Processing time
     - `is_active` (BOOLEAN): Whether package is active
     - `conditions` (TEXT): Package conditions
     - `created_at` (TIMESTAMP): Record creation timestamp
     - `updated_at` (TIMESTAMP): Last update timestamp

### Table Relationships

```
users 1--* pets (A user can have multiple pets)
users 1--* service_providers (A user can register as a service provider)
users 1--* service_bookings (A user can make multiple bookings)
users 1--* notifications (A user can receive multiple notifications)
users 1--1 admin_profiles (An admin user has one admin profile)
users 1--* user_restrictions (A user can have multiple restrictions)

service_providers 1--* service_packages (A provider can offer multiple packages)
service_providers 1--* provider_availability (A provider sets multiple availability dates)
service_providers 1--* provider_time_slots (A provider defines multiple time slots)
service_providers 1--* service_bookings (A provider receives multiple bookings)

service_packages 1--* package_inclusions (A package can have multiple inclusions)
service_packages 1--* package_addons (A package can have multiple add-ons)
service_packages 1--* package_images (A package can have multiple images)
service_packages 1--* service_bookings (A package can be booked multiple times)

pets 1--* service_bookings (A pet can be associated with multiple bookings)
```

### Database Constraints

1. **Primary Keys**: Each table has an auto-incrementing primary key
2. **Foreign Keys**: Relationships between tables are maintained through foreign keys
3. **Unique Constraints**:
   - `users.email` is unique
   - `provider_availability` has a unique constraint on `(provider_id, date)`
4. **Default Values**:
   - `created_at` and `updated_at` have default values of `CURRENT_TIMESTAMP`
   - `updated_at` is automatically updated on record changes
   - `is_active` defaults to `TRUE` for service packages

## Data Joins Implementation

### Common JOIN Patterns

1. **User-Related Joins**

```sql
-- Fetching user with admin profile
SELECT u.*, ap.username, ap.admin_role
FROM users u
LEFT JOIN admin_profiles ap ON u.id = ap.user_id
WHERE u.id = ?
```

2. **Service Provider Joins**

```sql
-- Fetching service providers with user details
SELECT sp.*, u.first_name, u.last_name, u.email
FROM service_providers sp
JOIN users u ON sp.user_id = u.id
WHERE sp.provider_type = 'cremation'
```

3. **Booking-Related Joins**

```sql
-- Complex join for bookings with related data
SELECT b.id, b.status, b.booking_date, b.booking_time, b.special_requests,
       b.created_at, p.name as pet_name, p.species as pet_type,
       u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number,
       sp.id as package_id, sp.name as service_name, sp.price
FROM bookings b
JOIN users u ON b.user_id = u.id
LEFT JOIN pets p ON p.user_id = u.id
JOIN service_packages sp ON b.business_service_id = sp.id
WHERE b.business_service_id IN (?)
AND b.status NOT IN ('completed', 'cancelled')
GROUP BY b.id
```

### Query Building Approach

The application uses raw SQL queries with parameterized inputs for security. There is no ORM, but there are helper functions that abstract the connection management and query execution.

### Complex Joins

1. **Dashboard Statistics**

```sql
-- User distribution query with multiple joins
SELECT
  sp.id,
  sp.id as businessId,
  sp.name as businessName,
  CONCAT(u.first_name, ' ', u.last_name) as owner,
  u.email,
  sp.created_at as submitDate,
  sp.application_status as status
FROM service_providers sp
JOIN users u ON sp.user_id = u.id
WHERE sp.provider_type = 'cremation'
ORDER BY sp.created_at DESC
LIMIT 5
```

2. **Service Listing with Provider Information**

```sql
SELECT
  p.id,
  p.name,
  p.description,
  p.price,
  p.created_at,
  p.updated_at,
  COALESCE(p.is_active, 1) as is_active,
  COALESCE(p.category, 'standard') as category,
  COALESCE(p.cremation_type, '') as cremationType,
  COALESCE(p.processing_time, '2-3 days') as processingTime,
  COALESCE(p.bookings_count, 0) as bookings_count,
  COALESCE(p.rating, 0) as rating,
  COALESCE(p.conditions, '') as conditions,
  sp.id as providerId,
  COALESCE(sp.name, 'Cremation Center') as providerName
FROM
  service_packages p
LEFT JOIN
  service_providers sp ON p.service_provider_id = sp.id OR p.provider_id = sp.id
WHERE 1=1
```

## Database-Related Functions

### Core Database Functions

1. **Connection Management**

Located in `src/lib/db.ts`:

```typescript
// Create a connection pool
const pool = mysql.createPool(config);

// Helper function to execute SQL queries
export async function query(sql: string, params: any[] = []) {
  try {
    // Get a connection from the pool
    const connection = await pool.getConnection();
    try {
      // Execute the query
      const [results] = await connection.query(sql, params);
      return results;
    } finally {
      // Release the connection back to the pool
      connection.release();
    }
  } catch (error) {
    // Error handling
    throw error;
  }
}
```

2. **Alternative Connection Function**

Located in `src/utils/db.ts`:

```typescript
export async function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rainbow_paws',
    port: parseInt(process.env.DB_PORT || '3306'),
    socketPath: undefined,
    insecureAuth: true,
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
```

### Transaction Management

Transactions are used throughout the application to ensure data consistency:

```typescript
// Start a transaction
await query('START TRANSACTION');

try {
  // Execute multiple queries...

  // Commit the transaction if all queries succeed
  await query('COMMIT');
} catch (error) {
  // Rollback the transaction if any query fails
  await query('ROLLBACK');
  throw error;
}
```

### Database Initialization and Migration

Located in `src/lib/initDB.ts`:

```typescript
async function initializeDatabase() {
  try {
    // Read the schema SQL file
    const schemaPath = path.join(process.cwd(), 'src', 'lib', 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf-8');

    // Split the SQL statements by semicolons and filter out empty statements
    const statements = schemaSql.split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Execute each statement separately
    for (const statement of statements) {
      await query(statement);
    }
  } catch (error) {
    throw error;
  }
}
```

### Table Creation and Schema Checking

The application includes dynamic table creation functionality:

```typescript
// Check if a table exists and create it if it doesn't
const tablesResult = await query(`
  SELECT TABLE_NAME
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
  AND table_name = ?
`, [tableName]);

if (tablesResult.length === 0) {
  // Create the table
  await query(`CREATE TABLE ${tableName} (...)`);
}
```

## Data Flow Between Application and Database

### Lifecycle of Database Operations

1. **Request Initiation**:
   - User performs an action in the UI (e.g., submits a form, clicks a button)
   - Client-side code sends a request to the API endpoint

2. **API Handler Processing**:
   - API route handler receives the request
   - Request data is validated and sanitized
   - Business logic is applied

3. **Database Interaction**:
   - Connection is obtained from the connection pool
   - Query is executed with parameterized inputs
   - Results are processed and transformed

4. **Response Formation**:
   - Database results are formatted into the expected response structure
   - Additional data processing or enrichment may occur
   - Response is sent back to the client

5. **Client-Side Handling**:
   - Client receives and processes the response
   - UI is updated to reflect the new data state

### Data Transformation

The application transforms database results in several ways:

1. **Field Renaming**: Database column names are often mapped to more frontend-friendly names
   ```typescript
   const formattedResults = results.map(row => ({
     id: row.id,
     userName: `${row.first_name} ${row.last_name}`,
     contactEmail: row.email,
     // Additional transformations
   }));
   ```

2. **Data Type Conversion**: Converting database types to appropriate JavaScript types
   ```typescript
   const formattedDate = new Date(row.created_at).toISOString();
   const isActive = Boolean(row.is_active);
   const price = parseFloat(row.price);
   ```

3. **Null Handling**: Providing default values for null fields
   ```typescript
   const description = row.description || 'No description available';
   const category = row.category || 'standard';
   ```

### Error Handling During Data Flow

1. **Database Connection Errors**: Handled with fallback connection attempts
2. **Query Execution Errors**: Caught and processed with appropriate error responses
3. **Data Validation Errors**: Checked before database operations to prevent invalid data

## Query Optimization Techniques

### Database Indexes

The Rainbow Paws database uses several indexes to optimize query performance:

1. **Primary Key Indexes**: Every table has an auto-incrementing primary key that is indexed
2. **Foreign Key Indexes**: Foreign key columns are indexed to speed up join operations
3. **Composite Indexes**: Used for frequently queried combinations of columns
   - `provider_availability` has a composite index on `(provider_id, date)`
   - `admin_logs` has indexes on `(admin_id)`, `(entity_type, entity_id)`, and `(action)`

### Query Optimization Strategies

1. **Selective Column Retrieval**: Only requesting needed columns
   ```sql
   SELECT id, first_name, last_name, email FROM users
   -- Instead of: SELECT * FROM users
   ```

2. **Limiting Result Sets**: Using LIMIT to restrict the number of rows returned
   ```sql
   SELECT * FROM service_providers ORDER BY created_at DESC LIMIT 5
   ```

3. **Optimized JOIN Operations**: Joining only necessary tables and using appropriate join types
   ```sql
   -- Using LEFT JOIN when data might not exist in the joined table
   LEFT JOIN admin_profiles ap ON u.id = ap.user_id

   -- Using INNER JOIN when data must exist in both tables
   JOIN users u ON sp.user_id = u.id
   ```

4. **Filtering Early**: Applying WHERE clauses before JOINs when possible
   ```sql
   -- Filter early to reduce the number of rows processed
   WHERE sp.provider_type = 'cremation'
   ```

### Performance Considerations

1. **Connection Pooling**: Using a connection pool to manage database connections efficiently
2. **Parameterized Queries**: Using parameterized queries to prevent SQL injection and improve query plan caching
3. **Transaction Management**: Using transactions for operations that require multiple queries to maintain data consistency

## Error Handling for Database Operations

### Error Handling Patterns

1. **Try-Catch Blocks**: All database operations are wrapped in try-catch blocks
   ```typescript
   try {
     const results = await query(sql, params);
     return results;
   } catch (error) {
     // Handle error
     throw error;
   }
   ```

2. **Connection Error Detection**: Specific connection errors are detected and handled
   ```typescript
   if (error.code === 'ECONNREFUSED') {
     // Connection refused error handling
   } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
     // Access denied error handling
   } else if (error.code === 'ER_BAD_DB_ERROR') {
     // Database does not exist error handling
   }
   ```

3. **Transaction Rollback**: Transactions are rolled back on error
   ```typescript
   try {
     await query('START TRANSACTION');
     // Execute queries
     await query('COMMIT');
   } catch (error) {
     await query('ROLLBACK');
     throw error;
   }
   ```

### Exception Processing

1. **Client-Friendly Error Messages**: Database errors are translated into user-friendly messages
   ```typescript
   return NextResponse.json({
     error: 'Unable to process your request',
     details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
   }, { status: 500 });
   ```

2. **Error Classification**: Errors are classified by type for appropriate handling
   ```typescript
   if (error instanceof ConnectionError) {
     // Handle connection errors
   } else if (error instanceof QueryError) {
     // Handle query syntax errors
   } else {
     // Handle other errors
   }
   ```

3. **Graceful Degradation**: The application attempts to continue functioning even when errors occur
   ```typescript
   // If the main query fails, try a simpler fallback query
   try {
     results = await query(complexQuery, params);
   } catch (error) {
     results = await query(simpleQuery, params);
   }
   ```

### Logging and Monitoring

1. **Error Logging**: Database errors are logged for later analysis
   ```typescript
   console.error('Database error:', error.message, {
     code: error.code,
     sql: error.sql,
     sqlState: error.sqlState
   });
   ```

2. **Admin Notifications**: Critical database errors trigger admin notifications
   ```typescript
   if (isCriticalError(error)) {
     await query(
       'INSERT INTO admin_notifications (type, title, message) VALUES (?, ?, ?)',
       ['database_error', 'Critical Database Error', error.message]
     );
   }
   ```

3. **Audit Logging**: Database changes are logged in the `admin_logs` table
   ```typescript
   await query(
     'INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
     [adminId, 'update', 'user', userId, JSON.stringify(changes)]
   );
   ```

## Conclusion

The Rainbow Paws database system is designed with a focus on reliability, performance, and maintainability. By following best practices in database design and query optimization, the application provides a robust foundation for managing pet cremation services.

Key strengths of the database implementation include:

1. **Consistent Structure**: Tables follow consistent naming conventions and structural patterns
2. **Robust Error Handling**: Comprehensive error detection and recovery mechanisms
3. **Performance Optimization**: Strategic use of indexes and query optimization techniques
4. **Data Integrity**: Use of transactions and constraints to maintain data consistency
5. **Flexible Schema**: Ability to adapt to changing requirements through dynamic table creation

Developers working with the Rainbow Paws database should:

1. Use parameterized queries to prevent SQL injection
2. Wrap database operations in try-catch blocks for error handling
3. Use transactions for operations that modify multiple tables
4. Follow the established naming conventions for new tables and columns
5. Document any schema changes in the appropriate documentation files
```
