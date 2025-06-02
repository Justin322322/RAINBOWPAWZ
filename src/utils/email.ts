import nodemailer from 'nodemailer';

interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, text, html }: EmailData) {
  try {
    // For development/testing, just return without sending
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Rainbow Paws" <noreply@rainbowpaws.com>',
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });

    return info;
  } catch (error) {
    throw error;
  }
}