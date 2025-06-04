import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';
  }
}

// Predefined error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

// Standard error response format
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
  timestamp: string;
  path?: string;
}

// Create standardized error response
export function createErrorResponse(
  error: AppError | Error,
  path?: string
): ErrorResponse {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
      },
      timestamp,
      path,
    };
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      },
      timestamp,
      path,
    };
  }

  // Handle generic errors
  return {
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    timestamp,
    path,
  };
}

// Error handler for API routes
export function handleApiError(error: unknown, path?: string): NextResponse {
  console.error('API Error:', error);

  if (error instanceof AppError) {
    const response = createErrorResponse(error, path);
    return NextResponse.json(response, { status: error.statusCode });
  }

  if (error instanceof ZodError) {
    const response = createErrorResponse(error, path);
    return NextResponse.json(response, { status: 400 });
  }

  // Handle database errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as any;
    
    // MySQL specific error codes
    switch (dbError.code) {
      case 'ER_DUP_ENTRY':
        const duplicateError = new ConflictError('Duplicate entry found');
        const response = createErrorResponse(duplicateError, path);
        return NextResponse.json(response, { status: 409 });
      
      case 'ER_NO_REFERENCED_ROW_2':
        const foreignKeyError = new ValidationError('Referenced record does not exist');
        const fkResponse = createErrorResponse(foreignKeyError, path);
        return NextResponse.json(fkResponse, { status: 400 });
      
      default:
        const genericDbError = new DatabaseError('Database operation failed');
        const dbResponse = createErrorResponse(genericDbError, path);
        return NextResponse.json(dbResponse, { status: 500 });
    }
  }

  // Generic error fallback
  const genericError = new AppError('Internal server error');
  const response = createErrorResponse(genericError, path);
  return NextResponse.json(response, { status: 500 });
}

// Async error wrapper for API routes
export function asyncHandler(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      const url = new URL(request.url);
      return handleApiError(error, url.pathname);
    }
  };
}

// Success response helper
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
}
