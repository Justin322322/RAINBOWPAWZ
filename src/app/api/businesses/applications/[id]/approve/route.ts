import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail } from '@/utils/email';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const businessId = parseInt(params.id);
    if (isNaN(businessId)) {
      return NextResponse.json({ message: 'Invalid business ID' }, { status: 400 });
    }

    // Update application status to approved
    const updateResult = await query(
      'UPDATE business_applications SET status = ?, updated_at = NOW() WHERE business_id = ?',
      ['approved', businessId]
    );

    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }

    // Get business details for email notification
    const [business] = await query(
      'SELECT ba.*, u.email FROM business_applications ba JOIN users u ON ba.user_id = u.id WHERE ba.business_id = ?',
      [businessId]
    );

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