import { NextResponse } from 'next/server';
import { sendEmail, queueEmail } from '@/lib/consolidatedEmailService';
import {
  createWelcomeEmail,
  createPasswordResetEmail,
  createOTPEmail,
  createBookingConfirmationEmail,
  createBookingStatusUpdateEmail,
  createBusinessVerificationEmail,
  createApplicationDeclineEmail
} from '@/lib/emailTemplates';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      type,
      email,
      firstName,
      resetToken,
      accountType,
      otp,
      bookingDetails,
      businessDetails,
      useQueue = false // Whether to queue the email or send immediately
    } = body;



    let emailData;
    let emailResult;

    // Prepare the appropriate email based on type
    switch (type) {
      case 'reset':
        if (!email || !resetToken) {
          return NextResponse.json({
            error: 'Missing required parameters for password reset email'
          }, { status: 400 });
        }
        emailData = {
          to: email,
          ...createPasswordResetEmail(resetToken)
        };
        break;

      case 'welcome':
        if (!email || !firstName) {
          return NextResponse.json({
            error: 'Missing required parameters for welcome email'
          }, { status: 400 });
        }
        emailData = {
          to: email,
          ...createWelcomeEmail(firstName, accountType || 'personal')
        };
        break;

      case 'otp':
        if (!email || !otp) {
          return NextResponse.json({
            error: 'Missing required parameters for OTP email'
          }, { status: 400 });
        }
        emailData = {
          to: email,
          ...createOTPEmail(otp)
        };
        break;

      case 'booking_confirmation':
        if (!email || !bookingDetails) {
          return NextResponse.json({
            error: 'Missing required parameters for booking confirmation email'
          }, { status: 400 });
        }
        emailData = {
          to: email,
          ...createBookingConfirmationEmail(bookingDetails)
        };
        break;

      case 'booking_status_update':
        if (!email || !bookingDetails) {
          return NextResponse.json({
            error: 'Missing required parameters for booking status update email'
          }, { status: 400 });
        }
        emailData = {
          to: email,
          ...createBookingStatusUpdateEmail(bookingDetails)
        };
        break;

      case 'business_verification':
        if (!email || !businessDetails) {
          return NextResponse.json({
            error: 'Missing required parameters for business verification email'
          }, { status: 400 });
        }
        emailData = {
          to: email,
          ...createBusinessVerificationEmail(businessDetails)
        };
        break;

      case 'application_decline':
        if (!email || !businessDetails) {
          return NextResponse.json({
            error: 'Missing required parameters for application decline email'
          }, { status: 400 });
        }
        emailData = {
          to: email,
          ...createApplicationDeclineEmail({
            businessName: businessDetails.businessName,
            contactName: businessDetails.contactName,
            reason: businessDetails.notes || 'Your application does not meet our current requirements.'
          })
        };
        break;

      default:
        return NextResponse.json({
          error: 'Invalid email type'
        }, { status: 400 });
    }

    // Send or queue the email
    if (useQueue) {
      emailResult = await queueEmail(emailData);
    } else {
      emailResult = await sendEmail(emailData);
    }

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email');
    }

    // Prepare response based on whether email was queued or sent directly
    const response = {
      success: true,
      message: `Email ${useQueue ? 'queued' : 'sent'} to ${email} (${type})`
    };

    // Add the appropriate ID based on the operation type
    if (useQueue && 'queueId' in emailResult) {
      return NextResponse.json({
        ...response,
        queueId: emailResult.queueId
      });
    } else if (!useQueue && 'messageId' in emailResult) {
      return NextResponse.json({
        ...response,
        messageId: emailResult.messageId
      });
    } else {
      return NextResponse.json(response);
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process email request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
