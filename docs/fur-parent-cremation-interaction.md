# Fur Parent and Cremation Center Interaction

This document provides a comprehensive overview of the interaction between fur parents and cremation centers in the Rainbow Paws application.

## Table of Contents

1. [Introduction](#introduction)
2. [Interaction Overview](#interaction-overview)
3. [Key Documentation](#key-documentation)
4. [Implementation Highlights](#implementation-highlights)
5. [Future Enhancements](#future-enhancements)

## Introduction

The Rainbow Paws application facilitates the interaction between fur parents who have lost their pets and cremation centers that provide pet memorial services. This interaction is a core part of the application and involves several components, including:

- Service provider discovery and selection
- Service package browsing and selection
- Booking creation and management
- Communication between fur parents and cremation centers
- Payment processing
- Delivery or pickup coordination

This document serves as an entry point to understand the complete interaction flow and provides links to more detailed documentation on specific aspects of the interaction.

## Interaction Overview

The interaction between fur parents and cremation centers follows this general flow:

1. **Service Provider Discovery**: Fur parents browse available cremation centers, filtering by location, rating, or services offered.

2. **Service Package Selection**: After selecting a cremation center, fur parents browse the service packages offered by that center and select one that meets their needs.

3. **Booking Creation**: Fur parents provide information about their pet, select delivery options, choose a payment method, and submit the booking.

4. **Booking Confirmation**: The system confirms the booking and sends notifications to both the fur parent and the cremation center.

5. **Booking Management**: The cremation center reviews the booking and updates its status (confirmed, in progress, completed, or cancelled).

6. **Status Updates**: As the booking status changes, notifications are sent to the fur parent to keep them informed.

7. **Service Delivery**: The cremation center provides the service and either delivers the remains to the fur parent or prepares them for pickup.

8. **Completion**: The booking is marked as completed, and the transaction is recorded for financial tracking.

## Key Documentation

For detailed information about specific aspects of the interaction, please refer to the following documents:

1. [**User and Cremation Center Interaction**](./user-cremation-interaction.md): Detailed documentation of the booking process, communication channels, and status updates.

2. [**Booking Flow Diagram**](./booking-flow-diagram.md): Visual representation of the booking flow between fur parents and cremation centers.

3. [**Interaction Database Tables**](./interaction-database-tables.md): Documentation of the database tables involved in the interaction.

4. [**Interaction UI Components**](./interaction-ui-components.md): Documentation of the user interface components used in the interaction.

## Implementation Highlights

### Booking Process

The booking process is implemented with a focus on user experience and data integrity:

```typescript
// src/components/booking/BookingForm.tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    setLoading(true);
    
    // Upload pet image if available
    let uploadedImageUrl = null;
    if (petImage) {
      uploadedImageUrl = await uploadPetImage();
    }

    // Create booking
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

    // Process response and show success message
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
};
```

### Status Updates

The status update process ensures that both fur parents and cremation centers are kept informed:

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
    
    // Automatically expand the status section when status is updated
    if (newStatus === 'confirmed' || newStatus === 'in_progress') {
      setStatusSectionExpanded(true);
    }

    showToast(`Booking status updated to ${getStatusLabel(newStatus)}`, 'success');

    // Refresh the booking data
    setTimeout(() => {
      fetchBookingDetails();
    }, 500);
  } catch (error) {
    showToast('Failed to update booking status', 'error');
  } finally {
    setLoading(false);
  }
};
```

### Notification System

The notification system keeps both fur parents and cremation centers informed about booking updates:

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

### Payment Processing

The payment processing system supports multiple payment methods and status updates:

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
    const updateQuery = `
      UPDATE service_bookings
      SET payment_status = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await query(updateQuery, [paymentStatus, bookingId]);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully',
      paymentStatus: paymentStatus
    });
  } catch (error) {
    // Handle error
    return NextResponse.json({
      error: 'Failed to update payment status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
```

## Future Enhancements

The interaction between fur parents and cremation centers could be enhanced in the following ways:

1. **Real-time Chat**: Implement a real-time chat feature to allow direct communication between fur parents and cremation centers.

2. **Service Ratings and Reviews**: Allow fur parents to rate and review cremation centers after service completion.

3. **Advanced Scheduling**: Implement a more sophisticated scheduling system with real-time availability updates.

4. **Online Payment Integration**: Integrate with payment gateways to allow online payments directly through the application.

5. **Service Tracking**: Implement a tracking system to allow fur parents to track the status of their pet's cremation process in real-time.

6. **Automated Reminders**: Send automated reminders to both fur parents and cremation centers about upcoming bookings or pending actions.

7. **Multi-language Support**: Add support for multiple languages to make the application accessible to a wider audience.

8. **Service Customization**: Allow fur parents to customize services with add-ons or special requests during the booking process.

9. **Mobile App**: Develop a dedicated mobile app for both fur parents and cremation centers to enhance the user experience on mobile devices.

10. **Integration with Pet Health Records**: Allow integration with pet health records to provide more comprehensive information about the pet.

These enhancements would further improve the interaction between fur parents and cremation centers, making the process more efficient, transparent, and user-friendly.
