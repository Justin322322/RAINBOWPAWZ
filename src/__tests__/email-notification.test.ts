import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nodemailer and other dependencies
vi.mock('nodemailer', () => ({
  createTransport: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    verify: vi.fn().mockResolvedValue(true),
  })),
  getTestMessageUrl: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/utils/appUrl', () => ({
  getServerAppUrl: vi.fn(() => 'http://localhost:3000'),
}));

// Import after mocking
import { sendBusinessVerificationEmail, sendApplicationDeclineEmail } from '@/lib/consolidatedEmailService';
import { createBusinessVerificationEmail, createApplicationDeclineEmail } from '@/lib/emailTemplates';

describe('Email and Notification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Business Verification Email', () => {
    it('should send documents required email with specific documents', async () => {
      const businessDetails = {
        businessName: 'Test Business',
        contactName: 'John Doe',
        status: 'documents_required' as const,
        notes: 'Please upload the following documents',
        requiredDocuments: ['business_permit', 'government_id']
      };

      const result = await sendBusinessVerificationEmail('test@example.com', businessDetails);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send approval email', async () => {
      const businessDetails = {
        businessName: 'Approved Business',
        contactName: 'Jane Smith',
        status: 'approved' as const,
        notes: 'Welcome to our platform!'
      };

      const result = await sendBusinessVerificationEmail('jane@example.com', businessDetails);

      expect(result.success).toBe(true);
    });

    it('should handle email sending failure', async () => {
      // Ensure SMTP path is taken and cache is bypassed
      process.env.SMTP_USER = 'test-user';
      process.env.SMTP_PASS = 'test-pass';
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 10 * 60 * 1000); // expire cached transporter

      // Mock email failure
      const nodemailer = await import('nodemailer');
      const mockTransport = {
        sendMail: vi.fn().mockRejectedValue(new Error('SMTP Error')),
        verify: vi.fn().mockResolvedValue(true),
      };
      (nodemailer.createTransport as any).mockReturnValue(mockTransport);

      const businessDetails = {
        businessName: 'Test Business',
        contactName: 'John Doe',
        status: 'documents_required' as const,
      };

      const result = await sendBusinessVerificationEmail('test@example.com', businessDetails);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP Error');
    });
    });
  });

  describe('Application Decline Email', () => {
    it('should send decline email with reason', async () => {
      const applicationDetails = {
        businessName: 'Declined Business',
        contactName: 'Bob Johnson',
        reason: 'Incomplete documentation'
      };

      const result = await sendApplicationDeclineEmail('bob@example.com', applicationDetails);

      expect(result.success).toBe(true);
    });
  });

  describe('Email Template Generation', () => {
    it('should generate documents required email template', () => {
      const businessDetails = {
        businessName: 'Test Business',
        contactName: 'John Doe',
        status: 'documents_required' as const,
        notes: 'Please upload required documents',
        requiredDocuments: ['business_permit', 'government_id']
      };

      const result = createBusinessVerificationEmail(businessDetails);

      expect(result.subject).toContain('Specific Documents Required');
      expect(result.html).toContain('Business Permit');
      expect(result.html).toContain('Government ID');
      expect(result.html).toContain('upload the required documents');
    });

    it('should generate approval email template', () => {
      const businessDetails = {
        businessName: 'Approved Business',
        contactName: 'Jane Smith',
        status: 'approved' as const,
        notes: 'Welcome!'
      };

      const result = createBusinessVerificationEmail(businessDetails);

      expect(result.subject).toContain('Approved');
      expect(result.html).toContain('Congratulations');
      expect(result.html).toContain('Login');
    });

    it('should generate decline email template', () => {
      const applicationDetails = {
        businessName: 'Declined Business',
        contactName: 'Bob Johnson',
        reason: 'Incomplete information'
      };

      const result = createApplicationDeclineEmail(applicationDetails);

      expect(result.subject).toContain('Application Status Update');
      expect(result.html).toContain('regret to inform you');
      expect(result.html).toContain('Incomplete information');
    });

    it('should handle empty required documents list', () => {
      const businessDetails = {
        businessName: 'Test Business',
        contactName: 'John Doe',
        status: 'documents_required' as const,
        notes: 'Please upload documents',
        requiredDocuments: []
      };

      const result = createBusinessVerificationEmail(businessDetails);

      expect(result.subject).toContain('Specific Documents Required');
      expect(result.html).toContain('upload specific documents');
    });
  });
});
