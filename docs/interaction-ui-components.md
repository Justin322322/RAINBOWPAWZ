# User Interface Components for Fur Parent-Cremation Center Interaction

This document outlines the key user interface components involved in the interaction between fur parents and cremation centers in the Rainbow Paws application.

## Table of Contents

1. [Fur Parent Interface](#fur-parent-interface)
2. [Cremation Center Interface](#cremation-center-interface)
3. [Shared Components](#shared-components)
4. [Mobile Responsiveness](#mobile-responsiveness)
5. [Accessibility Considerations](#accessibility-considerations)

## Fur Parent Interface

### Service Provider Listing

The interface where fur parents can browse and select cremation centers.

**Key Components:**
- Service provider cards with basic information
- Filtering options (rating, location, services offered)
- Search functionality
- Pagination controls

**Implementation:**
```tsx
// src/app/user/furparent_dashboard/services/page.tsx
<div className="grid grid-cols-1 gap-6 mt-6">
  {currentProviders.map((provider) => (
    <div key={provider.id} className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="w-full md:w-1/4">
          <img
            src={provider.image_url || '/images/default-business.png'}
            alt={provider.name}
            className="w-full h-40 object-cover rounded-md"
          />
        </div>
        <div className="w-full md:w-3/4">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold">{provider.name}</h3>
            <div className="flex items-center">
              <StarRating rating={provider.rating || 0} />
              <span className="ml-2 text-gray-600">
                ({provider.reviews_count || 0} reviews)
              </span>
            </div>
          </div>
          <p className="text-gray-600 mt-2">{provider.address}</p>
          <p className="mt-2">{provider.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {provider.services?.slice(0, 3).map((service, index) => (
              <span
                key={index}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
              >
                {service}
              </span>
            ))}
            {provider.services?.length > 3 && (
              <span className="text-gray-500 text-sm">
                +{provider.services.length - 3} more
              </span>
            )}
          </div>
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => router.push(`/user/furparent_dashboard/services/${provider.id}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              View Services
            </button>
            <button
              onClick={() => handleGetDirections(provider.id)}
              className="text-blue-600 hover:text-blue-800"
            >
              Get Directions
            </button>
          </div>
        </div>
      </div>
    </div>
  ))}
</div>
```

### Service Package Selection

The interface where fur parents can view and select service packages offered by a cremation center.

**Key Components:**
- Package cards with details (name, description, price)
- Package filtering and sorting options
- Package comparison functionality
- "Book Now" button

**Implementation:**
```tsx
// src/app/user/furparent_dashboard/services/[id]/page.tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
  {displayedPackages.map((pkg) => (
    <div key={pkg.id} className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="h-48 overflow-hidden">
        <img
          src={pkg.image_url || '/images/default-package.jpg'}
          alt={pkg.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold">{pkg.name}</h3>
        <p className="text-gray-600 mt-2 line-clamp-3">{pkg.description}</p>
        <div className="mt-4 flex justify-between items-center">
          <span className="text-xl font-bold">₱{pkg.price.toLocaleString()}</span>
          <button
            onClick={() => handleViewPackage(pkg.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
```

### Booking Form

The interface where fur parents can enter pet information and booking details.

**Key Components:**
- Pet information form (name, species, breed, etc.)
- Delivery option selection (pickup or delivery)
- Payment method selection
- Special requests text area
- Total price calculation
- Submit button

**Implementation:**
```tsx
// src/components/booking/BookingForm.tsx
<form onSubmit={handleSubmit} className="space-y-6">
  {/* Pet Information Section */}
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-xl font-semibold mb-4">Pet Information</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block mb-2 font-medium">Pet Name</label>
        <input
          type="text"
          value={petName}
          onChange={(e) => setPetName(e.target.value)}
          className="w-full p-2 border rounded-md"
          required
        />
      </div>
      <div>
        <label className="block mb-2 font-medium">Pet Type</label>
        <input
          type="text"
          value={petType}
          onChange={(e) => setPetType(e.target.value)}
          className="w-full p-2 border rounded-md"
          required
        />
      </div>
      {/* Other pet information fields */}
    </div>
  </div>

  {/* Delivery Options Section */}
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-xl font-semibold mb-4">Delivery Options</h2>
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
    {/* Delivery address and distance fields */}
  </div>

  {/* Payment Section */}
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-xl font-semibold mb-4">Payment</h2>
    <div className="mb-4">
      <label className="block mb-2 font-medium">Payment Method</label>
      <select
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
        className="w-full p-2 border rounded-md"
      >
        <option value="cash">Cash on Delivery/Pickup</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="gcash">GCash</option>
      </select>
    </div>
    {/* Price summary */}
  </div>

  {/* Special Requests Section */}
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-xl font-semibold mb-4">Special Requests</h2>
    <textarea
      value={specialRequests}
      onChange={(e) => setSpecialRequests(e.target.value)}
      className="w-full p-2 border rounded-md"
      rows={3}
      placeholder="Any special requests or notes for the cremation center"
    />
  </div>

  {/* Submit Button */}
  <div className="flex justify-end">
    <button
      type="submit"
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
      disabled={loading}
    >
      {loading ? 'Processing...' : 'Complete Booking'}
    </button>
  </div>
</form>
```

### Booking Details View

The interface where fur parents can view the details of their bookings.

**Key Components:**
- Booking summary (service, provider, date, time)
- Pet information display
- Payment details
- Booking status indicator
- Cancel booking button (if applicable)

**Implementation:**
```tsx
// src/app/user/furparent_dashboard/bookings/[id]/page.tsx
<div className="bg-white rounded-lg shadow-md p-6">
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-2xl font-semibold">Booking #{booking.id}</h2>
    <div className={`px-3 py-1 rounded-full text-white ${getStatusColor(booking.status)}`}>
      {getStatusLabel(booking.status)}
    </div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <h3 className="text-lg font-semibold mb-3">Service Details</h3>
      <p><span className="font-medium">Service:</span> {booking.serviceName}</p>
      <p><span className="font-medium">Provider:</span> {booking.providerName}</p>
      <p><span className="font-medium">Date:</span> {formatDate(booking.bookingDate)}</p>
      <p><span className="font-medium">Time:</span> {formatTime(booking.bookingTime)}</p>
      <p><span className="font-medium">Price:</span> ₱{booking.price.toLocaleString()}</p>
    </div>

    <div>
      <h3 className="text-lg font-semibold mb-3">Pet Information</h3>
      <p><span className="font-medium">Name:</span> {booking.petName}</p>
      <p><span className="font-medium">Type:</span> {booking.petType}</p>
      {booking.petBreed && (
        <p><span className="font-medium">Breed:</span> {booking.petBreed}</p>
      )}
      {booking.causeOfDeath && (
        <p><span className="font-medium">Cause of Death:</span> {booking.causeOfDeath}</p>
      )}
    </div>
  </div>

  {booking.specialRequests && (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Special Requests</h3>
      <p>{booking.specialRequests}</p>
    </div>
  )}

  <div className="mt-6">
    <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
    <p><span className="font-medium">Method:</span> {getPaymentMethodLabel(booking.paymentMethod)}</p>
    <p><span className="font-medium">Status:</span> {getPaymentStatusLabel(booking.paymentStatus)}</p>
  </div>

  {booking.status === 'pending' && (
    <div className="mt-6 flex justify-end">
      <button
        onClick={handleCancelBooking}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
      >
        Cancel Booking
      </button>
    </div>
  )}
</div>
```

## Cremation Center Interface

### Booking Management

The interface where cremation centers can view and manage bookings.

**Key Components:**
- Booking list with filtering options
- Booking status update controls
- Payment status update controls
- Booking details view

**Implementation:**
```tsx
// src/app/cremation/bookings/page.tsx
<div className="space-y-6">
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-xl font-semibold mb-4">Filter Bookings</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block mb-2 font-medium">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full p-2 border rounded-md"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div>
        <label className="block mb-2 font-medium">Date Range</label>
        <div className="flex space-x-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>
      <div className="flex items-end">
        <button
          onClick={handleApplyFilters}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md w-full"
        >
          Apply Filters
        </button>
      </div>
    </div>
  </div>

  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-xl font-semibold mb-4">Bookings</h2>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Customer</th>
            <th className="p-3 text-left">Pet</th>
            <th className="p-3 text-left">Service</th>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Payment</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredBookings.map((booking) => (
            <tr key={booking.id} className="border-b">
              <td className="p-3">{booking.id}</td>
              <td className="p-3">{booking.firstName} {booking.lastName}</td>
              <td className="p-3">{booking.petName}</td>
              <td className="p-3">{booking.serviceName}</td>
              <td className="p-3">{formatDate(booking.bookingDate)}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-white ${getStatusColor(booking.status)}`}>
                  {getStatusLabel(booking.status)}
                </span>
              </td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-white ${getPaymentStatusColor(booking.paymentStatus)}`}>
                  {getPaymentStatusLabel(booking.paymentStatus)}
                </span>
              </td>
              <td className="p-3">
                <button
                  onClick={() => router.push(`/cremation/bookings/${booking.id}`)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>
```

### Booking Detail View

The interface where cremation centers can view and update a specific booking.

**Key Components:**
- Detailed booking information
- Status update buttons
- Payment status update controls
- Customer contact information
- Special requests display

**Implementation:**
```tsx
// src/app/cremation/bookings/[id]/page.tsx
<div className="space-y-6">
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-semibold">Booking #{booking.id}</h2>
      <div className={`px-3 py-1 rounded-full text-white ${getStatusColor(booking.status)}`}>
        {getStatusLabel(booking.status)}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
        <p><span className="font-medium">Name:</span> {booking.firstName} {booking.lastName}</p>
        <p><span className="font-medium">Email:</span> {booking.email}</p>
        <p><span className="font-medium">Phone:</span> {booking.phone || 'N/A'}</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Pet Information</h3>
        <p><span className="font-medium">Name:</span> {booking.petName}</p>
        <p><span className="font-medium">Type:</span> {booking.petType}</p>
        {booking.petBreed && (
          <p><span className="font-medium">Breed:</span> {booking.petBreed}</p>
        )}
        {booking.causeOfDeath && (
          <p><span className="font-medium">Cause of Death:</span> {booking.causeOfDeath}</p>
        )}
      </div>
    </div>

    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Service Details</h3>
      <p><span className="font-medium">Service:</span> {booking.serviceName}</p>
      <p><span className="font-medium">Date:</span> {formatDate(booking.bookingDate)}</p>
      <p><span className="font-medium">Time:</span> {formatTime(booking.bookingTime)}</p>
      <p><span className="font-medium">Price:</span> ₱{booking.price.toLocaleString()}</p>
    </div>

    {booking.specialRequests && (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Special Requests</h3>
        <p>{booking.specialRequests}</p>
      </div>
    )}

    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
      <div className="flex items-center space-x-4">
        <p><span className="font-medium">Method:</span> {getPaymentMethodLabel(booking.paymentMethod)}</p>
        <div className="flex items-center space-x-2">
          <span className="font-medium">Status:</span>
          <select
            value={paymentStatus}
            onChange={(e) => handlePaymentStatusUpdate(e.target.value)}
            className="p-1 border rounded-md"
            disabled={loading}
          >
            <option value="not_paid">Not Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>
    </div>

    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">Update Status</h3>
      <div className="flex flex-wrap gap-2">
        {booking.status === 'pending' && (
          <>
            <button
              onClick={() => handleStatusUpdate('confirmed')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
              disabled={loading}
            >
              Confirm Booking
            </button>
            <button
              onClick={() => handleStatusUpdate('cancelled')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              disabled={loading}
            >
              Cancel Booking
            </button>
          </>
        )}
        {booking.status === 'confirmed' && (
          <button
            onClick={() => handleStatusUpdate('in_progress')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            disabled={loading}
          >
            Start Service
          </button>
        )}
        {booking.status === 'in_progress' && (
          <button
            onClick={() => handleStatusUpdate('completed')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
            disabled={loading}
          >
            Complete Service
          </button>
        )}
      </div>
    </div>
  </div>
</div>
```

## Shared Components

### Notification Component

Used to display notifications to both fur parents and cremation centers.

**Implementation:**
```tsx
// src/components/Notification.tsx
<div className={`p-4 rounded-md mb-4 ${getNotificationColor(type)}`}>
  <div className="flex items-start">
    <div className="flex-shrink-0">
      {type === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-400" />}
      {type === 'error' && <XCircleIcon className="h-5 w-5 text-red-400" />}
      {type === 'warning' && <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />}
      {type === 'info' && <InformationCircleIcon className="h-5 w-5 text-blue-400" />}
    </div>
    <div className="ml-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="mt-2 text-sm">{message}</div>
      {link && (
        <div className="mt-2">
          <Link href={link} className="text-sm font-medium underline">
            View Details
          </Link>
        </div>
      )}
    </div>
    {onDismiss && (
      <div className="ml-auto pl-3">
        <button
          onClick={onDismiss}
          className="inline-flex text-gray-400 hover:text-gray-500"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    )}
  </div>
</div>
```

### Status Badge Component

Used to display booking status in a consistent way across the application.

**Implementation:**
```tsx
// src/components/StatusBadge.tsx
<span
  className={`px-2 py-1 rounded-full text-white text-xs font-medium ${getStatusColor(status)}`}
>
  {getStatusLabel(status)}
</span>
```

## Mobile Responsiveness

The application is designed to be responsive across different device sizes:

1. **Responsive Grids**: Using Tailwind CSS grid system with responsive breakpoints
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
   ```

2. **Responsive Navigation**: Collapsible navigation for mobile devices
   ```tsx
   <div className={`md:flex ${isMenuOpen ? 'block' : 'hidden'}`}>
   ```

3. **Responsive Tables**: Horizontal scrolling for tables on small screens
   ```tsx
   <div className="overflow-x-auto">
     <table className="w-full">
   ```

4. **Responsive Forms**: Single column layout on mobile, multi-column on larger screens
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
   ```

## Accessibility Considerations

The application includes several accessibility features:

1. **Semantic HTML**: Using appropriate HTML elements for their intended purpose
   ```tsx
   <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
   ```

2. **ARIA Labels**: Adding ARIA attributes for screen readers
   ```tsx
   <button
     aria-label="Cancel booking"
     onClick={handleCancelBooking}
   >
     Cancel
   </button>
   ```

3. **Keyboard Navigation**: Ensuring all interactive elements are keyboard accessible
   ```tsx
   <button
     onKeyDown={(e) => {
       if (e.key === 'Enter' || e.key === ' ') {
         handleStatusUpdate('confirmed');
       }
     }}
   >
     Confirm
   </button>
   ```

4. **Color Contrast**: Ensuring sufficient color contrast for text readability
   ```tsx
   // Using Tailwind's color system which provides accessible contrast ratios
   <span className="text-blue-800 bg-blue-100">
   ```

5. **Focus Indicators**: Visible focus indicators for keyboard navigation
   ```tsx
   <button className="focus:ring-2 focus:ring-blue-500 focus:outline-none">
   ```
