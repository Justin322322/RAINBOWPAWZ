import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const providerId = url.searchParams.get('providerId');
    
    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
    }
    
    const providerIdNum = parseInt(providerId, 10);
    if (isNaN(providerIdNum) || providerIdNum <= 0) {
      return NextResponse.json({ error: 'Invalid Provider ID' }, { status: 400 });
    }
    
    // Default action is to list time slots
    if (!action || action === 'list') {
      // Get all time slots for the provider
      const timeSlotsQuery = `
        SELECT 
          id, 
          provider_id, 
          DATE_FORMAT(date, '%Y-%m-%d') as date, 
          TIME_FORMAT(start_time, '%H:%i') as start_time, 
          TIME_FORMAT(end_time, '%H:%i') as end_time,
          available_services,
          created_at,
          updated_at
        FROM provider_time_slots 
        WHERE provider_id = ?
        ORDER BY date, start_time
      `;
      
      const timeSlots = await query(timeSlotsQuery, [providerIdNum]) as any[];
      
      // Get all availability records for the provider
      const availabilityQuery = `
        SELECT 
          id, 
          provider_id, 
          DATE_FORMAT(date, '%Y-%m-%d') as date, 
          is_available,
          created_at,
          updated_at
        FROM provider_availability 
        WHERE provider_id = ?
        ORDER BY date
      `;
      
      const availability = await query(availabilityQuery, [providerIdNum]) as any[];
      
      return NextResponse.json({
        timeSlots,
        availability,
        count: {
          timeSlots: timeSlots.length,
          availability: availability.length
        }
      });
    }
    
    // Delete all time slots for a specific date
    else if (action === 'clear-date') {
      const date = url.searchParams.get('date');
      
      if (!date) {
        return NextResponse.json({ error: 'Date is required' }, { status: 400 });
      }
      
      // Delete time slots for the date
      const deleteTimeSlotsQuery = `
        DELETE FROM provider_time_slots 
        WHERE provider_id = ? AND date = ?
      `;
      
      const deleteResult = await query(deleteTimeSlotsQuery, [providerIdNum, date]) as any;
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${deleteResult.affectedRows} time slots for date ${date}`,
        affectedRows: deleteResult.affectedRows
      });
    }
    
    // Delete a specific time slot by ID
    else if (action === 'delete-slot') {
      const slotId = url.searchParams.get('slotId');
      
      if (!slotId) {
        return NextResponse.json({ error: 'Slot ID is required' }, { status: 400 });
      }
      
      // First, get the slot details for logging
      const getSlotQuery = `
        SELECT id, provider_id, DATE_FORMAT(date, '%Y-%m-%d') as date
        FROM provider_time_slots 
        WHERE id = ?
      `;
      
      const slotDetails = await query(getSlotQuery, [slotId]) as any[];
      
      if (!slotDetails || slotDetails.length === 0) {
        return NextResponse.json({ 
          error: 'Time slot not found',
          slotId
        }, { status: 404 });
      }
      
      // Delete the time slot
      const deleteSlotQuery = `
        DELETE FROM provider_time_slots 
        WHERE id = ?
      `;
      
      const deleteResult = await query(deleteSlotQuery, [slotId]) as any;
      
      return NextResponse.json({
        success: true,
        message: `Deleted time slot with ID ${slotId}`,
        slotDetails: slotDetails[0],
        affectedRows: deleteResult.affectedRows
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to execute debug action',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
