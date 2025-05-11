import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail } from '@/utils/email';
import mysql from 'mysql2/promise';

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

    // Update business profile verification status
    const updateResult = await query(
      `UPDATE business_profiles
       SET verification_status = 'verified',
           verification_date = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [businessId]
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
      // Send approval email
      await sendEmail({
        to: business.email,
        subject: 'Your Business Application has been Approved',
        text: `Congratulations! Your business application for ${business.business_name} has been approved.`
      });
    }

    return NextResponse.json({
      message: 'Application approved successfully',
      businessId
    });
  } catch (error) {
    console.error('Error approving application:', error);
    return NextResponse.json(
      { message: 'Failed to approve application' },
      { status: 500 }
    );
  }
}