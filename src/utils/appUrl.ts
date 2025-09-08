/**
 * Utility to handle app URL detection and generation
 * This ensures the app works correctly regardless of the port it's running on
 */

/**
 * Get the current port the application is running on
 * This works both client-side and server-side
 */
export function getCurrentPort(): string {
  // In the browser, get the actual port from window.location
  if (typeof window !== 'undefined') {
    return window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
  }

  // On the server, use environment variable (Railway sets this automatically)
  return process.env.PORT || '3000';
}



/**
 * Get the application URL for server-side use (emails, notifications_unified, etc.)
 * This ensures consistent URL generation across all server-side components
 * Priority: RAILWAY_STATIC_URL > NEXT_PUBLIC_APP_URL > dynamic port detection
 */
export function getServerAppUrl(): string {
  // Check for Railway-specific environment variable first
  if (process.env.RAILWAY_STATIC_URL) {
    return process.env.RAILWAY_STATIC_URL;
  }

  // Check for custom app URL environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Check for Railway deployment URL pattern
  if (process.env.RAILWAY_DEPLOYMENT_URL) {
    return process.env.RAILWAY_DEPLOYMENT_URL;
  }

  // Check for Vercel deployment URL
  if (process.env.VERCEL_URL) {
    const protocol = process.env.VERCEL_URL.includes('localhost') ? 'http' : 'https';
    const url = `${protocol}://${process.env.VERCEL_URL}`;
    return url;
  }

  // Fallback to dynamic port detection (avoid hardcoded localhost in production)
  const port = process.env.PORT || '3000';
  if (process.env.NODE_ENV === 'production') {
    return `http://localhost:${port}`;
  }
  
  const fallbackUrl = `http://localhost:${port}`;
  return fallbackUrl;
}


