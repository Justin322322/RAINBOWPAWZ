# Booking Flow Diagram

This document provides a visual representation of the booking flow between fur parents and cremation centers in the Rainbow Paws application.

## Booking Process Flow

```mermaid
flowchart TD
    A[Fur Parent] --> B[Browse Cremation Centers]
    B --> C[Select Cremation Center]
    C --> D[Browse Service Packages]
    D --> E[Select Package]
    E --> F[Enter Pet Information]
    F --> G[Choose Delivery Option]
    G --> H[Select Payment Method]
    H --> I[Submit Booking]
    I --> J[System Creates Booking]
    J --> K[Notification to Fur Parent]
    J --> L[Notification to Cremation Center]
    L --> M[Cremation Center Reviews Booking]
    M --> N{Accept Booking?}
    N -->|Yes| O[Update Status to Confirmed]
    N -->|No| P[Update Status to Cancelled]
    O --> Q[Notification to Fur Parent]
    P --> R[Notification to Fur Parent]
    O --> S[Process Service]
    S --> T[Update Status to In Progress]
    T --> U[Notification to Fur Parent]
    T --> V[Complete Service]
    V --> W[Update Status to Completed]
    W --> X[Notification to Fur Parent]
    W --> Y[Record in Successful Bookings]
```

## Booking Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Fur Parent submits booking
    Pending --> Confirmed: Cremation Center accepts
    Pending --> Cancelled: Cremation Center rejects
    Confirmed --> InProgress: Service begins
    InProgress --> Completed: Service finished
    Confirmed --> Cancelled: Cancellation requested
    InProgress --> Cancelled: Cancellation requested (rare)
    Completed --> [*]
    Cancelled --> [*]
```

## Communication Flow

```mermaid
sequenceDiagram
    participant FP as Fur Parent
    participant App as Rainbow Paws App
    participant CC as Cremation Center
    
    FP->>App: Browse cremation centers
    App->>FP: Display available centers
    FP->>App: Select cremation center
    App->>FP: Show service packages
    FP->>App: Select package
    FP->>App: Submit booking with pet info
    App->>FP: Booking confirmation
    App->>CC: New booking notification
    CC->>App: Update booking status (Confirmed)
    App->>FP: Status update notification
    CC->>App: Update booking status (In Progress)
    App->>FP: Status update notification
    CC->>App: Update booking status (Completed)
    App->>FP: Status update notification
    FP->>App: View booking history
```

## Payment Processing Flow

```mermaid
flowchart TD
    A[Fur Parent] --> B[Select Payment Method]
    B --> C{Payment Method}
    C -->|Cash| D[Mark as Cash Payment]
    C -->|Bank Transfer| E[Provide Bank Details]
    C -->|GCash| F[Provide GCash Details]
    D --> G[Cremation Center]
    E --> G
    F --> G
    G --> H{Payment Received?}
    H -->|Yes| I[Update Payment Status to Paid]
    H -->|Partial| J[Update Payment Status to Partially Paid]
    H -->|No| K[Keep Payment Status as Not Paid]
    I --> L[Notification to Fur Parent]
    J --> L
    I --> M[Proceed with Service]
    J --> M
    K --> N[Follow up with Fur Parent]
```

## Delivery Process Flow

```mermaid
flowchart TD
    A[Fur Parent] --> B{Delivery Option}
    B -->|Pickup| C[Schedule Pickup Time]
    B -->|Delivery| D[Provide Delivery Address]
    D --> E[Calculate Delivery Distance]
    E --> F[Calculate Delivery Fee]
    F --> G[Add Fee to Total Price]
    C --> H[Cremation Center]
    G --> H
    H --> I[Process Service]
    I --> J{Delivery Option}
    J -->|Pickup| K[Prepare for Pickup]
    J -->|Delivery| L[Arrange Delivery]
    K --> M[Fur Parent Picks Up]
    L --> N[Deliver to Fur Parent]
    M --> O[Complete Transaction]
    N --> O
```

## Notification System Flow

```mermaid
flowchart TD
    A[System Event] --> B{Event Type}
    B -->|Booking Created| C[Create Booking Confirmation Notification]
    B -->|Status Updated| D[Create Status Update Notification]
    B -->|Payment Updated| E[Create Payment Update Notification]
    B -->|Delivery Updated| F[Create Delivery Update Notification]
    C --> G[Store in Notifications Table]
    D --> G
    E --> G
    F --> G
    G --> H{Send Email?}
    H -->|Yes| I[Generate Email Content]
    H -->|No| J[In-App Notification Only]
    I --> K[Queue Email]
    K --> L[Send Email]
    J --> M[Mark as Unread]
    L --> M
    M --> N[User Views Notification]
    N --> O[Mark as Read]
```

These diagrams provide a visual representation of the various flows and interactions between fur parents and cremation centers in the Rainbow Paws application.
