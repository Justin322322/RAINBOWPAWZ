# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Essential Commands
```powershell
# Development server with dynamic port detection
npm run dev

# Type checking without emitting files
npm run type-check

# Build for production
npm run build

# Start production server
npm run start

# Run ESLint with strict unused variable checking
npm run lint:strict

# Auto-fix ESLint issues
npm run lint:fix

# Remove unused imports and variables
npm run lint:unused-only

# Clean build artifacts and check types
npm run spring-clean

# Complete cleanup including dependencies
npm run clean:all

# Find unused dependencies and exports
npm run knip
```

### Database Commands
```powershell
# Test database connection
curl http://localhost:3001/api/db-health

# Run database migrations manually
curl -X POST http://localhost:3001/api/run-migration

# Check application version and build info
curl http://localhost:3001/api/version
```

### Testing Specific Features
```powershell
# Test authentication and port detection
curl http://localhost:3001/api/auth/check-port

# Test email system (development mode)
curl -X POST http://localhost:3001/api/email -H "Content-Type: application/json" -d '{"to":"test@example.com","subject":"Test","html":"<p>Test email</p>"}'

# Test SMS service status
curl http://localhost:3001/api/sms/status

# Test notification system
curl http://localhost:3001/api/notifications/system
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15.4.2 with App Router
- **Language**: TypeScript 5.8.3 with strict configuration
- **Frontend**: React 19, Tailwind CSS 3.4.17, Framer Motion 12.10.4
- **Backend**: Next.js API Routes with MySQL 2 (mysql2 package)
- **Authentication**: JWT with HTTP-only cookies, dynamic imports for security
- **Database**: MySQL with connection pooling, transaction support, automatic retry logic
- **Real-time**: Server-Sent Events (SSE) with fallback mechanisms
- **File Storage**: Local file system with structured organization
- **Maps**: Leaflet 1.9.4 for interactive maps
- **Email**: Nodemailer 7.0.3 with queue system and retry logic

### Project Structure Pattern
This is a **monolithic Next.js application** with:
- **App Router**: All routes in `src/app/` directory
- **API Routes**: Extensive API in `src/app/api/` with nested structure
- **Components**: Reusable components in `src/components/`
- **Utilities**: Helper functions in `src/lib/` and `src/utils/`
- **Database**: Direct MySQL connection with pooling (no ORM)
- **Middleware**: Single middleware file for authentication and routing

## Database Architecture

### Connection Management
- **Connection Pooling**: Uses mysql2 connection pools with automatic reconnection
- **Environment Detection**: Supports Railway, PlanetScale, Vercel, and local MySQL
- **SSL Handling**: Automatic SSL configuration based on environment
- **Query Function**: Central `query()` function with retry logic and timeout protection
- **Transaction Support**: `withTransaction()` helper for atomic operations

### Key Database Patterns
```typescript
// Standard query pattern
import { query } from '@/lib/db/query';
const results = await query('SELECT * FROM users WHERE id = ?', [userId]);

// Transaction pattern
import { withTransaction } from '@/lib/db/transaction';
await withTransaction(async (transaction) => {
  await transaction.query('INSERT INTO...', [...]);
  await transaction.query('UPDATE...', [...]);
});
```

### Database Tables (13 optimized tables)
- **Core**: users, service_providers, service_packages, pets, bookings
- **Payments**: payment_transactions, refunds  
- **Communication**: notifications_unified, email_queue, admin_logs
- **Auth**: otp_codes, password_reset_tokens, restrictions
- **Reviews**: reviews (with expiration)

## Authentication System

### JWT Implementation
- **Security-First**: Server-side only verification with `verifyToken()`
- **Dynamic Imports**: JWT functions use dynamic imports to prevent client-side exposure
- **Cookie Storage**: HTTP-only cookies with secure settings
- **Multi-Environment**: Supports development, test, and production configurations
- **Legacy Support**: Backward compatibility with older token formats

### Authentication Flow
```typescript
// API route authentication pattern
import { verifySecureAuth } from '@/lib/secureAuth';

export async function GET(request: NextRequest) {
  const authData = await verifySecureAuth(request);
  if (!authData) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // authData contains: { userId: string, accountType: string }
}
```

### Middleware Protection
- **Route Protection**: Automatic redirect based on account type
- **Role-Based Access**: `/admin/*`, `/cremation/*`, `/user/*` routes
- **JWT Parsing**: Edge-compatible JWT decoding without verification
- **Image Serving**: Middleware handles `/uploads/*` rewriting to API routes

## API Architecture

### Route Organization
The API follows a **resource-based hierarchy**:
```
/api/
├── auth/          # Authentication & authorization
├── admin/         # Admin-only operations  
├── users/         # User management
├── pets/          # Pet profile management
├── packages/      # Service packages
├── bookings/      # Booking system
├── payments/      # Payment processing
├── cremation/     # Business dashboard operations
├── notifications/ # Real-time notifications
├── reviews/       # Review system
└── health/        # System monitoring
```

### Common Patterns
1. **Authentication First**: All protected routes use `verifySecureAuth()`
2. **Error Handling**: Consistent error responses with proper status codes  
3. **Database Direct**: No service layer - API routes directly use `query()`
4. **Input Validation**: Manual validation within each route
5. **Rate Limiting**: Database-based rate limiting for security

### Development Endpoints
Special endpoints for debugging (development only):
- `/api/auth/check-port` - Port and configuration verification
- `/api/version` - Application version and build info
- `/api/db-health` - Database connection status
- `/api/sms/debug` - SMS service diagnostics

## File Upload System

### Image Organization
```
public/uploads/
├── pets/
│   └── {userId}/
│       └── {filename}
├── packages/
│   └── {packageId}/
│       └── {filename}
└── profiles/
    └── {userType}/
        └── {userId}/
            └── {filename}
```

### Upload Patterns
- **API Routes**: `/api/upload/pet-image`, `/api/upload/package-image`
- **Serving**: Middleware rewrites `/uploads/*` to `/api/image/*`
- **Security**: File type validation and size limits
- **Organization**: Automatic directory creation by user/resource ID

## Environment Configuration

### Required Variables (Production)
```bash
# Database (required in production)
DATABASE_URL=mysql://user:pass@host:port/database
# OR individual components:
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=rainbow_paws

# JWT Secret (minimum 32 characters)
JWT_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-characters

# Optional services
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
PAYMONGO_SECRET_KEY=your-paymongo-key
```

### Development Configuration
```bash
# Port detection (optional - app auto-detects)
PORT=3001
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Development email mode (logs to console)
DEV_EMAIL_MODE=true

# Allow DDL in production (dangerous)
ALLOW_DDL=true
```

## Real-time Features

### Server-Sent Events (SSE)
- **Endpoint**: `/api/notifications/sse`
- **Authentication**: Requires valid JWT cookie
- **Fallback**: Automatic polling if SSE fails
- **Reconnection**: Exponential backoff on connection loss
- **Usage**: Real-time notifications for all user types

### Notification System
- **Unified Table**: Single `notifications_unified` table for all notification types
- **Categories**: booking, payment, system, admin notifications
- **Priorities**: low, normal, high priority handling
- **Real-time**: SSE pushes + fallback polling

## Development Workflows

### Adding New API Endpoints
1. Create route file in appropriate `src/app/api/` directory
2. Add authentication with `verifySecureAuth()` if needed
3. Use direct database queries with `query()` function
4. Follow existing error handling patterns
5. Add rate limiting if handling sensitive operations

### Adding New Database Tables
1. Create migration in `src/lib/migrations/`
2. Use `query()` with DDL statements
3. Handle PlanetScale compatibility (no foreign keys)
4. Test with local MySQL first
5. Use `/api/run-migration` endpoint to execute

### Working with Authentication
- Server-side: Always use `verifySecureAuth()` for protected routes
- Client-side: Use `fastAuthCheck()` for UI state management
- JWT tokens: Never decode on client-side - use server API endpoints
- Cookie management: Handled automatically by `setSecureAuthCookies()`

## Common Development Tasks

### Testing Database Connection
```powershell
# Check if database is reachable
curl http://localhost:3001/api/db-health

# Test with different database configurations
$env:DATABASE_URL="mysql://user:pass@localhost:3306/rainbow_paws"; npm run dev
```

### Debugging Authentication Issues
```powershell
# Check authentication status and port configuration  
curl http://localhost:3001/api/auth/check-port

# Test authentication with browser cookies
curl -H "Cookie: auth_token=..." http://localhost:3001/api/auth/check
```

### Running Single Tests
```powershell
# Test specific API endpoint functionality
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password"}'

# Test notification system
curl http://localhost:3001/api/notifications -H "Cookie: auth_token=..."
```

## Code Quality Standards

### ESLint Configuration
- **Strict unused variables**: Zero tolerance for unused imports/variables
- **TypeScript integration**: Uses `@typescript-eslint/parser`
- **API route special rules**: Flexible parameter naming for API routes
- **Auto-fixing**: Use `npm run lint:fix` for automatic fixes

### TypeScript Configuration  
- **Strict mode**: All strict TypeScript checks enabled
- **Path mapping**: `@/*` maps to `src/*`
- **No unused locals**: Disabled in favor of ESLint rules
- **Module resolution**: Uses bundler resolution for compatibility

### Code Organization Principles
1. **Separation**: Clear separation between API routes, components, and utilities
2. **Security**: No sensitive data in client-side code
3. **Error Handling**: Graceful degradation and proper error messages
4. **Performance**: Connection pooling, query optimization, and caching
5. **Maintainability**: Consistent patterns and comprehensive documentation

## Debugging and Monitoring

### Built-in Diagnostics
- `/api/health` - Basic application health
- `/api/db-health` - Database connectivity and pool stats
- `/api/version` - Build information and environment
- `/api/auth/check-port` - Authentication and port diagnostics

### Log Monitoring
- **Database queries**: Slow query warnings (>200ms)
- **Authentication**: Debug logs for auth failures
- **Email system**: Development mode logs all emails to console
- **SSE connections**: Connection status and reconnection attempts

### Performance Considerations
- **Database**: Connection pooling with 10-20 connections
- **Images**: Unoptimized in development, optimized in production
- **Caching**: Client-side localStorage for development only
- **Rate limiting**: Database-based request throttling
- **Bundle size**: Knip integration for unused dependency detection

This application represents a modern, full-stack Next.js application with enterprise-grade patterns for authentication, database management, and real-time features. The architecture prioritizes security, performance, and maintainability while providing comprehensive debugging and monitoring capabilities.
