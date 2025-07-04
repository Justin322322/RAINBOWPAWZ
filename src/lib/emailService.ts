// Email service for client-side components
// This service provides functions to send emails via the API

/**
 * Send a password reset email
 */
export const sendPasswordResetEmail = async (email: string, resetToken: string, useQueue = false) => {
  const response = await fetch('/api/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'reset',
      email,
      resetToken,
      useQueue
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send password reset email');
  }

  return response.json();
};

/**
 * Send a welcome email
 */
export const sendWelcomeEmail = async (email: string, firstName: string, accountType: 'personal' | 'business', useQueue = false) => {
  const response = await fetch('/api/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'welcome',
      email,
      firstName,
      accountType,
      useQueue
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send welcome email');
  }

  return response.json();
};

// OTP email functionality moved to consolidatedEmailService.ts

// Booking confirmation email functionality moved to consolidatedEmailService.ts

// Booking status update email functionality moved to consolidatedEmailService.ts

/**
 * Send a business verification email
 */
export const sendBusinessVerificationEmail = async (
  email: string,
  businessDetails: {
    businessName: string;
    contactName: string;
    status: 'approved' | 'rejected' | 'pending' | 'documents_required';
    notes?: string;
  },
  useQueue = true
) => {
  const response = await fetch('/api/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'business_verification',
      email,
      businessDetails,
      useQueue
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send business verification email');
  }

  return response.json();
};

/**
 * Send an application decline email
 */
export const sendApplicationDeclineEmail = async (
  email: string,
  applicationDetails: {
    businessName: string;
    contactName: string;
    reason: string;
  },
  useQueue = true
) => {
  const response = await fetch('/api/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'application_decline',
      email,
      businessDetails: {
        businessName: applicationDetails.businessName,
        contactName: applicationDetails.contactName,
        notes: applicationDetails.reason
      },
      useQueue
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send application decline email');
  }

  return response.json();
};