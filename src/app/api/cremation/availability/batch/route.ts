import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { verifySecureAuth } from '@/lib/secureAuth';

export async function POST(request: NextRequest) {
  try {
    const user = await verifySecureAuth(request);
    if (!user || user.accountType !== 'business') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { providerId, availabilityBatch } = await request.json();

    if (!providerId || !availabilityBatch || !Array.isArray(availabilityBatch)) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId and availabilityBatch (array)' },
        { status: 400 }
      );
    }

    // Validate providerId
    if (isNaN(Number(providerId)) || Number(providerId) <= 0) {
      return NextResponse.json(
        { error: 'Invalid providerId provided' },
        { status: 400 }
      );
    }

    // Authorization: ensure the authenticated business owns this providerId
    const ownershipCheck = await query(
      'SELECT provider_id FROM service_providers WHERE provider_id = ? AND user_id = ?',
      [providerId, user.userId]
    ) as any[];
    if (!ownershipCheck || ownershipCheck.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate batch size to prevent overwhelming the database
    if (availabilityBatch.length > 500) {
      return NextResponse.json(
        { error: 'Batch size too large. Maximum 500 days allowed per request.' },
        { status: 400 }
      );
    }

    // Detect normalized tables
    const tableCheckQuery = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('service_providers','provider_availability','availability_time_slots')
    `;
    const tablesResult = await query(tableCheckQuery) as any[];
    const hasProvider = tablesResult.some((t:any)=>t.TABLE_NAME.toLowerCase()==='service_providers');
    const hasDays = tablesResult.some((t:any)=>t.TABLE_NAME.toLowerCase()==='provider_availability');
    const hasSlots = tablesResult.some((t:any)=>t.TABLE_NAME.toLowerCase()==='availability_time_slots');
    if (!hasProvider) {
      return NextResponse.json({ error: 'Missing service_providers table.' }, { status: 500 });
    }

    // **🔥 FIX: Use proper transaction management to prevent connection leaks**
    const result = await withTransaction(async (transaction) => {
      let successCount = 0;
      const errors = [];

      // Process each day in the batch
      for (const dayData of availabilityBatch) {
        try {
          const { date, isAvailable, timeSlots } = dayData;

          // Validate date format
          if (!date || typeof date !== 'string') {
            throw new Error('Invalid date format');
          }

          // Validate date is not in the past
          const dateObj = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (dateObj < today) {
            throw new Error('Cannot set availability for past dates');
          }

          // Prefer normalized tables when available; otherwise update JSON columns
          
          // Common validations for slots
          const validateSlots = (list: any[]) => {
            const sorted = [...list].sort((a: any, b: any) => a.start.localeCompare(b.start));
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i].start < sorted[i - 1].end) {
                throw new Error('Overlapping time slots are not allowed');
              }
            }
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            for (const slot of sorted) {
              if (!slot.start || !slot.end) throw new Error('Invalid time slot format: start and end required');
              if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) throw new Error('Invalid time format. Use HH:MM');
              if (slot.start >= slot.end) throw new Error('Start time must be before end time');
            }
            return sorted;
          };

          if (hasDays && hasSlots) {
            // Upsert day availability
            await transaction.query(
              `INSERT INTO provider_availability (provider_id, availability_date, is_available)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE is_available = VALUES(is_available), updated_at = NOW()`,
              [providerId, date, isAvailable ? 1 : 0]
            );

            // Replace slots for the date
            await transaction.query(
              `DELETE FROM availability_time_slots WHERE provider_id = ? AND availability_date = ?`,
              [providerId, date]
            );
            if (isAvailable && Array.isArray(timeSlots) && timeSlots.length > 0) {
              const sorted = validateSlots(timeSlots);
              for (const slot of sorted) {
                await transaction.query(
                  `INSERT INTO availability_time_slots (provider_id, availability_date, start_time, end_time)
                   VALUES (?, ?, STR_TO_DATE(?, '%H:%i'), STR_TO_DATE(?, '%H:%i'))`,
                  [providerId, date, slot.start, slot.end]
                );
              }
            }
          } else {
            // Fallback to JSON storage in service_providers
            const currentData = await transaction.query(
              'SELECT availability_data, time_slots_data FROM service_providers WHERE provider_id = ?',
              [providerId]
            ) as any[];
            let availabilityData: Record<string, any> = {};
            let timeSlotsData: Record<string, any[]> = {};
            try { availabilityData = currentData[0]?.availability_data ? JSON.parse(currentData[0].availability_data) : {}; } catch { availabilityData = {}; }
            try { timeSlotsData = currentData[0]?.time_slots_data ? JSON.parse(currentData[0].time_slots_data) : {}; } catch { timeSlotsData = {}; }

            if (isAvailable && Array.isArray(timeSlots) && timeSlots.length > 0) {
              const sorted = validateSlots(timeSlots);
              availabilityData[date] = true;
              timeSlotsData[date] = sorted.map((slot:any, idx:number)=>({ id: `${date}-${Date.now()}-${idx}`, start: slot.start, end: slot.end, availableServices: Array.isArray(slot.availableServices)? slot.availableServices.filter((n:number)=>n!==0): [] }));
            } else {
              availabilityData[date] = false;
              delete timeSlotsData[date];
            }
            await transaction.query(
              'UPDATE service_providers SET availability_data = ?, time_slots_data = ?, updated_at = NOW() WHERE provider_id = ?',
              [JSON.stringify(availabilityData), JSON.stringify(timeSlotsData), providerId]
            );
          }

          successCount++;

        } catch (dayError) {
          console.error(`Error processing day ${dayData.date}:`, dayError);
          errors.push(`${dayData.date}: ${dayError instanceof Error ? dayError.message : String(dayError)}`);
          // Continue processing other days even if this one failed
          continue;
        }
      }

      // Restore original behavior: rollback if no days succeeded
      if (successCount === 0) {
        throw new Error('No days were successfully processed');
      }

      return { successCount, errors };
    });


    return NextResponse.json({
      success: true,
      message: `Batch availability update completed. ${result.successCount} days processed successfully.`,
      successCount: result.successCount,
      errorCount: result.errors.length,
      errors: result.errors
    });

  } catch (error) {
    console.error('Batch availability update error:', error);
    return NextResponse.json({
      error: 'Failed to update availability',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
