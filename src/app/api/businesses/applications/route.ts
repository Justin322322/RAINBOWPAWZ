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
    // Fetch all business profiles with user data
    const businesses = await query(`
      SELECT
        bp.id,
        bp.business_name,
        bp.contact_first_name,
        bp.contact_last_name,
        u.email,
        bp.business_phone,
        bp.business_address,
        bp.province,
        bp.city,
        bp.zip,
        bp.business_type,
        bp.service_description,
        bp.verification_status,
        bp.created_at,
        bp.updated_at,
        CASE
          WHEN bp.verification_status = 'verified' THEN 'approved'
          WHEN bp.business_permit_path IS NULL OR bp.government_id_path IS NULL THEN 'pending'
          ELSE 'reviewing'
        END AS status
      FROM
        business_profiles bp
      JOIN
        users u ON bp.user_id = u.id
      ORDER BY
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
        documents,
        description: business.service_description || 'No description provided',
        notes: '',
        businessId: business.id // Original ID for database operations
      };
    }));

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Error fetching business applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business applications' },
      { status: 500 }
    );
  }
}