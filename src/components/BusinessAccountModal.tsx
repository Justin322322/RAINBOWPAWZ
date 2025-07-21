'use client';

import React, { useState } from 'react';
import { Modal, Input, Button, Checkbox, Alert, SelectInput } from '@/components/ui';
import { EyeIcon, EyeSlashIcon, ArrowRightIcon, DocumentArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal';
import { useToast } from '@/context/ToastContext';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';

type BusinessAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
};

const BusinessAccountModal: React.FC<BusinessAccountModalProps> = ({ isOpen, onClose, onBack }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    sex: '',
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    businessDescription: '',
    businessType: 'cremation',
    businessHours: '',
    birCertificate: null as File | null,
    businessPermit: null as File | null,
    governmentId: null as File | null,
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
    const { name, value, type } = e.target;

    if (type === 'file') {
      const fileInput = e.target as HTMLInputElement;
      const file = fileInput.files ? fileInput.files[0] : null;

      // Log the file details for debugging
      if (file) {
      }

      setFormData(prev => ({
        ...prev,
        [name]: file
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
    }

    // Evaluate password strength if the password field is changed
    if (name === 'password') {
      evaluatePasswordStrength(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // Create FormData object for file uploads
      const _formDataObj = new FormData();

      // Add all the form fields
      const textData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        sex: formData.sex,
        password: formData.password,
        businessName: formData.businessName,
        businessType: 'cremation', // Set fixed business type for cremation centers
        businessPhone: formData.businessPhone,
        businessAddress: formData.businessAddress,
        businessHours: formData.businessHours || null,
        serviceDescription: formData.businessDescription || null,
        account_type: 'business' as const
      };

      // Log the data being sent for debugging

      // First, try sending the registration data without files
      const regResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textData),
      });

      // Log the response for debugging

      const regData = await regResponse.json();

      if (!regResponse.ok) {
        // Handle specific error cases
        if (regData.error === 'Email already exists') {
          setErrorMessage('This email is already registered. Please use a different email or try logging in.');
          showToast('This email is already registered. Please use a different email or try logging in.', 'error');
          setIsLoading(false);
          return;
        } else {
          throw new Error(regData.error || regData.message || 'Registration failed');
        }
      }

      // Now upload the documents if registration was successful
      if (formData.birCertificate || formData.businessPermit || formData.governmentId) {
        try {
          // Create FormData for documents upload
          const docFormData = new FormData();

          // Add the user ID from the registration response
          docFormData.append('userId', regData.userId);

          // Add files if they exist
          if (formData.businessPermit) {
            docFormData.append('businessPermit', formData.businessPermit);
          }

          if (formData.birCertificate) {
            docFormData.append('birCertificate', formData.birCertificate);
          }

          if (formData.governmentId) {
            docFormData.append('governmentId', formData.governmentId);
          }

          // Send the document upload request
          const docResponse = await fetch('/api/businesses/upload-documents', {
            method: 'POST',
            body: docFormData,
          });

          const _docData = await docResponse.json();

          if (!docResponse.ok) {
            // We'll continue even if document upload fails
            // since the user account has been created
          } else {
          }
        } catch {
          // Continue with registration even if document upload fails
        }
      }

      // Show success toast notification
      showToast('Registration successful!', 'success');

      // Close the modal
      onClose();

      // Redirect to the dashboard page
      setTimeout(() => {
        window.location.href = '/cremation/dashboard';
      }, 1500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      showToast(errorMsg, 'error');
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColor = (strength: number) => {
    if (strength >= 4) return 'bg-green-500';
    if (strength >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
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
              <h2 className="text-3xl font-bold text-gray-800">Cremation Center Registration</h2>
              <p className="text-gray-500 mt-2">Join our network of trusted pet memorial service providers.</p>
            </div>
          
          {errorMessage && (
            <div className="mb-6">
              <Alert variant="error" title="Registration Error" onClose={() => setErrorMessage('')} dismissible>
                <p>{errorMessage}</p>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Owner Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="First Name" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Juan" required size="lg" />
                <Input label="Last Name" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Dela Cruz" required size="lg" />
                <Input label="Email Address" id="email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required size="lg" />
                <SelectInput id="sex" name="sex" label="Sex" value={formData.sex} onChange={(value) => setFormData({...formData, sex: value})} options={[{ value: "", label: "Select Sex" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }, { value: "prefer-not-to-say", label: "Prefer not to say" }]} required />
              </div>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Business Name" id="businessName" name="businessName" value={formData.businessName} onChange={handleChange} placeholder="ABC Pet Cremation" required size="lg" />
                <PhilippinePhoneInput id="businessPhone" name="businessPhone" label="Business Phone" value={formData.businessPhone} onChange={(value) => setFormData({...formData, businessPhone: value})} required />
                <Input label="Business Email" id="businessEmail" type="email" name="businessEmail" value={formData.businessEmail} onChange={handleChange} placeholder="contact@abccremation.com" required size="lg" />
                <Input label="Business Hours" id="businessHours" name="businessHours" value={formData.businessHours} onChange={handleChange} placeholder="e.g., Mon-Fri, 9am-5pm" size="lg" />
              </div>
              <div className="mt-6">
                <Input label="Business Address" id="businessAddress" name="businessAddress" value={formData.businessAddress} onChange={handleChange} placeholder="123 Business St, Quezon City" required size="lg" />
              </div>
              <div className="mt-6">
                <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                <textarea id="businessDescription" name="businessDescription" value={formData.businessDescription} onChange={handleChange} rows={4} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-green)] transition" placeholder="Tell us about your services..."></textarea>
              </div>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Required Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FileInput label="BIR Certificate" id="birCertificate" name="birCertificate" onChange={handleChange} fileName={formData.birCertificate?.name} />
                <FileInput label="Business Permit" id="businessPermit" name="businessPermit" onChange={handleChange} fileName={formData.businessPermit?.name} />
                <FileInput label="Government ID" id="governmentId" name="governmentId" onChange={handleChange} fileName={formData.governmentId?.name} />
              </div>
              <p className="text-xs text-gray-500 mt-4">Please upload documents in PDF, JPG, or PNG format. These are required for verification.</p>
            </div>

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
              {formData.password.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-300 ${strengthColor(passwordStrength)}`} style={{ width: `${(passwordStrength / 5) * 100}%` }}></div>
                  </div>
                  <p className="text-sm text-gray-600">{passwordFeedback}</p>
                </div>
              )}
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
              {isLoading ? 'Registering...' : 'Register Cremation Center'}
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

const FileInput = ({ label, id, name, onChange, fileName }: { label: string, id: string, name: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, fileName?: string }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[var(--primary-green)] transition-colors duration-200 text-center cursor-pointer">
      <DocumentArrowUpIcon className="mx-auto h-10 w-10 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">
        {fileName ? <span className="font-semibold text-[var(--primary-green)]">{fileName}</span> : 'Click to upload'}
      </p>
      <input type="file" id={id} name={name} onChange={onChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.jpeg,.png" required />
    </div>
  </div>
);


export default BusinessAccountModal;
