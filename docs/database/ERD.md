# Rainbow Paws Database ERD (Entity Relationship Diagram)

This document provides a visual representation of the Rainbow Paws database structure using Mermaid diagram syntax.

## Core Database Tables and Relationships

```mermaid
erDiagram
    users ||--o{ pets : owns
    users ||--o{ service_providers : registers
    users ||--o{ service_bookings : creates
    users ||--o{ notifications : receives
    users ||--o{ otp_codes : has
    users ||--o{ otp_attempts : makes
    users ||--o{ password_reset_tokens : requests
    users ||--o{ admin_profiles : has
    users ||--o{ user_restrictions : receives

    service_providers ||--o{ service_packages : offers
    service_providers ||--o{ provider_availability : sets
    service_providers ||--o{ provider_time_slots : defines
    service_providers ||--o{ service_bookings : receives

    service_packages ||--o{ package_inclusions : includes
    service_packages ||--o{ package_addons : offers
    service_packages ||--o{ package_images : has
    service_packages ||--o{ service_bookings : booked_for

    pets ||--o{ service_bookings : associated_with

    service_bookings ||--o{ successful_bookings : results_in

    users {
        int user_id PK
        string email
        string password
        string first_name
        string last_name
        string phone_number
        text address
        string sex
        enum role
        enum status
        boolean is_verified
        boolean is_otp_verified
        timestamp created_at
        timestamp updated_at
        timestamp last_login
    }

    pets {
        int pet_id PK
        int user_id FK
        string name
        string species
        string breed
        string gender
        string age
        decimal weight
        string photo_path
        text special_notes
        timestamp created_at
        timestamp updated_at
    }

    service_providers {
        int provider_id PK
        int user_id FK
        string name
        text description
        text address
        string phone
        string email
        string provider_type
        string application_status
        string verification_status
        timestamp created_at
        timestamp updated_at
    }

    service_packages {
        int package_id PK
        int provider_id FK
        string name
        text description
        decimal price
        string category
        string cremation_type
        string processing_time
        boolean is_active
        text conditions
        timestamp created_at
        timestamp updated_at
    }

    service_bookings {
        int booking_id PK
        int user_id FK
        int provider_id FK
        int package_id FK
        int pet_id FK
        date booking_date
        time booking_time
        enum status
        text special_requests
        string payment_method
        string delivery_option
        text delivery_address
        float delivery_distance
        decimal delivery_fee
        decimal total_amount
        timestamp created_at
        timestamp updated_at
    }

    admin_profiles {
        int admin_profile_id PK
        int user_id FK
        string username
        string full_name
        enum admin_role
        timestamp created_at
        timestamp updated_at
    }

    user_restrictions {
        int restriction_id PK
        int user_id FK
        text reason
        timestamp restriction_date
        string duration
        int report_count
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    otp_codes {
        int otp_id PK
        int user_id FK
        string otp_code
        datetime expires_at
        boolean is_used
        timestamp created_at
    }

    otp_attempts {
        int attempt_id PK
        int user_id FK
        string attempt_type
        timestamp attempt_time
        string ip_address
    }

    password_reset_tokens {
        int token_id PK
        int user_id FK
        string token
        datetime expires_at
        boolean is_used
        timestamp created_at
    }

    provider_availability {
        int availability_id PK
        int provider_id FK
        date date
        boolean is_available
        timestamp created_at
        timestamp updated_at
    }

    provider_time_slots {
        int slot_id PK
        int provider_id FK
        date date
        time start_time
        time end_time
        text available_services
        timestamp created_at
        timestamp updated_at
    }

    package_inclusions {
        int inclusion_id PK
        int package_id FK
        string name
        text description
        timestamp created_at
    }

    package_addons {
        int addon_id PK
        int package_id FK
        string name
        text description
        decimal price
        timestamp created_at
    }

    package_images {
        int image_id PK
        int package_id FK
        string image_path
        int display_order
        timestamp created_at
    }

    notifications {
        int notification_id PK
        int user_id FK
        string type
        string title
        text message
        string link
        boolean is_read
        timestamp created_at
    }

    admin_logs {
        int log_id PK
        int admin_id FK
        string action
        string entity_type
        int entity_id
        text details
        string ip_address
        timestamp created_at
    }
```

## Notes on Relationships

- **One-to-Many (1:N)** relationships are represented with the `||--o{` notation
- **Many-to-Many (N:M)** relationships would typically be implemented with junction tables
- **Foreign Keys** follow the naming convention of `table_name_id` (e.g., `user_id`, `provider_id`)

## Primary Key Naming Convention

As per your preference, the ERD uses more descriptive primary key names (e.g., `user_id` instead of just `id`) for better readability. This makes it clearer which ID is being referenced in relationships.

## Reading the Diagram

- Each box represents a table in the database
- Lines between boxes represent relationships
- The notation on the lines indicates the type of relationship
- Inside each box are the columns of the table
- PK indicates Primary Key
- FK indicates Foreign Key
