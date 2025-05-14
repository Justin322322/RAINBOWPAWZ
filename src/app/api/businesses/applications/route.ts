import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Helper to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Define a type for the keys of docPaths
type DocPathKey = 'business_permit_path' | 'government_id_path' | 'bir_certificate_path';

// Get all business applications with status and documents
export async function GET() {
  try {
    // In the updated database, we only use service_providers table
    // No need to check for business_profiles anymore
    const tableName = 'service_providers';
    const tableAlias = 'bp'; // Keep the same alias for compatibility

    console.log(`Using table: ${tableName}`);

    // Fetch all business profiles with user data
    // Query for service_providers table
    const businesses = await query(`
      SELECT
        bp.id,
        bp.name as business_name,
        bp.contact_first_name,
        bp.contact_last_name,
        u.email,
        bp.phone as business_phone,
        bp.address as business_address,
        bp.province,
        bp.city,
        bp.zip,
        bp.provider_type as business_type,
        bp.service_description,
        bp.verification_status,
        bp.business_permit_path,
        bp.government_id_path,
        bp.bir_certificate_path,
        bp.created_at,
        bp.updated_at,
        CASE
          WHEN bp.verification_status = 'verified' THEN 'approved'
          WHEN bp.verification_status = 'declined' THEN 'declined'
          WHEN bp.verification_status = 'documents_required' THEN 'documents_required'
          WHEN bp.verification_status = 'restricted' THEN 'restricted'
          ELSE 'pending'
        END AS status
      FROM
        service_providers bp
      JOIN
        users u ON bp.user_id = u.id
      ORDER BY
        CASE
          WHEN bp.verification_status IS NULL OR bp.verification_status = 'pending' THEN 1
          WHEN bp.verification_status = 'documents_required' THEN 2
          WHEN bp.verification_status = 'restricted' THEN 3
          WHEN bp.verification_status = 'declined' THEN 4
          WHEN bp.verification_status = 'verified' THEN 5
          ELSE 6
        END,
        bp.created_at DESC
    `) as any[];

    if (!businesses || businesses.length === 0) {
      return NextResponse.json({
        applications: []
      });
    }

    // Prepare results with document information
    const applications = await Promise.all(businesses.map(async (business) => {
      // Convert dates to readable format
      const submitDate = formatDate(business.created_at);

      // Check for available document paths
      const documentFields = [
        { field: 'business_permit_path', name: 'Business Permit' },
        { field: 'government_id_path', name: 'Owner ID' },
        { field: 'bir_certificate_path', name: 'Tax Certificate' }
      ];

      // Document paths are already in the business profile data
      const documentResult = [
        {
          business_permit_path: business.business_permit_path,
          government_id_path: business.government_id_path,
          bir_certificate_path: business.bir_certificate_path
        }
      ];

      const documents = [];

      if (documentResult && documentResult.length > 0) {
        const docPaths = documentResult[0];

        for (const doc of documentFields) {
          // Assert that doc.field is one of the allowed keys
          const path = docPaths[doc.field as DocPathKey];
          if (path) {
            documents.push({
              name: doc.name,
              verified: business.verification_status === 'verified',
              path: path
            });
          }
        }
      }

      // Format application data
      return {
        id: `APP${business.id.toString().padStart(3, '0')}`,
        businessName: business.business_name,
        owner: `${business.contact_first_name} ${business.contact_last_name}`,
        email: business.email,
        phone: business.business_phone || 'Not provided',
        address: business.business_address
          ? `${business.business_address}, ${business.city || ''}, ${business.province || ''}, ${business.zip || ''}`
          : 'Not provided',
        submitDate,
        status: business.status,
        verificationStatus: business.verification_status, // Include verification_status
        documents,
        description: business.service_description || 'No description provided',
        notes: '',
        businessId: business.id // Original ID for database operations
      };
    }));

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error fetching business applications:', error);

    // Get more detailed error information
    let errorMessage = 'Failed to fetch business applications';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}: ${error.message}`;
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}