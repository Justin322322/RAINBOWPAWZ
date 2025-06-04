import { userRegistrationSchema, bookingSchema, validateData } from '@/lib/validation';

describe('Integration: Validation System', () => {
  describe('User Registration Validation', () => {
    it('should validate complete user registration', () => {
      const validUser = {
        email: 'test@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+639123456789',
        accountType: 'personal' as const,
      };

      const result = validateData(userRegistrationSchema, validUser);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.accountType).toBe('personal');
      }
    });

    it('should reject invalid user registration', () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'short',
        firstName: '',
        lastName: 'Doe',
        phoneNumber: '123',
        accountType: 'invalid' as any,
      };

      const result = validateData(userRegistrationSchema, invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(error => error.includes('email'))).toBe(true);
        expect(result.errors.some(error => error.includes('password'))).toBe(true);
      }
    });
  });

  describe('Booking Validation', () => {
    it('should validate complete booking data', () => {
      const validBooking = {
        date: '2024-12-25',
        time: '14:30:00',
        petName: 'Fluffy',
        petType: 'Cat',
        providerId: 1,
        packageId: 2,
        price: 1500.50,
        deliveryFee: 200,
      };

      const result = validateData(bookingSchema, validBooking);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.petName).toBe('Fluffy');
        expect(result.data.price).toBe(1500.50);
      }
    });

    it('should reject invalid booking data', () => {
      const invalidBooking = {
        date: '2024/12/25', // Wrong format
        time: '14:30', // Wrong format
        petName: '',
        petType: 'Cat',
        providerId: -1, // Invalid ID
        packageId: 0, // Invalid ID
        price: -100, // Negative price
      };

      const result = validateData(bookingSchema, invalidBooking);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(error => error.includes('date'))).toBe(true);
        expect(result.errors.some(error => error.includes('time'))).toBe(true);
        expect(result.errors.some(error => error.includes('price'))).toBe(true);
      }
    });
  });

  describe('Error Message Quality', () => {
    it('should provide clear error messages', () => {
      const invalidData = {
        email: 'not-an-email',
        password: '123',
        firstName: '',
        lastName: 'A'.repeat(101), // Too long
        phoneNumber: '123',
        accountType: 'invalid',
      };

      const result = validateData(userRegistrationSchema, invalidData);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errorMessages = result.errors.join(' ');
        expect(errorMessages).toContain('Invalid email format');
        expect(errorMessages).toContain('Password must be at least 8 characters');
        expect(errorMessages).toContain('Name is required');
        expect(errorMessages).toContain('Name too long');
        expect(errorMessages).toContain('Invalid Philippine phone number format');
      }
    });
  });
});
