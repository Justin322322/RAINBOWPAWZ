import {
  emailSchema,
  phoneSchema,
  passwordSchema,
  userRegistrationSchema,
  userLoginSchema,
  otpSchema,
  bookingSchema,
  reviewSchema,
  validateData,
  createValidationMiddleware,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      validEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).not.toThrow();
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
      ];

      invalidEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).toThrow();
      });
    });
  });

  describe('phoneSchema', () => {
    it('should validate Philippine phone numbers', () => {
      const validPhones = [
        '+639123456789',
        '639123456789',
        '09123456789',
      ];

      validPhones.forEach(phone => {
        expect(() => phoneSchema.parse(phone)).not.toThrow();
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123456789',
        '+1234567890',
        'not-a-phone',
        '091234567890', // too long
      ];

      invalidPhones.forEach(phone => {
        expect(() => phoneSchema.parse(phone)).toThrow();
      });
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'password123',
        'MyStrongPassword!',
        'verylongpasswordthatisvalid',
      ];

      validPasswords.forEach(password => {
        expect(() => passwordSchema.parse(password)).not.toThrow();
      });
    });

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        'short',
        '1234567',
        '', // empty
      ];

      invalidPasswords.forEach(password => {
        expect(() => passwordSchema.parse(password)).toThrow();
      });
    });
  });

  describe('userRegistrationSchema', () => {
    it('should validate complete user registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+639123456789',
        accountType: 'personal' as const,
      };

      expect(() => userRegistrationSchema.parse(validData)).not.toThrow();
    });

    it('should reject incomplete registration data', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        // missing required fields
      };

      expect(() => userRegistrationSchema.parse(invalidData)).toThrow();
    });
  });

  describe('otpSchema', () => {
    it('should validate correct OTP data', () => {
      const validOtp = {
        userId: 1,
        otpCode: '123456',
      };

      expect(() => otpSchema.parse(validOtp)).not.toThrow();
    });

    it('should reject invalid OTP data', () => {
      const invalidOtps = [
        { userId: 1, otpCode: '12345' }, // too short
        { userId: 1, otpCode: '1234567' }, // too long
        { userId: 1, otpCode: 'abcdef' }, // not numbers
        { userId: -1, otpCode: '123456' }, // invalid user ID
      ];

      invalidOtps.forEach(otp => {
        expect(() => otpSchema.parse(otp)).toThrow();
      });
    });
  });

  describe('bookingSchema', () => {
    it('should validate correct booking data', () => {
      const validBooking = {
        date: '2024-12-25',
        time: '10:30:00',
        petName: 'Fluffy',
        petType: 'Dog',
        providerId: 1,
        packageId: 1,
        price: 1500.00,
        deliveryFee: 100.00,
      };

      expect(() => bookingSchema.parse(validBooking)).not.toThrow();
    });

    it('should reject invalid booking data', () => {
      const invalidBookings = [
        {
          date: '2024/12/25', // wrong format
          time: '10:30:00',
          petName: 'Fluffy',
          petType: 'Dog',
          providerId: 1,
          packageId: 1,
          price: 1500.00,
        },
        {
          date: '2024-12-25',
          time: '10:30', // wrong format
          petName: 'Fluffy',
          petType: 'Dog',
          providerId: 1,
          packageId: 1,
          price: 1500.00,
        },
      ];

      invalidBookings.forEach(booking => {
        expect(() => bookingSchema.parse(booking)).toThrow();
      });
    });
  });

  describe('validateData helper', () => {
    it('should return success for valid data', () => {
      const result = validateData(emailSchema, 'test@example.com');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should return errors for invalid data', () => {
      const result = validateData(emailSchema, 'invalid-email');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain('Invalid email format');
      }
    });
  });

  describe('createValidationMiddleware', () => {
    it('should return validated data for valid input', () => {
      const middleware = createValidationMiddleware(emailSchema);
      expect(() => middleware('test@example.com')).not.toThrow();
      expect(middleware('test@example.com')).toBe('test@example.com');
    });

    it('should throw error for invalid input', () => {
      const middleware = createValidationMiddleware(emailSchema);
      expect(() => middleware('invalid-email')).toThrow();
    });
  });
});
