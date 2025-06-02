#!/usr/bin/env node

/**
 * Cron job script to process scheduled reminders
 * 
 * This script can be run by a cron job to automatically process:
 * - Booking reminders (24h and 1h before appointments)
 * - Review requests for completed bookings
 * - Cleanup of old data
 * 
 * Usage:
 * - Add to crontab to run every 15 minutes:
 *   */15 * * * * /path/to/node /path/to/scripts/process-reminders.js
 * 
 * Environment variables required:
 * - CRON_SECRET: Secret key for authenticating cron requests
 * - NEXT_PUBLIC_APP_URL: Base URL of the application
 */

const https = require('https');
const http = require('http');

// Configuration
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('Error: CRON_SECRET environment variable is required');
  process.exit(1);
}

// Parse URL
const url = new URL(`${APP_URL}/api/notifications/process-reminders`);
const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? https : http;

// Request options
const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-cron-secret': CRON_SECRET,
    'User-Agent': 'RainbowPaws-CronJob/1.0'
  }
};

console.log(`[${new Date().toISOString()}] Starting reminder processing...`);

// Make the request
const req = httpModule.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log(`[${new Date().toISOString()}] Reminder processing completed successfully:`);
        console.log(`  - Reminders processed: ${response.reminders?.processed || 0}`);
        console.log(`  - Reminders failed: ${response.reminders?.errors || 0}`);
        console.log(`  - Review requests sent: ${response.reviews?.processed || 0}`);
        console.log(`  - Review request errors: ${response.reviews?.errors || 0}`);
        console.log(`  - Old reminders cleaned: ${response.cleanup?.remindersDeleted || 0}`);
        console.log(`  - Old notifications cleaned: ${response.cleanup?.notificationsDeleted || 0}`);
        
        // Exit with success
        process.exit(0);
      } else {
        console.error(`[${new Date().toISOString()}] Error: HTTP ${res.statusCode}`);
        console.error('Response:', response);
        process.exit(1);
      }
    } catch (parseError) {
      console.error(`[${new Date().toISOString()}] Error parsing response:`, parseError);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error(`[${new Date().toISOString()}] Request error:`, error);
  process.exit(1);
});

// Set timeout
req.setTimeout(30000, () => {
  console.error(`[${new Date().toISOString()}] Request timeout`);
  req.destroy();
  process.exit(1);
});

// Send the request
req.end();

// Handle process termination
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Process interrupted`);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Process terminated`);
  process.exit(1);
});
