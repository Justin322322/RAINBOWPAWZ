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
 * Get the base URL of the application
 * This will use window.location if available, otherwise fall back to environment variable
 * This ensures the app works correctly regardless of which port it's running on
 */
export function getAppBaseUrl(): string {
  // In the browser, always use window.location to get the current port
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;

    // Include port in URL only if it's not the default port
    if (port && port !== '80' && port !== '443') {
      return `${protocol}//${hostname}:${port}`;
    }

    return `${protocol}//${hostname}`;
  }

  // On the server, use the environment variable with dynamic port detection
  const port = process.env.PORT || '3000';
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.RAILWAY_STATIC_URL || `http://localhost:${port}`;

  // If the URL already has a port, use it as is
  if (envUrl.includes(':' + port)) {
    return envUrl;
  }

  // Otherwise, parse the URL and add the port
  try {
    const url = new URL(envUrl);
    // Handle both localhost and IP addresses (including 0.0.0.0)
    if (url.hostname === 'localhost' || url.hostname === '0.0.0.0' || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
      url.port = port;
      return url.toString();
    }
  } catch {
    // If URL parsing fails, return the default
  }

  return envUrl;
}

/**
 * Get the application URL for server-side use (emails, notifications, etc.)
 * This ensures consistent URL generation across all server-side components
 * Priority: RAILWAY_STATIC_URL > NEXT_PUBLIC_APP_URL > dynamic port detection
 */
export function getServerAppUrl(): string {
  // Check for Railway-specific environment variable first
  if (process.env.RAILWAY_STATIC_URL) {
    console.log('Using RAILWAY_STATIC_URL:', process.env.RAILWAY_STATIC_URL);
    return process.env.RAILWAY_STATIC_URL;
  }

  // Check for custom app URL environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    console.log('Using NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Check for Railway deployment URL pattern
  if (process.env.RAILWAY_DEPLOYMENT_URL) {
    console.log('Using RAILWAY_DEPLOYMENT_URL:', process.env.RAILWAY_DEPLOYMENT_URL);
    return process.env.RAILWAY_DEPLOYMENT_URL;
  }

  // Check for Vercel deployment URL
  if (process.env.VERCEL_URL) {
    const protocol = process.env.VERCEL_URL.includes('localhost') ? 'http' : 'https';
    const url = `${protocol}://${process.env.VERCEL_URL}`;
    console.log('Using VERCEL_URL:', url);
    return url;
  }

  // Fallback to dynamic port detection (avoid hardcoded localhost in production)
  const port = process.env.PORT || '3000';
  if (process.env.NODE_ENV === 'production') {
    console.warn('No production URL configured, using fallback');
    return `http://localhost:${port}`;
  }
  
  const fallbackUrl = `http://localhost:${port}`;
  console.log('Using fallback URL:', fallbackUrl);
  return fallbackUrl;
}


