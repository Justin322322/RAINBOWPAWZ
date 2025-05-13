/** @type {import('next').NextConfig} */
// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Get port from environment or default to 3001
const port = process.env.PORT || 3001;

// Always use 3306 for MySQL
const dbPort = 3306;

// Log environment variables for debugging
console.log('Next.js Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT (Server):', port);
console.log('DB_PORT (MySQL):', dbPort);
console.log('DB_HOST:', process.env.DB_HOST);

const nextConfig = {
  // Pass environment variables to the client
  env: {
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || 'rainbow_paws',
    DB_PORT: '3306', // Always use the standard MySQL port
    // Add the port and app URL for client-side access
    PORT: port,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
    // Don't include NODE_ENV here as it's not allowed
  },
  // Allow connections from any origin in development
  async headers() {
    return [
      {
        source: '/logo.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ],
      },
      // Add proper CORS headers for all routes
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      }
    ]
  },
  // Ensure CSS is properly processed in production
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve server-only modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        // Prevent client-side imports of these packages
        nodemailer: false,
        emailjs: false
      };
    }
    return config;
  },
  // These packages will be bundled properly for server components
  serverExternalPackages: ['nodemailer', 'emailjs'],
  // Next.js 13+ uses a different approach for server configuration
  // The server settings should be in next.config.mjs or package.json scripts


};

module.exports = nextConfig;
