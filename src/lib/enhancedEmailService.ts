import nodemailer from 'nodemailer';
import { query } from './db';

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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

// Interface for email queue entry
interface EmailQueueEntry {
  id: number;
  to_email: string;
  subject: string;
  html: string;
  text?: string;
  from_email?: string;
  cc?: string;
  bcc?: string;
  attachments?: string; // JSON string
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  error?: string;
  created_at: Date;
  updated_at: Date;
  sent_at?: Date;
}

/**
 * Send an email directly
 */
export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if SMTP credentials are set
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('SMTP credentials are not properly configured');
      return { success: false, error: 'Email service not properly configured' };
    }

    // Log the email attempt
    console.log('Attempting to send email:', {
      to: emailData.to,
      subject: emailData.subject
    });

    // If in development mode and DISABLE_EMAILS is set, just log the email
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_EMAILS === 'true') {
      console.log('Email sending disabled in development. Email details:', {
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html.substring(0, 100) + '...'
      });
      return { success: true, messageId: 'dev-mode-disabled' };
    }

    // Send the email
    const info = await transporter.sendMail({
      from: emailData.from || `"Rainbow Paws" <${process.env.SMTP_USER}>`,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      subject: emailData.subject,
      text: emailData.text || stripHtml(emailData.html),
      html: emailData.html,
      attachments: emailData.attachments
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending error:', error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Queue an email to be sent
 */
export async function queueEmail(emailData: EmailData): Promise<{ success: boolean; queueId?: number; error?: string }> {
  try {
    // Ensure the email queue table exists
    await ensureEmailQueueTable();

    // Insert the email into the queue
    const result = await query(
      `INSERT INTO email_queue
       (to_email, subject, html, text, from_email, cc, bcc, attachments, status, attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [
        emailData.to,
        emailData.subject,
        emailData.html,
        emailData.text || stripHtml(emailData.html),
        emailData.from || `"Rainbow Paws" <${process.env.SMTP_USER}>`,
        emailData.cc || null,
        emailData.bcc || null,
        emailData.attachments ? JSON.stringify(emailData.attachments) : null
      ]
    ) as any;

    console.log('Email queued successfully:', result.insertId);
    return { success: true, queueId: result.insertId };
  } catch (error) {
    console.error('Error queueing email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process the email queue
 */
export async function processEmailQueue(limit: number = 10): Promise<{ processed: number; success: number; failed: number }> {
  try {
    // Ensure the email queue table exists
    await ensureEmailQueueTable();

    // Get pending emails from the queue
    const pendingEmails = await query(
      `SELECT * FROM email_queue
       WHERE status = 'pending' AND attempts < 3
       ORDER BY created_at ASC
       LIMIT ?`,
      [limit]
    ) as EmailQueueEntry[];

    console.log(`Processing ${pendingEmails.length} emails from queue`);

    let success = 0;
    let failed = 0;

    // Process each email
    for (const email of pendingEmails) {
      try {
        // Parse attachments if they exist
        const attachments = email.attachments ? JSON.parse(email.attachments) : undefined;

        // Send the email
        const result = await sendEmail({
          to: email.to_email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          from: email.from_email,
          cc: email.cc,
          bcc: email.bcc,
          attachments
        });

        if (result.success) {
          // Update the email status to sent
          await query(
            `UPDATE email_queue
             SET status = 'sent', sent_at = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [email.id]
          );
          success++;
        } else {
          // Update the email status to failed and increment attempts
          await query(
            `UPDATE email_queue
             SET status = 'failed', attempts = attempts + 1, error = ?, updated_at = NOW()
             WHERE id = ?`,
            [result.error, email.id]
          );
          failed++;
        }
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);

        // Update the email status to failed and increment attempts
        await query(
          `UPDATE email_queue
           SET status = 'failed', attempts = attempts + 1, error = ?, updated_at = NOW()
           WHERE id = ?`,
          [error instanceof Error ? error.message : 'Unknown error', email.id]
        );

        failed++;
      }
    }

    return { processed: pendingEmails.length, success, failed };
  } catch (error) {
    console.error('Error processing email queue:', error);
    return { processed: 0, success: 0, failed: 0 };
  }
}

/**
 * Ensure the email queue table exists
 */
async function ensureEmailQueueTable(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id INT AUTO_INCREMENT PRIMARY KEY,
        to_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        html TEXT NOT NULL,
        text TEXT,
        from_email VARCHAR(255),
        cc VARCHAR(255),
        bcc VARCHAR(255),
        attachments TEXT,
        status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        sent_at TIMESTAMP NULL
      )
    `);
  } catch (error) {
    console.error('Error ensuring email queue table:', error);
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
