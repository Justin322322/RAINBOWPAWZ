import nodemailer from 'nodemailer';
import { query } from '@/lib/db';

// Cache the transporter to avoid creating a new one for each email
let cachedTransporter: nodemailer.Transporter | null = null;
let lastTransporterCreation = 0;
const TRANSPORTER_TTL = 5 * 60 * 1000; // 5 minutes



// Helper function to strip HTML tags for plain text version
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Email data interface
interface EmailData {
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

/**
 * Create a transporter for sending emails
 * This function handles caching and domain-specific optimizations
 */
function createTransporter(recipientDomain?: string): nodemailer.Transporter {
  // Use cached transporter if it's not too old
  const now = Date.now();
  if (cachedTransporter && (now - lastTransporterCreation < TRANSPORTER_TTL)) {
    return cachedTransporter;
  }

  // Check if SMTP credentials are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Email service not properly configured: Missing SMTP credentials');
    console.warn('Required environment variables: SMTP_USER, SMTP_PASS');
    console.warn('Optional: SMTP_HOST, SMTP_PORT, SMTP_SECURE');
    
    // Return a mock transporter for development
    return nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: {
        user: 'test',
        pass: 'test',
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Log SMTP configuration for debugging
  // Base configuration with Railway-specific optimizations
  const baseConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    requireTLS: true, // Force TLS for Gmail
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false, // Accept self-signed certificates
      ciphers: 'SSLv3' // Compatibility with older SSL versions
    },
    // Railway-specific timeout settings
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    // Additional Gmail-specific settings
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 14 // messages per second
  };

  // Domain-specific optimizations
  if (recipientDomain === 'mail.com' || recipientDomain === 'gmx.com') {
    // These domains may have specific requirements
    cachedTransporter = nodemailer.createTransport({
      ...baseConfig,
      tls: {
        rejectUnauthorized: false // Less strict TLS requirements
      }
    });
  } else {
    // Default transporter
    cachedTransporter = nodemailer.createTransport(baseConfig);
  }

  lastTransporterCreation = now;
  return cachedTransporter;
}

/**
 * Send an email directly
 */
export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string; code?: string | number }> {
  try {
    console.log(`Attempting to send email to: ${emailData.to}, subject: ${emailData.subject}`);
    
    // Check if SMTP credentials are set
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error('Email service not properly configured: Missing SMTP credentials');
      console.error('Required: SMTP_USER, SMTP_PASS');
      console.error('Current environment:', process.env.NODE_ENV);
      
      // In development, pretend the email was sent successfully
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Pretending email was sent successfully');
        return { success: true, messageId: 'dev-mode-no-email-sent' };
      }
      
      // In production, return error
      return { 
        success: false, 
        error: 'Email service not configured. Please contact administrator.',
        code: 'SMTP_NOT_CONFIGURED'
      };
    }

    // Extract domain from recipient email for domain-specific optimizations
    const recipientDomain = emailData.to.split('@')[1]?.toLowerCase();
    console.log(`Recipient domain: ${recipientDomain}`);

    // Create a transporter with domain-specific optimizations
    const transporter = createTransporter(recipientDomain);

    // Add domain-specific headers for better deliverability
    const headers: Record<string, string> = {};
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
        console.log(`Email attempt ${retries + 1}/${maxRetries}`);
        
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

        console.log('Mail options prepared, attempting to send...');
        
        // Send the email
        const info = await transporter.sendMail(mailOptions);

        console.log(`Email sent successfully! Message ID: ${info.messageId}`);

        // Check for rejected recipients
        if (info.rejected && info.rejected.length > 0) {
          throw new Error(`Email rejected for recipients: ${info.rejected.join(', ')}`);
        }

        // Record the successful email in the database (best-effort)
        const recorded = await recordEmailSent(
          emailData.to,
          emailData.subject,
          info.messageId,
          emailData.html,
          emailData.text || stripHtml(emailData.html),
          emailData.from || process.env.SMTP_USER || null
        );
        if (recorded) {
          console.log('Email recorded in database successfully');
        } else {
          console.warn('Email sent but not recorded in DB (likely missing email_queue table).');
        }

        return { success: true, messageId: info.messageId };
      } catch (err) {
        retries++;
        console.error(`Email attempt ${retries} failed:`, err);

        if (retries >= maxRetries) {
          console.error('All email retries failed, attempting to queue email...');
          
          // If all retries failed, try to queue the email before giving up
          try {
            const queueResult = await queueEmail(emailData);
            if (queueResult.success) {
              console.log(`Email queued successfully with ID: ${queueResult.queueId}`);
              return { success: true, messageId: `queued-${queueResult.queueId}` };
            }
          } catch (queueError) {
            console.error('Failed to queue email:', queueError);
            // If queueing fails, continue with the original error
          }

          // Log final failure details
          console.error('Final email failure details:', {
            recipient: emailData.to,
            subject: emailData.subject,
            error: err instanceof Error ? err.message : 'Unknown error',
            code: (err as any).code || 'UNKNOWN',
            attempts: retries
          });

          throw err;
        }

        // Wait before retrying (exponential backoff)
        const delay = 1000 * Math.pow(2, retries);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached due to the throw in the loop
    throw new Error('Unexpected end of email sending loop');
  } catch (error) {
    console.error('Critical error in sendEmail function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorCode = (error as any).code || 'UNKNOWN_ERROR';
    
    return {
      success: false,
      error: errorMessage,
      code: errorCode
    };
  }
}

/**
 * Queue an email to be sent later
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
       LIMIT ${Number(limit)}`,
      []
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
    // Skip DDL in production unless explicitly allowed
    const isProd = process.env.NODE_ENV === 'production';
    const allowDDL = process.env.ALLOW_DDL === 'true';
    if (isProd && !allowDDL) {
      return;
    }

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
        status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        sent_at TIMESTAMP NULL,
        INDEX (status, attempts, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Also ensure the notifications_unified log table exists (no-op removed)
  } catch (error) {
    throw error;
  }
}

/**
 * Record sent email in the database for tracking
 */
async function recordEmailSent(
  recipient: string,
  subject: string,
  _messageId: string,
  html: string,
  text: string,
  fromEmail?: string | null
): Promise<boolean> {
  try {
    // Best-effort: only attempt to ensure table outside prod or when allowed
    await ensureEmailQueueTable();

    // Record the email into the email_queue as a sent entry (avoid notifications_unified schema differences)
    await query(
      `INSERT INTO email_queue (to_email, subject, html, text, from_email, status, attempts, sent_at)
       VALUES (?, ?, ?, ?, ?, 'sent', 1, NOW())`,
      [recipient, subject, html, text, fromEmail || null]
    );
    return true;
  } catch (error) {
    // Downgrade to warn and return false so callers can reflect accurate state
    console.warn('Failed to record email in log (non-fatal):', error);
    return false;
  }
}

// Export template-specific email functions for backward compatibility
export const sendWelcomeEmail = async (email: string, firstName: string, accountType: 'personal' | 'business') => {
  // Import the email templates dynamically to avoid circular dependencies
  const { createWelcomeEmail } = await import('@/lib/emailTemplates');

  const { subject, html } = createWelcomeEmail(firstName, accountType);
  return sendEmail({ to: email, subject, html });
};

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  // Import the email templates dynamically to avoid circular dependencies
  const { createPasswordResetEmail } = await import('@/lib/emailTemplates');

  const { subject, html } = createPasswordResetEmail(resetToken);
  return sendEmail({ to: email, subject, html });
};

export const sendOtpEmail = async (email: string, otp: string) => {
  // Import the email templates dynamically to avoid circular dependencies
  const { createOTPEmail } = await import('@/lib/emailTemplates');

  const { subject, html } = createOTPEmail(otp);
  return sendEmail({ to: email, subject, html });
};



export const sendBusinessVerificationEmail = async (
  email: string,
  businessDetails: {
    businessName: string;
    contactName: string;
    status: 'approved' | 'rejected' | 'pending' | 'documents_required';
    notes?: string;
    requiredDocuments?: string[];
  }
) => {
  // Import the email templates dynamically to avoid circular dependencies
  const { createBusinessVerificationEmail } = await import('@/lib/emailTemplates');

  const { subject, html } = createBusinessVerificationEmail(businessDetails);
  return sendEmail({ to: email, subject, html });
};

export const sendApplicationDeclineEmail = async (
  email: string,
  applicationDetails: {
    businessName: string;
    contactName: string;
    reason: string;
  }
) => {
  // Import the email templates dynamically to avoid circular dependencies
  const { createApplicationDeclineEmail } = await import('@/lib/emailTemplates');

  const { subject, html } = createApplicationDeclineEmail(applicationDetails);
  return sendEmail({ to: email, subject, html });
};
