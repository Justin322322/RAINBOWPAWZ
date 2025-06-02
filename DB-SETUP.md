# Database Setup for Rainbow Paws Application

This guide explains how to set up the required database tables for the Rainbow Paws application.

## Automatic Table Creation

The application now includes an auto-migration feature that will create missing tables as needed:

1. When you access endpoints like `/api/pets`, the system will automatically check if the required table exists
2. If the table doesn't exist, it will be created with the correct schema
3. This means tables are created "on-demand" without requiring a separate setup step

## Manual Database Setup

If you prefer to set up all tables in advance, you can run the included database check script:

```bash
# Install dependencies if you haven't already
npm install

# Run the database check script
node check-db-tables.js
```

The script will:
1. Connect to your database using the credentials in `.env.local`
2. Check for each required table
3. Create any missing tables with the proper schema

## Tables Created

Currently, the system will automatically create the following tables:

- `pets`: Stores information about users' pets

## Troubleshooting

If you encounter database connection errors:

1. Make sure your MySQL server is running
2. Check that your database credentials in `.env.local` are correct
3. Ensure the `rainbow_paws` database exists
4. Verify that your user has permission to create tables

If you need to manually create the database:

```sql
CREATE DATABASE IF NOT EXISTS rainbow_paws;
```

## Adding New Tables

When developing new features that require additional tables:

1. Add the table definition to the `tableDefinitions` object in `check-db-tables.js`
2. Create an `ensure[TableName]TableExists` function in the relevant API route
3. Call this function before attempting to query or modify the table 