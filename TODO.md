# Rainbow Paws - Development TODO List

This document tracks incomplete, non-functional, or buggy modules/features that need attention in the Rainbow Paws application. Each item includes the location, issues, and what's required to fix it.

## 1. Payment Processing Module

**Location:**
- `src/app/api/cremation/bookings/[id]/payment/route.ts`
- `src/components/booking/BookingForm.tsx`

**Issues:**
- GCash payment integration is incomplete (UI only, no actual API integration)
- The payment_status column might not exist in the database
- Client-side tracking for payment status used as a fallback
- No actual payment processing logic for GCash payments

**Required to Fix:**
- [ ] Implement actual GCash API integration
- [ ] Ensure the payment_status column exists in the database
- [ ] Add proper payment verification and processing logic
- [ ] Implement payment confirmation and receipt generation

**Check if Finished:**
- [ ] GCash API integration implemented
- [ ] Payment status tracking works in database
- [ ] Payment verification process tested
- [ ] Receipt generation and delivery works

## 2. Admin Logging System ✅

**Location:**
- `src/app/api/businesses/applications/[id]/approve/route.ts`
- `src/app/api/businesses/applications/[id]/decline/route.ts`

**Issues:**
- ✅ Hardcoded admin IDs (using ID 1) instead of getting actual admin ID from authentication
- ✅ TODO comments indicating this needs to be fixed
- ✅ Doesn't properly handle cases where the admin_logs table doesn't exist

**Required to Fix:**
- [x] Replace hardcoded admin IDs with actual admin IDs from authentication
- [x] Ensure the admin_logs table exists and has the correct schema
- [x] Add proper error handling for missing tables
- [x] Implement comprehensive admin action logging

**Solution:**
- Created utility functions in `src/utils/adminUtils.ts` to handle admin ID retrieval and logging
- Added proper authentication checks to ensure only admins can perform admin actions
- Implemented automatic table creation if the admin_logs table doesn't exist
- Added IP address tracking for better audit trails

**Check if Finished:**
- [x] Code changes implemented and tested
- [x] No linting errors related to the changes
- [x] Development server runs without errors
- [x] Authentication check works correctly
- [x] Admin logging works with actual admin IDs

## 3. Map and Geocoding Functionality

**Location:**
- `src/components/map/MapComponent.tsx`

**Issues:**
- Multiple fallback mechanisms indicating reliability issues with geocoding
- Hardcoded coordinates for Balanga City when geocoding fails
- Multiple error handling blocks for geocoding failures
- Uses public OSRM demo server which may have rate limits or reliability issues

**Required to Fix:**
- [ ] Implement a more reliable geocoding service
- [ ] Add proper error handling and user feedback for geocoding failures
- [ ] Consider using a paid routing service for better reliability
- [ ] Improve map performance and loading times
- [ ] Add caching for frequently accessed locations

**Check if Finished:**
- [ ] Geocoding works reliably without fallbacks
- [ ] User receives clear feedback on geocoding failures
- [ ] Routing service handles requests without rate limiting
- [ ] Map loads quickly and performs well
- [ ] Location caching reduces API calls

## 4. Cremation Section Loading Inconsistencies

**Location:**
- `src/app/cremation/components/LoadingComponents.tsx`
- Various cremation section pages

**Issues:**
- Cremation section has its own loading components inconsistent with the rest of the application
- Multiple loading component implementations across different files
- Some components use the standardized loading system while others use custom implementations

**Required to Fix:**
- [ ] Standardize loading components across the application
- [ ] Use the LoadingContext consistently for global loading states
- [ ] Refactor custom loading implementations to use the standardized components
- [ ] Ensure consistent loading animations and behavior

**Check if Finished:**
- [ ] All cremation pages use standardized loading components
- [ ] LoadingContext is used consistently throughout the application
- [ ] No custom loading implementations remain
- [ ] Loading animations are visually consistent

## 5. Database Table Structure Flexibility

**Location:**
- Various API routes with table existence checks

**Issues:**
- Many API routes check for the existence of tables and columns before operations
- Alternative queries are used if expected structures aren't found
- Suggests the database schema is not finalized or consistent

**Required to Fix:**
- [ ] Finalize the database schema
- [ ] Implement proper migrations to ensure consistent table structure
- [ ] Remove conditional table existence checks once the schema is stable
- [ ] Document the final database schema

**Check if Finished:**
- [ ] Database schema is finalized and documented
- [ ] Migration system is in place for schema changes
- [ ] Conditional table checks are removed
- [ ] All API routes use consistent table structure

## 6. Reviews System

**Location:**
- `src/app/api/reviews/pending/route.ts`

**Issues:**
- Complex fallback mechanisms for finding pending reviews
- Multiple query approaches used if the first one fails
- Debug information included in the response

**Required to Fix:**
- [ ] Standardize the query approach for finding pending reviews
- [ ] Remove debug information from production responses
- [ ] Simplify the fallback mechanisms
- [ ] Implement proper error handling

**Check if Finished:**
- [ ] Review queries are standardized
- [ ] No debug information in production responses
- [ ] Fallback mechanisms are simplified or removed
- [ ] Error handling is consistent and user-friendly

## 7. Image Path Handling

**Location:**
- `src/components/ui/DirectImageWithFallback.tsx`
- `scripts/fix-image-paths.js`

**Issues:**
- Multiple scripts and components dedicated to fixing image paths
- Complex error handling and path fixing logic
- Scripts specifically for verifying and fixing image paths

**Required to Fix:**
- [ ] Standardize image path storage and retrieval
- [ ] Fix the root cause of image path inconsistencies
- [ ] Simplify the image handling components
- [ ] Implement proper image optimization

**Check if Finished:**
- [ ] Image paths are stored consistently
- [ ] No path fixing scripts are needed
- [ ] Image components are simplified
- [ ] Images are properly optimized for web

## 8. OTP Verification System

**Location:**
- `src/app/api/auth/otp/verify/route.ts`
- `src/app/api/auth/otp/generate/route.ts`

**Issues:**
- Complex rate limiting and error handling
- Multiple tables involved (otp_codes, otp_attempts)
- Relies on IP address tracking which might not be reliable in all environments

**Required to Fix:**
- [ ] Simplify the OTP verification system
- [ ] Ensure consistent implementation of rate limiting
- [ ] Add more reliable user identification for rate limiting
- [ ] Improve security of the OTP system

**Check if Finished:**
- [ ] OTP verification system is simplified
- [ ] Rate limiting is consistently implemented
- [ ] User identification is reliable
- [ ] OTP system is secure against common attacks

## 9. Booking Status Updates

**Location:**
- `src/app/api/cremation/bookings/[id]/status/route.ts`

**Issues:**
- Tries multiple tables, indicating inconsistent database schema
- Complex logic for handling completed or cancelled bookings
- Attempts to get booking details from different tables with different schemas

**Required to Fix:**
- [ ] Standardize the booking table schema
- [ ] Simplify the status update logic
- [ ] Ensure consistent handling of booking status changes
- [ ] Add proper notifications for status changes

**Check if Finished:**
- [ ] Booking table schema is standardized
- [ ] Status update logic is simplified
- [ ] Booking status changes are handled consistently
- [ ] Notifications are sent for all status changes

## 10. Profile Picture System ✅

**Location:**
- `src/app/cremation/profile/page.tsx`
- `src/app/api/cremation/upload-profile-picture/route.ts`
- `src/components/navigation/CremationNavbar.tsx`
- `src/app/api/image/[...path]/route.ts`

**Issues:**
- ✅ No profile picture functionality for users
- ✅ Navigation bar only showed default user icons
- ✅ No way for users to personalize their profiles
- ✅ Document images were incorrectly showing as profile pictures

**Required to Fix:**
- [x] Add profile picture upload functionality to profile settings
- [x] Display profile pictures in navigation bar across all pages
- [x] Implement proper image validation and storage
- [x] Create API endpoints for profile picture upload and serving
- [x] Ensure profile pictures persist across all cremation dashboard pages

**Solution:**
- Created comprehensive profile picture upload system in cremation profile page
- Added profile picture display in navigation bar with fallback to user icon
- Implemented file validation (type, size) with user-friendly error messages
- Created dedicated API endpoint for profile picture uploads with proper file handling
- Enhanced image serving API to handle profile picture paths
- Added preview functionality that replaces main profile circle (not separate)
- Integrated with existing authentication and user management system

**Check if Finished:**
- [x] Profile picture upload works in profile settings
- [x] Profile pictures display in navigation bar across all pages
- [x] File validation prevents invalid uploads
- [x] Image serving API handles profile pictures correctly
- [x] Preview shows in main circle (not separate circle)
- [x] Profile pictures persist across page navigation
- [x] Fallback to user icon when no profile picture exists

## 11. Notification System ✅

**Location:**
- `src/app/api/notifications/route.ts`
- `src/app/api/notifications/mark-read/route.ts`
- `src/utils/rateLimitUtils.ts`

**Issues:**
- ✅ Client-side rate limiting using timestamps
- ✅ Complex caching logic with headers
- ✅ Returns empty results instead of errors in some cases

**Required to Fix:**
- [x] Implement proper server-side rate limiting
- [x] Standardize error handling
- [x] Simplify the caching logic
- [x] Improve notification delivery reliability

**Solution:**
- Created server-side rate limiting utility using database-backed tracking in `src/utils/rateLimitUtils.ts`
- Implemented proper rate limiting for notification API endpoints (max 30 requests per minute per user)
- Standardized error handling across all notification endpoints with consistent response formats
- Simplified caching logic by removing client-side timestamp workarounds and using proper HTTP cache headers
- Enhanced notification delivery reliability with better error handling and database connection checks
- Added proper logging for rate limiting and error tracking
- **COMPREHENSIVE NOTIFICATION SYSTEM IMPLEMENTED:**
  - ✅ Comprehensive booking lifecycle notifications (created, confirmed, in-progress, completed, cancelled)
  - ✅ Payment confirmation notifications (pending, confirmed, failed, refunded)
  - ✅ Review request notifications (automated after booking completion)
  - ✅ System maintenance notifications (admin-controlled system-wide announcements)
  - ✅ Automated reminder notifications (24-hour and 1-hour booking reminders)
  - ✅ In-app notifications for booking status updates and payment confirmations
  - ✅ Email + in-app notification delivery for all major events
  - ✅ Admin dashboard for notification management and reminder processing
  - ✅ Scheduled reminder system with database-backed tracking
  - ✅ Provider notifications for new bookings received

**Check if Finished:**
- [x] Server-side rate limiting is implemented
- [x] Error handling is standardized
- [x] Caching logic is simplified
- [x] Notifications are delivered reliably

## Priority Order

Based on the impact on user experience and system functionality, here's the suggested priority order for addressing these issues:

1. Payment Processing Module (Critical for business operations)
2. Booking Status Updates (Critical for service delivery)
3. Image Path Handling (Affects visual presentation)
4. Cremation Section Loading Inconsistencies (Affects user experience)
5. Map and Geocoding Functionality (Important for location services)
6. Database Table Structure Flexibility (Important for system stability)
7. OTP Verification System (Important for security)
8. Reviews System (Important for feedback)
9. ~~Notification System~~ ✅ (Completed - Important for user engagement)
10. ~~Admin Logging System~~ ✅ (Completed - Important for administration)
11. ~~Profile Picture System~~ ✅ (Completed - Important for user personalization)

## Additional Notes

- All fixes should follow the UI component guidelines in `docs/UI-COMPONENT-GUIDELINES.md`
- Loading components should follow the standards in `src/docs/LOADING-SYSTEM.md`
- Database changes should be documented in `DATABASE_README.md`
