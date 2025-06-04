import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  asyncHandler,
} from '@/lib/errorHandler';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      data,
      status: options?.status || 200,
    })),
  },
}));

describe('Error Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AppError classes', () => {
    it('should create ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should create AuthenticationError with correct properties', () => {
      const error = new AuthenticationError();
      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('User not found');
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should create RateLimitError with correct properties', () => {
      const error = new RateLimitError();
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response for AppError', () => {
      const error = new ValidationError('Invalid email');
      const response = createErrorResponse(error, '/api/test');

      expect(response.success).toBe(false);
      expect(response.error.message).toBe('Invalid email');
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.path).toBe('/api/test');
      expect(response.timestamp).toBeDefined();
    });

    it('should create error response for generic Error', () => {
      const error = new Error('Something went wrong');
      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe('Internal server error');
      expect(response.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle ZodError correctly', () => {
      // Create a proper ZodError instance
      const zodError = new ZodError([
        { path: ['email'], message: 'Invalid email format', code: 'invalid_string' },
        { path: ['password'], message: 'Password too short', code: 'too_small' },
      ]);

      const response = createErrorResponse(zodError);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe('Validation failed');
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.details).toHaveLength(2);
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const data = { id: 1, name: 'Test' };
      const response = createSuccessResponse(data, 'Success message');

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('Success message');
      expect(response.timestamp).toBeDefined();
    });

    it('should create success response without message', () => {
      const data = { id: 1, name: 'Test' };
      const response = createSuccessResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBeUndefined();
    });
  });

  describe('handleApiError', () => {
    it('should handle AppError correctly', () => {
      const error = new ValidationError('Invalid input');
      const result = handleApiError(error, '/api/test');

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Invalid input',
            code: 'VALIDATION_ERROR',
          }),
        }),
        { status: 400 }
      );
    });

    it('should handle database errors', () => {
      const dbError = { code: 'ER_DUP_ENTRY', message: 'Duplicate entry' };
      const result = handleApiError(dbError);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'CONFLICT_ERROR',
          }),
        }),
        { status: 409 }
      );
    });

    it('should handle generic errors', () => {
      const error = new Error('Unknown error');
      const result = handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          }),
        }),
        { status: 500 }
      );
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful requests', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );
      const wrappedHandler = asyncHandler(mockHandler);
      const mockRequest = new Request('http://localhost/api/test');

      const result = await wrappedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, undefined);
      expect(result).toEqual(NextResponse.json({ success: true }));
    });

    it('should handle errors in async handlers', async () => {
      const mockHandler = jest.fn().mockRejectedValue(
        new ValidationError('Invalid data')
      );
      const wrappedHandler = asyncHandler(mockHandler);
      const mockRequest = new Request('http://localhost/api/test');

      const result = await wrappedHandler(mockRequest);

      expect(mockHandler).toHaveBeenCalledWith(mockRequest, undefined);
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        }),
        { status: 400 }
      );
    });
  });
});
