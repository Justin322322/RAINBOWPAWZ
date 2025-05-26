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

## 2. Map and Geocoding Functionality

**Location:**
- `src/components/map/MapComponent.tsx`

**Issues:**
- Multiple fallback mechanisms indicating reliability issues with geocoding
- Hardcoded coordinates for Balanga City when geocoding fails
- Multiple error handling blocks for geocoding failures
- Uses public OSRM demo server which may have rate limits or reliability issues

**Required to Fix:**
- [x] Implement a more reliable geocoding service
- [x] Add proper error handling and user feedback for geocoding failures
- [x] Consider using a paid routing service for better reliability
- [x] Improve map performance and loading times
- [x] Add caching for frequently accessed locations

**Check if Finished:**
- [x] Geocoding works reliably without fallbacks
- [x] User receives clear feedback on geocoding failures
- [x] Routing service handles requests without rate limiting
- [x] Map loads quickly and performs well
- [x] Location caching reduces API calls

**Improvements Implemented:**
- Enhanced geocoding service with multiple providers (Google Maps + Nominatim fallback)
- Comprehensive caching system with TTL and versioning
- Multiple routing providers (MapBox + OSRM fallback)
- Better error handling with user-friendly messages
- Accuracy indicators for geocoding results
- Loading states for both geocoding and routing
- Exponential backoff for failed requests
- Cache cleanup on component mount

## 3. Cremation Section Loading Inconsistencies

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

## 4. Database Table Structure Flexibility

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

## 5. Reviews System

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

## 6. Image Path Handling

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

## 7. OTP Verification System

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

## 8. Booking Status Updates

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

## Additional Notes

- All fixes should follow the UI component guidelines in `docs/UI-COMPONENT-GUIDELINES.md`
- Loading components should follow the standards in `src/docs/LOADING-SYSTEM.md`
- Database changes should be documented in `DATABASE_README.md`
