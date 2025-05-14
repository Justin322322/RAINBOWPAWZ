import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Extract ID from params
  const id = params.id;

  console.log('Fetching direct application status for ID:', id);

  try {
    const businessId = parseInt(id);
    if (isNaN(businessId)) {
      console.error('Invalid business ID:', id);
      return NextResponse.json({ message: 'Invalid business ID' }, { status: 400 });
    }

    // We're using only the service_providers table
    const tableName = 'service_providers';
    console.log(`Using table: ${tableName}`);

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
        id = ?
    `, [businessId]) as any[];

    console.log('Status query result:', statusResult ? `Found ${statusResult.length} results` : 'No results');

    if (!statusResult || statusResult.length === 0) {
      console.error('Business profile not found for ID:', businessId);
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

    const result = statusResult[0];
    
    // Map the application_status to verification_status for backward compatibility
    result.verification_status = result.application_status;
    
    console.log(`Application status: ${result.application_status}`);

    // Return the status values from the database
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching business application status:', error);

    // Get more detailed error information
    let errorMessage = 'Failed to fetch business application status';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}: ${error.message}`;
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
