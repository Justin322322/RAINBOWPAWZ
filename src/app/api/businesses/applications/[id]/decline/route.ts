import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail } from '@/utils/email';
import mysql from 'mysql2/promise';

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
    const { note } = body;

    if (!note || note.trim().length < 10) {
      return NextResponse.json(
        { message: 'Please provide a detailed reason for declining (minimum 10 characters)' },
        { status: 400 }
      );
    }

    // Update business profile verification status and save the note
    const updateResult = await query(
      `UPDATE business_profiles
       SET verification_status = 'rejected',
           verification_notes = ?,
           verification_date = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [note.trim(), businessId]
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
      // Send decline email
      await sendEmail({
        to: business.email,
        subject: 'Update on Your Business Application',
        text: `We regret to inform you that your business application for ${business.business_name} has been declined.\n\nReason: ${note}\n\nIf you have any questions, please contact our support team.`
      });
    }

    return NextResponse.json({
      message: 'Application declined successfully',
      businessId
    });
  } catch (error) {
    console.error('Error declining application:', error);
    return NextResponse.json(
      { message: 'Failed to decline application' },
      { status: 500 }
    );
  }
}