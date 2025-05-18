# Database Schema Management

This document explains how the Rainbow Paws application manages database schema creation, migrations, and updates.

## Table of Contents

1. [Database Initialization](#database-initialization)
2. [Dynamic Table Creation](#dynamic-table-creation)
3. [Schema Migration](#schema-migration)
4. [Database Compatibility](#database-compatibility)
5. [Best Practices](#best-practices)

## Database Initialization

The Rainbow Paws application includes an automatic database initialization process that creates the required tables when the application starts or when specific endpoints are accessed for the first time.

### Initialization Process

The initialization process is implemented in `src/lib/initDB.ts`:

```typescript
import { promises as fs } from 'fs';
import path from 'path';
import pool, { query } from './db';

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

export default initializeDatabase;
```

### Initialization Endpoint

The application provides an API endpoint that can be called to initialize the database:

```typescript
// src/app/api/init-db/route.ts
import { NextRequest, NextResponse } from 'next/server';
import initializeDatabase from '@/lib/initDB';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

## Dynamic Table Creation

The application includes functionality to dynamically check for and create tables as needed. This approach ensures that the application can adapt to changes in the database schema without requiring manual intervention.

### Table Existence Check

Before attempting to use a table, the application checks if it exists:

```typescript
// Check if a table exists
const tableExists = await query(`
  SELECT COUNT(*) as count
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
  AND table_name = ?
`, [tableName]) as any[];

if (tableExists[0].count === 0) {
  // Table doesn't exist, create it
  await createTable();
}
```

### Dynamic Table Creation Example

Here's an example of how the application creates the `admin_logs` table if it doesn't exist:

```typescript
// src/app/api/admin/logs/ensure-table.ts
import { query } from '@/lib/db';

export async function ensureAdminLogsTable() {
  try {
    // Check if the table exists
    const tables = await query(`
      SELECT TABLE_NAME
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'admin_logs'
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
```

## Schema Migration

The application includes scripts for migrating data and schema changes. These scripts are designed to be run manually when needed.

### Package Images Migration

The `migrate-package-images.ts` script demonstrates how the application handles data migrations:

```typescript
import fs from 'fs';
import path from 'path';
import { query } from '@/lib/db';

async function migratePackageImages() {
  try {
    // Get all package images from database
    const images = await query(
      'SELECT pi.id, pi.package_id, pi.image_path FROM package_images pi'
    ) as any[];
    
    // Create base directory if it doesn't exist
    const baseDir = path.join(process.cwd(), 'public', 'uploads', 'packages');
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    let migrated = 0;
    let failed = 0;
    let skipped = 0;
    
    // Process each image
    for (const image of images) {
      const packageId = image.package_id;
      const currentPath = image.image_path;
      
      // Skip if already in the new format
      if (currentPath.includes(`/packages/${packageId}/`)) {
        skipped++;
        continue;
      }
      
      // Create package directory if it doesn't exist
      const packageDir = path.join(baseDir, packageId.toString());
      if (!fs.existsSync(packageDir)) {
        fs.mkdirSync(packageDir, { recursive: true });
      }
      
      try {
        // Check if the source file exists
        const sourcePath = path.join(process.cwd(), 'public', currentPath);
        if (!fs.existsSync(sourcePath)) {
          failed++;
          continue;
        }
        
        // Get the original filename
        const originalFilename = path.basename(sourcePath);
        
        // Create the new path
        const newRelativePath = `/uploads/packages/${packageId}/${originalFilename}`;
        const newAbsolutePath = path.join(process.cwd(), 'public', newRelativePath);
        
        // Copy the file to the new location
        fs.copyFileSync(sourcePath, newAbsolutePath);
        
        // Update the database with new path
        await query(
          'UPDATE package_images SET image_path = ? WHERE id = ?',
          [newRelativePath, image.id]
        );
        
        migrated++;
      } catch (error) {
        failed++;
      }
    }
    
    return { migrated, failed, skipped };
  } catch (error) {
    throw error;
  }
}
```

### Column Addition

The application can dynamically add columns to existing tables when needed:

```typescript
// Check if a column exists
const columnExists = await query(`
  SELECT COUNT(*) as count
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
  AND table_name = ?
  AND column_name = ?
`, [tableName, columnName]) as any[];

if (columnExists[0].count === 0) {
  // Column doesn't exist, add it
  await query(`
    ALTER TABLE ${tableName}
    ADD COLUMN ${columnName} ${columnDefinition}
  `);
}
```

## Database Compatibility

The application is designed to work with different database schemas, allowing it to adapt to changes over time.

### Schema Detection

The application detects the current schema and adapts its queries accordingly:

```typescript
// Check which table structure to use
let bookingResult;

try {
  // First, check if the bookings table has service_provider_id column
  const serviceProviderCheck = await query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'service_provider_id'"
  ) as any[];

  if (serviceProviderCheck.length > 0) {
    // Use the new schema
    bookingResult = await query(
      `INSERT INTO bookings (user_id, service_provider_id, service_package_id, booking_date, booking_time, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, providerId, packageId, formattedDate, bookingTime]
    ) as any;
  } else {
    // Use the old schema
    bookingResult = await query(
      `INSERT INTO bookings (user_id, business_service_id, booking_date, booking_time, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, packageId, formattedDate, bookingTime]
    ) as any;
  }
} catch (error) {
  // Handle error
}
```

### Fallback Queries

The application includes fallback queries for compatibility with different schema versions:

```typescript
try {
  // Try the primary query first
  const result = await query(primaryQuery, params);
  return result;
} catch (error) {
  // If the primary query fails, try the fallback query
  try {
    const fallbackResult = await query(fallbackQuery, fallbackParams);
    return fallbackResult;
  } catch (fallbackError) {
    // Both queries failed, handle the error
    throw fallbackError;
  }
}
```

## Best Practices

When working with the Rainbow Paws database schema, follow these best practices:

1. **Always Check Table Existence**: Before using a table, check if it exists and create it if needed
2. **Use Transactions for Schema Changes**: Wrap schema changes in transactions to ensure consistency
3. **Include Fallback Logic**: Provide fallback logic for different schema versions
4. **Document Schema Changes**: Update documentation when making schema changes
5. **Test Schema Migrations**: Test migration scripts thoroughly before running them in production
6. **Use Parameterized Queries**: Always use parameterized queries to prevent SQL injection
7. **Handle Migration Errors**: Implement proper error handling in migration scripts
8. **Backup Before Migration**: Always backup the database before running migration scripts

By following these practices, you can ensure that the Rainbow Paws application remains compatible with different database schemas and can be safely updated over time.
