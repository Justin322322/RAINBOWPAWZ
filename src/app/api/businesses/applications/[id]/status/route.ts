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

    // Since you've migrated from business_profiles to service_providers,
    // we'll use only the service_providers table
    const tableName = 'service_providers';
    console.log(`Using table: ${tableName}`);

    // Fetch just the status fields directly from the database
    const statusResult = await query(`
      SELECT
        verification_status,
        status,
        created_at,
        updated_at,
        verification_date
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

    // Check if the verification_status and status are mismatched for declined or restricted
    const result = statusResult[0];
    if ((result.verification_status === 'declined' || result.verification_status === 'restricted') &&
        result.status !== result.verification_status) {
      console.log(`Status mismatch detected! verification_status=${result.verification_status}, status=${result.status}`);
      console.log('Fixing status mismatch by updating status to match verification_status');

      // Update the status to match verification_status
      try {
        const updateResult = await query(
          `UPDATE ${tableName}
           SET status = ?
           WHERE id = ?`,
          [result.verification_status, businessId]
        );
        console.log('Status update result:', updateResult);

        // Force a commit to ensure the transaction is completed
        await query('COMMIT');
        console.log(`Committed transaction for status update`);

        // Update the result object
        result.status = result.verification_status;
        console.log('Updated result:', result);
      } catch (updateError) {
        console.error('Error updating status:', updateError);
      }
    }

    // Return the raw status values from the database
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
