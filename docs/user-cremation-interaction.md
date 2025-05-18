# User and Cremation Center Interaction

This document outlines the interaction flow between fur parents (users) and cremation centers in the Rainbow Paws application, focusing on the booking process, communication channels, and status updates.

## Table of Contents

1. [Overview](#overview)
2. [Booking Process Flow](#booking-process-flow)
3. [Booking Status Lifecycle](#booking-status-lifecycle)
4. [Communication Channels](#communication-channels)
5. [Notification System](#notification-system)
6. [Payment Processing](#payment-processing)
7. [Delivery Options](#delivery-options)

## Overview

The Rainbow Paws application facilitates the interaction between fur parents who have lost their pets and cremation centers that provide pet memorial services. The core of this interaction is the booking process, which allows fur parents to select a cremation center, choose a service package, provide pet information, and complete the booking.

## Booking Process Flow

### 1. Service Provider Selection

Fur parents begin by browsing available cremation centers:

```typescript
// src/app/user/furparent_dashboard/services/page.tsx
const fetchServiceProviders = async () => {
  try {
    setIsLoading(true);
    const response = await fetch('/api/service-providers?type=cremation');
    if (response.ok) {
      const data = await response.json();
      // Sort providers by rating or other criteria
      const sortedProviders = data.sort((a, b) => b.rating - a.rating);
      setServiceProviders(sortedProviders);
    }
  } catch (error) {
    setServiceProviders([]);
  } finally {
    setIsLoading(false);
  }
};
```

### 2. Package Selection

After selecting a cremation center, fur parents browse and select a service package:

```typescript
// src/app/user/furparent_dashboard/services/[id]/page.tsx
const handleViewPackage = (packageId: number) => {
  router.push(`/user/furparent_dashboard/services/${providerId}/packages/${packageId}`);
};

// src/app/user/furparent_dashboard/services/[id]/packages/[packageId]/page.tsx
const handleBookNow = () => {
  // Navigate to the checkout page with provider and package IDs
  router.push(`/user/furparent_dashboard/bookings/checkout?provider=${providerId}&package=${packageId}`);
};
```

### 3. Pet Information

Fur parents provide information about their deceased pet:

```typescript
// src/app/user/furparent_dashboard/bookings/checkout/page.tsx
// First, save the pet information
let petId = null;
if (userData.id && petName && petType) {
  try {
    // Map the data to match the API's expected field names
    const petData = {
      name: petName,
      species: petType,
      breed: petBreed || undefined,
      gender: petGender || undefined,
      age: petAge || undefined,
      weight: petWeight ? parseFloat(petWeight) : undefined,
      specialNotes: petSpecialNotes || undefined,
      imagePath: petImageUrl
    };

    const petResponse = await fetch('/api/pets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(petData)
    });
    
    // Process response to get petId
  } catch (petError) {
    // Handle error
  }
}
```

### 4. Booking Creation

The fur parent completes the booking by providing additional details such as delivery options and payment method:

```typescript
// src/components/booking/BookingForm.tsx
const bookingData = {
  userId,
  providerId,
  packageId: selectedPackage?.id,
  specialRequests,
  petName,
  petType,
  petBreed,
  petImageUrl: uploadedImageUrl,
  causeOfDeath,
  paymentMethod,
  deliveryOption,
  deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress : null,
  deliveryDistance: deliveryOption === 'delivery' ? deliveryDistance : 0,
  deliveryFee: deliveryOption === 'delivery' ? deliveryFee : 0,
  price: totalPrice
};

const response = await fetch('/api/cremation/bookings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(bookingData),
});
```

### 5. Booking Confirmation

Once the booking is created, a confirmation is sent to both the fur parent and the cremation center:

```typescript
// src/lib/emailService.ts
export const sendBookingConfirmationEmail = async (
  email: string,
  bookingDetails: {
    customerName: string;
    serviceName: string;
    providerName: string;
    bookingDate: string;
    bookingTime: string;
    petName: string;
    bookingId: string | number;
  },
  useQueue = true
) => {
  const response = await fetch('/api/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'booking_confirmation',
      email,
      bookingDetails,
      useQueue
    }),
  });
  // Process response
};
```

## Booking Status Lifecycle

The booking goes through several status changes as it progresses through the system:

### 1. Status Types

```typescript
// Valid booking statuses
type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
```

### 2. Initial Status

When a booking is first created, it is set to 'pending' status:

```typescript
// src/app/api/cremation/bookings/route.ts
const insertQuery = `
  INSERT INTO service_bookings (
    ${availableColumns.join(', ')}
  ) VALUES (${placeholders.join(', ')})
`;
// Status is set to 'pending' by default
```

### 3. Status Updates by Cremation Center

The cremation center can update the booking status through their dashboard:

```typescript
// src/app/cremation/bookings/[id]/page.tsx
const handleStatusUpdate = async (newStatus: string) => {
  try {
    setLoading(true);

    const response = await fetch(`/api/cremation/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    });

    // Process response and update UI
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
};
```

### 4. Status Update API

The API endpoint for updating booking status:

```typescript
// src/app/api/cremation/bookings/[id]/status/route.ts
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const { status } = await request.json();

    if (!status || !['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json({ 
        error: 'Valid status is required',
        details: 'Status must be one of: pending, confirmed, in_progress, completed, cancelled'
      }, { status: 400 });
    }

    // Update booking status in database
    // Send notifications to fur parent
    // Return success response
  } catch (error) {
    // Handle error
  }
}
```

### 5. Completed or Cancelled Bookings

When a booking is marked as 'completed' or 'cancelled', additional processing occurs:

```typescript
// src/app/api/cremation/bookings/[id]/status/route.ts
// If status is completed or cancelled and we have the successful_bookings table, insert a record
if ((status === 'completed' || status === 'cancelled') && hasSuccessfulBookings && bookingDetails) {
  try {
    const insertQuery = `
      INSERT INTO successful_bookings (
        booking_id, 
        service_package_id, 
        user_id, 
        provider_id, 
        transaction_amount, 
        payment_date, 
        payment_status
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?)
    `;
    
    const paymentStatus = status === 'cancelled' ? 'cancelled' : 'completed';
    
    const insertResult = await query(insertQuery, [
      bookingDetails.id,
      bookingDetails.service_package_id,
      bookingDetails.user_id,
      bookingDetails.provider_id,
      bookingDetails.transaction_amount,
      paymentStatus
    ]) as any;
  } catch (error) {
    // Don't fail the entire request if this part fails
  }
}
```

## Communication Channels

The Rainbow Paws application provides several channels for communication between fur parents and cremation centers:

### 1. Email Notifications

Emails are sent at key points in the booking process:

```typescript
// src/lib/emailService.ts
export const sendBookingStatusUpdateEmail = async (
  email: string,
  bookingDetails: {
    customerName: string;
    serviceName: string;
    providerName: string;
    bookingDate: string;
    bookingTime: string;
    petName: string;
    bookingId: string | number;
    status: 'confirmed' | 'completed' | 'cancelled';
    notes?: string;
  },
  useQueue = true
) => {
  // Send email notification about booking status change
};
```

### 2. In-App Notifications

Notifications are created in the system for both fur parents and cremation centers:

```typescript
// src/utils/notificationService.ts
export async function createNotification({
  userId,
  title,
  message,
  type = 'info',
  link = null,
  sendEmail = false,
  emailSubject
}: CreateNotificationParams): Promise<{ success: boolean; notificationId?: number; error?: string }> {
  try {
    // Ensure the notifications table exists
    await ensureNotificationsTable();

    // Insert the notification
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as any;

    // If requested, also send an email notification
    if (sendEmail) {
      // Get user email and send email
    }

    return {
      success: true,
      notificationId: result.insertId
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### 3. Special Requests Field

Fur parents can include special requests or notes with their booking:

```typescript
// src/components/booking/BookingForm.tsx
<textarea
  id="specialRequests"
  value={specialRequests}
  onChange={(e) => setSpecialRequests(e.target.value)}
  placeholder="Any special requests or notes for the cremation center"
  className="w-full p-2 border rounded-md"
  rows={3}
/>
```

## Notification System

The notification system keeps both fur parents and cremation centers informed about booking updates:

### 1. Notification Creation

```typescript
// src/app/api/notifications/route.ts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, type = 'info', link = null } = body;

    // Validate required fields
    if (!userId || !title || !message) {
      return NextResponse.json({
        error: 'User ID, title, and message are required'
      }, { status: 400 });
    }

    // Ensure the notifications table exists
    await ensureNotificationsTable();

    // Insert the notification
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    ) as any;

    return NextResponse.json({
      success: true,
      notificationId: result.insertId,
      message: 'Notification created successfully'
    });
  } catch (error) {
    // Handle error
  }
}
```

### 2. Notification Types

Different notification types are used for different events:

- **Booking Confirmation**: When a booking is first created
- **Status Update**: When the booking status changes
- **Payment Confirmation**: When a payment is processed
- **Delivery Update**: When there's an update about delivery

### 3. Marking Notifications as Read

Users can mark notifications as read:

```typescript
// src/app/api/notifications/mark-read/route.ts
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, markAll = false } = body;

    // Validate input
    if (!markAll && !notificationId) {
      return NextResponse.json({
        error: 'Notification ID is required when not marking all as read'
      }, { status: 400 });
    }

    // Build the query based on whether we're marking all or specific notifications
    let updateQuery = '';
    let queryParams: any[] = [];

    if (markAll) {
      updateQuery = 'UPDATE notifications SET is_read = 1 WHERE user_id = ?';
      queryParams = [getUserIdFromRequest(request)];
    } else {
      updateQuery = 'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?';
      queryParams = [notificationId, getUserIdFromRequest(request)];
    }

    // Execute the update
    const result = await query(updateQuery, queryParams) as any;

    return NextResponse.json({
      success: true,
      affectedRows: result.affectedRows,
      message: markAll 
        ? 'All notifications marked as read' 
        : `${result.affectedRows} notification(s) marked as read`
    });
  } catch (error) {
    // Handle error
  }
}
```

## Payment Processing

The application handles payment processing for bookings:

### 1. Payment Methods

Fur parents can select from different payment methods:

```typescript
// src/components/booking/BookingForm.tsx
<select
  id="paymentMethod"
  value={paymentMethod}
  onChange={(e) => setPaymentMethod(e.target.value)}
  className="w-full p-2 border rounded-md"
>
  <option value="cash">Cash on Delivery/Pickup</option>
  <option value="bank_transfer">Bank Transfer</option>
  <option value="gcash">GCash</option>
</select>
```

### 2. Payment Status Updates

Cremation centers can update the payment status:

```typescript
// src/app/api/cremation/bookings/[id]/payment/route.ts
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get booking ID from params
    const bookingId = await Promise.resolve(params.id);

    // Parse request body
    const requestBody = await request.json();
    const { paymentStatus } = requestBody;

    // Validate payment status
    if (!paymentStatus || !['not_paid', 'partially_paid', 'paid'].includes(paymentStatus)) {
      return NextResponse.json({
        error: 'Valid payment status is required',
        details: 'Payment status must be one of: not_paid, partially_paid, paid'
      }, { status: 400 });
    }

    // Update payment status in database
    // Return success response
  } catch (error) {
    // Handle error
  }
}
```

## Delivery Options

Fur parents can choose between pickup and delivery options:

### 1. Delivery Option Selection

```typescript
// src/components/booking/BookingForm.tsx
<div className="mb-4">
  <label className="block mb-2 font-medium">Delivery Option</label>
  <div className="flex space-x-4">
    <label className="flex items-center">
      <input
        type="radio"
        value="pickup"
        checked={deliveryOption === 'pickup'}
        onChange={() => setDeliveryOption('pickup')}
        className="mr-2"
      />
      Pickup
    </label>
    <label className="flex items-center">
      <input
        type="radio"
        value="delivery"
        checked={deliveryOption === 'delivery'}
        onChange={() => setDeliveryOption('delivery')}
        className="mr-2"
      />
      Delivery
    </label>
  </div>
</div>
```

### 2. Delivery Fee Calculation

If delivery is selected, a delivery fee is calculated based on distance:

```typescript
// src/components/booking/BookingForm.tsx
// Calculate delivery fee based on distance
const calculateDeliveryFee = (distance: number) => {
  // Base fee
  let fee = 50;
  
  // Additional fee per km beyond 5km
  if (distance > 5) {
    fee += (distance - 5) * 10;
  }
  
  return fee;
};

// Update delivery fee when distance changes
useEffect(() => {
  if (deliveryOption === 'delivery' && deliveryDistance > 0) {
    const fee = calculateDeliveryFee(deliveryDistance);
    setDeliveryFee(fee);
  } else {
    setDeliveryFee(0);
  }
}, [deliveryDistance, deliveryOption]);
```
