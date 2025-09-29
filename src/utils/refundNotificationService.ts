/**
 * Refund Notification Service
 * Handles email and SMS notifications_unified for refund processes
 */

import { query } from '@/lib/db/query';
import { sendEmail } from '@/lib/consolidatedEmailService';
import { createUserNotification } from '@/utils/userNotificationService';
import { sendSMS } from '@/lib/httpSmsService';

export interface RefundNotificationData {
  refundId: number;
  bookingId: number;
  userId: number;
  amount: number;
  refundType: 'automatic' | 'manual';
  paymentMethod: string;
  status: string;
  reason: string;
  transactionId?: string;
  receiptPath?: string;
  customerInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  bookingDetails?: {
    serviceName: string;
    bookingDate?: string;
    petName?: string;
  };
}

/**
 * Send refund processed notification (email + SMS + in-app)
 */
export async function sendRefundProcessedNotification(
  refundData: RefundNotificationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { customerInfo } = refundData;
    
    if (!customerInfo?.email) {
      // Get customer info if not provided
      const customerData = await getCustomerInfo(refundData.userId);
      if (!customerData) {
        return { success: false, error: 'Customer information not found' };
      }
      Object.assign(refundData, { customerInfo: customerData });
    }

    // Send email notification
    await sendRefundEmail(refundData, 'processed');
    
    // Send SMS notification
    await sendRefundSMS(refundData, 'processed');
    
    // Create in-app notification
    await createUserNotification({
      userId: refundData.userId,
      type: 'refund_processed',
      title: 'Refund Processed',
      message: `Your refund of ₱${refundData.amount.toFixed(2)} for booking #${refundData.bookingId} has been processed.`,
      entityId: refundData.refundId,
      shouldSendEmail: false // Already sent above
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending refund processed notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send refund initiation notification (for manual refunds)
 */
export async function sendRefundInitiatedNotification(
  refundData: RefundNotificationData,
  instructions?: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { customerInfo } = refundData;
    
    if (!customerInfo?.email) {
      const customerData = await getCustomerInfo(refundData.userId);
      if (!customerData) {
        return { success: false, error: 'Customer information not found' };
      }
      Object.assign(refundData, { customerInfo: customerData });
    }

    // Send email notification
    await sendRefundEmail(refundData, 'initiated', instructions);
    
    // Send SMS notification
    await sendRefundSMS(refundData, 'initiated');
    
    // Create in-app notification
    await createUserNotification({
      userId: refundData.userId,
      type: 'refund_initiated',
      title: 'Refund Initiated',
      message: `Your refund request for ₱${refundData.amount.toFixed(2)} has been initiated and is being processed.`,
      entityId: refundData.refundId,
      shouldSendEmail: false
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending refund initiated notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send refund failed notification
 */
export async function sendRefundFailedNotification(
  refundData: RefundNotificationData,
  failureReason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { customerInfo } = refundData;
    
    if (!customerInfo?.email) {
      const customerData = await getCustomerInfo(refundData.userId);
      if (!customerData) {
        return { success: false, error: 'Customer information not found' };
      }
      Object.assign(refundData, { customerInfo: customerData });
    }

    // Send email notification
    await sendRefundEmail(refundData, 'failed', undefined, failureReason);
    
    // Create in-app notification
    await createUserNotification({
      userId: refundData.userId,
      type: 'refund_failed',
      title: 'Refund Failed',
      message: `Your refund request for ₱${refundData.amount.toFixed(2)} could not be processed. Please contact support.`,
      entityId: refundData.refundId,
      shouldSendEmail: false
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending refund failed notification:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send email notification for refunds
 */
async function sendRefundEmail(
  refundData: RefundNotificationData,
  type: 'processed' | 'initiated' | 'failed',
  instructions?: string[],
  failureReason?: string
): Promise<void> {
  const { customerInfo } = refundData;
  
  if (!customerInfo?.email) {
    throw new Error('Customer email not available');
  }

  let subject: string;
  let emailHtml: string;
  let emailText: string;

  switch (type) {
    case 'processed':
      subject = 'Your Refund Has Been Processed - RainbowPaws';
      emailHtml = createRefundProcessedEmailHtml(refundData);
      emailText = createRefundProcessedEmailText(refundData);
      break;
    
    case 'initiated':
      subject = 'Refund Request Initiated - RainbowPaws';
      emailHtml = createRefundInitiatedEmailHtml(refundData, instructions);
      emailText = createRefundInitiatedEmailText(refundData, instructions);
      break;
    
    case 'failed':
      subject = 'Refund Processing Failed - RainbowPaws';
      emailHtml = createRefundFailedEmailHtml(refundData, failureReason);
      emailText = createRefundFailedEmailText(refundData, failureReason);
      break;
    
    default:
      throw new Error('Invalid email type');
  }

  await sendEmail({
    to: customerInfo.email,
    subject,
    html: emailHtml,
    text: emailText
  });
}

/**
 * Send SMS notification for refunds
 */
async function sendRefundSMS(
  refundData: RefundNotificationData,
  type: 'processed' | 'initiated'
): Promise<void> {
  const { customerInfo } = refundData;
  
  if (!customerInfo?.phone) {
    console.warn('Customer phone not available for SMS notification');
    return;
  }

  let message: string;

  switch (type) {
    case 'processed':
      message = `Your refund of ₱${refundData.amount.toFixed(2)} for booking #${refundData.bookingId} has been processed. Please check your email for details. - RainbowPaws`;
      break;
    
    case 'initiated':
      message = `Your refund request of ₱${refundData.amount.toFixed(2)} for booking #${refundData.bookingId} is being processed. You'll receive an update soon. - RainbowPaws`;
      break;
    
    default:
      return;
  }

  try {
    // Use existing SMS service
    const smsResult = await sendSMS({
      to: customerInfo.phone,
      message
    });

    if (smsResult.success) {
      console.log(`✅ Refund SMS sent successfully to ${customerInfo.phone} for refund #${refundData.refundId}`);
    } else {
      console.error(`❌ Refund SMS failed for refund #${refundData.refundId}:`, smsResult.error);
    }
  } catch (error) {
    console.error('Error sending refund SMS:', error);
  }
}

/**
 * Get customer information
 */
async function getCustomerInfo(userId: number): Promise<RefundNotificationData['customerInfo'] | null> {
  try {
    const results = await query(`
      SELECT first_name, last_name, email, phone
      FROM users
      WHERE user_id = ?
    `, [userId]) as any[];

    if (results.length === 0) {
      return null;
    }

    const user = results[0];
    return {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone
    };
  } catch (error) {
    console.error('Error getting customer info:', error);
    return null;
  }
}

/**
 * Create refund processed email HTML
 */
function createRefundProcessedEmailHtml(refundData: RefundNotificationData): string {
  const { customerInfo } = refundData;
  const isAutomatic = refundData.refundType === 'automatic';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Refund Processed</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .amount { font-size: 24px; font-weight: bold; color: #4CAF50; }
            .status { display: inline-block; background: #4CAF50; color: white; padding: 5px 10px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Refund Processed Successfully</h1>
            </div>
            
            <div class="content">
                <p>Dear ${customerInfo?.firstName || 'Valued Customer'},</p>
                
                <p>Your refund has been processed successfully. Here are the details:</p>
                
                <div class="details">
                    <h3>Refund Details</h3>
                    <p><strong>Refund Amount:</strong> <span class="amount">₱${refundData.amount.toFixed(2)}</span></p>
                    <p><strong>Booking ID:</strong> #${refundData.bookingId}</p>
                    <p><strong>Transaction ID:</strong> ${refundData.transactionId || 'N/A'}</p>
                    <p><strong>Payment Method:</strong> ${refundData.paymentMethod.toUpperCase()}</p>
                    <p><strong>Refund Type:</strong> <span class="status">${isAutomatic ? 'Automatic' : 'Manual'}</span></p>
                    <p><strong>Reason:</strong> ${refundData.reason}</p>
                    ${refundData.bookingDetails?.serviceName ? `<p><strong>Service:</strong> ${refundData.bookingDetails.serviceName}</p>` : ''}
                    ${refundData.bookingDetails?.petName ? `<p><strong>Pet:</strong> ${refundData.bookingDetails.petName}</p>` : ''}
                </div>
                
                ${isAutomatic ? `
                <p><strong>Processing Information:</strong></p>
                <p>Your refund has been automatically processed through our payment system. The amount will be credited back to your original payment method within 3-5 business days.</p>
                ` : `
                <p><strong>Processing Information:</strong></p>
                <p>Your refund has been manually processed by our team. ${refundData.receiptPath ? 'An official receipt has been generated and is attached to this email.' : 'You will receive the refund according to the original payment method.'}</p>
                `}
                
                <p>If you have any questions about this refund, please contact our customer support team.</p>
                
                <p>Thank you for choosing RainbowPaws.</p>
            </div>
            
            <div class="footer">
                <p>RainbowPaws Cremation Services<br>
                This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Create refund processed email text
 */
function createRefundProcessedEmailText(refundData: RefundNotificationData): string {
  const { customerInfo } = refundData;
  const isAutomatic = refundData.refundType === 'automatic';
  
  return `
    REFUND PROCESSED SUCCESSFULLY
    
    Dear ${customerInfo?.firstName || 'Valued Customer'},
    
    Your refund has been processed successfully.
    
    REFUND DETAILS:
    - Refund Amount: ₱${refundData.amount.toFixed(2)}
    - Booking ID: #${refundData.bookingId}
    - Transaction ID: ${refundData.transactionId || 'N/A'}
    - Payment Method: ${refundData.paymentMethod.toUpperCase()}
    - Refund Type: ${isAutomatic ? 'Automatic' : 'Manual'}
    - Reason: ${refundData.reason}
    ${refundData.bookingDetails?.serviceName ? `- Service: ${refundData.bookingDetails.serviceName}` : ''}
    ${refundData.bookingDetails?.petName ? `- Pet: ${refundData.bookingDetails.petName}` : ''}
    
    ${isAutomatic ? 
      'Your refund has been automatically processed. The amount will be credited back to your original payment method within 3-5 business days.' :
      'Your refund has been manually processed by our team.'
    }
    
    If you have any questions, please contact our customer support team.
    
    Thank you for choosing RainbowPaws.
    
    --
    RainbowPaws Cremation Services
    This is an automated message.
  `;
}

/**
 * Create refund initiated email HTML
 */
function createRefundInitiatedEmailHtml(refundData: RefundNotificationData, instructions?: string[]): string {
  const { customerInfo } = refundData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Refund Request Initiated</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .instructions { background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .amount { font-size: 24px; font-weight: bold; color: #2196F3; }
            .status { display: inline-block; background: #2196F3; color: white; padding: 5px 10px; border-radius: 3px; }
            ul { margin: 10px 0; padding-left: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Refund Request Initiated</h1>
            </div>
            
            <div class="content">
                <p>Dear ${customerInfo?.firstName || 'Valued Customer'},</p>
                
                <p>Your refund request has been initiated and is being processed. Here are the details:</p>
                
                <div class="details">
                    <h3>Refund Request Details</h3>
                    <p><strong>Refund Amount:</strong> <span class="amount">₱${refundData.amount.toFixed(2)}</span></p>
                    <p><strong>Booking ID:</strong> #${refundData.bookingId}</p>
                    <p><strong>Payment Method:</strong> ${refundData.paymentMethod.toUpperCase()}</p>
                    <p><strong>Status:</strong> <span class="status">Processing</span></p>
                    <p><strong>Reason:</strong> ${refundData.reason}</p>
                    ${refundData.bookingDetails?.serviceName ? `<p><strong>Service:</strong> ${refundData.bookingDetails.serviceName}</p>` : ''}
                    ${refundData.bookingDetails?.petName ? `<p><strong>Pet:</strong> ${refundData.bookingDetails.petName}</p>` : ''}
                </div>
                
                ${instructions && instructions.length > 0 ? `
                <div class="instructions">
                    <h3>Important Instructions</h3>
                    <p>Since this was a manual payment, please note the following steps for processing your refund:</p>
                    <ul>
                        ${instructions.map(instruction => `<li>${instruction}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <p>We will send you another notification once your refund has been processed. If you have any questions, please contact our customer support team.</p>
                
                <p>Thank you for your patience.</p>
            </div>
            
            <div class="footer">
                <p>RainbowPaws Cremation Services<br>
                This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Create refund initiated email text
 */
function createRefundInitiatedEmailText(refundData: RefundNotificationData, instructions?: string[]): string {
  const { customerInfo } = refundData;
  
  return `
    REFUND REQUEST INITIATED
    
    Dear ${customerInfo?.firstName || 'Valued Customer'},
    
    Your refund request has been initiated and is being processed.
    
    REFUND REQUEST DETAILS:
    - Refund Amount: ₱${refundData.amount.toFixed(2)}
    - Booking ID: #${refundData.bookingId}
    - Payment Method: ${refundData.paymentMethod.toUpperCase()}
    - Status: Processing
    - Reason: ${refundData.reason}
    ${refundData.bookingDetails?.serviceName ? `- Service: ${refundData.bookingDetails.serviceName}` : ''}
    ${refundData.bookingDetails?.petName ? `- Pet: ${refundData.bookingDetails.petName}` : ''}
    
    ${instructions && instructions.length > 0 ? `
    IMPORTANT INSTRUCTIONS:
    Since this was a manual payment, please note the following steps:
    ${instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join('\n')}
    ` : ''}
    
    We will send you another notification once your refund has been processed.
    
    If you have any questions, please contact our customer support team.
    
    Thank you for your patience.
    
    --
    RainbowPaws Cremation Services
    This is an automated message.
  `;
}

/**
 * Create refund failed email HTML
 */
function createRefundFailedEmailHtml(refundData: RefundNotificationData, failureReason?: string): string {
  const { customerInfo } = refundData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Refund Processing Failed</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f44336; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .details { background: white; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .amount { font-size: 24px; font-weight: bold; color: #f44336; }
            .status { display: inline-block; background: #f44336; color: white; padding: 5px 10px; border-radius: 3px; }
            .support-info { background: #e3f2fd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #2196F3; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Refund Processing Failed</h1>
            </div>
            
            <div class="content">
                <p>Dear ${customerInfo?.firstName || 'Valued Customer'},</p>
                
                <p>We apologize, but we encountered an issue while processing your refund. Here are the details:</p>
                
                <div class="details">
                    <h3>Refund Request Details</h3>
                    <p><strong>Refund Amount:</strong> <span class="amount">₱${refundData.amount.toFixed(2)}</span></p>
                    <p><strong>Booking ID:</strong> #${refundData.bookingId}</p>
                    <p><strong>Payment Method:</strong> ${refundData.paymentMethod.toUpperCase()}</p>
                    <p><strong>Status:</strong> <span class="status">Failed</span></p>
                    <p><strong>Reason:</strong> ${refundData.reason}</p>
                    ${failureReason ? `<p><strong>Failure Reason:</strong> ${failureReason}</p>` : ''}
                    ${refundData.bookingDetails?.serviceName ? `<p><strong>Service:</strong> ${refundData.bookingDetails.serviceName}</p>` : ''}
                    ${refundData.bookingDetails?.petName ? `<p><strong>Pet:</strong> ${refundData.bookingDetails.petName}</p>` : ''}
                </div>
                
                <div class="support-info">
                    <h3>Next Steps</h3>
                    <p>Please contact our customer support team so we can assist you with processing your refund manually. Our team will review your case and ensure your refund is processed as quickly as possible.</p>
                    <p>When contacting support, please reference your booking ID: <strong>#${refundData.bookingId}</strong></p>
                </div>
                
                <p>We sincerely apologize for any inconvenience this may have caused.</p>
            </div>
            
            <div class="footer">
                <p>RainbowPaws Cremation Services<br>
                This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

/**
 * Create refund failed email text
 */
function createRefundFailedEmailText(refundData: RefundNotificationData, failureReason?: string): string {
  const { customerInfo } = refundData;
  
  return `
    REFUND PROCESSING FAILED
    
    Dear ${customerInfo?.firstName || 'Valued Customer'},
    
    We apologize, but we encountered an issue while processing your refund.
    
    REFUND REQUEST DETAILS:
    - Refund Amount: ₱${refundData.amount.toFixed(2)}
    - Booking ID: #${refundData.bookingId}
    - Payment Method: ${refundData.paymentMethod.toUpperCase()}
    - Status: Failed
    - Reason: ${refundData.reason}
    ${failureReason ? `- Failure Reason: ${failureReason}` : ''}
    ${refundData.bookingDetails?.serviceName ? `- Service: ${refundData.bookingDetails.serviceName}` : ''}
    ${refundData.bookingDetails?.petName ? `- Pet: ${refundData.bookingDetails.petName}` : ''}
    
    NEXT STEPS:
    Please contact our customer support team so we can assist you with processing your refund manually. Our team will review your case and ensure your refund is processed as quickly as possible.
    
    When contacting support, please reference your booking ID: #${refundData.bookingId}
    
    We sincerely apologize for any inconvenience this may have caused.
    
    --
    RainbowPaws Cremation Services
    This is an automated message.
  `;
}
