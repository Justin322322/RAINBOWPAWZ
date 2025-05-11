import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import mysql from 'mysql2/promise';

// Import the simple email service
const { sendBusinessVerificationEmail } = require('@/lib/simpleEmailService');

export async function POST(request: NextRequest) {
  // Extract ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // -2 because the last part is 'decline'

  try {
    const businessId = parseInt(id);
    if (isNaN(businessId)) {
      return NextResponse.json({ message: 'Invalid business ID' }, { status: 400 });
    }

    // Get the decline note from request body
    const body = await request.json();
    const { note, requestDocuments } = body;

    if (!note || note.trim().length < 10) {
      return NextResponse.json(
        { message: 'Please provide a detailed reason for declining (minimum 10 characters)' },
        { status: 400 }
      );
    }

    // Determine the verification status based on whether additional documents are requested
    const verificationStatus = requestDocuments ? 'documents_required' : 'rejected';

    // Update business profile verification status and save the note
    const updateResult = await query(
      `UPDATE business_profiles
       SET verification_status = ?,
           verification_notes = ?,
           verification_date = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [verificationStatus, note.trim(), businessId]
    ) as mysql.ResultSetHeader;

    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

    // Get business details for email notification
    const businessResult = await query(
      `SELECT bp.*, u.email, u.first_name, u.last_name
       FROM business_profiles bp
       JOIN users u ON bp.user_id = u.id
       WHERE bp.id = ?`,
      [businessId]
    ) as any[];

    const business = businessResult[0];
    if (business) {
      // Send email notification using the simple email service
      try {
        console.log(`Preparing to send notification email to ${business.email} for business ${business.business_name}`);

        // Send email using simple email service
        const emailResult = await sendBusinessVerificationEmail(
          business.email,
          {
            businessName: business.business_name,
            contactName: `${business.first_name} ${business.last_name}`,
            status: requestDocuments ? 'documents_required' : 'rejected',
            notes: note.trim()
          }
        );

        if (emailResult.success) {
          console.log(`Notification email sent successfully to ${business.email}. Message ID: ${emailResult.messageId}`);
        } else {
          console.error('Failed to send notification email:', emailResult.error);
          // Continue with the process even if the email fails
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Continue with the process even if the email fails
      }
    }

    // Log the action
    await query(
      `INSERT INTO admin_logs (action, entity_type, entity_id, details, admin_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        requestDocuments ? 'request_documents' : 'decline_business',
        'business_profile',
        businessId,
        JSON.stringify({
          businessName: business?.business_name,
          notes: note.trim(),
          requestDocuments: !!requestDocuments
        }),
        1 // TODO: Replace with actual admin ID from auth
      ]
    ).catch(err => console.error('Failed to log admin action:', err));

    return NextResponse.json({
      message: requestDocuments ? 'Documents requested successfully' : 'Application declined successfully',
      businessId,
      businessName: business?.business_name,
      status: verificationStatus
    });
  } catch (error) {
    console.error('Error processing application:', error);
    return NextResponse.json(
      { message: 'Failed to process application' },
      { status: 500 }
    );
  }
}