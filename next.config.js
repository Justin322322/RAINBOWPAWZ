/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
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
