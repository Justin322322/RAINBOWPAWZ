/** @type {import('next').NextConfig} */
// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Get port from environment or default to 3001
const port = process.env.PORT || 3001;

// Always use 3306 for MySQL
const dbPort = 3306;

// Production flag and allowed image hosts whitelist (comma-separated)
const isProd = process.env.NODE_ENV === 'production';
const rawHosts = process.env.ALLOWED_IMAGE_HOSTS
  ? process.env.ALLOWED_IMAGE_HOSTS
  : 'assets.example.com';        // sensible default or fallback
const allowedImageHosts = rawHosts
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  // Normalize to bare hostnames even if URLs are provided
  .map((entry) => entry.replace(/^https?:\/\//i, '').replace(/\/.*$/, ''));const nextConfig = {
  // Pass only safe environment variables to the client
  // SECURITY: Never expose database credentials to client-side
  env: {
    // Only expose port and app URL for client-side access
    PORT: port,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,
    // Don't include NODE_ENV here as it's not allowed
  },
  // Configure image handling
  images: {
    remotePatterns: isProd
      ? allowedImageHosts.map((hostname) => ({
          protocol: 'https',
          hostname,
          port: '',
          pathname: '/**',
        }))
      : [
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
          // Broad patterns for development only
          { protocol: 'http', hostname: '*', port: '', pathname: '/**' },
          { protocol: 'https', hostname: '*', port: '', pathname: '/**' },
        ],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Keep images unoptimized locally; use optimizer in production
    unoptimized: !isProd,
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
  // Enable ESLint during builds for strict unused variable checking
  eslint: {
    ignoreDuringBuilds: false,
    // Only lint files in these directories during build
    dirs: ['src'],
  },
  typescript: {
    ignoreBuildErrors: true,
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
