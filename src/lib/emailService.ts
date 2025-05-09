// Email service for client-side components
// We'll use the PHP API endpoints instead of direct nodemailer usage

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  // Use Next.js API route instead of PHP endpoint
  const response = await fetch('/api/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'reset',
      email,
      resetToken
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send password reset email');
  }

  return response.json();
};

export const sendWelcomeEmail = async (email: string, firstName: string, accountType: 'personal' | 'business') => {
  // Use Next.js API route instead of PHP endpoint
  const response = await fetch('/api/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'welcome',
      email,
      firstName,
      accountType
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to send welcome email');
  }

  return response.json();
};