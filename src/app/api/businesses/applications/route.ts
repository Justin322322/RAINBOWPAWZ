import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Helper to format date
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'Unknown date';
  }
};

// Get all business applications with status and documents
export async function GET() {
  try {

    // First check if service_providers table exists
    let hasServiceProviders = false;
    let hasUsers = false;

    try {
      const tablesResult = await query(`SHOW TABLES`) as any[];
      const tableNames = tablesResult.map(row => Object.values(row)[0]);

      hasServiceProviders = tableNames.includes('service_providers');
      hasUsers = tableNames.includes('users');
    } catch {
    }

    if (!hasUsers || !hasServiceProviders) {
      return NextResponse.json({
        success: true,
        applications: [],
        message: 'Required database tables not available'
      });
    }

    // Check the structure of both tables to ensure we build a compatible query
    let hasFullName = false;
    let userColumns = [];
    let serviceProviderColumns = [];

    try {
      // Check users table structure
      const userColumnsResult = await query(`SHOW COLUMNS FROM users`) as any[];
      userColumns = userColumnsResult.map(col => col.Field);
      hasFullName = userColumns.includes('full_name');


      // Check service_providers table structure
      const spColumnsResult = await query(`SHOW COLUMNS FROM service_providers`) as any[];
      serviceProviderColumns = spColumnsResult.map(col => col.Field);

    } catch {
    }

    // Use a simplified, stable query with dynamic column selection based on schema
    const ownerNameField = hasFullName
      ? 'u.full_name AS owner'
      : "CONCAT(u.first_name, ' ', u.last_name) AS owner";

    // Build a dynamic query based on available columns
    let selectFields = [
      'sp.provider_id',
      'sp.name AS business_name',
      'sp.user_id',
      ownerNameField,
      'u.email'
    ];

    // Add fields only if they exist in the service_providers table
    if (serviceProviderColumns.includes('address')) selectFields.push('sp.address AS business_address');
    if (serviceProviderColumns.includes('phone')) selectFields.push('sp.phone AS business_phone');
    if (serviceProviderColumns.includes('province')) selectFields.push('sp.province');
    if (serviceProviderColumns.includes('city')) selectFields.push('sp.city');
    if (serviceProviderColumns.includes('zip')) selectFields.push('sp.zip');
    if (serviceProviderColumns.includes('service_description')) selectFields.push('sp.service_description');    // Handle status field - in the updated schema we only have application_status
    // Include provider contact name/email if present for better owner fallback
    if (serviceProviderColumns.includes('contact_first_name')) selectFields.push('sp.contact_first_name');
    if (serviceProviderColumns.includes('contact_last_name')) selectFields.push('sp.contact_last_name');
    if (serviceProviderColumns.includes('contact_email')) selectFields.push('sp.contact_email');
    if (serviceProviderColumns.includes('application_status')) {
      // Check for documents_required_flag and adjust status accordingly if column exists
      if (serviceProviderColumns.includes('documents_required_flag')) {
        selectFields.push(`CASE 
          WHEN sp.documents_required_flag = 1 AND sp.application_status = 'pending' THEN 'documents_required'
          ELSE sp.application_status
        END as application_status`);
      } else {
        selectFields.push('sp.application_status');
      }
    } else {
      // Fallback to a default status if the column doesn't exist
      selectFields.push('\'pending\' AS application_status');
    }

    // Add document fields if they exist
    if (serviceProviderColumns.includes('business_permit_path')) selectFields.push('sp.business_permit_path');
    if (serviceProviderColumns.includes('government_id_path')) selectFields.push('sp.government_id_path');
    if (serviceProviderColumns.includes('bir_certificate_path')) selectFields.push('sp.bir_certificate_path');
    if (serviceProviderColumns.includes('created_at')) selectFields.push('sp.created_at');
    if (serviceProviderColumns.includes('updated_at')) selectFields.push('sp.updated_at');

    // Build the WHERE clause based on available columns
    let whereClause = '';
    if (serviceProviderColumns.includes('provider_type')) {
      whereClause += "sp.provider_type = 'cremation'";
    } else {
      whereClause += '1=1'; // No provider_type column, so select all
    }

    const applicationQuery = `
      SELECT
        ${selectFields.join(',\n        ')}
      FROM
        service_providers sp
      JOIN
        users u ON sp.user_id = u.user_id
      WHERE
        ${whereClause}
      ORDER BY
        ${serviceProviderColumns.includes('created_at') ? 'sp.created_at DESC' : 'sp.provider_id DESC'}
    `;


    // Run the query with error handling
    let applications = [];

    try {
      applications = await query(applicationQuery) as any[];
    } catch {

      // Try a simplified backup query with dynamic fields
      try {
        // Build a minimal set of fields that should work in most cases
        let minimalSelectFields = [
          'sp.provider_id',
          'sp.name AS business_name',
          'sp.user_id',
          ownerNameField,
          'u.email'
        ];

        // Add created_at if it exists
        if (serviceProviderColumns.includes('created_at')) {
          minimalSelectFields.push('sp.created_at');
        }        // Add at least one status field if available
        if (serviceProviderColumns.includes('application_status')) {
          if (serviceProviderColumns.includes('documents_required_flag')) {
            minimalSelectFields.push(`CASE 
              WHEN sp.documents_required_flag = 1 AND sp.application_status = 'pending' THEN 'documents_required'
              ELSE sp.application_status
            END as application_status`);
          } else {
            minimalSelectFields.push('sp.application_status');
          }
        } else if (serviceProviderColumns.includes('verification_status')) {
          minimalSelectFields.push('sp.verification_status AS application_status');
        } else {
          minimalSelectFields.push("'pending' AS application_status");
        }


        const backupQuery = `
          SELECT
            ${minimalSelectFields.join(',\n            ')}
          FROM
            service_providers sp
          JOIN
            users u ON sp.user_id = u.user_id
          WHERE
            ${whereClause}
          ORDER BY
            ${serviceProviderColumns.includes('created_at') ? 'sp.created_at DESC' : 'sp.provider_id DESC'}
          LIMIT 50
        `;
        
        
        applications = await query(backupQuery) as any[];
      } catch {
        return NextResponse.json({
          success: false,
          applications: [],
          error: 'Database query error: Unable to retrieve applications data'
        });
      }
    }

    // Format the applications for the response
    const formattedApplications = applications.map(app => {
      // Set a default submitDate
      let submitDate = 'Unknown date';
      if (app.created_at) {
        try {
          submitDate = formatDate(app.created_at);
        } catch {
        }
      }

      // Build documents array with null checks
      const documents = [];
      if (app.business_permit_path) {
        documents.push({
          name: 'Business Permit',
          verified: app.application_status === 'verified',
          path: app.business_permit_path
        });
      }

      if (app.government_id_path) {
        documents.push({
          name: 'Owner ID',
          verified: app.application_status === 'verified',
          path: app.government_id_path
        });
      }

      if (app.bir_certificate_path) {
        documents.push({
          name: 'Tax Certificate',
          verified: app.application_status === 'verified',
          path: app.bir_certificate_path
        });
      }

      // Format the address
      const addressParts = [
        app.business_address,
        app.city,
        app.province,
        app.zip
      ].filter(Boolean);

      const address = addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';

      // Determine owner with robust fallbacks
      const ownerFromUser = (app.owner || '').trim();
      const ownerFromProvider = [app.contact_first_name, app.contact_last_name]
        .filter((p: string | undefined) => typeof p === 'string' && p.trim().length > 0)
        .join(' ')
        .trim();
      const resolvedOwner = ownerFromUser || ownerFromProvider || 'Unknown Owner';

      // Determine contact email fallback
      const resolvedEmail = (app.email || app.contact_email || '').trim();

      // Return formatted application
      return {
        id: app.provider_id || '0',
        businessId: app.provider_id || '0',
        businessName: app.business_name || 'Unnamed Business',
        owner: resolvedOwner,
        email: resolvedEmail,
        address,
        submitDate,
        status: app.application_status || 'pending',
        applicationStatus: app.application_status || 'pending',
        documents,
        userId: app.user_id || '0'
      };
    });

    return NextResponse.json({
      success: true,
      applications: formattedApplications
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch applications: ' + (error instanceof Error ? error.message : 'Unknown error'),
      applications: []
    });
  }
}
