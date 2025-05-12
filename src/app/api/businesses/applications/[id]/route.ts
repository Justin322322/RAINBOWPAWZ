import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Extract ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 1];

  try {
    const businessId = parseInt(id);
    if (isNaN(businessId)) {
      return NextResponse.json({ message: 'Invalid business ID' }, { status: 400 });
    }

    // Fetch business profile data
    const businessResult = await query(`
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
        bp.business_permit_path,
        bp.government_id_path,
        bp.created_at,
        bp.updated_at,
        CASE
          WHEN bp.verification_status = 'verified' THEN 'approved'
          WHEN bp.verification_status = 'rejected' THEN 'declined'
          WHEN bp.business_permit_path IS NULL OR bp.government_id_path IS NULL THEN 'pending'
          ELSE 'reviewing'
        END AS status
      FROM
        business_profiles bp
      JOIN
        users u ON bp.user_id = u.id
      WHERE
        bp.id = ?
    `, [businessId]) as any[];

    if (!businessResult || businessResult.length === 0) {
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

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

    // Format application data
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
      status: business.status,
      documents,
      verificationStatus: business.verification_status
    };

    return NextResponse.json(applicationData);
  } catch (error) {
    console.error('Error fetching business application:', error);
    return NextResponse.json(
      { message: 'Failed to fetch business application' },
      { status: 500 }
    );
  }
}
