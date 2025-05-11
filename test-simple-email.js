// Test script for the simple email service
require('dotenv').config({ path: '.env.local' });
const { 
  sendEmail, 
  sendWelcomeEmail, 
  sendPasswordResetEmail, 
  sendOtpEmail, 
  sendBookingConfirmationEmail,
  sendBusinessVerificationEmail
} = require('./src/lib/simpleEmailService');

// Get the test type from command line arguments
const testType = process.argv[2] || 'all';
const testEmail = process.argv[3] || process.env.SMTP_USER || 'test@example.com';

console.log('=== SIMPLE EMAIL SERVICE TEST ===');
console.log('Test type:', testType);
console.log('Test email:', testEmail);
console.log('Simulation mode:', process.env.SIMULATE_EMAIL_SUCCESS === 'true' ? 'Enabled' : 'Disabled');
console.log('');

async function runTests() {
  try {
    if (testType === 'all' || testType === 'basic') {
      console.log('Testing basic email...');
      const result = await sendEmail({
        to: testEmail,
        subject: 'Test Email from Rainbow Paws',
        html: '<h1>Test Email</h1><p>This is a test email from the simple email service.</p>'
      });
      console.log('Result:', result.success ? 'Success' : 'Failed', result.messageId || result.error);
      console.log('');
    }

    if (testType === 'all' || testType === 'welcome') {
      console.log('Testing welcome email...');
      const result = await sendWelcomeEmail(testEmail, 'Test User', 'personal');
      console.log('Result:', result.success ? 'Success' : 'Failed', result.messageId || result.error);
      console.log('');
    }

    if (testType === 'all' || testType === 'password') {
      console.log('Testing password reset email...');
      const resetToken = 'test-reset-token-' + Date.now();
      const result = await sendPasswordResetEmail(testEmail, resetToken);
      console.log('Result:', result.success ? 'Success' : 'Failed', result.messageId || result.error);
      console.log('');
    }

    if (testType === 'all' || testType === 'otp') {
      console.log('Testing OTP email...');
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const result = await sendOtpEmail(testEmail, otp);
      console.log('Result:', result.success ? 'Success' : 'Failed', result.messageId || result.error);
      console.log('');
    }

    if (testType === 'all' || testType === 'booking') {
      console.log('Testing booking confirmation email...');
      const bookingDetails = {
        customerName: 'Test Customer',
        serviceName: 'Test Service',
        providerName: 'Test Provider',
        bookingDate: 'January 1, 2023',
        bookingTime: '10:00 AM',
        petName: 'Test Pet',
        bookingId: 'TEST-123'
      };
      const result = await sendBookingConfirmationEmail(testEmail, bookingDetails);
      console.log('Result:', result.success ? 'Success' : 'Failed', result.messageId || result.error);
      console.log('');
    }

    if (testType === 'all' || testType === 'business') {
      console.log('Testing business verification email...');
      const businessDetails = {
        businessName: 'Test Business',
        contactName: 'Test Contact',
        status: 'approved',
        notes: 'This is a test approval.'
      };
      const result = await sendBusinessVerificationEmail(testEmail, businessDetails);
      console.log('Result:', result.success ? 'Success' : 'Failed', result.messageId || result.error);
      console.log('');
    }

    console.log('All tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runTests();
