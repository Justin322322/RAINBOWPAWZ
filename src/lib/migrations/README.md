# Database Migrations

This directory contains database migration files for the Rainbow Paws application.

## Available Migrations

- `create_bookings_table.sql`: Creates the `bookings` table that is referenced in the code but was missing from the database schema.

## How to Run Migrations

You can run the migrations using the provided script:

```bash
# From the project root directory
node run_migrations.js
```

Alternatively, you can run the migrations directly:

```bash
# From the project root directory
node src/lib/migrations/run_migrations.js
```

## Adding New Migrations

To add a new migration:

1. Create a new SQL file in this directory with a descriptive name, e.g., `create_new_table.sql`
2. Add your SQL statements to the file
3. Run the migrations using one of the methods above

## Troubleshooting

If you encounter any issues:

1. Make sure your database connection details in `.env` are correct
2. Check that your SQL syntax is compatible with your MySQL version
3. Look for error messages in the console output

For foreign key constraints, ensure that the referenced tables and columns exist before running the migration. 