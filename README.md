# Rainbow Paws Application

A full-featured application for pet memorial services.

## Quick Setup

To get started quickly, follow these steps:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup environment variables**:
   Copy the example environment file and configure your settings:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your actual configuration values.

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Run the production server**:
   ```bash
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
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Run ESLint and automatically fix issues
- `npm run type-check` - Run TypeScript type checking

## Cleanup and Maintenance

The project automatically handles cleanup during the build process. Build artifacts and temporary files are managed by Next.js and npm scripts.

## Running on Different Ports

You can run the application on different ports using standard Next.js commands:

### Development
```bash
npx next dev -p 3005
```

### Production
```bash
npm run build
npx next start -p 3005
```

### Environment Variables
You can also set the port in your `.env.local` file:
```
PORT=3010
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

For production deployment, use standard Next.js commands:

```bash
npm run build
npm start
```

To specify a custom port:

```bash
npm run build
npx next start -p 8080
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
