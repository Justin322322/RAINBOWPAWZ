/**
 * Test file for password reset functionality
 * This tests the password validation logic used in both registration and password reset
 */

import { validatePasswordStrength, calculatePasswordStrength, isPasswordValid, PASSWORD_CRITERIA } from '@/utils/passwordValidation';

describe('Password Validation', () => {
  describe('validatePasswordStrength', () => {
    test('should pass for valid password with all criteria', () => {
      const result = validatePasswordStrength('MySecure123!');
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Password meets all requirements');
      expect(result.requirements).toHaveLength(0);
    });

    test('should fail for password too short', () => {
      const result = validatePasswordStrength('Abc1!');
      expect(result.isValid).toBe(false);
      expect(result.requirements).toContain('At least 8 characters long');
    });

    test('should fail for password without lowercase', () => {
      const result = validatePasswordStrength('MYSECURE123!');
      expect(result.isValid).toBe(false);
      expect(result.requirements).toContain('At least one lowercase letter');
    });

    test('should fail for password without uppercase', () => {
      const result = validatePasswordStrength('mysecure123!');
      expect(result.isValid).toBe(false);
      expect(result.requirements).toContain('At least one uppercase letter');
    });

    test('should fail for password without numbers', () => {
      const result = validatePasswordStrength('MySecurePass!');
      expect(result.isValid).toBe(false);
      expect(result.requirements).toContain('At least one number');
    });

    test('should fail for password without special characters', () => {
      const result = validatePasswordStrength('MySecure123');
      expect(result.isValid).toBe(false);
      expect(result.requirements).toContain('At least one special character');
    });

    test('should fail for password missing multiple criteria', () => {
      const result = validatePasswordStrength('abc');
      expect(result.isValid).toBe(false);
      expect(result.requirements).toHaveLength(4); // Missing length, uppercase, number, special
    });
  });

  describe('calculatePasswordStrength', () => {
    test('should return 0 for empty password', () => {
      expect(calculatePasswordStrength('')).toBe(0);
    });

    test('should return 1 for password with only length', () => {
      expect(calculatePasswordStrength('abcdefgh')).toBe(1);
    });

    test('should return 5 for password meeting all criteria', () => {
      expect(calculatePasswordStrength('MySecure123!')).toBe(5);
    });

    test('should return 3 for password with length, lowercase, and uppercase', () => {
      expect(calculatePasswordStrength('MySecurePassword')).toBe(3);
    });
  });

  describe('isPasswordValid', () => {
    test('should return true for valid password', () => {
      expect(isPasswordValid('MySecure123!')).toBe(true);
    });

    test('should return false for invalid password', () => {
      expect(isPasswordValid('weak')).toBe(false);
    });
  });

  describe('PASSWORD_CRITERIA', () => {
    test('should have 5 criteria', () => {
      expect(PASSWORD_CRITERIA).toHaveLength(5);
    });

    test('should have correct criteria IDs', () => {
      const ids = PASSWORD_CRITERIA.map(c => c.id);
      expect(ids).toEqual(['length', 'lowercase', 'uppercase', 'number', 'special']);
    });

    test('each criterion should have required properties', () => {
      PASSWORD_CRITERIA.forEach(criterion => {
        expect(criterion).toHaveProperty('id');
        expect(criterion).toHaveProperty('label');
        expect(criterion).toHaveProperty('test');
        expect(criterion).toHaveProperty('description');
        expect(typeof criterion.test).toBe('function');
      });
    });
  });
});

// Integration test examples for password reset API
describe('Password Reset Integration', () => {
  test('should validate password requirements in API format', () => {
    const weakPassword = 'weak';
    const strongPassword = 'MySecure123!';

    const weakResult = validatePasswordStrength(weakPassword);
    const strongResult = validatePasswordStrength(strongPassword);

    // Weak password should return API-compatible error format
    expect(weakResult).toEqual({
      isValid: false,
      message: expect.stringContaining('Password must include:'),
      requirements: expect.arrayContaining([
        'At least 8 characters long',
        'At least one uppercase letter',
        'At least one number',
        'At least one special character'
      ])
    });

    // Strong password should pass
    expect(strongResult).toEqual({
      isValid: true,
      message: 'Password meets all requirements',
      requirements: []
    });
  });
});

// Test cases for common password patterns
describe('Common Password Patterns', () => {
  const testCases = [
    { password: 'Password123!', expected: true, description: 'Standard strong password' },
    { password: 'MyP@ssw0rd', expected: true, description: 'Password with special characters' },
    { password: 'SecurePass2024#', expected: true, description: 'Long password with year' },
    { password: 'password123', expected: false, description: 'Missing uppercase and special' },
    { password: 'PASSWORD123!', expected: false, description: 'Missing lowercase' },
    { password: 'MyPassword!', expected: false, description: 'Missing numbers' },
    { password: 'MyPassword123', expected: false, description: 'Missing special characters' },
    { password: 'Mp1!', expected: false, description: 'Too short' },
  ];

  testCases.forEach(({ password, expected, description }) => {
    test(`${description}: "${password}"`, () => {
      const result = validatePasswordStrength(password);
      expect(result.isValid).toBe(expected);
    });
  });
});
