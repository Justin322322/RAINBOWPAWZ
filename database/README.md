# Database Migrations

This directory contains SQL migrations for database schema changes.

## How to Apply Migrations

### Using MySQL CLI

1. Connect to your MySQL database:

```bash
mysql -u username -p
```

2. Select the Rainbow Paws database:

```sql
USE rainbow_paws;
```

3. Apply the migration scripts in sequence:

```sql
SOURCE /path/to/cremation_document_fields.sql;
```

### Using phpMyAdmin

1. Access your phpMyAdmin interface
2. Select the Rainbow Paws database
3. Go to the "SQL" tab
4. Copy the content of the migration file
5. Paste it into the SQL query box
6. Click "Go" to execute the query

## Migration Files

- `cremation_document_fields.sql`: Adds document file path fields to the businesses table for cremation center registration 