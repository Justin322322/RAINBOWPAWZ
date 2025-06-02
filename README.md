# Rainbow Paws Application

A full-featured application for pet memorial services.

## Quick Setup

To get started quickly, follow these steps:

1. **Setup environment variables**:
   ```
   npm run setup
   ```
   This will create an `.env.local` file with the necessary environment variables.

   For quick setup with default values, use:
   ```
   npm run setup -- --quick
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Run the development server**:
   ```
   npm run dev
   ```

4. **Build for production**:
   ```
   npm run build
   ```

5. **Run the production server**:
   ```
   npm start
   ```

## Managing Environment Variables

The following environment variables are used:

- `PORT` - Web server port (default: 3000)
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 3306)
- `DB_USER` - Database user (default: root)
- `DB_NAME` - Database name (default: rainbow_paws)
- `DB_PASSWORD` - Database password (empty by default)
- `SMTP_HOST` - SMTP server host (default: smtp.gmail.com)
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_USER` - SMTP username (your email address)
- `SMTP_PASS` - SMTP password (app password for Gmail)
- `SMTP_FROM` - From email address (default: no-reply@rainbowpaws.com)
- `DEV_EMAIL_MODE` - Enable development email mode (true/false, default: true)

## Email Configuration in Development

In development mode, emails are not actually sent; they are logged to the console. This is controlled by the `DEV_EMAIL_MODE` environment variable.

When enabled (`DEV_EMAIL_MODE=true`):
- Reset tokens and OTP codes are logged to the console
- No actual emails are sent
- No SMTP credentials are required

For testing with real emails, set `DEV_EMAIL_MODE=false` and provide valid SMTP credentials.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm start` - Start the production server
- `npm run start:custom` - Start with a custom port

- `npm run setup` - Set up environment variables

## Cleanup and Maintenance

The project automatically handles cleanup during the build process. Build artifacts and temporary files are managed by Next.js and npm scripts.

## Running on Different Ports

The application now supports running on any port. Here are several ways to change the port:

### Using the run-app-any-port script (Easiest)

For Windows users:
```
run-app-any-port.bat
```

For Linux/Mac users:
```
./run-app-any-port.sh
```

These scripts will prompt you for the port number and mode (development or production).

### Using the change-port utility

This is another easy way to run the app on a different port:

```bash
npm run change-port 3001
# or without specifying a port (it will prompt you)
npm run change-port
```

### Using start-any-port

```bash
npm run start:any-port 3002
```

### Using Next.js directly

```bash
npx next dev -p 3005 -H 0.0.0.0
# or for production
npx next start -p 3005 -H 0.0.0.0
```

### By updating .env.local

You can manually edit the `.env.local` file to include:

```
PORT=3010
HOST=0.0.0.0
NEXT_PUBLIC_APP_URL=http://localhost:3010
```

## Building for Production

```bash
npm run build
npm run start
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deployment

For production deployment, use:

```bash
npm run build
npm run start
```

Or to specify a custom port:

```bash
npm run build
npm run start:any-port 8080
```

## Package Image Organization

Images for service packages are now organized in a folder structure for better management:

- All package images are stored in folders based on their package ID
- Path format: `/public/uploads/packages/{packageId}/{filename}`
- This provides better organization and makes it easier to manage images for each package

The migration script can be run to organize existing package images into the database if needed during maintenance.

When uploading new package images, the system automatically:
1. Creates a folder with the package ID if it doesn't exist
2. Stores the images in that folder
3. Updates the database with the new path format
