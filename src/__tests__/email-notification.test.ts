import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nodemailer and other dependencies
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
      verify: vi.fn().mockResolvedValue(true),
    })),
  },
  createTransport: vi.fn(),
  getTestMessageUrl: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  testConnection: vi.fn().mockResolvedValue(true),
  checkTableExists: vi.fn().mockResolvedValue(true),
  withTransaction: vi.fn().mockImplementation(async (callback) => {
    // Create a transaction object that has the same methods as the real db
    const mockTransaction = {
      query: vi.fn(),
      rollback: vi.fn(),
      commit: vi.fn(),
    };
    return await callback(mockTransaction);
  }),
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

    it('should handle email sending success', async () => {
      const businessDetails = {
        businessName: 'Test Business',
        contactName: 'John Doe',
        status: 'documents_required' as const,
      };

      const result = await sendBusinessVerificationEmail('test@example.com', businessDetails);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
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
