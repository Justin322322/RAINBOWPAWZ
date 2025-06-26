import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
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

    // Validate batch size to prevent overwhelming the database
    if (availabilityBatch.length > 500) {
      return NextResponse.json(
        { error: 'Batch size too large. Maximum 500 days allowed per request.' },
        { status: 400 }
      );
    }

    // Check if required tables exist and use the correct table names
    const tableCheckQuery = `
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('provider_availability', 'provider_time_slots', 'availability_time_slots', 'time_slot_services')
    `;
    
    const tablesResult = await query(tableCheckQuery) as any[];
    const existingTables = tablesResult.map((row: any) => row.TABLE_NAME.toLowerCase());
    
    // Determine which table structure to use
    const useProviderTimeSlots = existingTables.includes('provider_time_slots');
    const useAvailabilityTimeSlots = existingTables.includes('availability_time_slots');
    const useProviderAvailability = existingTables.includes('provider_availability');
    
    if (!useProviderAvailability && !useProviderTimeSlots) {
      return NextResponse.json(
        { error: 'Database tables not properly configured. Missing provider_availability or provider_time_slots table.' },
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

          if (useProviderTimeSlots) {
            // Use the provider_time_slots table structure (simpler approach)
            
            // Delete existing time slots for this date first
            await transaction.query(
              'DELETE FROM provider_time_slots WHERE provider_id = ? AND date = ?',
              [providerId, date]
            );

            // Insert new time slots if any
            if (isAvailable && timeSlots && timeSlots.length > 0) {
              for (const slot of timeSlots) {
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

                // Format available services as JSON
                const availableServicesJson = Array.isArray(slot.availableServices) && slot.availableServices.length > 0
                  ? JSON.stringify(slot.availableServices.filter((id: number) => id !== 0))
                  : null;

                await transaction.query(
                  'INSERT INTO provider_time_slots (provider_id, date, start_time, end_time, available_services) VALUES (?, ?, ?, ?, ?)',
                  [providerId, date, slot.start, slot.end, availableServicesJson]
                );
              }
            }
            
          } else if (useProviderAvailability) {
            // Use the provider_availability + availability_time_slots structure
            
            let dayId;
            
            // Check if day already exists
            const existingDay = await transaction.query(
              'SELECT id FROM provider_availability WHERE provider_id = ? AND availability_date = ?',
              [providerId, date]
            ) as any[];

            if (existingDay.length > 0) {
              // Update existing day
              dayId = existingDay[0].id;
              await transaction.query(
                'UPDATE provider_availability SET is_available = ?, updated_at = NOW() WHERE id = ?',
                [isAvailable, dayId]
              );

              // Delete existing time slots for this day
              if (useAvailabilityTimeSlots) {
                await transaction.query(
                  'DELETE FROM availability_time_slots WHERE availability_id = ?',
                  [dayId]
                );
              }
            } else {
              // Insert new day
              const dayResult = await transaction.query(
                'INSERT INTO provider_availability (provider_id, availability_date, is_available, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                [providerId, date, isAvailable]
              ) as any;
              dayId = dayResult.insertId;
            }

            // Insert time slots if any and table exists
            if (useAvailabilityTimeSlots && isAvailable && timeSlots && timeSlots.length > 0) {
              for (const slot of timeSlots) {
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

                const slotResult = await transaction.query(
                  'INSERT INTO availability_time_slots (availability_id, start_time, end_time, created_at) VALUES (?, ?, ?, NOW())',
                  [dayId, slot.start, slot.end]
                ) as any;

                // Insert available services for this time slot if table exists
                if (existingTables.includes('time_slot_services') && slot.availableServices && slot.availableServices.length > 0) {
                  for (const serviceId of slot.availableServices) {
                    // Validate serviceId is a number
                    if (isNaN(Number(serviceId))) {
                      console.warn(`Invalid service ID: ${serviceId}, skipping`);
                      continue;
                    }

                    try {
                      await transaction.query(
                        'INSERT INTO time_slot_services (time_slot_id, service_id) VALUES (?, ?)',
                        [slotResult.insertId, serviceId]
                      );
                    } catch (serviceError) {
                      // If foreign key constraint fails, log but don't fail entire operation
                      console.warn(`Failed to link service ${serviceId} to time slot ${slotResult.insertId}:`, serviceError);
                    }
                  }
                }
              }
            }
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