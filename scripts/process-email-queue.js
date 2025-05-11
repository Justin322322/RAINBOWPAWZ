/**
 * Email Queue Processor Script
 *
 * This script processes the email queue by calling the API endpoint.
 * It can be run as a cron job or scheduled task to process emails periodically.
 *
 * Usage:
 * node process-email-queue.js [limit]
 *
 * Where [limit] is the maximum number of emails to process (default: 20)
 */

const https = require('https');
const http = require('http');

// Get the limit from command line arguments
const limit = parseInt(process.argv[2]) || 20;

// No API key required for internal processing

// Determine the base URL based on environment
const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
const isHttps = baseUrl.startsWith('https');
const client = isHttps ? https : http;

// Extract port from URL or use default
const urlObj = new URL(baseUrl);
const port = urlObj.port || (isHttps ? 443 : process.env.PORT || 3000);

// Prepare the request options
const options = {
  hostname: urlObj.hostname,
  port: port,
  path: '/api/email/queue/process',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

// Prepare the request body
const data = JSON.stringify({
  limit
});

// Send the request
const req = client.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const result = JSON.parse(responseData);
        console.log(`Email queue processed successfully:`);
        console.log(`- Processed: ${result.processed}`);
        console.log(`- Success: ${result.success}`);
        console.log(`- Failed: ${result.failed}`);
      } catch (error) {
        console.error('Error parsing response:', error);
      }
    } else {
      console.error(`Error processing email queue: ${res.statusCode} ${res.statusMessage}`);
      console.error(responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error sending request:', error);
});

// Write the request body
req.write(data);
req.end();

console.log(`Processing email queue (limit: ${limit})...`);
