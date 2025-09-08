import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user || user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Get the time slot ID and provider ID from the URL parameters
    const url = new URL(request.url);
    const slotId = url.searchParams.get('slotId');
    const providerId = url.searchParams.get('providerId');
    const date = url.searchParams.get('date'); // Optional date parameter for additional filtering


    if (!slotId) {
      return NextResponse.json({ error: 'Time slot ID is required' }, { status: 400 });
    }

    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }

    // Validate provider ID
    const providerIdNum = parseInt(providerId, 10);
    if (isNaN(providerIdNum) || providerIdNum <= 0) {
      return NextResponse.json({ error: 'Invalid Provider ID' }, { status: 400 });
    }

    // Check if provider exists and get time slots data
    const checkQuery = `
      SELECT
        provider_id,
        time_slots_data
      FROM service_providers
      WHERE provider_id = ?
    `;
    const checkResult = await query(checkQuery, [providerIdNum]) as any[];

    if (!checkResult || checkResult.length === 0) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Ensure slot belongs to the authenticated provider
    const owner = await query('SELECT provider_id FROM service_providers WHERE provider_id = ? AND user_id = ?', [providerIdNum, user.userId]) as any[];
    if (!owner || owner.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use proper transaction management with JSON column approach
    const result = await withTransaction(async (transaction) => {
      const provider = checkResult[0];
      let timeSlotsData: Record<string, any[]> = {};

      // Parse existing time slots data
      try {
        timeSlotsData = provider.time_slots_data ? JSON.parse(provider.time_slots_data) : {};
      } catch {
        timeSlotsData = {};
      }

      let deletedSlot = null;
      let remainingCount = 0;

      if (date) {
        // Delete all time slots for a specific date
        if (timeSlotsData[date]) {
          deletedSlot = { date, slots: timeSlotsData[date] };
          delete timeSlotsData[date];
          remainingCount = 0;
        } else {
          throw new Error('No time slots found for the specified date');
        }
      } else {
        // Delete specific time slot by ID
        let found = false;
        for (const [dateKey, slots] of Object.entries(timeSlotsData)) {
          const slotIndex = slots.findIndex((slot: any) => slot.id === slotId);
          if (slotIndex !== -1) {
            deletedSlot = { date: dateKey, slot: slots[slotIndex] };
            slots.splice(slotIndex, 1);
            remainingCount = slots.length;
            found = true;
            break;
          }
        }
        
        if (!found) {
          throw new Error('Time slot not found');
        }
      }

      // Update the time_slots_data JSON column
      await transaction.query(
        'UPDATE service_providers SET time_slots_data = ? WHERE provider_id = ?',
        [JSON.stringify(timeSlotsData), providerIdNum]
      );

      return {
        success: true,
        message: 'Time slot deleted successfully',
        deletedSlot,
        remaining_slots: remainingCount,
        method: date ? 'delete-by-date' : 'delete-by-id'
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Time slot deletion error:', error);
    return NextResponse.json({
      error: 'Failed to delete time slot',
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
    const { providerId: providerIdParam, date, timeSlot } = body;

    if (!providerIdParam || !date || !timeSlot) {
      return NextResponse.json({ 
        error: 'Provider ID, date, and time slot data are required' 
      }, { status: 400 });
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

    // Validate date format
    let normalizedDate;
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date');
      }
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      normalizedDate = `${year}-${month}-${day}`;
    } catch {
      return NextResponse.json({
        error: 'Invalid date format',
        details: 'The provided date could not be parsed correctly'
      }, { status: 400 });
    }

    // Validate time slot
    const { start, end, availableServices = [] } = timeSlot;
    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start) || !timeRegex.test(end)) {
      return NextResponse.json({ error: 'Invalid time format. Use HH:MM' }, { status: 400 });
    }

    if (start >= end) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    // Disallow past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(normalizedDate);
    if (targetDate < today) {
      return NextResponse.json({ error: 'Cannot add time slots for past dates' }, { status: 400 });
    }

    // Use JSON columns approach
    const result = await withTransaction(async (transaction) => {
      // Get current time slots data
      const currentData = await transaction.query(
        'SELECT time_slots_data FROM service_providers WHERE provider_id = ?',
        [providerId]
      ) as any[];

      let timeSlotsData: Record<string, any[]> = {};
      if (currentData && currentData.length > 0) {
        try {
          timeSlotsData = currentData[0].time_slots_data ? JSON.parse(currentData[0].time_slots_data) : {};
        } catch {
          timeSlotsData = {};
        }
      }

      // Initialize array for this date if it doesn't exist
      if (!timeSlotsData[normalizedDate]) {
        timeSlotsData[normalizedDate] = [];
      }

      // Check for overlapping time slots
      const existingSlots = timeSlotsData[normalizedDate];
      for (const existingSlot of existingSlots) {
        if ((start < existingSlot.end && end > existingSlot.start)) {
          throw new Error('Time slot overlaps with existing slot');
        }
      }

      // Generate unique ID for the time slot
      const slotId = `${normalizedDate}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add the new time slot
      const newSlot = {
        id: slotId,
        start: start.substring(0, 5),
        end: end.substring(0, 5),
        availableServices: Array.isArray(availableServices) 
          ? availableServices.filter((id: number) => id !== 0)
          : []
      };

      timeSlotsData[normalizedDate].push(newSlot);

      // Sort time slots by start time
      timeSlotsData[normalizedDate].sort((a: any, b: any) => a.start.localeCompare(b.start));

      // Update the time_slots_data JSON column
      await transaction.query(
        'UPDATE service_providers SET time_slots_data = ? WHERE provider_id = ?',
        [JSON.stringify(timeSlotsData), providerId]
      );

      return {
        success: true,
        slotId,
        slot: newSlot,
        totalSlots: timeSlotsData[normalizedDate].length
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Time slot added successfully',
      date: normalizedDate,
      slotId: result.slotId,
      slot: result.slot,
      totalSlots: result.totalSlots
    });

  } catch (error) {
    console.error('Time slot addition error:', error);
    return NextResponse.json({
      error: 'Failed to add time slot',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
