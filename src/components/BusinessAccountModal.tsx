'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal';
import { useToast } from '@/context/ToastContext';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';
import { SelectInput } from '@/components/ui/SelectInput';

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
      console.log("Sending registration data:", textData);

      // First, try sending the registration data without files
      const regResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textData),
      });

      // Log the response for debugging
      console.log("Registration response status:", regResponse.status);

      const regData = await regResponse.json();
      console.log("Registration response data:", regData);

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
        } catch (_docError) {
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

  const inputClasses = "w-full px-4 py-3 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-green)] focus:border-transparent transition-all duration-200 font-light";
  const labelClasses = "block text-sm font-light text-gray-700 mb-2";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cremation Center Registration" size="large" onBack={onBack}>
      <div className="space-y-6">
        {errorMessage && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-100">
            <p className="text-sm text-red-600">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className={labelClasses}>
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter your first name"
                required
              />
            </div>

            <div>
              <label htmlFor="lastName" className={labelClasses}>
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Enter your last name"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClasses}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter your email address"
              required
            />
          </div>

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

          <div>
            <label htmlFor="businessName" className={labelClasses}>
              Business Name
            </label>
            <input
              type="text"
              id="businessName"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter your business name"
              required
            />
          </div>

          <div>
            <label htmlFor="businessAddress" className={labelClasses}>
              Business Address
            </label>
            <input
              type="text"
              id="businessAddress"
              name="businessAddress"
              value={formData.businessAddress}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter your business address"
              required
            />
          </div>

          <div>
            <label htmlFor="businessHours" className={labelClasses}>
              Business Hours
            </label>
            <input
              type="text"
              id="businessHours"
              name="businessHours"
              value={formData.businessHours}
              onChange={handleChange}
              className={inputClasses}
              placeholder="e.g., Mon-Fri: 9AM-5PM, Sat: 10AM-3PM"
            />
          </div>

          <PhilippinePhoneInput
            id="businessPhone"
            name="businessPhone"
            label="Business Phone"
            value={formData.businessPhone}
            onChange={(value) => setFormData({...formData, businessPhone: value})}
            className={inputClasses}
            required
          />

          <div>
            <label htmlFor="businessEmail" className={labelClasses}>
              Business Email
            </label>
            <input
              type="email"
              id="businessEmail"
              name="businessEmail"
              value={formData.businessEmail}
              onChange={handleChange}
              className={inputClasses}
              placeholder="Enter your business email address"
              required
            />
          </div>

          <div>
            <label htmlFor="businessDescription" className={labelClasses}>
              Business Description
            </label>
            <textarea
              id="businessDescription"
              name="businessDescription"
              value={formData.businessDescription}
              onChange={handleChange}
              className={`${inputClasses} h-32 resize-none`}
              placeholder="Describe your business and services..."
              required
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-800">Required Documents</h3>

            <div>
              <label htmlFor="birCertificate" className={labelClasses}>
                BIR Certificate
              </label>
              <input
                type="file"
                id="birCertificate"
                name="birCertificate"
                onChange={handleChange}
                className={inputClasses}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.birCertificate ? formData.birCertificate.name : "No file selected"}
              </p>
            </div>

            <div>
              <label htmlFor="businessPermit" className={labelClasses}>
                Business Permit
              </label>
              <input
                type="file"
                id="businessPermit"
                name="businessPermit"
                onChange={handleChange}
                className={inputClasses}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.businessPermit ? formData.businessPermit.name : "No file selected"}
              </p>
            </div>

            <div>
              <label htmlFor="governmentId" className={labelClasses}>
                Government ID
              </label>
              <input
                type="file"
                id="governmentId"
                name="governmentId"
                onChange={handleChange}
                className={inputClasses}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.governmentId ? formData.governmentId.name : "No file selected"}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="password" className={labelClasses}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Create a strong password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
            </div>
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

          <div>
            <label htmlFor="confirmPassword" className={labelClasses}>
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
            </div>
            {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="agreeToTerms"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onClick={() => {
                // Open the privacy policy modal when clicking the checkbox
                setIsPrivacyPolicyOpen(true);
              }}
              onChange={handleChange}
              className="h-4 w-4 text-[var(--primary-green)] focus:ring-[var(--primary-green)] border-gray-300 rounded cursor-pointer"
              required
            />
            <label htmlFor="agreeToTerms" className="ml-2 block text-sm font-light text-gray-700 cursor-pointer" onClick={() => {
              setIsPrivacyPolicyOpen(true);
            }}>
              I agree to the <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPrivacyPolicyOpen(true);
                }}
                className="text-[var(--primary-green)] hover:text-[var(--primary-green-hover)] transition-colors duration-200 underline"
              >
                Privacy Policy
              </button>
            </label>
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

          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full bg-[var(--primary-green)] text-white py-4 px-8 rounded-md
              hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2
              focus:ring-offset-2 focus:ring-[var(--primary-green)] transition-all duration-200
              font-light tracking-wide text-lg flex items-center justify-center
              ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
            `}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Registering...</span>
              </>
            ) : (
              'Register Cremation Center'
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default BusinessAccountModal;
