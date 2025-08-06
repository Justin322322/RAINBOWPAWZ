/**
 * Shared password validation utility
 * Used across registration, password reset, and other password-related features
 */

interface PasswordValidationResult {
  isValid: boolean;
  message: string;
  requirements: string[];
}

/**
 * Validates password strength according to application requirements
 * Must meet all criteria: 8+ chars, uppercase, lowercase, numbers, special chars
 * 
 * @param password - The password to validate
 * @returns PasswordValidationResult with validation status and requirements
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const requirements: string[] = [];
  let isValid = true;

  // Check minimum length (8 characters)
  if (password.length < 8) {
    requirements.push('At least 8 characters long');
    isValid = false;
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    requirements.push('At least one lowercase letter');
    isValid = false;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    requirements.push('At least one uppercase letter');
    isValid = false;
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    requirements.push('At least one number');
    isValid = false;
  }

  // Check for special characters
  if (!/[^A-Za-z0-9]/.test(password)) {
    requirements.push('At least one special character');
    isValid = false;
  }

  const message = isValid
    ? 'Password meets all requirements'
    : `Password must include: ${requirements.join(', ')}`;

  return {
    isValid,
    message,
    requirements
  };
}

/**
 * Password criteria for UI components
 * Matches the criteria used in PasswordCriteria component
 */
const PASSWORD_CRITERIA = [
  {
    id: 'length',
    label: 'At least 8 characters',
    test: (pwd: string) => pwd.length >= 8,
    description: 'Password must be at least 8 characters long'
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (pwd: string) => /[a-z]/.test(pwd),
    description: 'Include at least one lowercase letter (a-z)'
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (pwd: string) => /[A-Z]/.test(pwd),
    description: 'Include at least one uppercase letter (A-Z)'
  },
  {
    id: 'number',
    label: 'One number',
    test: (pwd: string) => /\d/.test(pwd),
    description: 'Include at least one number (0-9)'
  },
  {
    id: 'special',
    label: 'One special character',
    test: (pwd: string) => /[^A-Za-z0-9]/.test(pwd),
    description: 'Include at least one special character (!@#$%^&*)'
  }
];

/**
 * Calculate password strength score (0-5)
 * @param password - The password to evaluate
 * @returns Number of criteria met (0-5)
 */
function calculatePasswordStrength(password: string): number {
  return PASSWORD_CRITERIA.filter(criterion => criterion.test(password)).length;
}


