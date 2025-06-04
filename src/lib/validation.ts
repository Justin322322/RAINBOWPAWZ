import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const phoneSchema = z.string().regex(/^(\+63|63|0)?[0-9]{10}$/, 'Invalid Philippine phone number format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long');
export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name too long');
export const idSchema = z.coerce.number().int().positive('Invalid ID');

// User registration validation
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneSchema,
  accountType: z.enum(['personal', 'business'], { required_error: 'Account type is required' }),
});

// User login validation
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// OTP validation
export const otpSchema = z.object({
  userId: idSchema,
  otpCode: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
});

// Booking validation
export const bookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Invalid time format (HH:MM:SS)'),
  petName: z.string().min(1, 'Pet name is required').max(50, 'Pet name too long'),
  petType: z.string().min(1, 'Pet type is required').max(30, 'Pet type too long'),
  providerId: idSchema,
  packageId: idSchema,
  price: z.coerce.number().positive('Price must be positive'),
  deliveryFee: z.coerce.number().min(0, 'Delivery fee cannot be negative').optional(),
});

// Review validation
export const reviewSchema = z.object({
  bookingId: idSchema,
  userId: idSchema,
  serviceProviderId: idSchema,
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().max(500, 'Comment too long').optional(),
});

// Payment validation
export const paymentSchema = z.object({
  bookingId: idSchema,
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['gcash', 'paymaya', 'card'], { required_error: 'Payment method is required' }),
});

// Admin user creation validation
export const adminUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneSchema,
});

// Pet image upload validation
export const petImageSchema = z.object({
  petId: idSchema.optional(),
  file: z.object({
    type: z.string().refine(
      (type) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type),
      'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'
    ),
    size: z.number().max(5 * 1024 * 1024, 'File size cannot exceed 5MB'),
  }),
});

// Notification validation
export const notificationSchema = z.object({
  userId: idSchema,
  type: z.string().min(1, 'Notification type is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  data: z.record(z.any()).optional(),
});

// Environment variables validation
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_HOST: z.string().min(1, 'Database host is required'),
  DB_USER: z.string().min(1, 'Database user is required'),
  DB_PASSWORD: z.string().min(1, 'Database password is required'),
  DB_NAME: z.string().min(1, 'Database name is required'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  PAYMONGO_SECRET_KEY: z.string().optional(),
  PAYMONGO_PUBLIC_KEY: z.string().optional(),
  PAYMONGO_WEBHOOK_SECRET: z.string().optional(),
});

// Validation helper function
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

// Middleware helper for API route validation
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    const result = validateData(schema, data);
    if (!result.success) {
      throw new Error(`Validation failed: ${result.errors.join(', ')}`);
    }
    return result.data;
  };
}
