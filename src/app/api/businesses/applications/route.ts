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

// Get all business applications with status and documents
export async function GET() {
  try {
    // Fetch all businesses
    const businesses = await query(`
      SELECT 
        b.id,
        b.business_name,
        b.contact_first_name,
        b.contact_last_name,
        b.email,
        b.business_phone,
        b.business_address,
        b.province,
        b.city,
        b.zip,
        b.business_type,
        b.service_description,
        b.is_verified,
        b.created_at,
        b.updated_at,
        CASE
          WHEN b.is_verified = 1 THEN 'approved'
          WHEN b.business_permit_path IS NULL OR b.government_id_path IS NULL THEN 'pending'
          ELSE 'reviewing'
        END AS status
      FROM
        businesses b
      ORDER BY
        b.created_at DESC
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

      // Fetch document paths
      const documentResult = await query(`
        SELECT 
          business_permit_path,
          government_id_path,
          bir_certificate_path
        FROM 
          businesses
        WHERE 
          id = ?
      `, [business.id]) as any[];

      const documents = [];
      
      if (documentResult && documentResult.length > 0) {
        const docPaths = documentResult[0];
        
        for (const doc of documentFields) {
          const path = docPaths[doc.field];
          if (path) {
            documents.push({
              name: doc.name,
              verified: business.status === 'approved',
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