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

    // Check if service_providers table exists
    const tableCheckQuery = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'service_providers'
    `;
    
    const tablesResult = await query(tableCheckQuery) as any[];
    
    if (!tablesResult || tablesResult.length === 0) {
      return NextResponse.json(
        { error: 'Database tables not properly configured. Missing service_providers table.' },
        { status: 500 }
      );
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

          // Use the service_providers table with availability_data JSON column
          
          // Get current availability data
          const currentData = await transaction.query(
            'SELECT availability_data FROM service_providers WHERE provider_id = ?',
            [providerId]
          ) as any[];

          let availabilityData: Record<string, any> = {};
          if (currentData.length > 0 && currentData[0].availability_data) {
            try {
              availabilityData = JSON.parse(currentData[0].availability_data);
            } catch {
              console.warn('Failed to parse existing availability_data, starting fresh');
              availabilityData = {};
            }
          }

          // Validate and process time slots if available
          if (isAvailable && timeSlots && timeSlots.length > 0) {
            // Sort and reject overlaps for each day
            const sorted = [...timeSlots].sort((a: any, b: any) => a.start.localeCompare(b.start));
            for (let i = 1; i < sorted.length; i++) {
              if (sorted[i].start < sorted[i - 1].end) {
                throw new Error('Overlapping time slots are not allowed');
              }
            }

            // Validate each time slot
            for (const slot of sorted) {
              // Validate time slot format
              if (!slot.start || !slot.end) {
                throw new Error('Invalid time slot format: start and end times required');
              }

              // Validate time format (HH:MM)
              const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
              if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
                throw new Error('Invalid time format. Use HH:MM format');
              }

              // Validate start time is before end time
              if (slot.start >= slot.end) {
                throw new Error('Start time must be before end time');
              }
            }

            // Store the processed time slots
            availabilityData[date] = {
              isAvailable,
              timeSlots: sorted.map(slot => ({
                start: slot.start,
                end: slot.end,
                availableServices: Array.isArray(slot.availableServices) 
                  ? slot.availableServices.filter((id: number) => id !== 0)
                  : []
              }))
            };
          } else {
            // Mark date as unavailable
            availabilityData[date] = {
              isAvailable: false,
              timeSlots: []
            };
          }

          // Get current time slots data
          const currentTimeSlotsData = await transaction.query(
            'SELECT time_slots_data FROM service_providers WHERE provider_id = ?',
            [providerId]
          ) as any[];

          let timeSlotsData: Record<string, any[]> = {};
          if (currentTimeSlotsData && currentTimeSlotsData.length > 0) {
            try {
              timeSlotsData = currentTimeSlotsData[0].time_slots_data ? JSON.parse(currentTimeSlotsData[0].time_slots_data) : {};
            } catch {
              timeSlotsData = {};
            }
          }

          // Update time slots data for this date
          if (isAvailable && timeSlots && timeSlots.length > 0) {
            timeSlotsData[date] = timeSlots.map((slot: any, index: number) => ({
              id: slot.id || `${date}-${Date.now()}-${index}`,
              start: slot.start,
              end: slot.end,
              availableServices: Array.isArray(slot.availableServices) 
                ? slot.availableServices.filter((id: number) => id !== 0)
                : []
            }));
          } else {
            // Remove time slots if day is not available
            delete timeSlotsData[date];
          }

          // Update both availability_data and time_slots_data JSON columns
          await transaction.query(
            'UPDATE service_providers SET availability_data = ?, time_slots_data = ?, updated_at = NOW() WHERE provider_id = ?',
            [JSON.stringify(availabilityData), JSON.stringify(timeSlotsData), providerId]
          );

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
