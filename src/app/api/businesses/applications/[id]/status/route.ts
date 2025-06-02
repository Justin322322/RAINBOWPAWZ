import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Extract ID from params
  const { id } = await params;


  try {
    const businessId = parseInt(id);
    if (isNaN(businessId)) {
      return NextResponse.json({ message: 'Invalid business ID' }, { status: 400 });
    }

    // We're using only the service_providers table
    const tableName = 'service_providers';

    // Fetch just the status fields directly from the database
    const statusResult = await query(`
      SELECT
        application_status,
        created_at,
        updated_at,
        verification_date,
        verification_notes
      FROM
        ${tableName}
      WHERE
        provider_id = ?
    `, [businessId]) as any[];


    if (!statusResult || statusResult.length === 0) {
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

    const result = statusResult[0];

    // Map the application_status to verification_status for backward compatibility
    result.verification_status = result.application_status;


    // Return the status values from the database
    return NextResponse.json(result);
  } catch (error) {

    // Get more detailed error information
    let errorMessage = 'Failed to fetch business application status';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}: ${error.message}`;
    }

    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
