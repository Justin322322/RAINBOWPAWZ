import {
  sendEmail as sendEmailInternal,
  queueEmail as queueEmailInternal,
  processEmailQueue as processEmailQueueInternal,
  sendWelcomeEmail as sendWelcomeEmailInternal,
  sendPasswordResetEmail as sendPasswordResetEmailInternal,
  sendOtpEmail as sendOtpEmailInternal,
  sendBusinessVerificationEmail as sendBusinessVerificationEmailInternal,
  sendApplicationDeclineEmail as sendApplicationDeclineEmailInternal
} from '@/lib/consolidatedEmailService';

type EmailData = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  cc?: string;
  bcc?: string;
  attachments?: any[];
};

export async function sendEmail(emailData: EmailData) {
  return sendEmailInternal(emailData);
}

export async function queueEmail(emailData: EmailData) {
  return queueEmailInternal(emailData);
}

export async function processEmailQueue(limit: number = 10) {
  return processEmailQueueInternal(limit);
}

export async function sendWelcomeEmail(email: string, firstName: string, accountType: 'personal' | 'business') {
  return sendWelcomeEmailInternal(email, firstName, accountType);
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  return sendPasswordResetEmailInternal(email, resetToken);
}

export async function sendOtpEmail(email: string, otp: string) {
  return sendOtpEmailInternal(email, otp);
}

export async function sendBusinessVerificationEmail(email: string, businessDetails: { businessName: string; contactName: string; status: 'approved' | 'rejected' | 'pending' | 'documents_required'; notes?: string; }) {
  return sendBusinessVerificationEmailInternal(email, businessDetails);
}

export async function sendApplicationDeclineEmail(email: string, applicationDetails: { businessName: string; contactName: string; reason: string; }) {
  return sendApplicationDeclineEmailInternal(email, applicationDetails);
}


