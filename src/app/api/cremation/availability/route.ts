import { NextRequest, NextResponse } from 'next/server';
import { query, ensureAvailabilityTablesExist, withTransaction } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const providerIdParam = url.searchParams.get('providerId');
    const month = url.searchParams.get('month'); // Format: YYYY-MM
    const startDateParam = url.searchParams.get('startDate'); // Format: YYYY-MM-DD
    const endDateParam = url.searchParams.get('endDate'); // Format: YYYY-MM-DD

    if (!providerIdParam) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    const providerId = parseInt(providerIdParam, 10);
    if (isNaN(providerId) || providerId <= 0) {
      return NextResponse.json({ error: 'Invalid Provider ID' }, { status: 400 });
    }

    // Ensure provider_time_slots and availability tables exist
    await ensureAvailabilityTablesExist();

    let startDate, endDate;

    // Use explicit date range if provided
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
    }
    // Otherwise fall back to month calculation
    else if (month) {
      const [year, monthNumber] = month.split('-').map(Number);
      startDate = new Date(year, monthNumber - 1, 1);
      endDate = new Date(year, monthNumber, 0);
    } else {
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
    }

    // Helper function to format date consistently
    const formatDateToString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const formattedStartDate = formatDateToString(startDate);
    const formattedEndDate = formatDateToString(endDate);

    console.log(`Fetching availability for provider ${providerId} from ${formattedStartDate} to ${formattedEndDate}`);

    // First, get all dates in the month range
    const allDatesInMonth: { date: string; isAvailable: boolean; timeSlots: any[] }[] = [];

    // Generate all dates in the month
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Use consistent date formatting to avoid timezone issues
      const formattedDate = formatDateToString(currentDate);

      allDatesInMonth.push({
        date: formattedDate,
        isAvailable: false, // Default to false, will update with DB data
        timeSlots: []
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Generated ${allDatesInMonth.length} dates from ${formatDateToString(startDate)} to ${formatDateToString(endDate)}`)

    try {
      // Get time slots directly - this is simpler and more reliable
      const directTimeSlotsQuery = `
        SELECT
          DATE_FORMAT(pts.date, '%Y-%m-%d') as date,
          pts.id,
          TIME_FORMAT(pts.start_time, '%H:%i') as start_time,
          TIME_FORMAT(pts.end_time, '%H:%i') as end_time,
          pts.available_services,
          provider_id
        FROM provider_time_slots pts
        WHERE provider_id = ?
        AND pts.date BETWEEN ? AND ?
        ORDER BY pts.date, pts.start_time
      `;

      const timeSlots = await query(directTimeSlotsQuery, [providerId, formattedStartDate, formattedEndDate]) as any[];

      // Process time slots and mark dates as available
      console.log(`Found ${timeSlots.length} time slots for provider ${providerId}`);

      for (const slot of timeSlots) {
        // Convert MySQL date format to ISO string for consistent comparison
        const slotDate = slot.date.split('T')[0]; // Ensure we're using YYYY-MM-DD format
        console.log(`Processing slot for date: ${slotDate}, id: ${slot.id}`);

        const dateIndex = allDatesInMonth.findIndex(d => d.date === slotDate);
        console.log(`Date index in allDatesInMonth: ${dateIndex}`);

        if (dateIndex !== -1) {
          // If we have a time slot for a date, mark the date as available
          allDatesInMonth[dateIndex].isAvailable = true;
          console.log(`Marked date ${slotDate} as available`);

          // Parse the time slot and add it to the array
          const slotData: { id: string; start: string; end: string; availableServices?: number[] } = {
            id: slot.id.toString(),
            start: slot.start_time,
            end: slot.end_time,
            availableServices: [] // Default to empty array
          };

          // Parse availableServices if present
          try {
            if (slot.available_services) {
              let parsedServices;
              try {
                parsedServices = typeof slot.available_services === 'string'
                  ? JSON.parse(slot.available_services)
                  : slot.available_services;
              } catch {
                parsedServices = [];
              }

              // Ensure parsedServices is an array of numbers
              if (Array.isArray(parsedServices)) {
                // Convert any string IDs to numbers
                slotData.availableServices = parsedServices.map(id => {
                  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
                  return isNaN(numId) ? 0 : numId;
                }).filter(id => id !== 0);
              } else {
                slotData.availableServices = [];
              }
            } else {
              // If no services specified, all are available (represented by empty array)
              slotData.availableServices = [];
            }
          } catch {
            // Silently fail
          }

          allDatesInMonth[dateIndex].timeSlots.push(slotData);
        }
      }

      // Also get availability data to mark days as available even without time slots
      const availabilityQuery = `
        SELECT date, is_available
        FROM provider_availability
        WHERE provider_id = ? AND date BETWEEN ? AND ?
      `;

      const availabilityResult = await query(availabilityQuery, [providerId, formattedStartDate, formattedEndDate]) as any[];
      console.log(`Found ${availabilityResult.length} availability records for provider ${providerId}`);

      // Update availability based on the provider_availability table
      for (const availDay of availabilityResult) {
        console.log(`Processing availability for date: ${availDay.date}, is_available: ${availDay.is_available}`);

        // Format the date consistently
        let formattedAvailDate = availDay.date;
        if (availDay.date instanceof Date) {
          const d = new Date(availDay.date);
          formattedAvailDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (typeof availDay.date === 'string') {
          // If it's already a string, ensure it's in YYYY-MM-DD format
          if (availDay.date.includes('T')) {
            formattedAvailDate = availDay.date.split('T')[0];
          }
        }

        console.log(`Formatted availability date: ${formattedAvailDate}`);

        const dateIndex = allDatesInMonth.findIndex(d => d.date === formattedAvailDate);
        console.log(`Date index in allDatesInMonth: ${dateIndex}`);

        if (dateIndex !== -1) {
          const isAvailable = availDay.is_available === 1 || availDay.is_available === true;
          allDatesInMonth[dateIndex].isAvailable = isAvailable;
          console.log(`Marked date ${formattedAvailDate} availability as ${isAvailable}`);
        } else {
          console.log(`Date ${formattedAvailDate} not found in allDatesInMonth`);
        }
      }



      return NextResponse.json({
        availability: allDatesInMonth
      });

    } catch (dbError) {
      return NextResponse.json({
        error: 'Database error while fetching availability data',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      availability: [],
      error: 'Failed to fetch availability data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId: providerIdParam, availability } = body;

    if (!providerIdParam || !availability) {
      return NextResponse.json({ error: 'Provider ID and availability data are required' }, { status: 400 });
    }

    const providerId = parseInt(providerIdParam, 10);
    if (isNaN(providerId) || providerId <= 0) {
      return NextResponse.json({ error: 'Invalid Provider ID' }, { status: 400 });
    }

    const { date, isAvailable, timeSlots } = availability;

    if (!date || typeof isAvailable !== 'boolean' || !Array.isArray(timeSlots)) {
      return NextResponse.json({ error: 'Invalid availability data structure' }, { status: 400 });
    }

    // Validate and normalize the date format to prevent timezone issues
    let normalizedDate;
    try {
      // Parse the date string into a Date object
      const dateObj = new Date(date);

      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date');
      }

      // Format the date as YYYY-MM-DD to ensure consistency
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      normalizedDate = `${year}-${month}-${day}`;

      // Log the original and normalized dates for debugging
      console.log('Original date:', date);
      console.log('Normalized date:', normalizedDate);
    } catch {
      return NextResponse.json({
        error: 'Invalid date format',
        details: 'The provided date could not be parsed correctly'
      }, { status: 400 });
    }

    // Ensure tables exist
    const tablesExist = await ensureAvailabilityTablesExist();
    if (!tablesExist) {
      return NextResponse.json({ error: 'Database error: Tables not available' }, { status: 500 });
    }

    // **🔥 FIX: Use proper transaction management to prevent connection leaks**
    const result = await withTransaction(async (transaction) => {
      // First, update the provider_availability record
      const upsertAvailabilityQuery = `
        INSERT INTO provider_availability (provider_id, date, is_available)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE is_available = VALUES(is_available)
      `;
      await transaction.query(upsertAvailabilityQuery, [providerId, normalizedDate, isAvailable ? 1 : 0]);

      // Delete existing time slots for this date
      await transaction.query('DELETE FROM provider_time_slots WHERE provider_id = ? AND date = ?', [providerId, normalizedDate]);

      // Add new time slots if available
      if (isAvailable && timeSlots && timeSlots.length > 0) {
        for (const slot of timeSlots) {
          if (!slot || typeof slot.start !== 'string' || typeof slot.end !== 'string') {
            continue;
          }

          // Format times properly
          const startTime = slot.start.substring(0, 5); // HH:MM format
          const endTime = slot.end.substring(0, 5);     // HH:MM format

          // Format available services
          const availableServicesJson = Array.isArray(slot.availableServices) && slot.availableServices.length > 0
            ? JSON.stringify(slot.availableServices.filter((id: number) => id !== 0))
            : null;

          // Insert the time slot with explicit column names
          const insertSlotQuery = `
            INSERT INTO provider_time_slots
              (provider_id, date, start_time, end_time, available_services)
            VALUES
              (?, ?, ?, ?, ?)
          `;

          await transaction.query(insertSlotQuery, [
            providerId,
            normalizedDate,
            startTime,
            endTime,
            availableServicesJson
          ]);
        }
      }

      return { 
        success: true,
        slotsCount: timeSlots.length 
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully',
      date: normalizedDate,
      original_date: date,
      slots_count: result.slotsCount
    });

  } catch (error) {
    console.error('Availability update error:', error);
    return NextResponse.json({
      error: 'Failed to update availability data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}