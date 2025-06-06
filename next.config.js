/** @type {import('next').NextConfig} */
// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Get port from environment or default to 3000
const port = process.env.PORT || 3000;

// Always use 3306 for MySQL
const dbPort = 3306;

const nextConfig = {
  // Pass only safe environment variables to the client
  // SECURITY: Never expose database credentials to client-side
  env: {
    // Only expose port and app URL for client-side access
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    // Convert PORT to string to avoid Next.js config warning
    PORT: String(port),
    // Don't include NODE_ENV here as it's not allowed
  },
  // Configure image handling
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: port.toString(),
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.56.1',
        port: port.toString(),
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
    domains: ['localhost', '192.168.56.1'],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: true // Disable image optimization for all environments to ensure consistent behavior
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
      // Disable caching for dynamic content like images in the uploads folder
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, max-age=0, must-revalidate',
          }
        ],
      },
      // Add proper CORS headers for all routes - more restrictive in production
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}` },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      }
    ]
  },
  // Enable type checking and linting during build
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Standard Next.js configuration
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
        emailjs: false,
        twilio: false
      };
    }
    return config;
  },
  // These packages will be bundled properly for server components
  serverExternalPackages: ['nodemailer', 'emailjs', 'twilio']
};

module.exports = nextConfig;
