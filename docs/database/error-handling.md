# Database Error Handling

This document outlines the error handling patterns and strategies used in the Rainbow Paws application for database operations.

## Table of Contents

1. [Error Handling Patterns](#error-handling-patterns)
2. [Common Database Errors](#common-database-errors)
3. [Transaction Error Handling](#transaction-error-handling)
4. [Client-Side Error Responses](#client-side-error-responses)
5. [Logging and Monitoring](#logging-and-monitoring)
6. [Best Practices](#best-practices)

## Error Handling Patterns

The Rainbow Paws application uses several patterns to handle database errors effectively.

### Try-Catch Blocks

All database operations are wrapped in try-catch blocks to catch and handle errors:

```typescript
try {
  const results = await query(sql, params);
  return results;
} catch (error) {
  // Handle error
  console.error('Database error:', error);
  throw error;
}
```

### Error Classification

Errors are classified by type to provide appropriate handling:

```typescript
try {
  // Database operation
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    // Connection refused error
    console.error('Could not connect to database server');
  } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
    // Access denied error
    console.error('Invalid database credentials');
  } else if (error.code === 'ER_BAD_DB_ERROR') {
    // Database does not exist
    console.error('Database does not exist');
  } else if (error.code === 'ER_NO_SUCH_TABLE') {
    // Table does not exist
    console.error('Table does not exist');
  } else {
    // Other database error
    console.error('Database error:', error.message);
  }
  
  throw error;
}
```

### Fallback Mechanisms

The application includes fallback mechanisms to handle errors gracefully:

```typescript
try {
  // Try the primary query
  results = await query(primaryQuery, params);
} catch (error) {
  try {
    // If the primary query fails, try a simpler fallback query
    results = await query(fallbackQuery, params);
  } catch (fallbackError) {
    // Both queries failed, handle the error
    console.error('All queries failed:', fallbackError);
    throw fallbackError;
  }
}
```

### Connection Recovery

The application attempts to recover from connection errors:

```typescript
try {
  // Database operation
} catch (error) {
  if (error.code === 'PROTOCOL_CONNECTION_LOST') {
    // The connection was lost, try to reconnect
    try {
      pool = mysql.createPool(config);
      // Retry the operation
      return await query(sql, params);
    } catch (reconnectError) {
      // Failed to reconnect
      console.error('Failed to reconnect to database:', reconnectError);
      throw reconnectError;
    }
  }
  
  throw error;
}
```

## Common Database Errors

The application handles several common database errors.

### Connection Errors

```typescript
// Connection refused
if (error.code === 'ECONNREFUSED') {
  return NextResponse.json(
    { error: 'Database connection error', details: 'Could not connect to the database server' },
    { status: 503 }
  );
}

// Access denied
if (error.code === 'ER_ACCESS_DENIED_ERROR') {
  return NextResponse.json(
    { error: 'Database authentication error', details: 'Invalid database credentials' },
    { status: 500 }
  );
}

// Database not found
if (error.code === 'ER_BAD_DB_ERROR') {
  return NextResponse.json(
    { error: 'Database not found', details: 'The specified database does not exist' },
    { status: 500 }
  );
}
```

### Query Errors

```typescript
// Table doesn't exist
if (error.code === 'ER_NO_SUCH_TABLE') {
  // Try to create the table
  try {
    await createTable();
    // Retry the query
    return await query(sql, params);
  } catch (createError) {
    throw createError;
  }
}

// Duplicate entry
if (error.code === 'ER_DUP_ENTRY') {
  return NextResponse.json(
    { error: 'Duplicate entry', details: 'A record with this information already exists' },
    { status: 409 }
  );
}

// Data too long
if (error.code === 'ER_DATA_TOO_LONG') {
  return NextResponse.json(
    { error: 'Data too long', details: 'One or more fields exceed the maximum allowed length' },
    { status: 400 }
  );
}
```

### Schema Errors

```typescript
// Unknown column
if (error.code === 'ER_BAD_FIELD_ERROR') {
  // Check if we need to add the column
  try {
    await addColumn();
    // Retry the query
    return await query(sql, params);
  } catch (addColumnError) {
    throw addColumnError;
  }
}
```

## Transaction Error Handling

Transactions are used to ensure data consistency across multiple operations. The application handles transaction errors carefully:

```typescript
// Start a transaction
await query('START TRANSACTION');

try {
  // Execute multiple queries
  await query(query1, params1);
  await query(query2, params2);
  
  // Commit the transaction if all queries succeed
  await query('COMMIT');
} catch (error) {
  // Rollback the transaction if any query fails
  await query('ROLLBACK');
  
  console.error('Transaction failed:', error);
  throw error;
}
```

### Nested Transactions

The application handles nested transactions by using savepoints:

```typescript
// Start the outer transaction
await query('START TRANSACTION');

try {
  // Execute some queries
  await query(query1, params1);
  
  // Create a savepoint for the nested transaction
  await query('SAVEPOINT nested_transaction');
  
  try {
    // Execute nested queries
    await query(query2, params2);
    await query(query3, params3);
  } catch (nestedError) {
    // Rollback to the savepoint if nested queries fail
    await query('ROLLBACK TO SAVEPOINT nested_transaction');
    
    // Handle the nested error
    console.error('Nested transaction failed:', nestedError);
    
    // Continue with the outer transaction
  }
  
  // Execute more queries in the outer transaction
  await query(query4, params4);
  
  // Commit the outer transaction
  await query('COMMIT');
} catch (error) {
  // Rollback the entire transaction if any query fails
  await query('ROLLBACK');
  
  console.error('Transaction failed:', error);
  throw error;
}
```

## Client-Side Error Responses

The application provides meaningful error responses to clients:

```typescript
try {
  // Database operation
} catch (error) {
  // Determine the appropriate status code
  let statusCode = 500;
  let errorMessage = 'Database error';
  let errorDetails = 'An unexpected error occurred';
  
  if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    errorMessage = 'Service unavailable';
    errorDetails = 'Database server is not responding';
  } else if (error.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    errorMessage = 'Conflict';
    errorDetails = 'A record with this information already exists';
  } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    errorMessage = 'Invalid reference';
    errorDetails = 'Referenced record does not exist';
  }
  
  // Return a JSON response with appropriate error information
  return NextResponse.json({
    error: errorMessage,
    details: errorDetails,
    // Include technical details in development mode only
    ...(process.env.NODE_ENV === 'development' && { 
      code: error.code,
      message: error.message,
      sql: error.sql
    })
  }, { status: statusCode });
}
```

## Logging and Monitoring

The application includes comprehensive logging and monitoring for database errors.

### Error Logging

Database errors are logged for later analysis:

```typescript
try {
  // Database operation
} catch (error) {
  // Log the error with relevant context
  console.error('Database error:', {
    code: error.code,
    message: error.message,
    sql: error.sql,
    sqlState: error.sqlState,
    params: params, // Be careful not to log sensitive data
    timestamp: new Date().toISOString(),
    route: request.url
  });
  
  throw error;
}
```

### Admin Notifications

Critical database errors trigger admin notifications:

```typescript
if (isCriticalError(error)) {
  try {
    await query(
      'INSERT INTO admin_notifications (type, title, message, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)',
      ['database_error', 'Critical Database Error', error.message, 'system', 0]
    );
  } catch (notificationError) {
    // Log the notification error but don't throw it
    console.error('Failed to create admin notification:', notificationError);
  }
}
```

### Error Tracking

The application tracks error patterns to identify recurring issues:

```typescript
try {
  // Database operation
} catch (error) {
  // Track the error
  await trackError({
    type: 'database',
    code: error.code,
    message: error.message,
    route: request.url,
    timestamp: new Date().toISOString()
  });
  
  throw error;
}
```

## Best Practices

When handling database errors in the Rainbow Paws application, follow these best practices:

1. **Always Use Try-Catch**: Wrap all database operations in try-catch blocks.

2. **Classify Errors**: Identify the type of error to provide appropriate handling.

3. **Use Transactions**: Use transactions for operations that require multiple queries to maintain data consistency.

4. **Provide Meaningful Responses**: Return clear, user-friendly error messages to clients.

5. **Log Errors**: Log database errors with relevant context for later analysis.

6. **Include Fallbacks**: Implement fallback mechanisms for critical operations.

7. **Handle Connection Issues**: Implement connection recovery for transient connection issues.

8. **Secure Error Messages**: Don't expose sensitive information in error messages sent to clients.

9. **Monitor Error Patterns**: Track error patterns to identify and address recurring issues.

10. **Test Error Scenarios**: Test how the application handles various database error scenarios.

By following these practices, you can ensure that the Rainbow Paws application handles database errors gracefully and maintains a good user experience even when errors occur.
