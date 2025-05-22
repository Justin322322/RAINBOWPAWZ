import nodemailer from 'nodemailer';
import { query } from '@/lib/db';

// Helper function to strip HTML tags for plain text version
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
}

// Email data interface
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

// Email queue entry interface
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

// Global transporter cache to avoid creating new transporter for each email
let cachedTransporter: nodemailer.Transporter | null = null;
let lastTransporterCreation: number = 0;
const TRANSPORTER_TTL = 1000 * 60 * 5; // 5 minutes

// Create a reusable transporter object using SMTP transport
const createTransporter = () => {
  // Use cached transporter if it's not too old
  const now = Date.now();
  if (cachedTransporter && (now - lastTransporterCreation < TRANSPORTER_TTL)) {
    return cachedTransporter;
  }

  // Check if SMTP credentials are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Email service not properly configured');
  }



  // Create real transporter for actual email sending
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Add additional options for better deliverability
    tls: {
      rejectUnauthorized: false // Accept self-signed certificates
    }
  };

  console.log('Creating email transporter', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth_user: config.auth.user ? config.auth.user.substring(0, 3) + '...' : 'not set'
  });

  // Create new transporter and cache it
  cachedTransporter = nodemailer.createTransport(config);
  lastTransporterCreation = now;
  return cachedTransporter;
};

/**
 * Send an email directly
 */
export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string; code?: string | number }> {
  try {


    // Check if SMTP credentials are set
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {

      throw new Error('Email service not properly configured: Missing SMTP credentials');
    }

    // Log the email attempt
    console.log('Sending email', {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from || `"Rainbow Paws" <${process.env.SMTP_USER}>`,
      smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtp_port: process.env.SMTP_PORT || '587',
      smtp_secure: process.env.SMTP_SECURE === 'true'
    });



    const transporter = createTransporter();

    // Add domain-specific optimizations
    const recipientDomain = emailData.to.split('@')[1]?.toLowerCase();
    const headers: Record<string, string> = {};

    // Add domain-specific headers for better deliverability
    if (recipientDomain === 'mail.com' || recipientDomain === 'gmx.com') {
      headers['X-Priority'] = '1'; // High priority
      headers['Importance'] = 'high';
      headers['X-MSMail-Priority'] = 'High';
    }

    // Send the email with retry mechanism
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        // Create mail options with default values where needed
        const mailOptions = {
          from: emailData.from || `"Rainbow Paws" <${process.env.SMTP_USER}>`,
          to: emailData.to,
          cc: emailData.cc,
          bcc: emailData.bcc,
          subject: emailData.subject,
          text: emailData.text || stripHtml(emailData.html),
          html: emailData.html,
          attachments: emailData.attachments,
          headers
        };

        // Send the email
        if (!transporter) {
          throw new Error('Email transporter is null');
        }
        const info = await transporter.sendMail(mailOptions);

        // Record the email in the log
        try {
          await recordEmailSent(emailData.to, emailData.subject, info.messageId);
        } catch (logError) {
        }

        return { success: true, messageId: info.messageId };
      } catch (err) {
        retries++;

        if (retries >= maxRetries) {
          // If all retries failed, try to queue the email before giving up
          try {
            const queueResult = await queueEmail(emailData);
            if (queueResult.success) {
              return { success: true, messageId: `queued-${queueResult.queueId}` };
            }
          } catch (queueError) {
          }



          throw err;
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      }
    }

    // This should never be reached due to throw in the retry loop
    return { success: false, error: 'Failed to send email after retries' };
  } catch (error) {

    // Log more detailed error information
    if (error instanceof Error) {

      // Log specific error types for better troubleshooting
      if ('code' in error) {
        const code = (error as any).code;
        if (code === 'EAUTH') {
        } else if (code === 'ESOCKET') {
        } else if (code === 'ETIMEDOUT') {
        } else if (code === 'ECONNREFUSED') {
        }
      }
    }



    // Try to queue the email if sending failed
    try {
      const queueResult = await queueEmail(emailData);
      if (queueResult.success) {
        return {
          success: true,
          messageId: `queued-${queueResult.queueId}`,
          error: 'Email queued for later delivery due to send failure'
        };
      }
    } catch (queueError) {
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error && 'code' in error ? (error as any).code : undefined
    };
  }
}

/**
 * Queue an email to be sent later
 */
export async function queueEmail(emailData: EmailData): Promise<{ success: boolean; queueId?: number; error?: string }> {
  try {


    // Log that we're queueing a real email



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

    return { success: true, queueId: result.insertId };
  } catch (error) {



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

    return {
      processed: pendingEmails.length,
      success,
      failed
    };
  } catch (error) {
    throw error;
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
        sent_at TIMESTAMP NULL,
        INDEX (status, attempts, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Also ensure the email_log table exists
    await query(`
      CREATE TABLE IF NOT EXISTS email_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message_id VARCHAR(255),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (recipient),
        INDEX (sent_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (error) {
    throw error;
  }
}

/**
 * Record sent email in the database for tracking
 */
async function recordEmailSent(recipient: string, subject: string, messageId: string): Promise<void> {
  try {


    // Ensure the email_log table exists (this is now done in ensureEmailQueueTable)

    // Record the email
    await query(
      'INSERT INTO email_log (recipient, subject, message_id) VALUES (?, ?, ?)',
      [recipient, subject, messageId]
    );

  } catch (error) {
    // Don't throw the error - we don't want logging failures to affect email sending
  }
}
