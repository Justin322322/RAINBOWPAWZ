# Port Configuration for Rainbow Paws Application

This document explains how to run the Rainbow Paws application on different ports.

## Running on Different Ports

The application has been configured to run on any port, not just the default port 3000. Here are several ways to specify a custom port:

### Method 1: Using the Custom Start Script (Recommended)

The easiest way to run the application on a custom port is to use the provided start script:

```bash
# Run on the default port (3000)
npm run start:custom

# Run on a specific port (e.g., 8080)
npm run start:custom 8080
```

This script will:
- Set the correct environment variables
- Update the application URL automatically
- Start the application on the specified port

### Method 2: Setting the PORT Environment Variable

You can set the PORT environment variable before starting the application:

```bash
# On Windows
set PORT=8080
npm run dev

# On macOS/Linux
PORT=8080 npm run dev
```

### Method 3: Modifying .env.local

You can also change the port in the `.env.local` file:

1. Open `.env.local`
2. Change the PORT value: `PORT=8080`
3. Run `npm run dev` or `npm run start`

## Verifying the Port

After starting the application, you should see a message indicating which port it's running on. You can access the application at:

```
http://localhost:[PORT]
```

Where `[PORT]` is the port you specified.

## Troubleshooting

If you encounter issues:

1. Make sure the port you're trying to use isn't already in use by another application
2. Check that you have the necessary permissions to bind to the specified port
3. Some ports (below 1024) require administrative privileges on Unix-based systems

## Notes for Deployment

When deploying to production:

1. Update the `NEXT_PUBLIC_APP_URL` to your production URL
2. The PORT environment variable will be used by the server to determine which port to listen on
