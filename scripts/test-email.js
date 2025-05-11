/**
 * Email Testing Script
 *
 * This script tests the email functionality by sending a test email.
 * It's useful for verifying that your email configuration is working correctly.
 *
 * Usage:
 * node test-email.js [recipient_email]
 *
 * Where [recipient_email] is the email address to send the test email to.
 * If not provided, it will use the SMTP_USER from the environment.
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const nodemailer = require('nodemailer');

// Get the recipient email from command line arguments or use the SMTP_USER
const recipientEmail = process.argv[2] || process.env.SMTP_USER;

if (!recipientEmail) {
  console.error('ERROR: Please provide a recipient email address as an argument or set SMTP_USER in .env.local');
  process.exit(1);
}

// Check if SMTP credentials are set
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('ERROR: SMTP_USER and SMTP_PASS must be set in .env.local');
  process.exit(1);
}

console.log('Email Configuration:');
console.log('- SMTP Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
console.log('- SMTP Port:', process.env.SMTP_PORT || '587');
console.log('- SMTP User:', process.env.SMTP_USER.substring(0, 3) + '...');
console.log('- SMTP Secure:', process.env.SMTP_SECURE === 'true' ? 'Yes' : 'No');
console.log('- Recipient:', recipientEmail);

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
        <li>Timestamp: ${new Date().toISOString()}</li>
      </ul>
      <hr style="border: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #666; font-size: 12px; text-align: center;">
        Rainbow Paws - Pet Memorial Services
      </p>
    </div>
  `
};

console.log('\nSending test email...');

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
  
  process.exit(0);
});
