# RainbowPaws Database Consolidation Plan

## 🎯 Goal: Reduce from 35 tables to 8-10 tables

## Phase 1: Merge Duplicate Tables (High Impact, Low Risk)

### 1.1 Merge `service_bookings` → `bookings`
**Problem**: Two tables doing the same thing
**Solution**: Consolidate into single `bookings` table

#### Database Changes:
```sql
-- Add missing columns to bookings table
ALTER TABLE bookings ADD COLUMN service_type_id INT NULL;
ALTER TABLE bookings ADD COLUMN notes TEXT NULL;
ALTER TABLE bookings ADD COLUMN confirmation_code VARCHAR(50) NULL;

-- Migrate data from service_bookings to bookings
INSERT INTO bookings (
  user_id, provider_id, package_id, service_type_id, pet_name, pet_type,
  booking_date, booking_time, status, payment_method, payment_status,
  total_price, notes, confirmation_code, created_at, updated_at
)
SELECT 
  user_id, provider_id, package_id, service_type_id, pet_name, pet_type,
  booking_date, booking_time, status, payment_method, payment_status,
  price as total_price, notes, confirmation_code, created_at, updated_at
FROM service_bookings;

-- Drop service_bookings table
DROP TABLE service_bookings;
```

#### Code Changes Required:
- **Files to update**: 15+ files
- **APIs**: `/api/bookings/`, `/api/cremation/bookings/`
- **Services**: `paymentService.ts`, `refundService.ts`
- **Pages**: All booking-related components

### 1.2 Merge `business_profiles` → `service_providers`
**Problem**: Duplicate business information
**Solution**: Add missing columns to service_providers

#### Database Changes:
```sql
-- Add business profile columns to service_providers
ALTER TABLE service_providers ADD COLUMN contact_email VARCHAR(255) NULL;
ALTER TABLE service_providers ADD COLUMN business_hours JSON NULL;
ALTER TABLE service_providers ADD COLUMN social_media JSON NULL;
ALTER TABLE service_providers ADD COLUMN certifications JSON NULL;

-- Migrate data
UPDATE service_providers sp 
JOIN business_profiles bp ON sp.provider_id = bp.provider_id
SET 
  sp.contact_email = bp.contact_email,
  sp.business_hours = bp.business_hours,
  sp.social_media = bp.social_media,
  sp.certifications = bp.certifications;

-- Drop business_profiles table
DROP TABLE business_profiles;
```

### 1.3 Merge `admin_profiles` → `users`
**Problem**: Separate table for admin data
**Solution**: Add admin fields to users table

#### Database Changes:
```sql
-- Add admin fields to users table
ALTER TABLE users ADD COLUMN admin_role VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN full_name VARCHAR(100) NULL;

-- Migrate admin data
UPDATE users u 
JOIN admin_profiles ap ON u.user_id = ap.user_id
SET 
  u.admin_role = ap.admin_role,
  u.username = ap.username,
  u.full_name = ap.full_name;

-- Drop admin_profiles table
DROP TABLE admin_profiles;
```

## Phase 2: Consolidate Package System (Medium Impact, Medium Risk)

### 2.1 Convert Package Tables to JSON
**Problem**: 6 tables for simple package data
**Solution**: Use JSON columns in service_packages

#### Database Changes:
```sql
-- Add JSON columns to service_packages
ALTER TABLE service_packages 
ADD COLUMN addons JSON NULL,
ADD COLUMN inclusions JSON NULL,
ADD COLUMN images JSON NULL,
ADD COLUMN size_pricing JSON NULL;

-- Migrate package_addons
UPDATE service_packages sp
SET addons = (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'name', pa.addon_name,
      'description', pa.description,
      'price', pa.price,
      'is_required', pa.is_required
    )
  )
  FROM package_addons pa 
  WHERE pa.package_id = sp.package_id
);

-- Migrate package_inclusions
UPDATE service_packages sp
SET inclusions = (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'name', pi.inclusion_name,
      'description', pi.description,
      'is_included', pi.is_included
    )
  )
  FROM package_inclusions pi 
  WHERE pi.package_id = sp.package_id
);

-- Migrate package_images
UPDATE service_packages sp
SET images = (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'url', pimg.image_url,
      'alt_text', pimg.alt_text,
      'is_primary', pimg.is_primary
    )
  )
  FROM package_images pimg 
  WHERE pimg.package_id = sp.package_id
);

-- Migrate package_size_pricing
UPDATE service_packages sp
SET size_pricing = (
  SELECT JSON_ARRAYAGG(
    JSON_OBJECT(
      'pet_size', psp.pet_size,
      'price', psp.price,
      'weight_range', psp.weight_range
    )
  )
  FROM package_size_pricing psp 
  WHERE psp.package_id = sp.package_id
);

-- Drop old tables
DROP TABLE package_addons;
DROP TABLE package_inclusions;
DROP TABLE package_images;
DROP TABLE package_size_pricing;
DROP TABLE package_addon_suggestions;
DROP TABLE package_inclusion_suggestions;
```

## Phase 3: Simplify Infrastructure Tables (Low Impact, High Risk)

### 3.1 Consolidate Notifications
```sql
-- Add type column to notifications
ALTER TABLE notifications ADD COLUMN recipient_type ENUM('user', 'admin', 'business') DEFAULT 'user';

-- Migrate admin_notifications
INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, link, is_read, recipient_type, created_at)
SELECT 0 as user_id, type, title, message, entity_type, entity_id, link, is_read, 'admin', created_at
FROM admin_notifications;

-- Drop admin_notifications
DROP TABLE admin_notifications;
```

### 3.2 Remove Infrastructure Tables (External Services)
```sql
-- These should be replaced with external services:
DROP TABLE email_log;      -- Use SendGrid logs
DROP TABLE email_queue;    -- Use SendGrid queue
DROP TABLE otp_codes;      -- Use JWT tokens
DROP TABLE otp_attempts;   -- Use middleware rate limiting
DROP TABLE password_reset_tokens; -- Use JWT tokens
DROP TABLE rate_limits;    -- Use Redis
```

## Code Changes Required

### 1. Update All Booking Queries
**Files to update:**
- `src/app/api/bookings/route.ts`
- `src/app/api/cremation/bookings/route.ts`
- `src/services/paymentService.ts`
- `src/services/refundService.ts`
- `src/services/bookingCancellationService.ts`

**Change from:**
```typescript
// OLD: Query both tables
FROM service_bookings sb
LEFT JOIN bookings b ON sb.id = b.id
```

**To:**
```typescript
// NEW: Single table
FROM bookings b
```

### 2. Update Package Queries
**Files to update:**
- `src/app/api/packages/route.ts`
- `src/components/PackageCard.tsx`
- Package management APIs

**Change from:**
```typescript
// OLD: Multiple JOINs
SELECT sp.*, pa.addon_name, pi.inclusion_name
FROM service_packages sp
LEFT JOIN package_addons pa ON sp.package_id = pa.package_id
LEFT JOIN package_inclusions pi ON sp.package_id = pi.package_id
```

**To:**
```typescript
// NEW: JSON columns
SELECT 
  sp.*,
  JSON_EXTRACT(sp.addons, '$') as addons,
  JSON_EXTRACT(sp.inclusions, '$') as inclusions
FROM service_packages sp
```

### 3. Update Business Profile Queries
**Files to update:**
- `src/app/api/cremation/profile/route.ts`
- Business dashboard components

**Change from:**
```typescript
// OLD: JOIN with business_profiles
SELECT sp.*, bp.contact_email, bp.business_hours
FROM service_providers sp
JOIN business_profiles bp ON sp.provider_id = bp.provider_id
```

**To:**
```typescript
// NEW: All data in service_providers
SELECT sp.*, sp.contact_email, sp.business_hours
FROM service_providers sp
```

## Migration Script Generator

Let me create the actual migration scripts...
