import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  // Extract ID from params
  const id = params.id;

  console.log('Fetching application details for ID:', id);

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

    // Check if application_status column exists
    const columnsResult = await query(`
      SHOW COLUMNS FROM ${tableName} LIKE 'application_status'
    `) as any[];
    
    const hasApplicationStatus = columnsResult.length > 0;
    console.log(`Table ${tableName} has application_status column: ${hasApplicationStatus}`);

    // Fetch business profile data with all fields
    let businessResult;
    if (hasApplicationStatus) {
      // Query prioritizing application_status field
      businessResult = await query(`
        SELECT
          bp.*,
          u.email,
          u.first_name,
          u.last_name,
          bp.name as business_name,
          bp.phone as business_phone,
          bp.address as business_address,
          bp.provider_type as business_type,
          bp.hours as business_hours,
          bp.application_status,
          bp.verification_status,
          bp.status as account_status
        FROM
          service_providers bp
        JOIN
          users u ON bp.user_id = u.id
        WHERE
          bp.id = ?
      `, [businessId]) as any[];
    } else {
      // Fallback query for old schema
      businessResult = await query(`
        SELECT
          bp.*,
          u.email,
          u.first_name,
          u.last_name,
          bp.name as business_name,
          bp.phone as business_phone,
          bp.address as business_address,
          bp.provider_type as business_type,
          bp.hours as business_hours,
          bp.verification_status,
          CASE
            WHEN bp.verification_status = 'verified' THEN 'approved'
            WHEN bp.verification_status = 'rejected' THEN 'declined'
            WHEN bp.verification_status = 'declined' THEN 'declined'
            WHEN bp.verification_status = 'restricted' THEN 'restricted'
            WHEN bp.verification_status = 'documents_required' THEN 'documents_required'
            WHEN bp.business_permit_path IS NULL OR bp.government_id_path IS NULL THEN 'pending'
            ELSE bp.verification_status
          END AS status
        FROM
          service_providers bp
        JOIN
          users u ON bp.user_id = u.id
        WHERE
          bp.id = ?
      `, [businessId]) as any[];
    }

    // Log the raw query result for debugging
    console.log('Raw business result:', JSON.stringify(businessResult[0], null, 2));

    console.log('Query result:', businessResult ? `Found ${businessResult.length} results` : 'No results');

    if (!businessResult || businessResult.length === 0) {
      console.error('Business profile not found for ID:', businessId);
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

    // Get the business name (could be in business_name or name field)
    const businessName = businessResult[0].business_name || businessResult[0].name || 'Unknown';
    console.log('Found business profile:', businessName);

    const business = businessResult[0];

    // Format date
    const createdAt = new Date(business.created_at);
    const submitDate = `${createdAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })} at ${createdAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    // Prepare documents array
    const documents = [];

    if (business.business_permit_path) {
      documents.push({
        type: 'Business Permit',
        url: business.business_permit_path
      });
    }

    if (business.government_id_path) {
      documents.push({
        type: 'Government ID',
        url: business.government_id_path
      });
    }

    if (business.bir_certificate_path) {
      documents.push({
        type: 'BIR Certificate',
        url: business.bir_certificate_path
      });
    }

    // Status handling
    const applicationStatus = business.application_status || business.verification_status || business.status || 'pending';
    const accountStatus = business.account_status || business.status || 'active';

    // Format application data with all fields
    const applicationData = {
      id: `APP${business.id.toString().padStart(3, '0')}`,
      businessId: business.id,
      businessName: business.business_name,
      owner: `${business.contact_first_name} ${business.contact_last_name}`,
      email: business.email,
      phone: business.business_phone || 'Not provided',
      address: business.business_address
        ? `${business.business_address}, ${business.city || ''}, ${business.province || ''}, ${business.zip || ''}`
        : 'Not provided',
      businessType: business.business_type,
      description: business.service_description || 'No description provided',
      submitDate,
      status: applicationStatus, // For backward compatibility
      applicationStatus: applicationStatus, // Consolidated status field
      verificationStatus: business.verification_status, // For backward compatibility
      accountStatus: accountStatus, // Account status (active, inactive, etc.)
      documents,

      // Additional fields
      contactFirstName: business.contact_first_name,
      contactLastName: business.contact_last_name,
      businessAddress: business.business_address,
      city: business.city,
      province: business.province,
      zip: business.zip,
      businessHours: business.business_hours,
      businessPermitNumber: business.business_permit_number,
      taxIdNumber: business.tax_id_number,
      websiteUrl: business.website_url,
      socialMediaLinks: business.social_media_links,
      verificationDate: business.verification_date ? new Date(business.verification_date).toLocaleDateString('en-US') : null,
      verificationNotes: business.verification_notes,
      createdAt: business.created_at,
      updatedAt: business.updated_at,

      // User information
      userFirstName: business.first_name,
      userLastName: business.last_name,
      userEmail: business.email,
      userPhone: null // The users table doesn't have a phone column
    };

    return NextResponse.json(applicationData);
  } catch (error) {
    console.error('Error fetching business application:', error);

    // Get more detailed error information
    let errorMessage = 'Failed to fetch business application';
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
