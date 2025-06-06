[1mdiff --git a/next.config.js b/next.config.js[m
[1mindex 9bc6a46..bf9e907 100644[m
[1m--- a/next.config.js[m
[1m+++ b/next.config.js[m
[36m@@ -2,8 +2,8 @@[m
 // Load environment variables[m
 require('dotenv').config({ path: '.env.local' });[m
 [m
[31m-// Get port from environment or default to 3001[m
[31m-const port = process.env.PORT || 3001;[m
[32m+[m[32m// Get port from environment or default to 3000[m
[32m+[m[32mconst port = process.env.PORT || 3000;[m
 [m
 // Always use 3306 for MySQL[m
 const dbPort = 3306;[m
[36m@@ -13,11 +13,11 @@[m [mconst nextConfig = {[m
   // SECURITY: Never expose database credentials to client-side[m
   env: {[m
     // Only expose port and app URL for client-side access[m
[31m-    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',[m
[32m+[m[32m    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`,[m
     NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',[m
     NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',[m
     // Convert PORT to string to avoid Next.js config warning[m
[31m-    PORT: String(process.env.PORT || 3000),[m
[32m+[m[32m    PORT: String(port),[m
     // Don't include NODE_ENV here as it's not allowed[m
   },[m
   // Configure image handling[m
[1mdiff --git a/src/components/booking/AvailabilityCalendar.tsx b/src/components/booking/AvailabilityCalendar.tsx[m
[1mindex c21685c..ffba297 100644[m
[1m--- a/src/components/booking/AvailabilityCalendar.tsx[m
[1m+++ b/src/components/booking/AvailabilityCalendar.tsx[m
[36m@@ -42,6 +42,21 @@[m [mtype CalendarDay = {[m
   timeSlots?: TimeSlot[];[m
 };[m
 [m
[32m+[m[32m// Raw data types from API (before cleaning)[m
[32m+[m[32mtype RawTimeSlot = {[m
[32m+[m[32m  id?: string;[m
[32m+[m[32m  start?: string;[m
[32m+[m[32m  end?: string;[m
[32m+[m[32m  availableServices?: any;[m
[32m+[m[32m  isBooked?: boolean;[m
[32m+[m[32m};[m
[32m+[m
[32m+[m[32mtype RawDayAvailability = {[m
[32m+[m[32m  date?: string;[m
[32m+[m[32m  isAvailable?: any;[m
[32m+[m[32m  timeSlots?: any;[m
[32m+[m[32m};[m
[32m+[m
 interface AvailabilityCalendarProps {[m
   providerId: number;[m
   onAvailabilityChange?: (availability: DayAvailability[]) => void;[m
[36m@@ -162,17 +177,169 @@[m [mexport default function AvailabilityCalendar({ providerId, onAvailabilityChange,[m
       }[m
 [m
       const data = await response.json();[m
[31m-      const availability = Array.isArray(data.availability) ? data.availability : [];[m
[32m+[m[32m      const rawAvailability = Array.isArray(data.availability) ? data.availability : [];[m
[32m+[m
[32m+[m[32m      // Data validation and cleaning logic[m
[32m+[m[32m      const cleanedAvailability = rawAvailability.map((day: any): DayAvailability => {[m
[32m+[m[32m        // Ensure required properties exist with correct types[m
[32m+[m[32m        const cleanedDay: DayAvailability = {[m
[32m+[m[32m          date: day.date || '',[m
[32m+[m[32m          isAvailable: Boolean(day.isAvailable),[m
[32m+[m[32m          timeSlots: [][m
[32m+[m[32m        };[m
[32m+[m
[32m+[m[32m        // Validate and clean time slots[m
[32m+[m[32m        if (Array.isArray(day.timeSlots)) {[m
[32m+[m[32m          cleanedDay.timeSlots = day.timeSlots[m
[32m+[m[32m            .filter((slot: any) => slot && typeof slot === 'object')[m
[32m+[m[32m            .map((slot: RawTimeSlot): TimeSlot => {[m
[32m+[m[32m              // Generate unique ID if missing[m
[32m+[m[32m              const slotId = slot.id || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;[m
[32m+[m[41m              [m
[32m+[m[32m              // Ensure availableServices is an array[m
[32m+[m[32m              let availableServices: number[] = [];[m
[32m+[m[32m              if (Array.isArray(slot.availableServices)) {[m
[32m+[m[32m                availableServices = slot.availableServices[m
[32m+[m[32m                  .map((id: any) => {[m
[32m+[m[32m                    const numId = typeof id === 'string' ? parseInt(id, 10) : id;[m
[32m+[m[32m                    return isNaN(numId) ? 0 : numId;[m
[32m+[m[32m                  })[m
[32m+[m[32m                  .filter((id: number) => id > 0);[m
[32m+[m[32m              }[m
[32m+[m
[32m+[m[32m              // Note: Time slots that exist in the database are available by definition[m
[32m+[m[32m              // When a booking is made, the corresponding time slot is deleted from provider_time_slots[m
[32m+[m[32m              // So any time slot returned by the API is available (not booked)[m
[32m+[m[32m              const isBooked = Boolean(slot.isBooked) || false;[m
[32m+[m
[32m+[m[32m              return {[m
[32m+[m[32m                id: slotId,[m
[32m+[m[32m                start: slot.start || '09:00',[m
[32m+[m[32m                end: slot.end || '10:00',[m
[32m+[m[32m                availableServices,[m
[32m+[m[32m                isBooked[m
[32m+[m[32m              };[m
[32m+[m[32m            })[m
[32m+[m[32m            .filter((slot: any) => slot.start && slot.end); // Remove invalid time slots[m
[32m+[m[32m        }[m
[32m+[m
[32m+[m[32m        return cleanedDay;[m
[32m+[m[32m      });[m
[32m+[m
[32m+[m[32m      // Additionally, we can fetch recent bookings to show them as booked time slots for display purposes[m
[32m+[m[32m      try {[m
[32m+[m[32m        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);[m
[32m+[m[32m        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);[m
[32m+[m[32m        const formattedStartDate = formatDateToString(startDate);[m
[32m+[m[32m        const formattedEndDate = formatDateToString(endDate);[m
[32m+[m
[32m+[m[32m        // Fetch recent bookings to display them as booked time slots[m
[32m+[m[32m        const bookingsResponse = await fetch(`/api/cremation/bookings?providerId=${providerId}&limit=1000`, {[m
[32m+[m[32m          method: 'GET',[m
[32m+[m[32m          headers: {[m
[32m+[m[32m            'Cache-Control': 'no-cache',[m
[32m+[m[32m            'Pragma': 'no-cache'[m
[32m+[m[32m          }[m
[32m+[m[32m        });[m
[32m+[m
[32m+[m[32m        if (bookingsResponse.ok) {[m
[32m+[m[32m          const bookingsData = await bookingsResponse.json();[m
[32m+[m[32m          const allBookings = Array.isArray(bookingsData.bookings) ? bookingsData.bookings : [];[m
[32m+[m[41m          [m
[32m+[m[32m          // Filter bookings to only include those in the current month[m
[32m+[m[32m          const currentMonthBookings = allBookings.filter((booking: any) => {[m
[32m+[m[32m            const bookingDate = booking.booking_date || booking.date;[m
[32m+[m[32m            if (!bookingDate) return false;[m
[32m+[m[41m            [m
[32m+[m[32m            let formattedBookingDate: string;[m
[32m+[m[32m            if (typeof bookingDate === 'string') {[m
[32m+[m[32m              formattedBookingDate = bookingDate.includes('T') ? bookingDate.split('T')[0] : bookingDate;[m
[32m+[m[32m            } else if (bookingDate instanceof Date) {[m
[32m+[m[32m              formattedBookingDate = formatDateToString(bookingDate);[m
[32m+[m[32m            } else {[m
[32m+[m[32m              return false;[m
[32m+[m[32m            }[m
[32m+[m[41m            [m
[32m+[m[32m            return formattedBookingDate >= formattedStartDate && formattedBookingDate <= formattedEndDate;[m
[32m+[m[32m          });[m
[32m+[m
[32m+[m[32m          // Add booked time slots to the availability data for display[m
[32m+[m[32m          currentMonthBookings.forEach((booking: any) => {[m
[32m+[m[32m            const bookingDate = booking.booking_date || booking.date;[m
[32m+[m[32m            const bookingTime = booking.booking_time || booking.time;[m
[32m+[m[41m            [m
[32m+[m[32m            if (!bookingDate || !bookingTime || booking.status === 'cancelled') return;[m
[32m+[m[41m            [m
[32m+[m[32m            let formattedBookingDate: string;[m
[32m+[m[32m            if (typeof bookingDate === 'string') {[m
[32m+[m[32m              formattedBookingDate = bookingDate.includes('T') ? bookingDate.split('T')[0] : bookingDate;[m
[32m+[m[32m            } else if (bookingDate instanceof Date) {[m
[32m+[m[32m              formattedBookingDate = formatDateToString(bookingDate);[m
[32m+[m[32m            } else {[m
[32m+[m[32m              return;[m
[32m+[m[32m            }[m
[32m+[m[41m            [m
[32m+[m[32m            // Format booking time (HH:MM)[m
[32m+[m[32m            const formattedBookingTime = typeof bookingTime === 'string'[m[41m [m
[32m+[m[32m              ? bookingTime.substring(0, 5)[m[41m [m
[32m+[m[32m              : bookingTime;[m
[32m+[m[41m            [m
[32m+[m[32m            // Find the day in our availability data[m
[32m+[m[32m            const dayIndex = cleanedAvailability.findIndex((day: DayAvailability) => day.date === formattedBookingDate);[m
[32m+[m[32m            if (dayIndex >= 0) {[m
[32m+[m[32m              // Check if a time slot for this booking already exists (shouldn't happen, but just in case)[m
[32m+[m[32m              const existingSlotIndex = cleanedAvailability[dayIndex].timeSlots.findIndex([m
[32m+[m[32m                (slot: TimeSlot) => slot.start.substring(0, 5) === formattedBookingTime[m
[32m+[m[32m              );[m
[32m+[m[41m              [m
[32m+[m[32m              if (existingSlotIndex >= 0) {[m
[32m+[m[32m                // Mark existing slot as booked[m
[32m+[m[32m                cleanedAvailability[dayIndex].timeSlots[existingSlotIndex].isBooked = true;[m
[32m+[m[32m              } else {[m
[32m+[m[32m                // Add a booked time slot to show the booking[m
[32m+[m[32m                const bookedSlot: TimeSlot = {[m
[32m+[m[32m                  id: `booked_${booking.id}`,[m
[32m+[m[32m                  start: formattedBookingTime,[m
[32m+[m[32m                  end: addHoursToTime(formattedBookingTime, 1), // Assume 1-hour duration[m
[32m+[m[32m                  availableServices: [],[m
[32m+[m[32m                  isBooked: true[m
[32m+[m[32m                };[m
[32m+[m[41m                [m
[32m+[m[32m                cleanedAvailability[dayIndex].timeSlots.push(bookedSlot);[m
[32m+[m[32m                cleanedAvailability[dayIndex].isAvailable = true; // Mark day as having activity[m
[32m+[m[32m              }[m
[32m+[m[32m            } else {[m
[32m+[m[32m              // Create a new day entry for this booking[m
[32m+[m[32m              const bookedSlot: TimeSlot = {[m
[32m+[m[32m                id: `booked_${booking.id}`,[m
[32m+[m[32m                start: formattedBookingTime,[m
[32m+[m[32m                end: addHoursToTime(formattedBookingTime, 1), // Assume 1-hour duration[m
[32m+[m[32m                availableServices: [],[m
[32m+[m[32m                isBooked: true[m
[32m+[m[32m              };[m
[32m+[m[41m              [m
[32m+[m[32m              cleanedAvailability.push({[m
[32m+[m[32m                date: formattedBookingDate,[m
[32m+[m[32m                isAvailable: true,[m
[32m+[m[32m                timeSlots: [bookedSlot][m
[32m+[m[32m              });[m
[32m+[m[32m            }[m
[32m+[m[32m          });[m
[32m+[m[32m        }[m
[32m+[m[32m      } catch (bookingError) {[m
[32m+[m[32m        console.warn('Failed to fetch existing bookings for display:', bookingError);[m
[32m+[m[32m        // Continue without booking data rather than failing completely[m
[32m+[m[32m      }[m
 [m
[31m-      setAvailabilityData(availability);[m
[32m+[m[32m      setAvailabilityData(cleanedAvailability);[m
 [m
[31m-      // Cache the data[m
[31m-      if (typeof window !== "undefined" && availability.length > 0) {[m
[31m-        localStorage.setItem(cacheKey, JSON.stringify(availability));[m
[32m+[m[32m      // Cache the cleaned data[m
[32m+[m[32m      if (typeof window !== "undefined" && cleanedAvailability.length > 0) {[m
[32m+[m[32m        localStorage.setItem(cacheKey, JSON.stringify(cleanedAvailability));[m
         localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());[m
       }[m
 [m
[31m-      onAvailabilityChange?.(availability);[m
[32m+[m[32m      onAvailabilityChange?.(cleanedAvailability);[m
     } catch (err) {[m
       setError(err instanceof Error ? err.message : 'Unknown error occurred');[m
     } finally {[m
[36m@@ -422,6 +589,15 @@[m [mexport default function AvailabilityCalendar({ providerId, onAvailabilityChange,[m
     // Format as YYYY-MM-DD[m
     return `${year}-${month}-${day}`;[m
   };[m
[32m+[m
[32m+[m[32m  // Helper function to add hours to a time string[m
[32m+[m[32m  const addHoursToTime = (timeString: string, hours: number): string => {[m
[32m+[m[32m    const [hoursStr, minutesStr] = timeString.split(':');[m
[32m+[m[32m    const totalMinutes = parseInt(hoursStr, 10) * 60 + parseInt(minutesStr, 10) + (hours * 60);[m
[32m+[m[32m    const newHours = Math.floor(totalMinutes / 60) % 24;[m
[32m+[m[32m    const newMinutes = totalMinutes % 60;[m
[32m+[m[32m    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;[m
[32m+[m[32m  };[m
   const handlePreviousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));[m
   const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));[m
   [m
