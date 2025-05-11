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
    console.log('Using cached email transporter');
    return cachedTransporter;
  }

  // Check if SMTP credentials are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ ERROR: SMTP credentials are not properly configured');
    throw new Error('Email service not properly configured');
  }

  // Check if we're in development mode with simulation explicitly enabled
  if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
    console.log('Creating simulated email transporter for development (SIMULATE_EMAIL_SUCCESS=true)');
    // Create a mock transporter that always succeeds
    cachedTransporter = {
      sendMail: async (mailOptions: any) => {
        console.log('📧 DEV MODE: Simulating email send:', {
          to: mailOptions.to,
          subject: mailOptions.subject
        });
        return {
          messageId: `simulated-${Date.now()}`,
          accepted: [mailOptions.to],
          rejected: []
        };
      }
    } as any;
    lastTransporterCreation = now;
    return cachedTransporter;
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

  console.log('📧 Creating real email transporter with config:', {
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
    // Extract important information for logging
    const extractImportantInfo = () => {
      // For OTP emails, extract and log the OTP code for testing
      if (emailData.subject.includes('Verification Code')) {
        const otpMatch = emailData.html.match(/(\d{6})/);
        if (otpMatch) {
          console.log('🔑 OTP code is', otpMatch[1]);
        }
      }

      // For password reset emails, extract and log the reset token for testing
      if (emailData.subject.includes('Reset Your Password')) {
        const tokenMatch = emailData.html.match(/token=([a-zA-Z0-9_-]+)/);
        if (tokenMatch) {
          console.log('🔑 Reset token is', tokenMatch[1]);
        }
      }
    };

    // DEVELOPMENT MODE: Check for simulation flag
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
      console.log('🔔 DEV MODE: Simulating email success (SIMULATE_EMAIL_SUCCESS=true)');
      console.log('📧 Would have sent email to:', emailData.to);
      console.log('📑 Subject:', emailData.subject);
      console.log('💬 Preview:', emailData.html.substring(0, 200) + '...');

      // Extract and log important information
      extractImportantInfo();

      return {
        success: true,
        messageId: 'simulated-' + Date.now()
      };
    }

    // Check if SMTP credentials are set
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('❌ SMTP credentials are not properly configured');
      console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set');
      console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set');
      console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
      console.log('SMTP_PORT:', process.env.SMTP_PORT || '587');

      throw new Error('Email service not properly configured: Missing SMTP credentials');
    }

    // Log the email attempt
    console.log('Attempting to send email:', {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from || `"Rainbow Paws" <${process.env.SMTP_USER}>`,
      smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtp_port: process.env.SMTP_PORT || '587',
      smtp_secure: process.env.SMTP_SECURE === 'true'
    });

    // If in development mode and DISABLE_EMAILS is set to true, just log the email
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_EMAILS === 'true') {
      console.log('Email sending disabled in development. Email details:', {
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html.substring(0, 100) + '...'
      });

      // For OTP emails, extract and log the OTP code for testing
      if (emailData.subject.includes('Verification Code')) {
        const otpMatch = emailData.html.match(/(\d{6})/);
        if (otpMatch) {
          console.log('🔑 DEV MODE: OTP code is', otpMatch[1]);
        }
      }

      // For password reset emails, extract and log the reset token for testing
      if (emailData.subject.includes('Reset Your Password')) {
        const tokenMatch = emailData.html.match(/token=([a-zA-Z0-9_-]+)/);
        if (tokenMatch) {
          console.log('🔑 DEV MODE: Reset token is', tokenMatch[1]);
        }
      }

      return { success: true, messageId: 'dev-mode-disabled' };
    }

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
        console.log('Email sent successfully:', info.messageId);

        // Record the email in the log
        try {
          await recordEmailSent(emailData.to, emailData.subject, info.messageId);
        } catch (logError) {
          console.error('Failed to log email, but email was sent:', logError);
        }

        return { success: true, messageId: info.messageId };
      } catch (err) {
        retries++;
        console.error(`Email sending failed (attempt ${retries}/${maxRetries}):`, err);

        if (retries >= maxRetries) {
          // If all retries failed, try to queue the email before giving up
          try {
            console.log('All retry attempts failed, queueing email for later delivery');
            const queueResult = await queueEmail(emailData);
            if (queueResult.success) {
              console.log('Email queued successfully for later delivery');
              return { success: true, messageId: `queued-${queueResult.queueId}` };
            }
          } catch (queueError) {
            console.error('Failed to queue email after send attempts failed:', queueError);
          }

          // In development mode, simulate success despite errors
          if (process.env.NODE_ENV === 'development' && process.env.ALWAYS_SUCCEED_EMAILS === 'true') {
            console.log('DEV MODE with ALWAYS_SUCCEED_EMAILS: Simulating success despite error');
            return { success: true, messageId: 'dev-error-simulated-success' };
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
    console.error('Email sending error:', error);

    // Log more detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      // Log specific error types for better troubleshooting
      if ('code' in error) {
        const code = (error as any).code;
        if (code === 'EAUTH') {
          console.error('Authentication error. Check your SMTP credentials.');
        } else if (code === 'ESOCKET') {
          console.error('Socket error. Check your SMTP host and port settings.');
        } else if (code === 'ETIMEDOUT') {
          console.error('Connection timed out. Check your network and SMTP server settings.');
        } else if (code === 'ECONNREFUSED') {
          console.error('Connection refused. Check if the SMTP server is running and accessible.');
        }
      }
    }

    // Only in development mode with simulation explicitly enabled, return success anyway
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
      console.log('DEV MODE: Simulating email success despite error');
      return { success: true, messageId: 'dev-error-simulated-success' };
    }

    // Try to queue the email if sending failed
    try {
      console.log('Attempting to queue email after send failure');
      const queueResult = await queueEmail(emailData);
      if (queueResult.success) {
        console.log('Email queued successfully for later delivery after send failure');
        return {
          success: true,
          messageId: `queued-${queueResult.queueId}`,
          error: 'Email queued for later delivery due to send failure'
        };
      }
    } catch (queueError) {
      console.error('Failed to queue email after send failure:', queueError);
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
    // Extract important information for logging
    const extractImportantInfo = () => {
      // For OTP emails, extract and log the OTP code for testing
      if (emailData.subject.includes('Verification Code')) {
        const otpMatch = emailData.html.match(/(\d{6})/);
        if (otpMatch) {
          console.log('🔑 OTP code is', otpMatch[1]);
        }
      }

      // For password reset emails, extract and log the reset token for testing
      if (emailData.subject.includes('Reset Your Password')) {
        const tokenMatch = emailData.html.match(/token=([a-zA-Z0-9_-]+)/);
        if (tokenMatch) {
          console.log('🔑 Reset token is', tokenMatch[1]);
        }
      }
    };

    // Only in development mode with simulation explicitly enabled, simulate queueing
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
      console.log('🔔 DEV MODE: Simulating email queue success');
      console.log('📧 Would have queued email to:', emailData.to);
      console.log('📑 Subject:', emailData.subject);

      // Extract and log important information
      extractImportantInfo();

      return { success: true, queueId: Math.floor(Math.random() * 1000) + 1 };
    }

    // Log that we're queueing a real email
    console.log('Queueing email to:', emailData.to);
    console.log('Subject:', emailData.subject);

    // Extract and log important information
    extractImportantInfo();

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

    // In development mode, simulate success despite errors
    if (process.env.NODE_ENV === 'development' && process.env.ALWAYS_SUCCEED_EMAILS === 'true') {
      console.log('DEV MODE with ALWAYS_SUCCEED_EMAILS: Simulating queue success despite error');
      return { success: true, queueId: Math.floor(Math.random() * 1000) + 1 };
    }

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
    // Only in development mode with simulation explicitly enabled, simulate processing
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
      console.log('🔔 DEV MODE: Simulating email queue processing');
      console.log(`Would have processed up to ${limit} emails from queue`);
      return {
        processed: Math.min(limit, 5), // Simulate processing some random number of emails
        success: Math.min(limit, 4),   // Most succeeded
        failed: Math.min(limit, 1)     // A few failed
      };
    }

    console.log(`Processing up to ${limit} emails from queue...`);

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

    return {
      processed: pendingEmails.length,
      success,
      failed
    };
  } catch (error) {
    console.error('Error processing email queue:', error);

    // In development mode, return simulated results despite errors
    if (process.env.NODE_ENV === 'development' && process.env.ALWAYS_SUCCEED_EMAILS === 'true') {
      console.log('DEV MODE: Returning simulated queue processing results despite error');
      return {
        processed: 0,
        success: 0,
        failed: 0
      };
    }

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
    console.error('Error ensuring email tables:', error);
    throw error;
  }
}

/**
 * Record sent email in the database for tracking
 */
async function recordEmailSent(recipient: string, subject: string, messageId: string): Promise<void> {
  try {
    // In development mode with simulation enabled, just simulate recording
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_EMAIL_SUCCESS === 'true') {
      console.log('🔔 DEV MODE: Simulating email log recording');
      console.log(`Would have recorded email to ${recipient} with subject "${subject}"`);
      return;
    }

    // Ensure the email_log table exists (this is now done in ensureEmailQueueTable)

    // Record the email
    await query(
      'INSERT INTO email_log (recipient, subject, message_id) VALUES (?, ?, ?)',
      [recipient, subject, messageId]
    );

    console.log(`Email recorded in log: ${messageId}`);
  } catch (error) {
    // Don't throw the error, just log it - we don't want logging failures to affect email sending
    console.error('Error recording email in database:', error);
  }
}
