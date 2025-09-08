import { NextRequest, NextResponse } from 'next/server';
import { query, ensureAvailabilityTablesExist, withTransaction } from '@/lib/db';
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

    // Ensure service_providers and availability tables exist
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
      // Get time slots directly - this is simpler and more reliable
      const directTimeSlotsQuery = `
        SELECT
          DATE_FORMAT(pts.date, '%Y-%m-%d') as date,
          pts.id,
          TIME_FORMAT(pts.start_time, '%H:%i') as start_time,
          TIME_FORMAT(pts.end_time, '%H:%i') as end_time,
          pts.available_services,
          provider_id
        FROM service_providers pts
        WHERE provider_id = ?
        AND pts.date BETWEEN ? AND ?
        ORDER BY pts.date, pts.start_time
      `;

      const timeSlots = await query(directTimeSlotsQuery, [providerId, formattedStartDate, formattedEndDate]) as any[];

      // Process time slots and mark dates as available

      for (const slot of timeSlots) {
        // Convert MySQL date format to ISO string for consistent comparison
        const slotDate = slot.date.split('T')[0]; // Ensure we're using YYYY-MM-DD format

        const dateIndex = allDatesInMonth.findIndex(d => d.date === slotDate);

        if (dateIndex !== -1) {
          // If we have a time slot for a date, mark the date as available
          allDatesInMonth[dateIndex].isAvailable = true;

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
        FROM service_providers
        WHERE provider_id = ? AND date BETWEEN ? AND ?
      `;

      const availabilityResult = await query(availabilityQuery, [providerId, formattedStartDate, formattedEndDate]) as any[];

      // Update availability based on the service_providers table
      for (const availDay of availabilityResult) {

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


        const dateIndex = allDatesInMonth.findIndex(d => d.date === formattedAvailDate);

        if (dateIndex !== -1) {
          const isAvailable = availDay.is_available === 1 || availDay.is_available === true;
          allDatesInMonth[dateIndex].isAvailable = isAvailable;
        } else {
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

    // Ensure tables exist
    const tablesExist = await ensureAvailabilityTablesExist();
    if (!tablesExist) {
      return NextResponse.json({ error: 'Database error: Tables not available' }, { status: 500 });
    }

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

    // **Use proper transaction management to prevent connection leaks**
    const result = await withTransaction(async (transaction) => {
      // First, update the service_providers record
      const upsertAvailabilityQuery = `
        INSERT INTO service_providers (provider_id, date, is_available)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE is_available = VALUES(is_available)
      `;
      await transaction.query(upsertAvailabilityQuery, [providerId, normalizedDate, isAvailable ? 1 : 0]);

      // If day is not available, remove all slots
      if (!isAvailable) {
        await transaction.query('DELETE FROM service_providers WHERE provider_id = ? AND date = ?', [providerId, normalizedDate]);
      } else if (sortedSlots && sortedSlots.length > 0) {
        // Fetch existing slots for diffing
        const existingRows = await transaction.query(
          `SELECT id, TIME_FORMAT(start_time, '%H:%i') as start_time, TIME_FORMAT(end_time, '%H:%i') as end_time
           FROM service_providers WHERE provider_id = ? AND date = ? ORDER BY start_time`,
          [providerId, normalizedDate]
        ) as any[];

        const existingById = new Map<number, { start_time: string; end_time: string }>();
        for (const row of existingRows) {
          const rowIdNumber = Number(row?.id);
          if (row?.id !== null && row?.id !== undefined && Number.isFinite(rowIdNumber)) {
            existingById.set(rowIdNumber, { start_time: row.start_time, end_time: row.end_time });
          }
        }

        const incomingIds = new Set<number>();

        // Upsert incoming slots
        for (const slot of sortedSlots) {
          const idNum = Number(slot.id);
          const hasExisting = Number.isFinite(idNum) && existingById.has(idNum);
          const startTime = slot.start.substring(0, 5);
          const endTime = slot.end.substring(0, 5);
          const availableServicesJson = Array.isArray(slot.availableServices) && slot.availableServices.length > 0
            ? JSON.stringify(slot.availableServices.filter((id: number) => id !== 0))
            : null;

          if (hasExisting) {
            incomingIds.add(idNum);
            await transaction.query(
              `UPDATE service_providers SET start_time = ?, end_time = ?, available_services = ? WHERE id = ? AND provider_id = ? AND date = ?`,
              [startTime, endTime, availableServicesJson, idNum, providerId, normalizedDate]
            );
          } else {
            await transaction.query(
              `INSERT INTO service_providers (provider_id, date, start_time, end_time, available_services) VALUES (?, ?, ?, ?, ?)`,
              [providerId, normalizedDate, startTime, endTime, availableServicesJson]
            );
          }
        }

        // Delete slots that are not present anymore
        const idsToDelete = Array.from(existingById.keys()).filter((id) => !incomingIds.has(id));
        if (idsToDelete.length > 0) {
          const placeholders = idsToDelete.map(() => '?').join(',');
          await transaction.query(
            `DELETE FROM service_providers WHERE provider_id = ? AND id IN (${placeholders})`,
            [providerId, ...idsToDelete]
          );
        }
      }

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
