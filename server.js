/**
 * Custom Next.js Server
 * This server provides better error handling and debugging
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Get port from environment or default to 3001
const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';

// Set production mode
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

// Log environment variables
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', port);
console.log('HOST:', host);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }).listen(port, host, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    console.log(`> Network access on http://${host}:${port}`);
  });
});
