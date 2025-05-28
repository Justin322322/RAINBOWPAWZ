'use client';

import React from 'react';
import Modal from './Modal';

type PrivacyPolicyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
};

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose, onAccept }) => {
  const handleAccept = (e: React.MouseEvent) => {
    // Prevent event bubbling and default behavior
    e.stopPropagation();
    e.preventDefault();

    // Check the checkbox
    onAccept();

    // Close the modal
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy Policy" size="large" closeOnOverlayClick={false}>
      <div className="space-y-6 text-sm text-gray-700 max-h-[70vh] overflow-y-auto pr-2">
        <h2 className="text-lg font-medium text-gray-900">Rainbow Paws Privacy Policy</h2>
        <p className="font-medium">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-4">
          <p>
            This Privacy Policy describes how Rainbow Paws (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, and discloses your personal information when you use our website and services. This policy is in compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012 of the Philippines.
          </p>

          <h3 className="text-md font-medium text-gray-900">1. Information We Collect</h3>
          <p>We collect the following types of information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Personal Information:</strong> Name, email address, contact information, address, and sex.</li>
            <li><strong>Business Information:</strong> Business name, address, contact details, and business description.</li>
            <li><strong>Account Information:</strong> Login credentials and account preferences.</li>
            <li><strong>Documents:</strong> Business permits, government IDs, and other documents required for verification.</li>
            <li><strong>Usage Data:</strong> Information about how you interact with our website and services.</li>
          </ul>

          <h3 className="text-md font-medium text-gray-900">2. How We Use Your Information</h3>
          <p>We use your information for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and maintain our services</li>
            <li>To process transactions and manage your account</li>
            <li>To verify your identity and eligibility for our services</li>
            <li>To communicate with you about our services, updates, and promotions</li>
            <li>To improve our website and services</li>
            <li>To comply with legal obligations</li>
          </ul>

          <h3 className="text-md font-medium text-gray-900">3. Legal Basis for Processing (Under the Data Privacy Act)</h3>
          <p>We process your personal information based on the following legal grounds:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Consent:</strong> You have given consent to the processing of your personal information.</li>
            <li><strong>Contract:</strong> Processing is necessary for the performance of a contract with you.</li>
            <li><strong>Legal Obligation:</strong> Processing is necessary for compliance with legal obligations.</li>
            <li><strong>Legitimate Interests:</strong> Processing is necessary for our legitimate interests, provided these interests do not override your fundamental rights and freedoms.</li>
          </ul>

          <h3 className="text-md font-medium text-gray-900">4. Data Sharing and Disclosure</h3>
          <p>We may share your information with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Service Providers:</strong> Third-party vendors who help us operate our business and provide services.</li>
            <li><strong>Business Partners:</strong> Other businesses we collaborate with to offer joint services or promotions.</li>
            <li><strong>Legal Authorities:</strong> When required by law, court order, or government regulation.</li>
          </ul>
          <p>We ensure that all third parties respect the security of your personal information and treat it in accordance with the law.</p>

          <h3 className="text-md font-medium text-gray-900">5. Data Security</h3>
          <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction, in accordance with Section 20 of the Data Privacy Act.</p>

          <h3 className="text-md font-medium text-gray-900">6. Data Retention</h3>
          <p>We will retain your personal information only for as long as necessary to fulfill the purposes for which it was collected, including for the purposes of satisfying any legal, accounting, or reporting requirements.</p>

          <h3 className="text-md font-medium text-gray-900">7. Your Rights Under the Data Privacy Act</h3>
          <p>Under the Data Privacy Act of 2012, you have the following rights:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Right to Information:</strong> You have the right to be informed about the processing of your personal information.</li>
            <li><strong>Right to Access:</strong> You have the right to access your personal information that we hold.</li>
            <li><strong>Right to Object:</strong> You have the right to object to the processing of your personal information.</li>
            <li><strong>Right to Erasure or Blocking:</strong> You have the right to request the removal or blocking of your personal information.</li>
            <li><strong>Right to Damages:</strong> You have the right to be indemnified for damages sustained due to inaccurate, incomplete, outdated, false, unlawfully obtained, or unauthorized use of personal information.</li>
            <li><strong>Right to Data Portability:</strong> You have the right to obtain and reuse your personal information for your own purposes across different services.</li>
            <li><strong>Right to File a Complaint:</strong> You have the right to file a complaint with the National Privacy Commission.</li>
          </ul>

          <h3 className="text-md font-medium text-gray-900">8. Changes to This Privacy Policy</h3>
          <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date.</p>

          <h3 className="text-md font-medium text-gray-900">9. Contact Us</h3>
          <p>If you have any questions about this Privacy Policy or our data practices, please contact us at:</p>
          <p>Email: rainbowpaws2025@gmail.com.com</p>
          <p>Phone: +63 (2) 8123-4567</p>
          <p>Address: BPSU(MAIN CAMPUS), Balanga City, Philippines</p>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-4 py-2 bg-[var(--primary-green)] border border-transparent rounded-md text-sm font-medium text-white hover:bg-[var(--primary-green-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-green)]"
          >
            I Accept
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default PrivacyPolicyModal;
