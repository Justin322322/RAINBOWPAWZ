// Script to test the email service
require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

// Get the recipient email from command line arguments or use the SMTP_USER
const recipientEmail = process.argv[2] || process.env.SMTP_USER;

if (!recipientEmail) {
  console.error('ERROR: Please provide a recipient email address as an argument or set SMTP_USER in .env.local');
  process.exit(1);
}

console.log('Email Configuration:');
console.log('- SMTP Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
console.log('- SMTP Port:', process.env.SMTP_PORT || '587');
console.log('- SMTP User:', process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 3) + '...' : 'not set');
console.log('- SMTP Secure:', process.env.SMTP_SECURE === 'true' ? 'Yes' : 'No');
console.log('- Recipient:', recipientEmail);
console.log('- Simulation Mode:', process.env.SIMULATE_EMAIL_SUCCESS === 'true' ? 'Enabled' : 'Disabled');

// If simulation mode is enabled, just simulate sending
if (process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
  console.log('\n🔔 SIMULATION MODE: Email sending simulated');
  console.log('📧 Would have sent test email to:', recipientEmail);
  console.log('📑 Subject: Test Email from Rainbow Paws');
  console.log('✅ Test completed successfully in simulation mode');
  process.exit(0);
}

// Check if SMTP credentials are set
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('\nERROR: SMTP_USER and SMTP_PASS must be set in .env.local');
  console.error('For Gmail, you need to:');
  console.error('1. Enable 2-Step Verification in your Google Account');
  console.error('2. Generate an App Password at https://myaccount.google.com/apppasswords');
  console.error('3. Use that App Password in your .env.local file');
  process.exit(1);
}

// Create a transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
});

console.log('\nVerifying SMTP connection...');
transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP connection failed:', error);
    process.exit(1);
  } else {
    console.log('SMTP connection successful! Server is ready to send emails.');
    sendTestEmail();
  }
});

function sendTestEmail() {
  console.log('\nSending test email...');
  
  // Create the email content
  const mailOptions = {
    from: `"Rainbow Paws Test" <${process.env.SMTP_USER}>`,
    to: recipientEmail,
    subject: 'Test Email from Rainbow Paws',
    text: 'This is a test email from Rainbow Paws to verify that the email service is working correctly.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1B4D3E; text-align: center;">Rainbow Paws Email Test</h2>
        <p>Hello,</p>
        <p>This is a test email from Rainbow Paws to verify that the email service is working correctly.</p>
        <p>If you received this email, it means that your email configuration is working properly.</p>
        <p>Email details:</p>
        <ul>
          <li>SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}</li>
          <li>SMTP Port: ${process.env.SMTP_PORT || '587'}</li>
          <li>SMTP Secure: ${process.env.SMTP_SECURE === 'true' ? 'Yes' : 'No'}</li>
          <li>Sent at: ${new Date().toLocaleString()}</li>
        </ul>
        <div style="text-align: center; margin-top: 30px;">
          <div style="background-color: #1B4D3E; color: white; padding: 10px 20px; display: inline-block; border-radius: 5px;">
            Email Service Working!
          </div>
        </div>
        <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
          This is an automated test email. Please do not reply.
        </p>
      </div>
    `
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('\nError sending email:', error);
      
      if (error.code === 'EAUTH') {
        console.error('\nAuthentication Error: Your email credentials are incorrect.');
        console.error('For Gmail, you need to:');
        console.error('1. Enable 2-Step Verification in your Google Account');
        console.error('2. Generate an App Password at https://myaccount.google.com/apppasswords');
        console.error('3. Use that App Password in your .env.local file');
      }
      
      process.exit(1);
    }
    
    console.log('\nTest email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    if (info.accepted && info.accepted.length > 0) {
      console.log('Accepted recipients:', info.accepted);
    }
    
    if (info.rejected && info.rejected.length > 0) {
      console.error('Rejected recipients:', info.rejected);
    }
    
    console.log('\nCheck your inbox to confirm receipt of the test email.');
    process.exit(0);
  });
}
