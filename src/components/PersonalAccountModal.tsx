'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal';
import { useToast } from '@/context/ToastContext';
import { Button, Input, SelectInput, Checkbox } from '@/components/ui';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';

type PersonalAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
};

const PersonalAccountModal: React.FC<PersonalAccountModalProps> = ({ isOpen, onClose, onBack }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    sex: '',
    address: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

  // Function to evaluate password strength
  const evaluatePasswordStrength = (password: string) => {
    let strength = 0;
    let feedback = '';

    if (password.length === 0) {
      setPasswordStrength(0);
      setPasswordFeedback('');
      return;
    }

    // Length check
    if (password.length >= 8) {
      strength += 1;
    } else {
      feedback = 'Password should be at least 8 characters long';
      setPasswordStrength(strength);
      setPasswordFeedback(feedback);
      return;
    }

    // Contains lowercase
    if (/[a-z]/.test(password)) {
      strength += 1;
    }

    // Contains uppercase
    if (/[A-Z]/.test(password)) {
      strength += 1;
    } else {
      feedback = feedback || 'Add uppercase letters';
    }

    // Contains numbers
    if (/\d/.test(password)) {
      strength += 1;
    } else {
      feedback = feedback || 'Add numbers';
    }

    // Contains special characters
    if (/[^A-Za-z0-9]/.test(password)) {
      strength += 1;
    } else {
      feedback = feedback || 'Add special characters';
    }

    // Set feedback based on strength
    if (strength === 5) {
      feedback = 'Strong password';
    } else if (strength >= 3) {
      feedback = feedback || 'Good password, but could be stronger';
    } else {
      feedback = feedback || 'Weak password';
    }

    setPasswordStrength(strength);
    setPasswordFeedback(feedback);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    // Evaluate password strength if the password field is changed
    if (name === 'password') {
      evaluatePasswordStrength(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Proceed with registration

      // Use window.location.origin to get the current URL including port
      const _baseUrl = window.location.origin;


      // Call our Next.js API route for registration with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      try {
        // Create a simple test request first to check if the server is responding
        try {
          const _testResponse = await fetch(`/api/health-check`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });
        } catch (_testError) {
        }

        // Now send the actual registration request
        const response = await fetch(`/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            account_type: 'personal'
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId); // Clear the timeout if the request completes

        // Get the raw response text first for debugging
        const responseText = await response.text();

        // Try to parse the response as JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (_jsonError) {

          // If we can't parse the response as JSON, check if it's an HTML error page
          if (responseText.includes('<!DOCTYPE html>')) {
            throw new Error('Server error: Received HTML response instead of JSON. The server might be misconfigured.');
          } else {
            throw new Error(`Failed to parse server response: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);
          }
        }

        if (!response.ok) {
          // Handle specific error cases
          if (data.error === 'Email already exists') {
            setErrorMessage('This email is already registered. Please use a different email or try logging in.');
            showToast('This email is already registered. Please use a different email or try logging in.', 'error');
          } else {
            // Instead of throwing an error, set the error message and show a toast
            const errorMsg = data.error || data.message || 'Registration failed';
            setErrorMessage(errorMsg);
            showToast(errorMsg, 'error');
          }
          return;
        }

        // Show success toast notification and close modal immediately
        showToast('Registration successful! Check your email for confirmation.', 'success');
        onClose();
      } catch (fetchError: any) {

        // Handle network errors
        let errorMessage = 'Network error. Please check your internet connection and try again.';

        if (fetchError && fetchError.name === 'AbortError') {
          errorMessage = 'Request timed out. The server took too long to respond.';
        }

        setErrorMessage(errorMessage);
        showToast(errorMessage, 'error');
      }
    } catch (error) {

      // Log more detailed error information
      if (error instanceof Error) {
      }

      const errorMsg = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      showToast(errorMsg, 'error');
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const _inputClasses = "w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent transition-all duration-200 font-light";
  const _labelClasses = "block text-sm font-light text-gray-700 mb-2";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fur Parent Registration" size="medium" onBack={onBack}>
      <div className="space-y-6">
        {errorMessage && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              type="text"
              id="firstName"
              name="firstName"
              label="First Name"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter your first name"
              required
              rounded="default"
              size="lg"
              labelClassName="font-light"
            />

            <Input
              type="text"
              id="lastName"
              name="lastName"
              label="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter your last name"
              required
              rounded="default"
              size="lg"
              labelClassName="font-light"
            />
          </div>

          <Input
            type="email"
            id="email"
            name="email"
            label="Email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email address"
            required
            rounded="default"
            size="lg"
            labelClassName="font-light"
          />

          <SelectInput
            id="sex"
            name="sex"
            label="Sex"
            value={formData.sex}
            onChange={(value) => setFormData({...formData, sex: value})}
            options={[
              { value: "", label: "Select Sex" },
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
              { value: "prefer-not-to-say", label: "Prefer not to say" }
            ]}
            required
            labelClassName="font-light"
          />

          <Input
            type="text"
            id="address"
            name="address"
            label="Address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Enter your address"
            rounded="default"
            size="lg"
            labelClassName="font-light"
          />

          <PhilippinePhoneInput
            id="phoneNumber"
            name="phoneNumber"
            label="Phone Number"
            value={formData.phoneNumber}
            onChange={(value) => setFormData({...formData, phoneNumber: value})}
            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent transition-all duration-200 font-light"
          />

          <div>
            <Input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              label="Password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              required
              rounded="default"
              size="lg"
              labelClassName="font-light"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              }
            />
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-gray-600">Password strength:</div>
                  <div className="text-xs font-medium" style={{ color: passwordStrength >= 4 ? 'green' : passwordStrength >= 3 ? 'orange' : 'red' }}>
                    {passwordStrength === 0 ? 'Very weak' :
                     passwordStrength === 1 ? 'Weak' :
                     passwordStrength === 2 ? 'Fair' :
                     passwordStrength === 3 ? 'Good' :
                     passwordStrength === 4 ? 'Strong' : 'Very strong'}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${(passwordStrength / 5) * 100}%`,
                      backgroundColor: passwordStrength >= 4 ? 'green' : passwordStrength >= 3 ? 'orange' : 'red'
                    }}
                  ></div>
                </div>
                {passwordFeedback && (
                  <p className="mt-1 text-xs text-gray-600">{passwordFeedback}</p>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  <p>Password must contain:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li className={/[a-z]/.test(formData.password) ? "text-green-600" : ""}>Lowercase letters</li>
                    <li className={/[A-Z]/.test(formData.password) ? "text-green-600" : ""}>Uppercase letters</li>
                    <li className={/\d/.test(formData.password) ? "text-green-600" : ""}>Numbers</li>
                    <li className={/[^A-Za-z0-9]/.test(formData.password) ? "text-green-600" : ""}>Special characters</li>
                    <li className={formData.password.length >= 8 ? "text-green-600" : ""}>At least 8 characters</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <Input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            required
            rounded="default"
            size="lg"
            labelClassName="font-light"
            error={formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword ? "Passwords do not match" : undefined}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            }
          />

          <div className="flex items-center">
            <Checkbox
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={(e) => {
                handleChange(e);
                if (!formData.agreeToTerms) {
                  setIsPrivacyPolicyOpen(true);
                }
              }}
              label="I agree to the Privacy Policy"
              containerClassName="flex items-center"
              onClick={(e) => {
                e.stopPropagation();
                setIsPrivacyPolicyOpen(true);
              }}
              required
              labelClassName="font-light"
            />
          </div>

          <PrivacyPolicyModal
            isOpen={isPrivacyPolicyOpen}
            onClose={() => {
              // Just close the modal without changing the checkbox state
              setIsPrivacyPolicyOpen(false);
            }}
            onAccept={() => {
              // When accepting, check the checkbox
              setFormData(prev => ({ ...prev, agreeToTerms: true }));
              setIsPrivacyPolicyOpen(false);
            }}
          />

          <Button
            type="submit"
            disabled={isLoading}
            isLoading={isLoading}
            fullWidth
            size="lg"
            rounded="default"
            className="font-light tracking-wide text-lg"
          >
            {isLoading ? 'Registering...' : 'Register Fur Parent Account'}
          </Button>
          </form>
      </div>
    </Modal>
  );
};

export default PersonalAccountModal;
