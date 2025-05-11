import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import mysql from 'mysql2/promise';

// Import the simple email service
const { sendBusinessVerificationEmail } = require('@/lib/simpleEmailService');

export async function POST(request: NextRequest) {
  // Extract ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.length - 2]; // -2 because the last part is 'approve'

  try {
    const businessId = parseInt(id);
    if (isNaN(businessId)) {
      return NextResponse.json({ message: 'Invalid business ID' }, { status: 400 });
    }

    // Get any additional notes from the request body
    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    // Update business profile verification status
    const updateResult = await query(
      `UPDATE business_profiles
       SET verification_status = 'verified',
           verification_date = NOW(),
           verification_notes = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [notes || 'Application approved', businessId]
    ) as mysql.ResultSetHeader;

    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ message: 'Business profile not found' }, { status: 404 });
    }

    // Update the user's verification status as well
    await query(
      `UPDATE users u
       JOIN business_profiles bp ON u.id = bp.user_id
       SET u.is_verified = 1
       WHERE bp.id = ?`,
      [businessId]
    );

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
      // Send approval email using the simple email service
      try {
        console.log(`Preparing to send approval email to ${business.email} for business ${business.business_name}`);

        // Send email using simple email service
        const emailResult = await sendBusinessVerificationEmail(
          business.email,
          {
            businessName: business.business_name,
            contactName: `${business.first_name} ${business.last_name}`,
            status: 'approved',
            notes: notes || undefined
          }
        );

        if (emailResult.success) {
          console.log(`Approval email sent successfully to ${business.email}. Message ID: ${emailResult.messageId}`);
        } else {
          console.error('Failed to send approval email:', emailResult.error);
          // Continue with the approval process even if the email fails
        }
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Continue with the approval process even if the email fails
      }
    }

    // Log the approval action
    await query(
      `INSERT INTO admin_logs (action, entity_type, entity_id, details, admin_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'approve_business',
        'business_profile',
        businessId,
        JSON.stringify({
          businessName: business?.business_name,
          notes: notes || 'Application approved'
        }),
        1 // TODO: Replace with actual admin ID from auth
      ]
    ).catch(err => console.error('Failed to log admin action:', err));

    return NextResponse.json({
      message: 'Application approved successfully',
      businessId,
      businessName: business?.business_name
    });
  } catch (error) {
    console.error('Error approving application:', error);
    return NextResponse.json(
      { message: 'Failed to approve application' },
      { status: 500 }
    );
  }
}