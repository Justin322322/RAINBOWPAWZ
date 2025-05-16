import { NextRequest, NextResponse } from 'next/server';
import { query, ensureAvailabilityTablesExist } from '@/lib/db';

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
    
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    console.log(`[API] Fetching availability for provider ${providerId} from ${formattedStartDate} to ${formattedEndDate}`);
    
    // First, get all dates in the month range
    const allDatesInMonth: { date: string; isAvailable: boolean; timeSlots: any[] }[] = [];
    
    // Generate all dates in the month
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      allDatesInMonth.push({
        date: currentDate.toISOString().split('T')[0],
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
        FROM provider_time_slots pts
        WHERE provider_id = ? 
        AND pts.date BETWEEN ? AND ?
        ORDER BY pts.date, pts.start_time
      `;
      
      console.log(`[API] Running direct query: ${directTimeSlotsQuery} with params [${providerId}, ${formattedStartDate}, ${formattedEndDate}]`);
      const timeSlots = await query(directTimeSlotsQuery, [providerId, formattedStartDate, formattedEndDate]) as any[];
      
      console.log(`[API] Got ${timeSlots.length} time slots from database:`, timeSlots);
      
      // Process time slots and mark dates as available
      for (const slot of timeSlots) {
        // Convert MySQL date format to ISO string for consistent comparison
        const slotDate = slot.date.split('T')[0]; // Ensure we're using YYYY-MM-DD format
        const dateIndex = allDatesInMonth.findIndex(d => d.date === slotDate);
        
        console.log(`[API] Processing time slot for date ${slotDate}, database date: ${slot.date}, matched index: ${dateIndex}`);
        
        if (dateIndex !== -1) {
          console.log(`[API] Matched time slot for date ${slotDate} to index ${dateIndex}. Pushing slot:`, slot);
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
              } catch (parseError) {
                console.error(`[API] Error parsing JSON for available_services: ${parseError}. Raw value:`, slot.available_services);
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
                console.warn(`[API] availableServices is not an array:`, parsedServices);
                slotData.availableServices = [];
              }
              
              // Debug to check what we've parsed
              console.log(`[API] Parsed available services for slot ${slot.id}:`, slotData.availableServices);
            } else {
              // If no services specified, all are available (represented by empty array)
              slotData.availableServices = [];
            }
          } catch (e) {
            console.error(`[API] Error processing available_services for slot ${slot.id}:`, e);
          }
          
          allDatesInMonth[dateIndex].timeSlots.push(slotData);
          console.log(`[API] Added time slot to date ${slotDate}, now has ${allDatesInMonth[dateIndex].timeSlots.length} slots`);
        } else {
          console.error(`[API] Could not find matching date for time slot date ${slotDate} in allDatesInMonth array`);
          // Debug: print all dates in allDatesInMonth to help diagnose
          console.log(`[API] Available dates in allDatesInMonth: ${allDatesInMonth.map(d => d.date).join(', ')}`);
        }
      }
      
      // Also get availability data to mark days as available even without time slots
      const availabilityQuery = `
        SELECT date, is_available 
        FROM provider_availability 
        WHERE provider_id = ? AND date BETWEEN ? AND ?
      `;
      
      const availabilityResult = await query(availabilityQuery, [providerId, formattedStartDate, formattedEndDate]) as any[];
      
      // Update availability based on the provider_availability table
      for (const availDay of availabilityResult) {
        const dateIndex = allDatesInMonth.findIndex(d => d.date === availDay.date);
        if (dateIndex !== -1) {
          allDatesInMonth[dateIndex].isAvailable = availDay.is_available === 1 || availDay.is_available === true;
        }
      }
      
      // Find days with time slots for debugging
      const daysWithTimeSlots = allDatesInMonth.filter(d => d.timeSlots.length > 0);
      console.log(`[API] Found ${daysWithTimeSlots.length} days with time slots:`, 
        daysWithTimeSlots.map(d => `${d.date}: ${d.timeSlots.length} slots`));
      
      // Detailed logging of time slots with their available services
      daysWithTimeSlots.forEach(day => {
        console.log(`[API] Day ${day.date} has ${day.timeSlots.length} time slots:`);
        day.timeSlots.forEach(slot => {
          console.log(`  - Slot ID ${slot.id}, Time ${slot.start}-${slot.end}, Available services: ${JSON.stringify(slot.availableServices)}`);
        });
      });
      
      return NextResponse.json({ 
        availability: allDatesInMonth,
        debug: {
          provider_id: providerId,
          date_range: `${formattedStartDate} to ${formattedEndDate}`,
          days_with_slots: daysWithTimeSlots.length,
          total_slots: daysWithTimeSlots.reduce((sum, day) => sum + day.timeSlots.length, 0)
        }
      });
      
    } catch (dbError) {
      console.error('[API] Database error while fetching availability:', dbError);
      return NextResponse.json({
        error: 'Database error while fetching availability data',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[API] Error fetching provider availability:', error);
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
    
    console.log('[API] Received availability update request with body:', JSON.stringify(body, null, 2));
    
    if (!providerIdParam || !availability) {
      console.error('[API] Missing required data:', { providerIdParam, availability });
      return NextResponse.json({ error: 'Provider ID and availability data are required' }, { status: 400 });
    }

    const providerId = parseInt(providerIdParam, 10);
    if (isNaN(providerId) || providerId <= 0) {
      console.error('[API] Invalid Provider ID received:', providerIdParam);
      return NextResponse.json({ error: 'Invalid Provider ID' }, { status: 400 });
    }
    
    const { date, isAvailable, timeSlots } = availability;

    if (!date || typeof isAvailable !== 'boolean' || !Array.isArray(timeSlots)) {
      console.error('[API] Invalid availability structure:', availability);
      return NextResponse.json({ error: 'Invalid availability data structure' }, { status: 400 });
    }
    
    // Ensure tables exist
    const tablesExist = await ensureAvailabilityTablesExist();
    if (!tablesExist) {
      console.error('[API] Failed to create or verify availability tables during POST');
      return NextResponse.json({ error: 'Database error: Tables not available' }, { status: 500 });
    }
    
    try {
      // Start transaction
      await query('START TRANSACTION');
      
      // First, update the provider_availability record
      const upsertAvailabilityQuery = `
        INSERT INTO provider_availability (provider_id, date, is_available) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE is_available = VALUES(is_available)
      `;
      await query(upsertAvailabilityQuery, [providerId, date, isAvailable ? 1 : 0]);
      
      // Delete existing time slots for this date
      await query('DELETE FROM provider_time_slots WHERE provider_id = ? AND date = ?', [providerId, date]);
      
      // Add new time slots if available
      if (isAvailable && timeSlots && timeSlots.length > 0) {
        for (const slot of timeSlots) {
          if (!slot || typeof slot.start !== 'string' || typeof slot.end !== 'string') {
            console.warn('[API] Skipping invalid time slot:', slot);
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
          
          await query(insertSlotQuery, [
            providerId,
            date,
            startTime,
            endTime,
            availableServicesJson
          ]);
          
          console.log(`[API] Added time slot ${startTime}-${endTime} for date ${date}`);
        }
      }
      
      // Commit transaction
      await query('COMMIT');
      
      console.log(`[API] Successfully saved availability for provider ${providerId} on ${date}`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Availability updated successfully',
        date,
        slots_count: timeSlots.length
      });
      
    } catch (dbError) {
      // Rollback on error
      await query('ROLLBACK');
      console.error('[API] Database error while saving availability:', dbError);
      
      return NextResponse.json({
        error: 'Database error while saving availability',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[API] Error updating provider availability:', error);
    return NextResponse.json({
      error: 'Failed to update availability data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 