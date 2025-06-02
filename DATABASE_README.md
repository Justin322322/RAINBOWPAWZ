# Rainbow Paws Database System

## Overview

Rainbow Paws is a comprehensive web application designed to provide dignified and compassionate memorial services for beloved pet companions. The platform connects pet owners (fur parents) with service providers who offer various pet memorial services, primarily focusing on pet cremation services.

This document provides a detailed explanation of the database structure and how it supports the key functionalities of the Rainbow Paws application.

## Entity Relationship Diagram

The database structure is visualized in the Entity Relationship Diagram (ERD) located at `database/RAINBOW_PAWS_ERD.md`. This diagram shows all tables, their relationships, primary and foreign keys, and important attributes.

## Core Database Tables

### User Management

1. **`users`**
   - Central table storing all user accounts
   - Contains personal information, authentication details, and role information
   - Primary key: `id`
   - Key fields: `email`, `password`, `first_name`, `last_name`, `role`, `status`

2. **`admin_profiles`**
   - Stores additional information for admin users
   - Primary key: `id`
   - Foreign key: `user_id` references `users.id`

3. **`user_restrictions`**
   - Tracks restrictions placed on user accounts
   - Primary key: `id`
   - Foreign key: `user_id` references `users.id`

### Authentication and Security

1. **`otp_codes`**
   - Stores one-time password codes for user verification
   - Primary key: `id`
   - Foreign key: `user_id` references `users.id`

2. **`otp_attempts`**
   - Tracks attempts to generate or verify OTP codes
   - Used for rate limiting and security
   - Primary key: `id`
   - Foreign key: `user_id` references `users.id`

3. **`password_reset_tokens`**
   - Stores tokens for password reset requests
   - Primary key: `id`
   - Foreign key: `user_id` references `users.id`

### Pet Management

1. **`pets`**
   - Stores information about pets owned by fur parents
   - Primary key: `id`
   - Foreign key: `user_id` references `users.id`
   - Key fields: `name`, `species`, `breed`, `gender`, `age`, `weight`, `photo_path`

### Service Provider Management

1. **`service_providers`**
   - Stores information about businesses that provide pet services
   - Primary key: `id`
   - Foreign key: `user_id` references `users.id`
   - Key fields: `name`, `provider_type`, `address`, `application_status`

2. **`service_packages`**
   - Stores service packages offered by service providers
   - Primary key: `id`
   - Foreign key: `service_provider_id` references `service_providers.id`
   - Key fields: `name`, `description`, `category`, `cremation_type`, `price`

3. **`package_inclusions`**
   - Stores items included in service packages
   - Primary key: `id`
   - Foreign key: `package_id` references `service_packages.id`

4. **`package_addons`**
   - Stores optional add-ons available for service packages
   - Primary key: `id`
   - Foreign key: `package_id` references `service_packages.id`

5. **`package_images`**
   - Stores images associated with service packages
   - Primary key: `id`
   - Foreign key: `package_id` references `service_packages.id`

### Availability Management

1. **`provider_availability`**
   - Stores availability dates for service providers
   - Primary key: `id`
   - Foreign key: `provider_id` references `service_providers.id`

2. **`provider_time_slots`**
   - Stores specific time slots when providers are available
   - Primary key: `id`
   - Foreign key: `provider_id` references `service_providers.id`
   - Key fields: `date`, `start_time`, `end_time`, `available_services`

### Booking and Payment

1. **`service_bookings`**
   - Stores booking information for services requested by users
   - Primary key: `id`
   - Foreign keys:
     - `user_id` references `users.id`
     - `provider_id` references `service_providers.id`
     - `package_id` references `service_packages.id`
     - `pet_id` references `pets.id`
   - Key fields: `booking_date`, `booking_time`, `status`, `payment_method`, `delivery_option`, `price`

2. **`successful_bookings`**
   - Stores information about completed bookings
   - Primary key: `id`
   - Foreign keys:
     - `booking_id` references `service_bookings.id`
     - `service_package_id` references `service_packages.id`
     - `user_id` references `users.id`
     - `provider_id` references `service_providers.id`
   - Key fields: `transaction_amount`, `payment_date`, `payment_status`

### Notifications

1. **`notifications`**
   - Stores user notifications
   - Primary key: `id`
   - Foreign key: `user_id` references `users.id`

2. **`admin_notifications`**
   - Stores notifications for administrators
   - Primary key: `id`
   - Key fields: `type`, `title`, `message`, `entity_type`, `entity_id`

## Key User Journeys and Workflows

### 1. User Registration and Authentication

**Database Tables Involved**: `users`, `otp_codes`, `otp_attempts`

**Process Flow**:
1. User submits registration form with personal details
   - Data is stored in the `users` table with `is_verified` set to `0`
2. System generates an OTP code
   - OTP is stored in the `otp_codes` table with an expiration time
   - An entry is added to `otp_attempts` to track the generation attempt
3. User enters the OTP to verify their account
   - System validates the OTP against the `otp_codes` table
   - Updates `is_otp_verified` in the `users` table to `1` if valid
   - Records the verification attempt in `otp_attempts`
4. User can now access their dashboard based on their role

### 2. Pet Management

**Database Tables Involved**: `users`, `pets`

**Process Flow**:
1. Fur parent adds a new pet
   - Pet details are stored in the `pets` table with a reference to the user's ID
2. Fur parent can view, edit, or delete their pets
   - System retrieves or updates records in the `pets` table
3. When booking a service, the fur parent can select one of their pets
   - The selected pet's ID is associated with the booking

### 3. Service Provider Application and Verification

**Database Tables Involved**: `users`, `service_providers`, `admin_notifications`

**Process Flow**:
1. Business user registers and applies to be a service provider
   - User account is created in the `users` table with `role` set to `business`
   - Service provider details are stored in the `service_providers` table with `application_status` set to `pending`
   - An admin notification is created in the `admin_notifications` table
2. Admin reviews the application
   - Admin views the service provider details from the `service_providers` table
3. Admin approves or declines the application
   - Updates `application_status` in the `service_providers` table
   - A notification is sent to the business user (stored in `notifications`)

### 4. Service Package Management

**Database Tables Involved**: `service_providers`, `service_packages`, `package_inclusions`, `package_addons`, `package_images`

**Process Flow**:
1. Service provider creates a new service package
   - Package details are stored in the `service_packages` table
   - Inclusions are stored in the `package_inclusions` table
   - Add-ons are stored in the `package_addons` table
   - Images are stored in the `package_images` table
2. Service provider can update or deactivate packages
   - Updates the relevant records in the tables
3. Fur parents can browse and view service packages
   - System retrieves package details and related information from all tables

### 5. Availability Management

**Database Tables Involved**: `service_providers`, `provider_availability`, `provider_time_slots`

**Process Flow**:
1. Service provider sets available dates
   - Availability is stored in the `provider_availability` table
2. Service provider defines specific time slots for available dates
   - Time slots are stored in the `provider_time_slots` table
   - Available services for each time slot are stored as JSON in the `available_services` field
3. When booking, fur parents can only select from available dates and time slots
   - System checks the `provider_availability` and `provider_time_slots` tables

### 6. Booking Creation

**Database Tables Involved**: `users`, `pets`, `service_providers`, `service_packages`, `provider_time_slots`, `service_bookings`

**Process Flow**:
1. Fur parent selects a service provider and package
   - System retrieves data from `service_providers` and `service_packages`
2. Fur parent selects an available date and time slot
   - System validates against `provider_availability` and `provider_time_slots`
3. Fur parent provides pet information or selects an existing pet
   - If selecting an existing pet, system retrieves from `pets`
   - If providing new pet info, it's stored directly in the booking
4. Fur parent selects payment method and delivery option
   - Delivery fee is calculated based on distance and provider's rate
5. System creates the booking
   - All booking details are stored in the `service_bookings` table
   - Status is set to `pending`

### 7. Payment Processing

**Database Tables Involved**: `service_bookings`, `successful_bookings`

**Process Flow**:
1. For cash payments:
   - Booking is created with `payment_method` set to `cash`
   - Payment is collected upon service delivery
   - Service provider updates payment status
2. For GCash payments:
   - Booking is created with `payment_method` set to `gcash`
   - User completes payment through GCash
   - System records the payment
3. Once payment is confirmed:
   - Payment status is updated in the `service_bookings` table
   - For completed bookings, a record is created in `successful_bookings`

### 8. Booking Management

**Database Tables Involved**: `service_bookings`, `notifications`

**Process Flow**:
1. Service provider views pending bookings
   - System retrieves bookings from `service_bookings` with status `pending`
2. Service provider confirms or rejects bookings
   - Updates the `status` field in `service_bookings`
   - Creates notifications for the fur parent in the `notifications` table
3. Service provider updates booking status as it progresses
   - Updates from `confirmed` to `in_progress` to `completed`
4. Fur parent can view booking history and status
   - System retrieves all bookings associated with the user

## Detailed Implementation Aspects

### Authentication and Security

The authentication system in Rainbow Paws uses a multi-layered approach:

1. **Password Security**:
   - Passwords are hashed using bcrypt before storage in the `users` table
   - The system never stores plain-text passwords

2. **OTP Verification**:
   - One-time passwords are used for email verification
   - OTP codes are stored in the `otp_codes` table with expiration times
   - The `otp_attempts` table tracks attempts to prevent brute force attacks
   - Rate limiting is implemented (max 10 generation attempts and 15 verification attempts in 10 minutes)

3. **Password Reset**:
   - Secure tokens are generated and stored in the `password_reset_tokens` table
   - Tokens have expiration times and can only be used once

4. **Role-Based Access Control**:
   - The `role` field in the `users` table determines access levels
   - Three primary roles: `fur_parent`, `business`, and `admin`
   - API endpoints validate user roles before allowing access

### Data Validation and Integrity

1. **Foreign Key Constraints**:
   - Most tables have foreign key constraints with `ON DELETE CASCADE`
   - When a parent record is deleted, related child records are automatically deleted
   - This ensures referential integrity throughout the database

2. **Enum Fields**:
   - Several fields use enum types to restrict values to a predefined set
   - Examples: `status` in `service_bookings`, `role` in `users`, `provider_type` in `service_providers`

3. **Default Values**:
   - Many fields have sensible default values
   - Example: `is_verified` and `is_otp_verified` in `users` default to `0`

### Fallback Mechanisms

The system includes several fallback mechanisms to handle edge cases:

1. **Table Structure Flexibility**:
   - Code checks for the existence of tables and columns before operations
   - Alternative queries are used if expected structures aren't found
   - This allows for backward compatibility during database schema evolution

2. **Error Handling**:
   - Comprehensive error handling for database operations
   - Graceful fallbacks when database operations fail

### Performance Considerations

1. **Indexing**:
   - Primary keys are indexed by default
   - Foreign keys are indexed to improve JOIN performance
   - Additional indexes on frequently queried fields like `user_id`, `is_read`, `created_at`

2. **Query Optimization**:
   - JOINs are used efficiently to retrieve related data
   - WHERE clauses target indexed columns when possible

## Conclusion

The Rainbow Paws database system is designed to support all the key functionalities of the application, from user management and authentication to service booking and payment processing. The relationships between tables ensure data integrity while allowing for flexible and efficient data retrieval and manipulation.

The database structure follows best practices such as normalization, appropriate use of foreign keys, and consistent naming conventions, making it maintainable and scalable as the application grows.

By understanding the database structure and relationships, developers can efficiently work with the Rainbow Paws application, implement new features, and maintain existing functionality with confidence.
