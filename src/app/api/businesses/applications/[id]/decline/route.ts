import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendEmail } from '@/utils/email';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const businessId = parseInt(params.id);
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

    // Update application status to declined and save the note
    const updateResult = await query(
      'UPDATE business_applications SET status = ?, decline_reason = ?, updated_at = NOW() WHERE business_id = ?',
      ['declined', note.trim(), businessId]
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