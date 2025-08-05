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

  // On the server, use environment variable or default
  return process.env.PORT || '3001';
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
  const port = process.env.PORT || '3001';
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;

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
 * Get the application URL with dynamic port detection
 * This is the recommended function to use for generating URLs in the application
 * Works both client-side and server-side
 */
export function getAppUrl(): string {
  return getAppBaseUrl();
}

/**
 * Get the application URL for server-side use (emails, notifications, etc.)
 * This ensures consistent URL generation across all server-side components
 */
export function getServerAppUrl(): string {
  // Always use environment variable or dynamic port detection on server
  const port = process.env.PORT || '3001';
  return process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
}


