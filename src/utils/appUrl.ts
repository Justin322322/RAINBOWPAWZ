/**
 * Utility to handle app URL detection and generation
 * This ensures the app works correctly regardless of the port it's running on
 */

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

  // On the server, use the environment variable but ensure it has the correct port
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const port = process.env.PORT || '3001';

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


