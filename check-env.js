// Script to check environment variables
require('dotenv').config({ path: '.env.local' });

console.log('Environment Variables:');
console.log('=====================');
console.log('Database Configuration:');
console.log('DB_HOST:', process.env.DB_HOST || 'not set');
console.log('DB_USER:', process.env.DB_USER || 'not set');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'not set');
console.log('DB_NAME:', process.env.DB_NAME || 'not set');
console.log('DB_PORT:', process.env.DB_PORT || 'not set');

console.log('\nEmail Configuration:');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'not set');
console.log('SMTP_PORT:', process.env.SMTP_PORT || 'not set');
console.log('SMTP_USER:', process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 3) + '...' : 'not set');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***' : 'not set');
console.log('SMTP_FROM:', process.env.SMTP_FROM || 'not set');
console.log('DISABLE_EMAILS:', process.env.DISABLE_EMAILS || 'not set');

console.log('\nApplication Configuration:');
console.log('PORT:', process.env.PORT || 'not set');
console.log('HOST:', process.env.HOST || 'not set');
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'not set');
