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

    // Since you've migrated from business_profiles to service_providers,
    // we'll use only the service_providers table
    const _tableName = 'service_providers';

    // SECURITY FIX: Check if application_status column exists
    const columnsResult = await query(
      'SHOW COLUMNS FROM service_providers LIKE ?',
      ['application_status']
    ) as any[];

    const hasApplicationStatus = columnsResult.length > 0;

    // Fetch business profile data with all fields
    let businessResult;
    if (hasApplicationStatus) {
      // Query using only application_status field (verification_status no longer exists)
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
          bp.description as service_description,
          bp.application_status,
          bp.application_status as verification_status, /* For backward compatibility */
          u.status as account_status
        FROM
          service_providers bp
        JOIN
          users u ON bp.user_id = u.user_id
        WHERE
          bp.provider_id = ?
      `, [businessId]) as any[];
    } else {
      // Fallback query for schemas without application_status
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
          bp.description as service_description,
          'pending' as application_status, /* Default fallback status */
          'pending' as verification_status, /* For backward compatibility */
          u.status as account_status
        FROM
          service_providers bp
        JOIN
          users u ON bp.user_id = u.user_id
        WHERE
          bp.provider_id = ?
      `, [businessId]) as any[];
    }

    // Log the raw query result for debugging


    if (!businessResult || businessResult.length === 0) {
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

    // Get the business name (could be in business_name or name field)
    const _businessName = businessResult[0].business_name || businessResult[0].name || 'Unknown';

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
    const applicationStatus = business.application_status || 'pending';
    const accountStatus = business.account_status || 'active';

    // Format application data with all fields
    const applicationData = {
      id: `APP${business.provider_id.toString().padStart(3, '0')}`,
      businessId: business.provider_id,
      businessName: business.business_name,
      owner: `${business.contact_first_name} ${business.contact_last_name}`,
      email: business.email,
      phone: business.business_phone || 'Not provided',
      address: business.business_address || 'Not provided',
      businessType: business.business_type,
      description: business.service_description || business.description || 'No description provided',
      businessHours: business.business_hours || business.hours || 'Not specified',
      submitDate,
      status: applicationStatus, // For backward compatibility
      applicationStatus: applicationStatus, // New primary status field
      verification_status: applicationStatus, // Make sure this matches the field name expected
      verificationStatus: applicationStatus, // For backward compatibility
      accountStatus: accountStatus, // Account status (active, inactive, etc.)
      documents,

      // Additional fields
      contactFirstName: business.contact_first_name,
      contactLastName: business.contact_last_name,
      businessAddress: business.business_address,
      city: business.city,
      province: business.province,
      zip: business.zip,
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

    // Get more detailed error information
    let errorMessage = 'Failed to fetch business application';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}: ${error.message}`;
    }

    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
