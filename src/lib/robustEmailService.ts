import nodemailer from 'nodemailer';
import { query } from './db';

// Interface for email data
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string;
  bcc?: string;
  attachments?: any[];
}

/**
 * Enhanced email sending function with better error handling and domain-specific configurations
 */
export async function sendRobustEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if SMTP credentials are set
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return { success: false, error: 'Email service not properly configured' };
    }

    // Extract domain from recipient email
    const recipientDomain = emailData.to.split('@')[1]?.toLowerCase();

    // Create a transporter with configuration optimized for the recipient's domain
    const transporter = createOptimizedTransporter(recipientDomain);

    // Add additional headers for better deliverability
    const headers: Record<string, string> = {};

    // Add domain-specific headers
    if (recipientDomain === 'mail.com' || recipientDomain === 'gmx.com') {
      // These domains may require specific headers
      headers['X-Priority'] = '1'; // High priority
      headers['Importance'] = 'high';
      headers['X-MSMail-Priority'] = 'High';
    }

    // Send the email with optimized settings
    const info = await transporter.sendMail({
      from: emailData.from || `"Rainbow Paws" <${process.env.SMTP_USER}>`,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      subject: emailData.subject,
      text: emailData.text || stripHtml(emailData.html),
      html: emailData.html,
      attachments: emailData.attachments,
      headers
    });

    // Check for rejected recipients
    if (info.rejected && info.rejected.length > 0) {
      return {
        success: false,
        error: `Email rejected for recipients: ${info.rejected.join(', ')}`
      };
    }

    // Record the successful email in the database for tracking
    try {
      await recordEmailSent(emailData.to, emailData.subject, info.messageId);
    } catch (recordError) {
      // Continue even if recording fails
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create an optimized transporter based on the recipient's domain
 */
function createOptimizedTransporter(recipientDomain?: string): nodemailer.Transporter {
  const baseConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // Domain-specific optimizations
  if (recipientDomain === 'mail.com' || recipientDomain === 'gmx.com') {
    // These domains may have specific requirements
    return nodemailer.createTransport({
      ...baseConfig,
      tls: {
        rejectUnauthorized: false // Less strict TLS requirements
      }
    });
  }

  // Default transporter
  return nodemailer.createTransport(baseConfig);
}

/**
 * Record sent email in the database for tracking
 */
async function recordEmailSent(recipient: string, subject: string, messageId: string): Promise<void> {
  try {
    // Ensure the email_log table exists
    await query(`
      CREATE TABLE IF NOT EXISTS email_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message_id VARCHAR(255),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (recipient),
        INDEX (sent_at)
      )
    `);

    // Record the email
    await query(
      'INSERT INTO email_log (recipient, subject, message_id) VALUES (?, ?, ?)',
      [recipient, subject, messageId]
    );
  } catch (error) {
    throw error;
  }
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
