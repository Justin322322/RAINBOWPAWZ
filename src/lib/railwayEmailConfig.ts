// Alternative SMTP configuration specifically for Railway deployment
import nodemailer from 'nodemailer';

export function createRailwayTransporter() {
  // Railway-optimized Gmail SMTP configuration
  const config = {
    service: 'gmail', // Use Gmail service directly
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    // Railway-specific settings
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    logger: true, // Enable logging for debugging
    debug: process.env.NODE_ENV === 'development'
  };

  console.log('Creating Railway SMTP transporter with config:', {
    service: config.service,
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user ? 'Set' : 'Not set',
    pass: config.auth.pass ? 'Set' : 'Not set'
  });

  return nodemailer.createTransport(config);
}

// Alternative SSL configuration (Port 465)
export function createRailwaySSLTransporter() {
  const config = {
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    logger: true,
    debug: process.env.NODE_ENV === 'development'
  };

  console.log('Creating Railway SSL SMTP transporter with config:', {
    service: config.service,
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user ? 'Set' : 'Not set',
    pass: config.auth.pass ? 'Set' : 'Not set'
  });

  return nodemailer.createTransport(config);
}