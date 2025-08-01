<div align="center">
  <img width="200" height="600" alt="logo" src="https://github.com/user-attachments/assets/769e4e6c-f22d-455a-9a3e-49b8b860f4f4" />
</div>


# Rainbow Paws Application

A comprehensive Next.js application for pet memorial services, connecting pet owners with cremation service providers.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Email Configuration](#email-configuration)
- [Available Scripts](#available-scripts)
- [Data Flow Diagram](#data-flow-diagram)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [File Organization](#file-organization)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Learn More](#learn-more)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Recent Updates](#recent-updates-2025-07-07)

## Overview

Rainbow Paws is a full-featured web application that facilitates pet memorial services by connecting pet owners (fur parents) with cremation service providers. The platform offers booking management, payment processing, notifications, and comprehensive dashboards for all user types.

## Features

### For Pet Owners (Fur Parents)
- Pet profile management with photos and details
- Service booking with real-time availability
- Secure payment processing (GCash, PayMaya, Card)
- SMS and email notifications
- Booking history and status tracking
- Review and rating system
- Interactive maps for service locations

### For Service Providers (Cremation Businesses)
- Business profile and document management
- Service package creation and management
- Availability and time slot management
- Revenue analytics and reporting
- Real-time booking notifications
- Booking status management
- Refund processing

### For Administrators
- User and business management
- Business application approval workflow
- System analytics and monitoring
- Platform configuration
- Payment and refund oversight

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, Node.js
- **Database**: MySQL with connection pooling
- **Authentication**: JWT with secure HTTP-only cookies
- **Payment**: PayMongo integration
- **Notifications**: Twilio SMS, Nodemailer
- **Maps**: Leaflet with React-Leaflet
- **Validation**: Custom validation with TypeScript
- **Caching**: Client-side localStorage for geocoding/routing
- **Rate Limiting**: Database-based request limiting
- **State Management**: React Context API

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOBILE[Mobile Browser]
        CACHE_CLIENT[localStorage Cache]
    end

    subgraph "Application Layer"
        NEXTJS[Next.js Application]
        API[API Routes]
        AUTH[Authentication]
        MIDDLEWARE[Middleware]
        RATE_LIMIT[Rate Limiting]
    end

    subgraph "Service Layer"
        EMAIL_QUEUE[Email Queue Service]
        EMAIL_LOG[Email Logging]
        SMS[SMS Service]
        PAYMENT[Payment Service]
        UPLOAD[File Upload Service]
        NOTIFICATION[Notification Service]
        SSE[Server-Sent Events]
        HEALTH[Health Check Service]
    end

    subgraph "Business Logic Layer"
        APPEAL[Appeal Management]
        REVIEW[Review System]
        AVAILABILITY[Availability Management]
        DOCUMENT[Document Verification]
        ADMIN_LOG[Admin Audit Trail]
    end

    subgraph "Data Layer"
        DB[(MySQL Database)]
        FILES[Local File Storage]
        RATE_DB[Rate Limit Storage]
        EMAIL_DB[Email Queue Storage]
    end

    subgraph "External Services"
        TWILIO[Twilio SMS]
        PAYMONGO[PayMongo]
        SMTP[SMTP Server]
    end

    WEB --> NEXTJS
    MOBILE --> NEXTJS
    WEB --> CACHE_CLIENT
    MOBILE --> CACHE_CLIENT

    NEXTJS --> API
    API --> AUTH
    API --> MIDDLEWARE
    API --> RATE_LIMIT

    API --> EMAIL_QUEUE
    API --> SMS
    API --> PAYMENT
    API --> UPLOAD
    API --> NOTIFICATION
    API --> SSE
    API --> HEALTH

    API --> APPEAL
    API --> REVIEW
    API --> AVAILABILITY
    API --> DOCUMENT
    API --> ADMIN_LOG

    EMAIL_QUEUE --> EMAIL_LOG
    EMAIL_QUEUE --> SMTP
    SMS --> TWILIO
    PAYMENT --> PAYMONGO
    NOTIFICATION --> SSE

    API --> DB
    UPLOAD --> FILES
    RATE_LIMIT --> RATE_DB
    EMAIL_QUEUE --> EMAIL_DB

    APPEAL --> DB
    REVIEW --> DB
    AVAILABILITY --> DB
    DOCUMENT --> DB
    ADMIN_LOG --> DB

    style NEXTJS fill:#0070f3
    style DB fill:#4479a1
    style TWILIO fill:#f22f46
    style PAYMONGO fill:#00d4aa
    style EMAIL_QUEUE fill:#ff9800
    style SSE fill:#9c27b0
```

## Prerequisites

Before running the application, ensure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager (included with Node.js)
- **MySQL** database server (v8.0 or higher)
- **XAMPP** (recommended for local development) - [Download here](https://www.apachefriends.org/) or standalone MySQL

## Installation & Setup

### 1. Clone the Repository
```bash
# Replace 'Justin322322' with your actual GitHub username if you forked it
git clone https://github.com/Justin322322/RAINBOWPAWZ.git
cd RAINBOWPAWZ
```

> **Note**: If you downloaded this as a ZIP file, extract it and navigate to the extracted folder instead.

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
Start your MySQL server (XAMPP recommended for local development):
- Start Apache and MySQL in XAMPP Control Panel
- Create a database named `rainbow_paws`
- The application will automatically create tables on first run

### 4. Environment Configuration
Create a `.env.local` file in the root directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rainbow_paws

# Application Configuration
PORT=3001
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3001

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-key-here-minimum-32-characters

# Email Configuration (Optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=no-reply@rainbowpaws.com
DEV_EMAIL_MODE=true

# SMS Configuration (Optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Payment Configuration (Optional)
PAYMONGO_SECRET_KEY=your-paymongo-secret-key
```

## Database Setup

### Database Schema (ERD)

The Rainbow Paws application uses a comprehensive MySQL database schema designed to handle all aspects of pet memorial services. The database has been optimized and cleaned of any corrupted data. Below is the Entity Relationship Diagram showing the complete database structure:

```mermaid
erDiagram
    users {
        int user_id PK
        varchar email UK
        varchar password
        varchar first_name
        varchar last_name
        varchar phone
        text address
        enum gender
        varchar profile_picture
        enum role
        enum status
        enum restriction_status
        boolean is_verified
        boolean is_otp_verified
        timestamp last_login
        timestamp created_at
        timestamp updated_at
        boolean sms_notifications
        boolean email_notifications
    }

    admin_profiles {
        int id PK
        int user_id FK
        varchar username
        varchar full_name
        varchar admin_role
        timestamp created_at
        timestamp updated_at
    }

    service_providers {
        int provider_id PK
        int user_id FK
        varchar name
        enum provider_type
        enum business_entity_type
        varchar contact_first_name
        varchar contact_last_name
        varchar phone
        text address
        text hours
        text description
        enum application_status
        timestamp verification_date
        text verification_notes
        varchar bir_certificate_path
        varchar business_permit_path
        varchar government_id_path
        int active_service_count
        timestamp created_at
        timestamp updated_at
    }

    service_packages {
        int package_id PK
        int provider_id FK
        varchar name
        text description
        enum category
        enum cremation_type
        varchar processing_time
        decimal price
        decimal delivery_fee_per_km
        text conditions
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    package_inclusions {
        int inclusion_id PK
        int package_id FK
        varchar description
        timestamp created_at
    }

    package_addons {
        int addon_id PK
        int package_id FK
        varchar description
        decimal price
        timestamp created_at
    }

    package_images {
        int image_id PK
        int package_id FK
        varchar image_path
        int display_order
        timestamp created_at
    }

    pets {
        int pet_id PK
        int user_id FK
        varchar name
        varchar species
        varchar breed
        enum gender
        varchar age
        decimal weight
        varchar photo_path
        text special_notes
        timestamp created_at
        timestamp updated_at
    }

    service_bookings {
        int id PK
        int user_id FK
        int provider_id FK
        int package_id FK
        int service_type_id FK
        varchar pet_name
        varchar pet_type
        text cause_of_death
        varchar pet_image_url
        date booking_date
        time booking_time
        enum status
        text special_requests
        varchar payment_method
        enum payment_status
        int refund_id FK
        enum delivery_option
        text delivery_address
        float delivery_distance
        decimal delivery_fee
        decimal price
        timestamp created_at
        timestamp updated_at
    }

    payment_transactions {
        int id PK
        int booking_id FK
        varchar payment_intent_id
        varchar source_id
        decimal amount
        varchar currency
        enum payment_method
        enum status
        int refund_id FK
        timestamp refunded_at
        enum provider
        varchar provider_transaction_id
        text checkout_url
        text return_url
        text failure_reason
        json metadata
        timestamp created_at
        timestamp updated_at
    }

    notifications {
        int id PK
        int user_id FK
        varchar title
        text message
        enum type
        boolean is_read
        varchar link
        timestamp created_at
    }

    otp_codes {
        int id PK
        int user_id FK
        varchar otp_code
        datetime expires_at
        boolean is_used
        timestamp used_at
        timestamp created_at
    }

    otp_attempts {
        int id PK
        int user_id FK
        enum attempt_type
        varchar ip_address
        timestamp attempt_time
    }

    password_reset_tokens {
        int id PK
        int user_id FK
        varchar token UK
        timestamp created_at
        datetime expires_at
        boolean is_used
    }

    user_restrictions {
        int restriction_id PK
        int user_id FK
        text reason
        timestamp restriction_date
        varchar duration
        int report_count
        boolean is_active
    }

    user_appeals {
        int appeal_id PK
        int user_id FK
        int admin_id FK
        enum user_type
        int business_id FK
        enum appeal_type
        varchar subject
        text message
        json evidence_files
        enum status
        text admin_response
        timestamp submitted_at
        timestamp reviewed_at
        timestamp resolved_at
        timestamp created_at
        timestamp updated_at
    }

    appeal_history {
        int history_id PK
        int appeal_id FK
        int admin_id FK
        enum previous_status
        enum new_status
        text admin_response
        timestamp changed_at
        text notes
    }

    refunds {
        int id PK
        int booking_id FK
        int processed_by FK
        decimal amount
        text reason
        enum status
        varchar payment_method
        varchar transaction_id
        text notes
        timestamp created_at
        timestamp updated_at
    }

    service_types {
        int id PK
        varchar name
        text description
        enum category
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    admin_logs {
        int id PK
        int admin_id FK
        varchar action
        varchar entity_type
        int entity_id
        text details
        varchar ip_address
        timestamp created_at
    }

    admin_notifications {
        int id PK
        varchar type
        varchar title
        text message
        varchar entity_type
        int entity_id
        boolean is_read
        timestamp created_at
    }

    business_notifications {
        int id PK
        int user_id FK
        varchar title
        text message
        enum type
        boolean is_read
        varchar link
        timestamp created_at
    }

    business_custom_options {
        int id PK
        int provider_id FK
        enum option_type
        varchar option_value
        boolean is_active
        timestamp created_at
    }

    business_pet_types {
        int id PK
        int provider_id FK
        varchar pet_type
        boolean is_active
        timestamp created_at
    }

    package_size_pricing {
        int id PK
        int package_id FK
        enum size_category
        decimal weight_range_min
        decimal weight_range_max
        decimal price
        timestamp created_at
    }

    provider_availability {
        int id PK
        int provider_id FK
        date date
        boolean is_available
        timestamp created_at
        timestamp updated_at
    }

    provider_time_slots {
        int id PK
        int provider_id FK
        date date
        time start_time
        time end_time
        boolean is_available
        int booking_id FK
        timestamp created_at
    }

    reviews {
        int id PK
        int user_id FK
        int service_provider_id FK
        int booking_id FK
        int rating
        text comment
        timestamp created_at
        timestamp expires_at
    }

    email_queue {
        int id PK
        varchar to_email
        varchar subject
        text html
        text text
        enum status
        int retry_count
        timestamp scheduled_at
        timestamp sent_at
        timestamp created_at
    }

    email_log {
        int id PK
        varchar recipient
        varchar subject
        varchar message_id
        timestamp sent_at
    }

    rate_limits {
        int id PK
        varchar identifier
        varchar action
        int request_count
        timestamp window_start
        timestamp updated_at
    }

    %% Relationships - All foreign key constraints
    users ||--o{ admin_profiles : "has"
    users ||--o{ service_providers : "has"
    users ||--o{ pets : "owns"
    users ||--o{ notifications : "receives"
    users ||--o{ otp_codes : "has"
    users ||--o{ otp_attempts : "has"
    users ||--o{ password_reset_tokens : "has"
    users ||--o{ user_restrictions : "has"
    users ||--o{ user_appeals : "submits"
    users ||--o{ appeal_history : "processes"
    users ||--o{ service_bookings : "makes"
    users ||--o{ refunds : "processes"
    users ||--o{ business_notifications : "receives"
    users ||--o{ reviews : "writes"

    service_providers ||--o{ service_packages : "offers"
    service_providers ||--o{ service_bookings : "receives"
    service_providers ||--o{ business_custom_options : "configures"
    service_providers ||--o{ business_pet_types : "supports"
    service_providers ||--o{ provider_availability : "manages"
    service_providers ||--o{ provider_time_slots : "schedules"
    service_providers ||--o{ reviews : "receives"

    service_packages ||--o{ package_inclusions : "includes"
    service_packages ||--o{ package_addons : "has"
    service_packages ||--o{ package_images : "has"
    service_packages ||--o{ service_bookings : "booked_as"
    service_packages ||--o{ package_size_pricing : "has_pricing"

    service_types ||--o{ service_bookings : "categorizes"

    service_bookings ||--o{ payment_transactions : "has"
    service_bookings ||--o{ refunds : "may_have"
    service_bookings ||--o{ reviews : "generates"
    service_bookings ||--o{ provider_time_slots : "reserves"

    user_appeals ||--o{ appeal_history : "tracks"

    admin_profiles ||--o{ admin_logs : "creates"
```

### Key Database Features

#### Core Entities (with Foreign Key Relationships)
- **Users**: Central user management with role-based access (fur_parent, business, admin)
- **Service Providers**: Cremation businesses with verification workflow (linked to users)
- **Service Packages**: Customizable service offerings with pricing and inclusions (linked to providers)
- **Pets**: Pet profiles with detailed information and photos (linked to users)
- **Service Bookings**: Main booking system connecting users, providers, and packages
- **Payment Transactions**: Payment processing system (linked to service_bookings)
- **User Appeals**: Appeal system for restricted users (linked to users and admins)
- **Appeal History**: Tracking of appeal status changes (linked to appeals and admins)
- **Refunds**: Refund management system (linked to bookings and admin users)

#### Security & Authentication
- **OTP System**: Secure email verification with attempt tracking
- **Password Reset**: Token-based password recovery
- **Rate Limiting**: API protection against abuse
- **User Restrictions**: Admin-controlled user access management

#### Payment & Financial
- **Payment Transactions**: Complete payment processing with PayMongo integration
- **Refunds**: Automated refund processing with admin oversight
- **Multiple Payment Methods**: Support for GCash, PayMaya, and card payments

#### Communication & Notifications
- **Email System**: Queue-based email delivery with logging
- **Notifications**: Real-time user notifications with read status
- **Admin Notifications**: Separate notification system for administrators
- **Admin Logs**: Comprehensive audit trail for all admin actions

#### Business Logic
- **Provider Availability**: Calendar-based availability management
- **Time Slots**: Detailed scheduling with service-specific availability
- **Reviews**: Rating system with expiration dates
- **Package Management**: Flexible service packages with addons and images

#### Additional Database Features

**Operational & Logging Tables (Now Included in ERD):**
- **Admin Logs**: Comprehensive audit trail for all admin actions
- **Admin Notifications**: Admin-specific notification system
- **Business Notifications**: Business-specific notifications with read status
- **Email Queue/Log**: Sophisticated email delivery and tracking system
- **Rate Limits**: Database-based API rate limiting protection
- **Reviews**: Customer feedback and rating system with expiration
- **Provider Availability/Time Slots**: Detailed scheduling and availability management
- **Migration History**: Database migration tracking and rollback support

**Business Configuration Tables:**
- **Business Custom Options**: Flexible business configuration system
- **Business Pet Types**: Pet types supported by each business
- **Package Size Pricing**: Size-based pricing for service packages
- **Service Types**: Categorization of different service offerings

**Enhanced Features:**
- **Email Queue System**: Reliable email delivery with retry logic and status tracking
- **Rate Limiting**: Prevents API abuse with configurable limits per user/action
- **Appeal System**: Complete workflow for user appeals and admin responses
- **Review System**: Time-limited reviews with rating aggregation
- **Availability Management**: Complex scheduling system for service providers
- **Document Verification**: Business document upload and verification workflow

### Automatic Setup (Recommended)
The application automatically creates necessary database tables on first run. The included SQL file has been cleaned and optimized for production use. Simply:

1. Ensure MySQL is running
2. Create an empty database named `rainbow_paws`
3. Import the provided `rainbow_paws.sql` file, or
4. Start the application - tables will be created automatically

**Note**: The database has been cleaned of corrupted data and optimized for performance.

### Manual Setup (Advanced)
If you prefer manual setup, run the migration scripts in `src/lib/migrations/`:

```bash
# Navigate to migrations directory
cd src/lib/migrations

# Run migration script
node run_migrations.js
```

## Running the Application

### Development Mode
```bash
npm run dev
```
The application will be available at `http://localhost:3001` (or your configured PORT)

### Production Mode
```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Custom Port
```bash
# Development with custom port
npx next dev -p 3005

# Production with custom port
npm run build
npx next start -p 3005
```

## Email Configuration

### Development Mode (Default)
- `DEV_EMAIL_MODE=true` - Emails are logged to console instead of being sent
- No SMTP credentials required
- OTP codes and reset tokens are displayed in server logs

### Production Mode
- `DEV_EMAIL_MODE=false` - Real emails are sent
- Requires valid SMTP credentials
- Supports Gmail, Outlook, and custom SMTP servers

### Gmail Setup
1. Enable 2-factor authentication in your [Google Account Security](https://myaccount.google.com/security)
2. Generate an [App Password](https://support.google.com/accounts/answer/185833)
3. Use the App Password as `SMTP_PASS` in your `.env.local` file

> **Note**: Regular Gmail passwords won't work for SMTP. You must use an App Password.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build optimized production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint code quality checks |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run lint:unused` | Check for unused imports |
| `npm run lint:unused:fix` | Remove unused imports |
| `npm run type-check` | Run TypeScript type checking |
| `npm run clean` | Clean build artifacts |
| `npm run clean:all` | Full cleanup including node_modules |
| `npm run spring-clean` | Complete cleanup with linting and type checking |

### Version Management Scripts
| Script | Description |
|--------|-------------|
| `npm version patch` | Increment patch version (e.g., 1.0.0 → 1.0.1) |
| `npm version minor` | Increment minor version (e.g., 1.0.0 → 1.1.0) |
| `npm version major` | Increment major version (e.g., 1.0.0 → 2.0.0) |

## Data Flow Diagram

The following Data Flow Diagram illustrates how data flows through the Rainbow Paws application across different layers and components:

```mermaid
flowchart TD
    subgraph "External Actors"
        FP[Fur Parents]
        SP[Service Providers]
        AD[Administrators]
        GU[Guest Users]
    end

    subgraph "User Interface Layer"
        WEB[Web Application]
        AUTH_UI[Authentication Pages]
        DASH[User Dashboard]
        ADMIN_UI[Admin Dashboard]
        BOOKING_UI[Booking Interface]
        PAYMENT_UI[Payment Interface]
        BUSINESS_UI[Business Dashboard]
    end

    subgraph "API Gateway Layer"
        API_ROUTER[API Router]
        AUTH_MW[Auth Middleware]
        RATE_LIMIT[Rate Limiter]
        VALIDATOR[Request Validator]
        HEALTH_CHECK[Health Check]
    end

    subgraph "Business Logic Layer"
        AUTH_SVC[Authentication Service]
        USER_SVC[User Management Service]
        PET_SVC[Pet Management Service]
        BOOKING_SVC[Booking Service]
        PAYMENT_SVC[Payment Service]
        NOTIFICATION_SVC[Notification Service]
        ADMIN_SVC[Admin Service]
        FILE_SVC[File Upload Service]
        EMAIL_QUEUE_SVC[Email Queue Service]
        APPEAL_SVC[Appeal Management Service]
        REVIEW_SVC[Review System Service]
        AVAILABILITY_SVC[Availability Management]
        DOCUMENT_SVC[Document Verification]
    end

    subgraph "Data Access Layer"
        USER_REPO[User Repository]
        PET_REPO[Pet Repository]
        BOOKING_REPO[Booking Repository]
        PAYMENT_REPO[Payment Repository]
        PROVIDER_REPO[Provider Repository]
        NOTIFICATION_REPO[Notification Repository]
        EMAIL_REPO[Email Repository]
        ADMIN_REPO[Admin Repository]
        REVIEW_REPO[Review Repository]
        RATE_LIMIT_REPO[Rate Limit Repository]
    end

    subgraph "Database Layer"
        MYSQL[(MySQL Database)]
        LOCAL_CACHE[Client-side Cache]
    end

    subgraph "External Services"
        PAYMONGO[PayMongo API]
        TWILIO[Twilio SMS]
        SMTP[SMTP Server]
        LOCAL_STORAGE[Local File Storage]
    end

    subgraph "Data Stores"
        USER_DATA[User Data]
        PET_DATA[Pet Profiles]
        BOOKING_DATA[Booking Records]
        PAYMENT_DATA[Payment Transactions]
        PROVIDER_DATA[Service Providers]
        NOTIFICATION_DATA[Notifications]
        FILE_DATA[Uploaded Files]
        EMAIL_DATA[Email Queue & Logs]
        ADMIN_DATA[Admin Logs & Appeals]
        REVIEW_DATA[Reviews & Ratings]
        RATE_LIMIT_DATA[Rate Limiting Data]
    end

    %% External Actors to UI
    FP --> WEB
    SP --> BUSINESS_UI
    AD --> ADMIN_UI
    GU --> AUTH_UI

    %% UI Layer to API Gateway
    WEB --> API_ROUTER
    AUTH_UI --> API_ROUTER
    DASH --> API_ROUTER
    ADMIN_UI --> API_ROUTER
    BOOKING_UI --> API_ROUTER
    PAYMENT_UI --> API_ROUTER
    BUSINESS_UI --> API_ROUTER

    %% API Gateway Processing
    API_ROUTER --> AUTH_MW
    AUTH_MW --> RATE_LIMIT
    RATE_LIMIT --> VALIDATOR
    API_ROUTER --> HEALTH_CHECK

    %% API Gateway to Business Logic
    VALIDATOR --> AUTH_SVC
    VALIDATOR --> USER_SVC
    VALIDATOR --> PET_SVC
    VALIDATOR --> BOOKING_SVC
    VALIDATOR --> PAYMENT_SVC
    VALIDATOR --> NOTIFICATION_SVC
    VALIDATOR --> ADMIN_SVC
    VALIDATOR --> FILE_SVC
    VALIDATOR --> EMAIL_QUEUE_SVC
    VALIDATOR --> APPEAL_SVC
    VALIDATOR --> REVIEW_SVC
    VALIDATOR --> AVAILABILITY_SVC
    VALIDATOR --> DOCUMENT_SVC

    %% Business Logic to Data Access
    AUTH_SVC --> USER_REPO
    USER_SVC --> USER_REPO
    PET_SVC --> PET_REPO
    BOOKING_SVC --> BOOKING_REPO
    BOOKING_SVC --> PROVIDER_REPO
    PAYMENT_SVC --> PAYMENT_REPO
    NOTIFICATION_SVC --> NOTIFICATION_REPO
    ADMIN_SVC --> USER_REPO
    ADMIN_SVC --> BOOKING_REPO
    ADMIN_SVC --> ADMIN_REPO
    FILE_SVC --> LOCAL_STORAGE
    EMAIL_QUEUE_SVC --> EMAIL_REPO
    APPEAL_SVC --> USER_REPO
    REVIEW_SVC --> REVIEW_REPO
    AVAILABILITY_SVC --> PROVIDER_REPO
    DOCUMENT_SVC --> PROVIDER_REPO
    RATE_LIMIT --> RATE_LIMIT_REPO

    %% Data Access to Database
    USER_REPO --> MYSQL
    PET_REPO --> MYSQL
    BOOKING_REPO --> MYSQL
    PAYMENT_REPO --> MYSQL
    PROVIDER_REPO --> MYSQL
    NOTIFICATION_REPO --> MYSQL
    EMAIL_REPO --> MYSQL
    ADMIN_REPO --> MYSQL
    REVIEW_REPO --> MYSQL
    RATE_LIMIT_REPO --> MYSQL

    %% Client-side Cache Integration
    WEB --> LOCAL_CACHE
    BUSINESS_UI --> LOCAL_CACHE

    %% External Service Integration
    PAYMENT_SVC --> PAYMONGO
    NOTIFICATION_SVC --> TWILIO
    EMAIL_QUEUE_SVC --> SMTP

    %% Database to Data Stores
    MYSQL --> USER_DATA
    MYSQL --> PET_DATA
    MYSQL --> BOOKING_DATA
    MYSQL --> PAYMENT_DATA
    MYSQL --> PROVIDER_DATA
    MYSQL --> NOTIFICATION_DATA
    MYSQL --> EMAIL_DATA
    MYSQL --> ADMIN_DATA
    MYSQL --> REVIEW_DATA
    MYSQL --> RATE_LIMIT_DATA
    LOCAL_STORAGE --> FILE_DATA

    %% Data Flow Styling
    classDef userLayer fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef apiLayer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef businessLayer fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef dataLayer fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef externalLayer fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    classDef storageLayer fill:#f1f8e9,stroke:#33691e,stroke-width:2px

    class WEB,AUTH_UI,DASH,ADMIN_UI,BOOKING_UI,PAYMENT_UI,BUSINESS_UI userLayer
    class API_ROUTER,AUTH_MW,RATE_LIMIT,VALIDATOR,HEALTH_CHECK apiLayer
    class AUTH_SVC,USER_SVC,PET_SVC,BOOKING_SVC,PAYMENT_SVC,NOTIFICATION_SVC,ADMIN_SVC,FILE_SVC,EMAIL_QUEUE_SVC,APPEAL_SVC,REVIEW_SVC,AVAILABILITY_SVC,DOCUMENT_SVC businessLayer
    class USER_REPO,PET_REPO,BOOKING_REPO,PAYMENT_REPO,PROVIDER_REPO,NOTIFICATION_REPO,EMAIL_REPO,ADMIN_REPO,REVIEW_REPO,RATE_LIMIT_REPO,MYSQL,LOCAL_CACHE dataLayer
    class PAYMONGO,TWILIO,SMTP,LOCAL_STORAGE externalLayer
    class USER_DATA,PET_DATA,BOOKING_DATA,PAYMENT_DATA,PROVIDER_DATA,NOTIFICATION_DATA,FILE_DATA,EMAIL_DATA,ADMIN_DATA,REVIEW_DATA,RATE_LIMIT_DATA storageLayer
```

### Data Flow Process Description

**1. User Interaction Flow**
- External actors (Fur Parents, Service Providers, Admins) interact with the web application
- Requests flow through the UI layer to the API Gateway
- API Gateway handles authentication, rate limiting, and request validation

**2. Business Logic Processing**
- Validated requests are processed by appropriate business services
- Services implement core business rules and workflows
- Cross-service communication handles complex operations

**3. Data Persistence**
- Business services interact with data repositories
- Repositories abstract database operations
- Data is stored in MySQL with comprehensive logging
- Client-side localStorage caching for geocoding and routing data
- Database-based rate limiting for API protection

**4. External Integration**
- Payment processing through PayMongo API
- SMS notifications via Twilio
- Email delivery through SMTP servers with queue management
- Local file storage for images and documents
- Health monitoring for system status

**5. Response Flow**
- Data flows back through the same layers
- Responses are formatted and returned to the UI
- Real-time updates via Server-Sent Events (SSE)
- Email queue processing for reliable delivery
- Admin audit trails for all administrative actions

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### User Management
- `GET /api/users` - Get user profile
- `PUT /api/users` - Update user profile
- `POST /api/users/upload-profile-picture` - Upload profile picture

### Pet Management
- `GET /api/pets` - Get user's pets
- `POST /api/pets` - Create new pet
- `GET /api/pets/[id]` - Get specific pet
- `PUT /api/pets/[id]` - Update pet information
- `DELETE /api/pets/[id]` - Delete pet

### Booking System
- `GET /api/bookings` - Get user bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/[id]` - Get booking details
- `PUT /api/bookings/[id]` - Update booking
- `DELETE /api/bookings/[id]` - Cancel booking
- `GET /api/cremation/bookings` - Get cremation business bookings
- `GET /api/cart-bookings` - Get cart bookings

### Service Management
- `GET /api/packages` - Get service packages
- `POST /api/packages` - Create service package
- `GET /api/packages/[id]` - Get specific package
- `PUT /api/packages/[id]` - Update package
- `DELETE /api/packages/[id]` - Delete package
- `GET /api/service-providers` - Get service providers
- `GET /api/service-providers/[id]` - Get specific provider

### Payment Processing
- `POST /api/payments/create-intent` - Create payment intent
- `GET /api/payments/status` - Check payment status
- `POST /api/payments/webhook` - Payment webhook handler
- `POST /api/payments/cleanup` - Cleanup expired payments

### Business Management
- `GET /api/businesses/applications` - Get business applications
- `POST /api/businesses/upload-documents` - Upload business documents
- `GET /api/cremation/availability` - Get provider availability
- `POST /api/cremation/availability` - Set provider availability

### Review System
- `GET /api/reviews` - Get reviews
- `POST /api/reviews` - Create review
- `GET /api/reviews/provider/[id]` - Get provider reviews
- `GET /api/reviews/user/[id]` - Get user reviews
- `GET /api/reviews/pending` - Get pending reviews

### Appeal System
- `GET /api/appeals` - Get user appeals
- `POST /api/appeals` - Create new appeal
- `GET /api/appeals/[id]` - Get specific appeal
- `PUT /api/appeals/[id]` - Update appeal status

### Notification System
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-read` - Mark notifications as read
- `GET /api/notifications/sse` - Server-sent events for real-time notifications
- `POST /api/notifications/process-reminders` - Process notification reminders

### Email Management
- `POST /api/email` - Send email
- `GET /api/email/queue` - Get email queue status
- `POST /api/email/queue` - Queue email for delivery

### File Upload
- `POST /api/upload/pet-image` - Upload pet image
- `POST /api/upload/package-image` - Upload package image
- `GET /api/image/[...path]` - Serve uploaded images

### Admin Management
- `GET /api/admin/dashboard` - Get admin dashboard data
- `GET /api/admin/dashboard-stats` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/[id]` - Update user status
- `GET /api/admin/cremation-businesses` - Get cremation businesses
- `PUT /api/admin/cremation-businesses/[id]` - Update business status
- `GET /api/admin/bookings` - Get all bookings
- `GET /api/admin/payments` - Get payment transactions
- `GET /api/admin/refunds` - Get refund requests
- `POST /api/admin/refunds` - Process refund
- `GET /api/admin/logs` - Get admin activity logs
- `GET /api/admin/reviews` - Get all reviews
- `GET /api/admin/notifications` - Get admin notifications

### System Endpoints
- `GET /api/health` - Health check endpoint for monitoring
- `GET /api/db-health` - Database health check
- `GET /api/version` - Get application version and build information

#### Version Endpoint Response
```json
{
  "success": true,
  "data": {
    "version": "0.1.0",
    "name": "app_rainbowpaws",
    "timestamp": "2025-01-20T10:30:00.000Z",
    "environment": "production"
  }
}
```

## CI/CD Workflow

### Automated Deployment
The application includes a GitHub Actions workflow for controlled deployments:

- **Trigger**: Only deploys on version tags (e.g., `v1.0.0`) or manual dispatch
- **Process**:
  1. Install dependencies using `npm ci` for consistent builds
  2. Run tests to ensure code quality
  3. Build optimized production bundle
  4. Deploy to staging for beta versions
  5. Deploy to production for stable releases

### Deployment Strategy
- **No Forced Updates**: Clients are not automatically forced to update dependencies
- **Version Control**: Uses semantic versioning for controlled releases
- **Environment Separation**: Staging and production environments for safe testing

### Creating a Release
```bash
# Create and push a version tag
npm version patch  # or minor/major
git push origin master --tags

# This triggers the automated deployment workflow
```

## Deployment

### Production Build
```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start production server
npm run start
```

### Environment Variables for Production
Ensure all required environment variables are set:
- Database credentials
- JWT secret (minimum 32 characters)
- SMTP configuration (if email features needed)
- Payment gateway credentials (if payment features needed)

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

## File Organization

### Package Images
Images for service packages are organized in a structured folder system:
- **Path Format**: `/public/uploads/packages/{packageId}/{filename}`
- **Auto-creation**: Folders are created automatically when uploading
- **Database Integration**: Paths are stored and managed in the database

### Pet Images
Pet profile pictures are stored in:
- **Path Format**: `/public/uploads/pets/{userId}/{filename}`
- **Supported Formats**: JPG, PNG, WebP
- **Size Limits**: Maximum 5MB per image

### Profile Pictures
User and business profile pictures:
- **Path Format**: `/public/uploads/profiles/{userType}/{userId}/{filename}`
- **Types**: `users`, `businesses`, `admins`

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API endpoint tests
- **E2E Tests**: Full user workflow tests

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
Error: Database connection failed
```
**Solution**:
1. Ensure MySQL is running
2. Check database credentials in `.env.local`
3. Verify database `rainbow_paws` exists

#### Port Already in Use
```bash
Error: Port 3001 is already in use
```
**Solution**:
```bash
# Use different port
npx next dev -p 3002

# Or kill process using the port
npx kill-port 3001
```

#### JWT Secret Error
```bash
Error: JWT secret must be at least 32 characters
```
**Solution**: Generate a secure JWT secret:
```bash
# Generate random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use an online generator: [JWT Secret Generator](https://generate-secret.vercel.app/32)

### Development Tips
- Use browser dev tools for debugging
- Check server logs for API errors
- Monitor database queries in development mode
- Use React Developer Tools for component debugging

## Learn More

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - Interactive Next.js tutorial
- [Next.js GitHub](https://github.com/vercel/next.js/) - Source code and examples

### Technology Documentation
- [React Documentation](https://react.dev/) - React library documentation
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/docs/) - TypeScript language documentation
- [MySQL](https://dev.mysql.com/doc/) - MySQL database documentation

### External Services Documentation
- [PayMongo API Documentation](https://developers.paymongo.com/) - Payment processing integration
- [Twilio Documentation](https://www.twilio.com/docs) - SMS and communication services
- [Leaflet Documentation](https://leafletjs.com/) - Interactive maps library
- [Framer Motion](https://www.framer.com/motion/) - Animation library documentation

## Contributing

We welcome contributions! Here's how to get started:

1. [Fork the repository](https://github.com/Justin322322/RAINBOWPAWZ/fork)
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. [Open a Pull Request](https://github.com/Justin322322/RAINBOWPAWZ/compare)

### Development Guidelines
- Follow the existing code style and conventions
- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

### Code of Conduct
Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

### Getting Help
- Check the [documentation](#table-of-contents) first
- Search [existing issues](https://github.com/Justin322322/RAINBOWPAWZ/issues) for solutions
- [Create a new issue](https://github.com/Justin322322/RAINBOWPAWZ/issues/new) if you can't find an answer

### Issue Templates
When creating an issue, please use the appropriate template:
- [Bug Report](https://github.com/Justin322322/RAINBOWPAWZ/issues/new?template=bug_report.md)
- [Feature Request](https://github.com/Justin322322/RAINBOWPAWZ/issues/new?template=feature_request.md)
- [Question](https://github.com/Justin322322/RAINBOWPAWZ/issues/new?template=question.md)

### Community
- Email: rainbowpaws2025@gmail.com
- Facebook: [@justinmarlosibonga](https://www.facebook.com/justinmarlosibonga)

## Recent Updates (2025-07-07)

### Mobile Responsiveness Improvements
- **Admin Dashboard**: Enhanced mobile card views for recent applications
- **User Management**: Improved mobile interface for cremation centers and fur parents
- **Admin Logs**: Fixed mobile view with custom Select components
- **Touch-Friendly Buttons**: Larger, more accessible action buttons on mobile
- **Modal Improvements**: Better mobile modal experience with proper warnings

### Codebase Optimization
- **File Cleanup**: Removed 45+ unused legacy files and components
- **Bundle Optimization**: Reduced application size through dead code elimination
- **Build Performance**: Improved compilation speed and reduced memory usage
- **Type Safety**: Enhanced TypeScript coverage and error handling

### Bug Fixes & Stability
- **Build Errors**: Fixed all TypeScript compilation errors
- **Mobile UX**: Resolved touch target issues and improved accessibility
- **Modal Warnings**: Ensured restriction warnings appear on all devices
- **Production Ready**: Zero-error build suitable for deployment

### UI/UX Enhancements
- **Consistent Design**: Unified card styling across all admin pages
- **Better Navigation**: Improved mobile menu and touch interactions
- **Loading States**: Enhanced skeleton loading components
- **Responsive Tables**: Better mobile table handling with proper overflow

---

**Built with care for pet lovers everywhere**

*Rainbow Paws - Honoring the memories of our beloved companions*
