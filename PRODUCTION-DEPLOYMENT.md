# Rainbow Paws Production Deployment Guide

This guide explains how to deploy the Rainbow Paws application in production mode.

## Quick Start (Recommended)

For the simplest deployment experience, use the provided scripts:

### Windows Users

1. Double-click the `start-production.bat` file
2. Follow the on-screen instructions

### Linux/Mac Users

1. Make the script executable:
   ```bash
   chmod +x start-production.sh
   ```

2. Run the script:
   ```bash
   ./start-production.sh
   ```

3. Follow the on-screen instructions

## Manual Deployment

If you prefer to deploy manually, follow these steps:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the application**:
   ```bash
   npm run build
   ```

3. **Start the production server**:
   ```bash
   npm start
   ```

## Using npm Scripts

You can also use the npm scripts defined in package.json:

```bash
# Build and start in one command
npm run production

# Start on a specific port
npm run start:any-port 8080
```

## Environment Configuration

The application uses the following environment variables:

- `PORT` - Web server port (default: 3001)
- `DB_HOST` - Database host (default: localhost)
- `DB_USER` - Database user (default: root)
- `DB_PASSWORD` - Database password (empty by default)
- `DB_NAME` - Database name (default: rainbow_paws)

These can be configured in the `.env.local` file.

## Database Setup

The application will automatically create the required database tables on first run. However, you need to ensure:

1. MySQL server is running
2. The database `rainbow_paws` exists
3. The user has appropriate permissions

To manually create the database:

```sql
CREATE DATABASE IF NOT EXISTS rainbow_paws;
```

## Troubleshooting

### Application won't start

1. Check if MySQL is running
2. Verify database credentials in `.env.local`
3. Ensure the port is not in use by another application

### Build fails

1. Check for TypeScript errors
2. Ensure all dependencies are installed
3. Check disk space

### Database connection issues

1. Verify MySQL is running
2. Check database credentials
3. Ensure the database exists
4. Verify network connectivity to the database server

## Production Best Practices

1. **Use a process manager** like PM2 for production deployments:
   ```bash
   npm install -g pm2
   pm2 start npm --name "rainbow-paws" -- start
   ```

2. **Set up a reverse proxy** like Nginx to handle SSL and load balancing

3. **Configure proper logging** for production environments

4. **Set up monitoring** to track application health

5. **Implement regular backups** of the database

## Support

If you encounter any issues with deployment, please contact the development team.
