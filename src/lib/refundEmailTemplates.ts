// Refund-specific email templates

import { baseEmailTemplate } from './emailTemplates';

// Refund completion email template
export const refundCompletedTemplate = (data: {
  customerName: string;
  refundAmount: number;
  refundId: number;
  paymentMethod: string;
  bookingId: number;
}) => {
  const content = `
    <div class="content">
      <h2>Refund Completed Successfully!</h2>
      <p>Dear ${data.customerName},</p>
      
      <p>We're pleased to inform you that your refund has been processed successfully.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #10B981;">Refund Details</h3>
        <p><strong>Refund Amount:</strong> ₱${data.refundAmount.toFixed(2)}</p>
        <p><strong>Refund ID:</strong> #${data.refundId}</p>
        <p><strong>Original Payment Method:</strong> ${data.paymentMethod.toUpperCase()}</p>
        <p><strong>Booking ID:</strong> #${data.bookingId}</p>
      </div>
      
      <p>The refund has been processed through your original payment method. Please allow 3-5 business days for the funds to appear in your account.</p>
      
      <p>You can download your refund receipt from your dashboard at any time.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://rainbowpaws.com'}/user/furparent_dashboard/refunds" class="button">
          View Refund Details
        </a>
      </div>
      
      <p>If you have any questions about this refund, please don't hesitate to contact our support team.</p>
      
      <p>Thank you for choosing RainbowPaws for your pet care needs.</p>
      
      <p>Best regards,<br>
      The RainbowPaws Team</p>
    </div>
  `;
  
  return {
    subject: 'Refund Completed - RainbowPaws',
    html: baseEmailTemplate(content)
  };
};
