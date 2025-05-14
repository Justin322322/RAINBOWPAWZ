# Rainbow Paws Cleanup Guide

This document explains how to clean up unnecessary files in the Rainbow Paws project.

## Files That Can Be Safely Removed

The following files are not needed in production and can be safely removed:

### Test and Development Files

- `test-db.js` - Database test script
- `package.json.backup` - Backup of package.json
- `src/scripts/insert_test_providers.js` - Script to insert test data
- `src/scripts/insert_test_providers.sql` - SQL for test data

### Build and Configuration Files

- `fix-production.js` - One-time production fix script
- `package-prod.js` - Old production package script

### Cache and Temporary Files

- `.next/cache/*` - Next.js build cache (will be regenerated)
- `.next-temp/` - Temporary build files

## Using the Cleanup Scripts

We've created two scripts to help you clean up the project:

### 1. Basic Cleanup

Run the following command to remove unnecessary files and clean the build cache:

```bash
npm run cleanup
```

This will:
- Remove test files and unused scripts
- Clean the Next.js cache
- Preserve your actual application code

### 2. Production Preparation

Run the following command to prepare a production-ready package:

```bash
npm run prepare:prod
```

This will:
- Clean up unnecessary files
- Build the application for production
- Create a `rainbow_paws_prod` directory with only the essential files
- Optimize the package.json for production
- Create a simplified start script

## Additional NPM Scripts

- `npm run build:clean` - Clean unnecessary files then build the application
- `npm run clean-build` - Legacy cleanup script (uses cleanup-repo.js)

## Manual Cleanup

If you prefer to clean up files manually, follow these steps:

1. Remove test files:
   ```
   rm test-db.js
   rm package.json.backup
   rm src/scripts/insert_test_providers.js
   rm src/scripts/insert_test_providers.sql
   ```

2. Clean Next.js cache:
   ```
   rm -rf .next/cache/*
   ```

3. Remove build scripts that are no longer needed:
   ```
   rm fix-production.js
   rm package-prod.js
   ```

## Important Notes

- Cleaning the Next.js cache will not affect your application but may increase the next build time
- Always make sure you have a backup before removing files
- The cleanup scripts are designed to be safe and will only remove files that are known to be unnecessary 