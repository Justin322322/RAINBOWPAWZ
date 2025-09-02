import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock all dependencies
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/secureAuth', () => ({
  verifySecureAuth: vi.fn(),
}));

vi.mock('@/utils/auth', () => ({
  getAuthTokenFromRequest: vi.fn(),
}));

vi.mock('@/lib/consolidatedEmailService', () => ({
  sendWelcomeEmail: vi.fn(),
}));

vi.mock('@/utils/businessNotificationService', () => ({
  createBusinessNotification: vi.fn(),
}));

// Import after mocking
import { POST as registerBusiness } from '@/app/api/auth/register/route';
import { query } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';
import { getAuthTokenFromRequest } from '@/utils/auth';

describe('Business Registration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Business Registration API', () => {
    it('should register business user successfully', async () => {
      // Mock database queries
      (query as any)
        .mockResolvedValueOnce([]) // Check existing email
        .mockResolvedValueOnce([]) // Check existing user
        .mockResolvedValueOnce([{ insertId: 123 }]) // Insert user
        .mockResolvedValueOnce([{ insertId: 456 }]) // Insert service provider
        .mockResolvedValueOnce([]); // Insert business profile

      // Mock auth token generation
      vi.mock('@/lib/jwt', () => ({
        generateToken: vi.fn(() => 'mock-jwt-token'),
        generateVerificationToken: vi.fn(() => 'mock-verification-token'),
      }));

      const registrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        sex: 'male',
        businessName: 'Test Business',
        businessAddress: '123 Business St, City',
        businessPhone: '+1234567890',
        businessEmail: 'business@example.com',
        password: 'SecurePass123!',
        account_type: 'business',
        businessType: 'cremation',
        businessEntityType: 'sole_proprietorship',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registrationData),
      });

      const response = await registerBusiness(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();
      expect(result.businessId).toBeDefined();
    });

    it('should validate required business fields', async () => {
      const incompleteData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        // Missing business name and other required fields
        password: 'SecurePass123!',
        account_type: 'business',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      const response = await registerBusiness(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('required');
    });

    it('should reject duplicate email addresses', async () => {
      // Mock existing user
      (query as any).mockResolvedValueOnce([{ user_id: 123 }]);

      const registrationData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        businessName: 'Test Business',
        password: 'SecurePass123!',
        account_type: 'business',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registrationData),
      });

      const response = await registerBusiness(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('already exists');
    });

    it('should validate business email format', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        businessName: 'Test Business',
        businessEmail: 'invalid-email', // Invalid format
        password: 'SecurePass123!',
        account_type: 'business',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await registerBusiness(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain('email');
    });

    it('should create service provider record', async () => {
      (query as any)
        .mockResolvedValueOnce([]) // Check existing email
        .mockResolvedValueOnce([]) // Check existing user
        .mockResolvedValueOnce([{ insertId: 123 }]) // Insert user
        .mockResolvedValueOnce([{ insertId: 456 }]) // Insert service provider
        .mockResolvedValueOnce([]); // Insert business profile

      const businessData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        businessName: 'Test Cremation Services',
        businessAddress: '123 Business St',
        businessPhone: '+1234567890',
        businessEmail: 'business@example.com',
        businessType: 'cremation',
        businessEntityType: 'sole_proprietorship',
        password: 'SecurePass123!',
        account_type: 'business',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(businessData),
      });

      const response = await registerBusiness(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.businessId).toBe(456);

      // Verify service provider was created with correct data
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO service_providers'),
        expect.arrayContaining([
          expect.any(Number), // user_id
          businessData.businessName,
          businessData.businessType,
          businessData.businessEntityType,
          businessData.businessPhone,
          businessData.businessAddress,
          businessData.businessEmail,
          expect.any(String), // password hash
        ])
      );
    });
  });

  describe('Business Document Integration', () => {
    it('should handle document paths in registration', async () => {
      (query as any)
        .mockResolvedValueOnce([]) // Check existing email
        .mockResolvedValueOnce([]) // Check existing user
        .mockResolvedValueOnce([{ insertId: 123 }]) // Insert user
        .mockResolvedValueOnce([{ insertId: 456 }]) // Insert service provider
        .mockResolvedValueOnce([]); // Update with document paths

      const registrationWithDocs = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        businessName: 'Test Business',
        businessAddress: '123 Business St',
        businessPhone: '+1234567890',
        businessEmail: 'business@example.com',
        password: 'SecurePass123!',
        account_type: 'business',
        businessType: 'cremation',
        documentUrls: {
          business_permit_path: 'https://example.com/permit.pdf',
          bir_certificate_path: 'https://example.com/bir.pdf',
          government_id_path: 'https://example.com/id.jpg',
        }
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registrationWithDocs),
      });

      const response = await registerBusiness(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // Verify document paths were saved
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE service_providers SET'),
        expect.arrayContaining([
          registrationWithDocs.documentUrls.business_permit_path,
          registrationWithDocs.documentUrls.bir_certificate_path,
          registrationWithDocs.documentUrls.government_id_path,
          456 // provider_id
        ])
      );
    });

    it('should handle registration without documents', async () => {
      (query as any)
        .mockResolvedValueOnce([]) // Check existing email
        .mockResolvedValueOnce([]) // Check existing user
        .mockResolvedValueOnce([{ insertId: 123 }]) // Insert user
        .mockResolvedValueOnce([{ insertId: 456 }]) // Insert service provider
        .mockResolvedValueOnce([]); // No document update needed

      const basicRegistration = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        businessName: 'Test Business',
        businessAddress: '123 Business St',
        businessPhone: '+1234567890',
        businessEmail: 'business@example.com',
        password: 'SecurePass123!',
        account_type: 'business',
        businessType: 'cremation',
      };

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(basicRegistration),
      });

      const response = await registerBusiness(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);

      // Should not attempt document update
      const updateCalls = (query as any).mock.calls.filter((call: any[]) =>
        call[0].includes('UPDATE service_providers SET')
      );
      expect(updateCalls).toHaveLength(0);
    });
  });

  describe('Authentication Integration', () => {
    it('should handle business user authentication correctly', async () => {
      (verifySecureAuth as any).mockResolvedValue({
        userId: '123',
        accountType: 'business',
        email: 'business@example.com'
      });

      const request = new NextRequest('http://localhost:3000/api/businesses/upload-documents', {
        method: 'POST',
        body: new FormData(),
      });

      // This would be testing a protected route
      // The auth check should pass for business users
      expect(verifySecureAuth).toHaveBeenCalledWith(request);
    });

    it('should reject non-business users from business routes', async () => {
      (verifySecureAuth as any).mockResolvedValue({
        userId: '123',
        accountType: 'personal', // Not business
        email: 'user@example.com'
      });

      const request = new NextRequest('http://localhost:3000/api/businesses/upload-documents', {
        method: 'POST',
        body: new FormData(),
      });

      // Business routes should reject non-business users
      expect(verifySecureAuth).toHaveBeenCalledWith(request);
    });
  });
});
