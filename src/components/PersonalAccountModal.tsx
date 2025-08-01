'use client';

import React, { useState } from 'react';
import { Modal, Input, Button, Checkbox, Alert, SelectInput } from '@/components/ui';
import { EyeIcon, EyeSlashIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal';
import { useToast } from '@/context/ToastContext';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';
import PasswordCriteria from '@/components/ui/PasswordCriteria';

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
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

  // Handle password strength updates from PasswordCriteria component
  const handlePasswordStrengthChange = (_strength: number, isValid: boolean) => {
    setIsPasswordValid(isValid);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    // Password strength is now handled by the PasswordCriteria component
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

    // Validate password strength before submission
    if (!isPasswordValid) {
      setErrorMessage('Password must meet all security requirements: at least 8 characters with uppercase, lowercase, numbers, and special characters');
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
        } catch {
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
        } catch {

          // If we can't parse the response as JSON, check if it's an HTML error page
          if (responseText.includes('<!DOCTYPE html>')) {
            throw new Error('Server error: Received HTML response instead of JSON. The server might be misconfigured.');
          } else {
            throw new Error(`Failed to parse server response: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);
          }
        }

        if (!response.ok) {
          // Handle server errors with both inline and toast notifications
          const errorMsg = data.error === 'Email already exists'
            ? 'This email is already registered. Please use a different email or try logging in.'
            : data.error || data.message || 'Registration failed. Please try again.';
          
          setErrorMessage(errorMsg);
          showToast(errorMsg, 'error');
          return;
        }

        // Show success message and close modal
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



  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        onBack={onBack}
        size="large"
      >
        <div className="relative p-6 pt-10">
            {onBack && (
              <button
                onClick={onBack}
                className="absolute top-3 left-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10 p-2 rounded-full hover:bg-gray-100"
                aria-label="Go back"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10 p-2 rounded-full hover:bg-gray-100"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Create Your Fur Parent Account</h2>
              <p className="text-gray-500 mt-2">Join our community and create beautiful memorials for your pets.</p>
            </div>
          
          {errorMessage && (
            <div className="mb-6">
              <Alert variant="error" title="Registration Error" onClose={() => setErrorMessage('')} dismissible>
                <p>{errorMessage}</p>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Juan"
                required
                size="lg"
              />
              <Input
                label="Last Name"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Dela Cruz"
                required
                size="lg"
              />
            </div>

            <Input
              label="Email Address"
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              size="lg"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              />
              <PhilippinePhoneInput
                id="phoneNumber"
                name="phoneNumber"
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={(value) => setFormData({...formData, phoneNumber: value})}
              />
            </div>

            <Input
              label="Home Address"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Main St, Balanga City, Bataan, Philippines"
              size="lg"
            />

            <div>
              <Input
                label="Password"
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
                size="lg"
                rightIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-[var(--primary-green)]">
                    {showPassword ? <EyeSlashIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
                  </button>
                }
              />
              <PasswordCriteria
                password={formData.password}
                onStrengthChange={handlePasswordStrengthChange}
              />
            </div>

            <Input
              label="Confirm Password"
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your new password"
              required
              size="lg"
              error={formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword ? "Passwords do not match" : undefined}
              rightIcon={
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-gray-400 hover:text-[var(--primary-green)]">
                  {showConfirmPassword ? <EyeSlashIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
                </button>
              }
            />

            <Checkbox
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              required
              label={
                <span>
                  I agree to the{' '}
                  <button type="button" onClick={() => setIsPrivacyPolicyOpen(true)} className="text-[var(--primary-green)] hover:underline font-semibold">
                    Privacy Policy
                  </button>
                </span>
              }
            />

            <Button
              type="submit"
              disabled={isLoading || !formData.agreeToTerms}
              isLoading={isLoading}
              fullWidth
              size="lg"
              className="bg-[var(--primary-green)] hover:bg-[var(--primary-green-hover)] text-white font-bold tracking-wide flex items-center justify-center group"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
              {!isLoading && <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
            </Button>
          </form>
        </div>
      </Modal>

      <PrivacyPolicyModal
        isOpen={isPrivacyPolicyOpen}
        onClose={() => setIsPrivacyPolicyOpen(false)}
        onAccept={() => {
          setFormData(prev => ({ ...prev, agreeToTerms: true }));
          setIsPrivacyPolicyOpen(false);
        }}
      />
    </>
  );
};

export default PersonalAccountModal;
