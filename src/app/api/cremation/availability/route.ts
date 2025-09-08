import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

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

    // Prefer normalized tables if present; fallback to JSON columns

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

    // Date range is used for generating the month view; data comes from normalized tables if present


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


    try {
      // Detect normalized tables
      const tables = await query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('provider_availability','availability_time_slots')`
      ) as any[];
      const hasDays = tables.some((t: any) => t.TABLE_NAME.toLowerCase() === 'provider_availability');
      const hasSlots = tables.some((t: any) => t.TABLE_NAME.toLowerCase() === 'availability_time_slots');

      if (hasDays && hasSlots) {
        // Load from normalized tables
        const daysRows = await query(
          `SELECT availability_date AS d, is_available AS ia
           FROM provider_availability
           WHERE provider_id = ? AND availability_date BETWEEN ? AND ?`,
          [providerId, formatDateToString(startDate), formatDateToString(endDate)]
        ) as any[];

        const slotsRows = await query(
          `SELECT availability_date AS d,
                  TIME_FORMAT(start_time,'%H:%i') AS start,
                  TIME_FORMAT(end_time,'%H:%i')   AS end
           FROM availability_time_slots
           WHERE provider_id = ? AND availability_date BETWEEN ? AND ?
           ORDER BY start_time`,
          [providerId, formatDateToString(startDate), formatDateToString(endDate)]
        ) as any[];

        const dateToAvail = new Map<string, boolean>();
        for (const r of daysRows) {
          if (r.d) dateToAvail.set(String(r.d).slice(0,10), Boolean(r.ia));
        }
        const dateToSlots = new Map<string, {start: string; end: string;}[]>();
        for (const r of slotsRows) {
          const key = String(r.d).slice(0,10);
          if (!dateToSlots.has(key)) dateToSlots.set(key, []);
          dateToSlots.get(key)!.push({ start: r.start, end: r.end });
        }

        for (const dateObj of allDatesInMonth) {
          if (dateToAvail.has(dateObj.date)) {
            dateObj.isAvailable = dateToAvail.get(dateObj.date) === true;
          }
          const slots = dateToSlots.get(dateObj.date) || [];
          if (slots.length > 0) {
            dateObj.timeSlots = slots.map((s, idx) => ({ id: `${dateObj.date}-${idx}`, start: s.start, end: s.end, availableServices: [] }));
            dateObj.isAvailable = true;
          }
        }

        return NextResponse.json({ availability: allDatesInMonth });
      }

      // Fallback to JSON columns in service_providers
      const providerResult = await query(
        `SELECT provider_id, availability_data, time_slots_data FROM service_providers WHERE provider_id = ?`,
        [providerId]
      ) as any[];

      if (!providerResult || providerResult.length === 0) {
        return NextResponse.json({ availability: allDatesInMonth });
      }

      const provider = providerResult[0];
      let availabilityData: Record<string, boolean> = {};
      let timeSlotsData: Record<string, any[]> = {};
      try { availabilityData = provider.availability_data ? JSON.parse(provider.availability_data) : {}; } catch { availabilityData = {}; }
      try { timeSlotsData = provider.time_slots_data ? JSON.parse(provider.time_slots_data) : {}; } catch { timeSlotsData = {}; }

      for (const dateObj of allDatesInMonth) {
        const dateKey = dateObj.date;
        if (availabilityData[dateKey] !== undefined) {
          dateObj.isAvailable = Boolean(availabilityData[dateKey]);
        }
        if (timeSlotsData[dateKey] && Array.isArray(timeSlotsData[dateKey])) {
          dateObj.timeSlots = timeSlotsData[dateKey].map((slot: any, index: number) => ({
            id: slot.id || `${dateKey}-${index}`,
            start: slot.start || slot.start_time,
            end: slot.end || slot.end_time,
            availableServices: Array.isArray(slot.availableServices) ? slot.availableServices : []
          }));
          if (dateObj.timeSlots.length > 0) {
            dateObj.isAvailable = true;
          }
        }
      }

      return NextResponse.json({ availability: allDatesInMonth });

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
    const user = await verifySecureAuth(request);
    if (!user || user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { providerId: providerIdParam, availability } = body;

    if (!providerIdParam || !availability) {
      return NextResponse.json({ error: 'Provider ID and availability data are required' }, { status: 400 });
    }

    const providerId = parseInt(providerIdParam, 10);
    if (isNaN(providerId) || providerId <= 0) {
      return NextResponse.json({ error: 'Invalid Provider ID' }, { status: 400 });
    }

    // Authorization: ensure the authenticated business owns this providerId
    const ownershipCheck = await query(
      'SELECT provider_id FROM service_providers WHERE provider_id = ? AND user_id = ?',
      [providerId, user.userId]
    ) as any[];
    if (!ownershipCheck || ownershipCheck.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    } catch {
      return NextResponse.json({
        error: 'Invalid date format',
        details: 'The provided date could not be parsed correctly'
      }, { status: 400 });
    }

    // Using existing service_providers table with JSON columns - no additional tables needed

    // Validate time slots: format, order, and overlap
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    for (const slot of timeSlots) {
      if (!slot || typeof slot.start !== 'string' || typeof slot.end !== 'string') {
        return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 });
      }
      if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
        return NextResponse.json({ error: 'Invalid time format. Use HH:MM' }, { status: 400 });
      }
      if (slot.start >= slot.end) {
        return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
      }
    }

    // Sort and check overlap
    const sortedSlots = [...timeSlots].sort((a,b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sortedSlots.length; i++) {
      if (sortedSlots[i].start < sortedSlots[i-1].end) {
        return NextResponse.json({ error: 'Overlapping time slots are not allowed' }, { status: 400 });
      }
    }

    // Disallow past dates
    const today = new Date(); today.setHours(0,0,0,0);
    const targetDate = new Date(normalizedDate);
    if (targetDate < today) {
      return NextResponse.json({ error: 'Cannot modify availability for past dates' }, { status: 400 });
    }

    // Use JSON columns approach - much cleaner!
    const result = await withTransaction(async (transaction) => {
      // Get current JSON data
      const currentData = await transaction.query(
        'SELECT availability_data, time_slots_data FROM service_providers WHERE provider_id = ?',
        [providerId]
      ) as any[];

      let availabilityData: Record<string, boolean> = {};
      let timeSlotsData: Record<string, any[]> = {};

      if (currentData && currentData.length > 0) {
        try {
          availabilityData = currentData[0].availability_data ? JSON.parse(currentData[0].availability_data) : {};
        } catch {
          availabilityData = {};
        }
        try {
          timeSlotsData = currentData[0].time_slots_data ? JSON.parse(currentData[0].time_slots_data) : {};
        } catch {
          timeSlotsData = {};
        }
      }

      // Update availability for the specific date
      availabilityData[normalizedDate] = isAvailable;

      // Update time slots for the specific date
      if (!isAvailable) {
        // Remove time slots if day is not available
        delete timeSlotsData[normalizedDate];
      } else {
        // Update time slots
        timeSlotsData[normalizedDate] = sortedSlots.map((slot, index) => ({
          id: slot.id || `${normalizedDate}-${index}`,
          start: slot.start.substring(0, 5),
          end: slot.end.substring(0, 5),
          availableServices: Array.isArray(slot.availableServices) 
            ? slot.availableServices.filter((id: number) => id !== 0)
            : []
        }));
      }

      // Update the provider record with new JSON data
      await transaction.query(
        `UPDATE service_providers 
         SET availability_data = ?, time_slots_data = ? 
         WHERE provider_id = ?`,
        [JSON.stringify(availabilityData), JSON.stringify(timeSlotsData), providerId]
      );

      return { 
        success: true,
        slotsCount: sortedSlots.length 
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
