# Rainbow Paws - Pet Memorial Services

![Rainbow Paws Logo](/public/logo.png)

## 1. System Overview

Rainbow Paws is a comprehensive web application designed to provide dignified and compassionate memorial services for beloved pet companions. The platform connects pet owners (fur parents) with service providers who offer various pet memorial services, primarily focusing on pet cremation services.

### Main Features

- **User Authentication**: Secure registration and login system with OTP verification
- **Pet Management**: Add and manage pet profiles with details and photos
- **Service Provider Directory**: Browse and search for pet memorial service providers
- **Service Packages**: View detailed information about available memorial service packages
- **Booking System**: Schedule and manage memorial service appointments
- **Payment Processing**: Support for multiple payment methods (Cash, GCash)
- **Delivery Options**: Choose between pickup or delivery of memorial items
- **Admin Dashboard**: Comprehensive management tools for administrators
- **Business Dashboard**: Tools for service providers to manage their services and bookings

## 2. Module Explanations

### 2.1 User Authentication Module

The authentication system provides secure access to the application with role-based permissions.

#### Registration Process
1. Users fill out the registration form with personal details
2. System validates the input and creates a new user account
3. A verification OTP is sent to the user's email
4. User enters the OTP to verify their account
5. Upon successful verification, the user can access their dashboard

#### Login Process
1. User enters email and password
2. System validates credentials and determines user role
3. User is redirected to the appropriate dashboard based on their role:
   - Fur Parent Dashboard for pet owners
   - Business Dashboard for service providers
   - Admin Dashboard for administrators

#### Password Recovery
1. User requests password reset via the "Forgot Password" link
2. System sends a password reset link to the user's email
3. User clicks the link and sets a new password
4. System confirms the password change

### 2.2 Pet Management Module

This module allows fur parents to manage information about their pets.

#### Features
- Add new pets with details (name, species, breed, age, gender, weight)
- Upload pet photos
- Add special notes about the pet
- View and edit pet information
- Associate pets with memorial service bookings

### 2.3 Service Provider Module

This module manages the service providers who offer pet memorial services.

#### Features
- Service provider profiles with detailed information
- Service package listings with descriptions and pricing
- Provider verification and approval system
- Provider ratings and reviews
- Location-based provider search

### 2.4 Booking System Module

The booking system facilitates scheduling memorial services for pets.

#### Booking Process
1. User selects a service provider
2. User chooses a specific service package
3. User selects date and time slot for the service
4. User provides pet information or selects from existing pets
5. User selects payment method and delivery option
6. System confirms the booking and sends confirmation details

#### Booking Management
- View booking history and status
- Cancel or reschedule bookings
- Add special requests to bookings
- Track booking status (pending, confirmed, in progress, completed)

### 2.5 Payment Processing Module

This module handles payment transactions for memorial services.

#### Payment Methods
- Cash payment (paid upon service delivery)
- GCash electronic payment

#### Payment Status Tracking
- Not Paid: Initial status for new bookings
- Partially Paid: When a partial payment has been made
- Paid: When full payment has been received

### 2.6 Admin Dashboard Module

The admin dashboard provides tools for system administrators to manage the application.

#### Features
- User management (view, verify, restrict users)
- Service provider approval and verification
- Booking oversight and management
- System statistics and reports
- Content management

## 3. User Flows

### 3.1 Registration and Login Flow

```
User → Registration Form → Email Verification → Dashboard Access
     ↘ Login Form → Authentication → Dashboard Access
```

### 3.2 Pet Memorial Service Booking Flow

```
Browse Providers → Select Provider → View Packages → Select Package
→ Choose Date/Time → Enter Pet Details → Select Payment Method
→ Confirm Booking → Receive Confirmation
```

### 3.3 Payment Processing Flow

For Cash Payments:
```
Booking Confirmed → Service Provided → Cash Payment → Update Payment Status
```

For GCash Payments:
```
Booking Confirmed → Process GCash Payment → Payment Verification → Update Payment Status
```

## 4. Technical Architecture

Rainbow Paws is built using a modern web application stack:

### Frontend
- **Framework**: Next.js 15.3.2
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Animations**: Framer Motion
- **Maps**: Leaflet with React Leaflet

### Backend
- **Runtime**: Node.js with Next.js API Routes
- **Database**: MySQL
- **Authentication**: JWT with cookie-based sessions
- **Email Service**: Nodemailer
- **File Storage**: Local file system with organized directory structure

### Deployment
- **Hosting**: Any Node.js compatible hosting service
- **Database**: MySQL database server
- **Static Assets**: Served through Next.js static file handling

## 5. Database Schema

The Rainbow Paws application uses a relational database with the following core tables:

### Core Tables

#### users
- `id` (PK): Unique identifier
- `email`: User's email address (unique)
- `password`: Hashed password
- `first_name`: User's first name
- `last_name`: User's last name
- `phone_number`: Contact phone number
- `address`: Physical address
- `sex`: User's gender
- `role`: User role (fur_parent, business, admin)
- `is_verified`: Account verification status
- `is_otp_verified`: OTP verification status
- `status`: Account status (active, inactive, suspended)
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp

#### pets
- `id` (PK): Unique identifier
- `user_id` (FK): Reference to users table
- `name`: Pet's name
- `species`: Type of animal
- `breed`: Specific breed
- `gender`: Pet's gender
- `age`: Pet's age
- `weight`: Pet's weight
- `photo_path`: Path to pet's photo
- `special_notes`: Additional information
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

#### service_providers
- `id` (PK): Unique identifier
- `user_id` (FK): Reference to users table
- `name`: Business name
- `description`: Business description
- `address`: Business address
- `city`: Business city
- `phone`: Contact phone
- `email`: Business email
- `verification_status`: Verification status
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

#### service_packages
- `id` (PK): Unique identifier
- `provider_id` (FK): Reference to service_providers table
- `name`: Package name
- `description`: Package description
- `category`: Service category
- `cremation_type`: Type of cremation service
- `processing_time`: Estimated processing time
- `price`: Package price
- `conditions`: Terms and conditions
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

#### service_bookings
- `id` (PK): Unique identifier
- `user_id` (FK): Reference to users table
- `provider_id` (FK): Reference to service_providers table
- `package_id` (FK): Reference to service_packages table
- `pet_id` (FK): Reference to pets table
- `booking_date`: Service date
- `booking_time`: Service time
- `status`: Booking status
- `payment_method`: Payment method
- `payment_status`: Payment status
- `special_requests`: Special instructions
- `total_amount`: Total booking amount
- `created_at`: Booking creation timestamp
- `updated_at`: Last update timestamp

## 6. Entity Relationship Diagram (ERD)

```
+-------------+       +----------------+       +-------------------+
|    users    |       |      pets      |       | service_providers |
+-------------+       +----------------+       +-------------------+
| id (PK)     |<----->| id (PK)        |       | id (PK)           |
| email       |       | user_id (FK)   |       | user_id (FK)      |
| password    |       | name           |       | name              |
| first_name  |       | species        |       | description       |
| last_name   |       | breed          |       | address           |
| role        |       | gender         |       | verification_status|
| ...         |       | ...            |       | ...               |
+-------------+       +----------------+       +-------------------+
      ^                                                 ^
      |                                                 |
      |                                                 |
      v                                                 v
+------------------+                          +-------------------+
| service_bookings |<------------------------->| service_packages |
+------------------+                          +-------------------+
| id (PK)          |                          | id (PK)           |
| user_id (FK)     |                          | provider_id (FK)  |
| provider_id (FK) |                          | name              |
| package_id (FK)  |                          | description       |
| pet_id (FK)      |                          | price             |
| booking_date     |                          | ...               |
| status           |                          |                   |
| payment_status   |                          |                   |
| ...              |                          |                   |
+------------------+                          +-------------------+
```

## 7. Authentication and Authorization

### Authentication Mechanisms

Rainbow Paws uses a secure authentication system with the following components:

1. **Password Hashing**: Passwords are hashed using bcrypt before storage
2. **Token-based Authentication**: User sessions are managed via secure cookies
3. **OTP Verification**: One-time passwords for email verification
4. **Password Reset**: Secure token-based password reset functionality

### Authorization Levels

The application implements role-based access control with three primary roles:

1. **Fur Parent (user)**: Regular users who can book services
2. **Business (business)**: Service providers who offer memorial services
3. **Admin (admin)**: System administrators with full access

Access to routes and features is controlled through middleware that validates the user's role and permissions.

## 8. API Endpoints

### Authentication Endpoints

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Authenticate a user
- `POST /api/auth/logout`: End a user session
- `POST /api/auth/forgot-password`: Request password reset
- `POST /api/auth/reset-password`: Reset user password
- `GET /api/auth/check`: Verify authentication status
- `POST /api/auth/otp/generate`: Generate OTP for verification
- `POST /api/auth/otp/verify`: Verify OTP code

### User Endpoints

- `GET /api/users`: Get list of users (admin only)
- `GET /api/users/:id`: Get user details
- `PUT /api/users/:id`: Update user information
- `POST /api/admin/users/verify`: Verify a user (admin only)
- `POST /api/admin/users/restrict`: Restrict a user (admin only)

### Pet Endpoints

- `GET /api/pets`: Get user's pets
- `POST /api/pets`: Create a new pet
- `GET /api/pets/:id`: Get pet details
- `PUT /api/pets/:id`: Update pet information
- `DELETE /api/pets/:id`: Delete a pet

### Service Provider Endpoints

- `GET /api/service-providers`: Get list of service providers
- `GET /api/service-providers/:id`: Get provider details
- `POST /api/service-providers`: Create a new provider (admin only)
- `PUT /api/service-providers/:id`: Update provider information

### Service Package Endpoints

- `GET /api/packages`: Get list of service packages
- `GET /api/packages/:id`: Get package details
- `POST /api/packages`: Create a new package (business only)
- `PUT /api/packages/:id`: Update package information (business only)

### Booking Endpoints

- `GET /api/bookings`: Get user's bookings
- `POST /api/bookings`: Create a new booking
- `GET /api/bookings/:id`: Get booking details
- `PUT /api/bookings/:id`: Update booking information
- `PUT /api/bookings/:id/status`: Update booking status
- `PUT /api/cremation/bookings/:id/payment`: Update payment status

## 9. Deployment Instructions

### Prerequisites

- Node.js (version 18.18.0 or higher)
- MySQL Server (version 5.7 or higher)
- npm or yarn package manager

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd app_rainbowpaws
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   npm run setup
   ```
   This will create an `.env.local` file with the necessary environment variables.

4. **Set up the database**:
   - Create a MySQL database named `rainbow_paws`
   - The application will automatically create the required tables

5. **Build the application**:
   ```bash
   npm run build
   ```

6. **Start the production server**:
   ```bash
   npm start
   ```

7. **Access the application**:
   Open your browser and navigate to `http://localhost:3000` (or the configured port)

## 10. Troubleshooting Common Issues

### Database Connection Issues

**Problem**: Unable to connect to the database
**Solution**:
- Verify MySQL server is running
- Check database credentials in `.env.local`
- Ensure the database exists
- Verify network connectivity to the database server
- Check if the MySQL port (3306) is accessible

### Authentication Problems

**Problem**: Unable to log in or register
**Solution**:
- Clear browser cookies and try again
- Verify email address is correct
- Check for proper OTP verification
- Reset password if necessary
- Ensure account is not restricted or suspended

### Image Upload Issues

**Problem**: Images not displaying or upload failing
**Solution**:
- Verify upload directory permissions
- Check file size limits
- Ensure proper file formats are used (JPG, PNG)
- Verify image paths in the database
- Check if the image directories exist and are writable

### Email Sending Problems

**Problem**: Verification emails not being received
**Solution**:
- Check SMTP configuration in `.env.local`
- Verify email address is correct
- Check spam/junk folders
- In development, check console logs for email content
- Test SMTP connection using a diagnostic tool

### Booking System Issues

**Problem**: Unable to create or manage bookings
**Solution**:
- Verify user authentication
- Check if service provider is verified
- Ensure all required booking fields are completed
- Verify date/time slot availability
- Check for conflicts with existing bookings

## 11. Defending Your Project

When presenting Rainbow Paws to a panel, focus on these key aspects:

### System Architecture Strengths

1. **Modular Design**: The application is built with a clear separation of concerns, making it easy to maintain and extend.

2. **Security Implementation**: Highlight the comprehensive security measures:
   - Password hashing with bcrypt
   - OTP verification for account security
   - Token-based authentication
   - Role-based access control

3. **Database Design**: Explain how the relational database schema efficiently models the domain with proper relationships and constraints.

4. **Scalability Considerations**: Discuss how the application can scale:
   - Connection pooling for database efficiency
   - Stateless authentication for horizontal scaling
   - Image storage organization for growth

### Technical Implementation Highlights

1. **Authentication Flow**: Explain the complete user journey from registration through verification to secure login.

2. **Booking Process**: Demonstrate the end-to-end booking process, highlighting the user experience and backend validation.

3. **Payment Handling**: Explain how different payment methods are processed and tracked.

4. **Error Handling**: Showcase the robust error handling throughout the application, providing clear feedback to users.

### Business Value

1. **Meeting User Needs**: Explain how the application addresses the emotional and practical needs of pet owners during difficult times.

2. **Provider Benefits**: Highlight how the platform helps memorial service providers manage their business and connect with clients.

3. **Market Opportunity**: Discuss the growing market for pet memorial services and how the application fills a gap.

4. **Future Expansion**: Share ideas for future features and improvements based on user feedback and market trends.

### Demonstration Tips

1. Prepare a script that covers all major features
2. Have test accounts ready for different user roles
3. Prepare examples that showcase error handling
4. Be ready to explain any technical decisions
5. Know the database schema well enough to explain relationships
6. Practice explaining the authentication and authorization mechanisms
7. Be prepared to discuss security measures in detail

Remember to emphasize both the technical excellence and the human-centered design of the application, showing how it solves real problems for users during a sensitive time in their lives.
