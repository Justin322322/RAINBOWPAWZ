// Test script for real email sending
require('dotenv').config({ path: '.env.local' });
const {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  sendBookingConfirmationEmail,
  sendBusinessVerificationEmail
} = require('./src/lib/simpleEmailService');

// Get the test type and recipient email from command line arguments
const testType = process.argv[2] || 'all';
const testEmail = process.argv[3] || process.env.SMTP_USER || 'test@example.com';

console.log('=== REAL EMAIL SERVICE TEST ===');
console.log('Test type:', testType);
console.log('Test email:', testEmail);
console.log('SMTP settings:');
console.log('- Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
console.log('- Port:', process.env.SMTP_PORT || '587');
console.log('- User:', process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 3) + '...' : 'not set');
console.log('- Secure:', process.env.SMTP_SECURE === 'true' ? 'Yes' : 'No');
console.log('- Simulation mode:', process.env.SIMULATE_EMAIL_SUCCESS === 'true' ? 'Enabled' : 'Disabled');
console.log('');

// Test basic email
async function testBasicEmail() {
  console.log('Testing basic email...');
  try {
    const result = await sendEmail({
      to: testEmail,
      subject: 'Test Email from Rainbow Paws',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1B4D3E; text-align: center;">Test Email</h1>
          <p>Hello,</p>
          <p>This is a test email from Rainbow Paws to verify that the email service is working correctly.</p>
          <p>If you received this email, it means that your email configuration is working properly.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      `
    });

    console.log('Result:', result);
    return result.success;
  } catch (error) {
    console.error('Error sending basic email:', error);
    return false;
  }
}

// Test welcome email
async function testWelcomeEmail() {
  console.log('Testing welcome email...');
  try {
    const result = await sendWelcomeEmail(
      testEmail,
      'Test User',
      'personal'
    );

    console.log('Result:', result);
    return result.success;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

// Test password reset email
async function testPasswordResetEmail() {
  console.log('Testing password reset email...');
  try {
    const resetToken = 'test-reset-token-' + Date.now();
    const result = await sendPasswordResetEmail(
      testEmail,
      resetToken
    );

    console.log('Result:', result);
    return result.success;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

// Test OTP email
async function testOtpEmail() {
  console.log('Testing OTP email...');
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const result = await sendOtpEmail(
      testEmail,
      otp
    );

    console.log('Result:', result);
    return result.success;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}

// Test booking confirmation email
async function testBookingConfirmationEmail() {
  console.log('Testing booking confirmation email...');
  try {
    const bookingDetails = {
      customerName: 'Test User',
      serviceName: 'Private Cremation',
      providerName: 'Rainbow Paws Memorial',
      bookingDate: '2023-12-31',
      bookingTime: '10:00 AM',
      petName: 'Fluffy',
      bookingId: 'BK-' + Date.now()
    };

    const result = await sendBookingConfirmationEmail(
      testEmail,
      bookingDetails
    );

    console.log('Result:', result);
    return result.success;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return false;
  }
}

// Test business verification email
async function testBusinessVerificationEmail() {
  console.log('Testing business verification email...');
  try {
    const businessDetails = {
      businessName: 'Test Business',
      contactName: 'Test Owner',
      status: 'approved',
      notes: 'This is a test verification email.'
    };

    const result = await sendBusinessVerificationEmail(
      testEmail,
      businessDetails
    );

    console.log('Result:', result);
    return result.success;
  } catch (error) {
    console.error('Error sending business verification email:', error);
    return false;
  }
}

// Run the tests
async function runTests() {
  let results = {
    basic: false,
    welcome: false,
    reset: false,
    otp: false,
    booking: false,
    business: false
  };

  try {
    if (testType === 'all' || testType === 'basic') {
      results.basic = await testBasicEmail();
    }

    if (testType === 'all' || testType === 'welcome') {
      results.welcome = await testWelcomeEmail();
    }

    if (testType === 'all' || testType === 'reset') {
      results.reset = await testPasswordResetEmail();
    }

    if (testType === 'all' || testType === 'otp') {
      results.otp = await testOtpEmail();
    }

    if (testType === 'all' || testType === 'booking') {
      results.booking = await testBookingConfirmationEmail();
    }

    if (testType === 'all' || testType === 'business') {
      results.business = await testBusinessVerificationEmail();
    }

    console.log('\n=== TEST RESULTS ===');
    Object.entries(results).forEach(([test, success]) => {
      if (testType === 'all' || testType === test) {
        console.log(`${test.padEnd(10)}: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
      }
    });

    // Filter results to only include tests that were actually run
    const runTests = Object.entries(results)
      .filter(([test, _]) => testType === 'all' || testType === test)
      .map(([_, success]) => success);

    // Check if all run tests were successful
    const allSuccess = runTests.length > 0 && runTests.every(result => result);

    if (testType === 'all') {
      console.log('\nOverall result:', allSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
    } else {
      // For individual tests, just report the result of that test
      console.log('\nTest result:', allSuccess ? '✅ TEST PASSED' : '❌ TEST FAILED');
    }

    process.exit(allSuccess ? 0 : 1);
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
