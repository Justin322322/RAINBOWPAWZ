'use client';

import React, { useState } from 'react';
import { Modal, Input, Button, Checkbox, SelectInput } from '@/components/ui';
import { EyeIcon, EyeSlashIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import PrivacyPolicyModal from '@/components/PrivacyPolicyModal';
import { useToast } from '@/context/ToastContext';
import PhilippinePhoneInput from '@/components/ui/PhilippinePhoneInput';
import PasswordCriteria from '@/components/ui/PasswordCriteria';
import FileInputWithThumbnail from '@/components/ui/FileInputWithThumbnail';

// Error Modal Component
interface ErrorModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, title, message, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-700">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

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
    businessStreetAddress: '',
    businessBarangay: '',
    businessCity: '',
    businessProvince: '',
    businessPostalCode: '',
    businessPhone: '',
    businessEmail: '',
    businessDescription: '',
    businessType: 'cremation',
    businessEntityType: 'sole_proprietorship', // New field for legal entity type
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
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);

  // Handle password strength updates from PasswordCriteria component
  const handlePasswordStrengthChange = (_strength: number, isValid: boolean) => {
    setIsPasswordValid(isValid);
  };

  // Helper function to show error modal
  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  // Helper function to close error modal
  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
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

    // Password strength is now handled by the PasswordCriteria component
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    // Validate required fields
    const missingFields = [];

    if (!formData.firstName.trim()) missingFields.push('First Name');
    if (!formData.lastName.trim()) missingFields.push('Last Name');
    if (!formData.email.trim()) missingFields.push('Email Address');
    if (!formData.businessName.trim()) missingFields.push('Business Name');
    if (!formData.businessStreetAddress.trim()) missingFields.push('Business Street Address');
    if (!formData.businessBarangay.trim()) missingFields.push('Business Barangay');
    if (!formData.businessCity.trim()) missingFields.push('Business City');
    if (!formData.businessProvince.trim()) missingFields.push('Business Province');
    if (!formData.businessPhone.trim()) missingFields.push('Business Phone');
    if (!formData.businessEmail.trim()) missingFields.push('Business Email');
    if (!formData.businessEntityType) missingFields.push('Business Entity Type');
    if (!formData.password) missingFields.push('Password');
    if (!formData.confirmPassword) missingFields.push('Confirm Password');
    if (!formData.agreeToTerms) missingFields.push('Terms and Conditions');

    if (missingFields.length > 0) {
      showError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      setIsLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim()) || !emailRegex.test(formData.businessEmail.trim())) {
      showError('Please enter valid email addresses');
      setIsLoading(false);
      return;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      setIsLoading(false);
      return;
    }

    // Validate password strength before submission
    if (!isPasswordValid) {
      showToast('Password must meet all security requirements: at least 8 characters with uppercase, lowercase, numbers, and special characters', 'error');
      setIsLoading(false);
      return;
    }

    try {
      // Upload documents to temporary storage first (before registration)
      let uploadedDocumentUrls = null;

      const hasDocuments = formData.birCertificate || formData.businessPermit || formData.governmentId;

      if (hasDocuments) {
        // Validate file types and sizes before upload
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/jpg',
          'image/gif',
          'image/webp'
        ];

        const fileValidationErrors = [];
        if (formData.businessPermit) {
          if (formData.businessPermit.size > maxSize) {
            fileValidationErrors.push('Business Permit: File too large (max 10MB)');
          }
          if (!allowedTypes.includes(formData.businessPermit.type)) {
            fileValidationErrors.push('Business Permit: Invalid file type (PDF, Word documents, images only)');
          }
        }
        if (formData.birCertificate) {
          if (formData.birCertificate.size > maxSize) {
            fileValidationErrors.push('BIR Certificate: File too large (max 10MB)');
          }
          if (!allowedTypes.includes(formData.birCertificate.type)) {
            fileValidationErrors.push('BIR Certificate: Invalid file type (PDF, Word documents, images only)');
          }
        }
        if (formData.governmentId) {
          if (formData.governmentId.size > maxSize) {
            fileValidationErrors.push('Government ID: File too large (max 10MB)');
          }
          if (!allowedTypes.includes(formData.governmentId.type)) {
            fileValidationErrors.push('Government ID: Invalid file type (PDF, Word documents, images only)');
          }
        }

        if (fileValidationErrors.length > 0) {
          showError(`Document validation failed: ${fileValidationErrors.join(', ')}`);
          setIsLoading(false);
          return;
        }

        try {
          // Upload documents to temporary storage (no authentication required)
          const tempDocFormData = new FormData();

          if (formData.businessPermit) {
            tempDocFormData.append('businessPermit', formData.businessPermit);
          }
          if (formData.birCertificate) {
            tempDocFormData.append('birCertificate', formData.birCertificate);
          }
          if (formData.governmentId) {
            tempDocFormData.append('governmentId', formData.governmentId);
          }

          const tempUploadResponse = await fetch('/api/businesses/upload-documents-temp', {
            method: 'POST',
            body: tempDocFormData
          });

          if (!tempUploadResponse.ok) {
            const tempData = await tempUploadResponse.json();
            showError(`Document upload failed: ${tempData.error || 'Unknown error'}`);
            setIsLoading(false);
            return;
          }

          const tempJson = await tempUploadResponse.json();
          // Normalize to the plain mapping expected by the API and register route
          uploadedDocumentUrls = tempJson?.filePaths ?? tempJson ?? {};
          console.log('Documents uploaded to temporary storage:', uploadedDocumentUrls);

        } catch (tempError) {
          console.error('Temporary document upload error:', tempError);
          showError('Failed to upload documents. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // Combine address fields into single address string (only include non-empty fields)
      const businessAddressParts = [];
      if (formData.businessStreetAddress?.trim()) businessAddressParts.push(formData.businessStreetAddress.trim());
      if (formData.businessBarangay?.trim()) businessAddressParts.push(formData.businessBarangay.trim());
      if (formData.businessCity?.trim()) businessAddressParts.push(formData.businessCity.trim());
      if (formData.businessProvince?.trim()) businessAddressParts.push(formData.businessProvince.trim());
      if (formData.businessPostalCode?.trim()) businessAddressParts.push(formData.businessPostalCode.trim());
      businessAddressParts.push('Philippines'); // Always include Philippines
      const businessAddress = businessAddressParts.join(', ');

      // Now proceed with registration including document URLs
      const textData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        sex: formData.sex,
        password: formData.password,
        businessName: formData.businessName,
        businessType: 'cremation',
        businessEntityType: formData.businessEntityType,
        businessPhone: formData.businessPhone,
        businessAddress: businessAddress,
        businessHours: formData.businessHours || null,
        serviceDescription: formData.businessDescription || null,
        account_type: 'business' as const,
        // Include uploaded document URLs
        ...(uploadedDocumentUrls && { documentUrls: uploadedDocumentUrls })
      };

      console.log('Submitting registration with documents:', textData);

      // Register the user with document information
      const regResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textData),
      });

      const regData = await regResponse.json();

      if (!regResponse.ok) {
        // Handle specific error cases with modal overlay
        if (regData.error === 'Email already exists') {
          showError('This email is already registered. Please use a different email or try logging in.');
        } else {
          showError(regData.error || regData.message || 'Registration failed. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // If we have temp documents, migrate them to permanent storage
      if (hasDocuments && uploadedDocumentUrls) {
        try {
          console.log('Migrating temp documents to permanent storage...');

          // Extract temp URLs from the uploaded document response
          const tempUrls = {
            business_permit_path: uploadedDocumentUrls.business_permit_path || null,
            bir_certificate_path: uploadedDocumentUrls.bir_certificate_path || null,
            government_id_path: uploadedDocumentUrls.government_id_path || null
          };

          // Filter out null values
          const filteredTempUrls = Object.fromEntries(
            Object.entries(tempUrls).filter(([_, value]) => value !== null)
          );

          if (Object.keys(filteredTempUrls).length > 0) {
            const migrationResponse = await fetch('/api/businesses/upload-documents', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                action: 'migrate',
                tempUrls: filteredTempUrls
              }),
            });

            if (migrationResponse.ok) {
              const migrationResult = await migrationResponse.json();
              console.log('Document migration successful:', migrationResult);
            } else {
              console.error('Document migration failed:', await migrationResponse.text());
              // Don't fail registration if migration fails - documents will still work from temp storage
            }
          }
        } catch (migrationError) {
          console.error('Error during document migration:', migrationError);
          // Continue with registration even if migration fails
        }
      }

      // Success!
      if (hasDocuments) {
        showToast('Registration and document upload successful!', 'success');
      } else {
        showToast('Registration successful!', 'success');
      }

      // Close the modal
      onClose();

      // Redirect to the dashboard page
      setTimeout(() => {
        window.location.href = '/cremation/dashboard';
      }, 1500);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      showError(errorMsg);
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
            <h2 className="text-3xl font-bold text-gray-800">Cremation Center Registration</h2>
            <p className="text-gray-500 mt-2">Join our network of trusted pet memorial service providers.</p>
          </div>



          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Owner Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="First Name" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Juan" required size="lg" />
                <Input label="Last Name" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Dela Cruz" required size="lg" />
                <Input label="Email Address" id="email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required size="lg" />
                <SelectInput id="sex" name="sex" label="Sex" value={formData.sex} onChange={(value) => setFormData({ ...formData, sex: value })} options={[{ value: "", label: "Select Sex" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }, { value: "prefer-not-to-say", label: "Prefer not to say" }]} required size="lg" />
              </div>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Business Name" id="businessName" name="businessName" value={formData.businessName} onChange={handleChange} placeholder="ABC Pet Cremation" required size="lg" />
                <PhilippinePhoneInput id="businessPhone" name="businessPhone" label="Business Phone" value={formData.businessPhone} onChange={(value) => setFormData({ ...formData, businessPhone: value })} required size="lg" />
                <Input label="Business Email" id="businessEmail" type="email" name="businessEmail" value={formData.businessEmail} onChange={handleChange} placeholder="contact@abccremation.com" required size="lg" />
                <Input label="Business Hours" id="businessHours" name="businessHours" value={formData.businessHours} onChange={handleChange} placeholder="e.g., Mon-Fri, 9am-5pm" size="lg" />
              </div>
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-4">Business Address</h4>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Street Address"
                      id="businessStreetAddress"
                      name="businessStreetAddress"
                      value={formData.businessStreetAddress}
                      onChange={handleChange}
                      placeholder="123 Business Street"
                      required
                      size="lg"
                      hideOptionalHint
                    />
                    <Input
                      label="Barangay"
                      id="businessBarangay"
                      name="businessBarangay"
                      value={formData.businessBarangay}
                      onChange={handleChange}
                      placeholder="Barangay 1"
                      required
                      size="lg"
                      hideOptionalHint
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                      label="City/Municipality"
                      id="businessCity"
                      name="businessCity"
                      value={formData.businessCity}
                      onChange={handleChange}
                      placeholder="Balanga City"
                      required
                      size="lg"
                      hideOptionalHint
                    />
                    <Input
                      label="Province"
                      id="businessProvince"
                      name="businessProvince"
                      value={formData.businessProvince}
                      onChange={handleChange}
                      placeholder="Bataan"
                      required
                      size="lg"
                      hideOptionalHint
                    />
                    <Input
                      label="Postal Code"
                      id="businessPostalCode"
                      name="businessPostalCode"
                      value={formData.businessPostalCode}
                      onChange={handleChange}
                      placeholder="2100"
                      size="lg"
                      hideOptionalHint
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <SelectInput
                  label="Business Entity Type"
                  id="businessEntityType"
                  name="businessEntityType"
                  value={formData.businessEntityType}
                  onChange={(value) => setFormData({ ...formData, businessEntityType: value })}
                  required
                  size="lg"
                  options={[
                    { value: "sole_proprietorship", label: "Sole Proprietorship" },
                    { value: "corporation", label: "Corporation" },
                    { value: "partnership", label: "Partnership" },
                    { value: "limited_liability_company", label: "Limited Liability Company (LLC)" },
                    { value: "cooperative", label: "Cooperative" }
                  ]}
                />
              </div>
              <div className="mt-6">
                <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                <textarea id="businessDescription" name="businessDescription" value={formData.businessDescription} onChange={handleChange} rows={4} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary-green)] transition" placeholder="Tell us about your services..."></textarea>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Required Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FileInputWithThumbnail
                  label="BIR Certificate"
                  id="birCertificate"
                  name="birCertificate"
                  onChange={handleChange}
                  file={formData.birCertificate}
                  required
                />
                <FileInputWithThumbnail
                  label="Business Permit"
                  id="businessPermit"
                  name="businessPermit"
                  onChange={handleChange}
                  file={formData.businessPermit}
                  required
                />
                <FileInputWithThumbnail
                  label="Government ID"
                  id="governmentId"
                  name="governmentId"
                  onChange={handleChange}
                  file={formData.governmentId}
                  required
                />
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

      {/* Error Modal */}
      {showErrorModal && (
        <ErrorModal
          isOpen={showErrorModal}
          title="Registration Error"
          message={errorMessage}
          onClose={closeErrorModal}
        />
      )}
    </>
  );
};




export default BusinessAccountModal;
