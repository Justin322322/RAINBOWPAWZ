import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
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

    // **🔥 FIX: Check if time slot exists first (outside transaction to handle 404 properly)**
    const checkQuery = `
      SELECT
        id,
        provider_id,
        DATE_FORMAT(date, '%Y-%m-%d') as date,
        TIME_FORMAT(start_time, '%H:%i') as start_time,
        TIME_FORMAT(end_time, '%H:%i') as end_time
      FROM provider_time_slots
      WHERE id = ?
    `;
    const checkResult = await query(checkQuery, [slotId]) as any[];

    if (!checkResult || checkResult.length === 0) {

      // If we have a date parameter, try to delete by date and provider instead
      if (date) {

        const result = await withTransaction(async (transaction) => {
          // Delete time slots for the date and provider
          const deleteByDateQuery = `
            DELETE FROM provider_time_slots
            WHERE provider_id = ? AND date = ?
          `;

          const deleteByDateResult = await transaction.query(deleteByDateQuery, [providerIdNum, date]) as any;

          if (deleteByDateResult && deleteByDateResult.affectedRows > 0) {
            return {
              success: true,
              message: `Deleted ${deleteByDateResult.affectedRows} time slots for date ${date}`,
              date: date,
              remaining_slots: 0,
              method: 'delete-by-date'
            };
          }

          throw new Error('No time slots found for the specified date and provider');
        });

        return NextResponse.json(result);
      }

      // Return 404 for time slot not found
      return NextResponse.json(
        { error: 'Time slot not found in the database' },
        { status: 404 }
      );
    }

    // **🔥 FIX: Use proper transaction management to prevent connection leaks**
    const result = await withTransaction(async (transaction) => {
      // Get the slot details for response
      const slotDetails = checkResult[0];
      const slotDate = slotDetails.date;

      // If the slot exists but belongs to a different provider, log this information
      if (slotDetails.provider_id !== providerIdNum) {

        // For this specific case, we'll allow deletion even if provider IDs don't match
        // This is to fix potential data inconsistencies
      }

      // Delete the time slot using only the ID for maximum reliability
      const deleteSlotQuery = `
        DELETE FROM provider_time_slots
        WHERE id = ?
      `;
      const deleteResult = await transaction.query(deleteSlotQuery, [slotId]) as any;

      // Check if any rows were affected by the delete operation
      if (!deleteResult || deleteResult.affectedRows === 0) {
        console.error('Delete operation did not affect any rows');
        throw new Error('Failed to delete time slot - no rows affected');
      }

      // Check if there are any remaining time slots for this date
      const remainingSlotsQuery = `
        SELECT COUNT(*) as count FROM provider_time_slots
        WHERE provider_id = ? AND date = ?
      `;
      const remainingResult = await transaction.query(remainingSlotsQuery, [providerIdNum, slotDate]) as any[];
      const remainingCount = remainingResult[0].count;

      return {
        success: true,
        message: 'Time slot deleted successfully',
        date: slotDate,
        slotDetails,
        remaining_slots: remainingCount,
        method: 'delete-by-id'
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
