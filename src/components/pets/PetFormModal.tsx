import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import PetForm from './PetForm';

interface PetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet?: any;
  onSubmit: (petData: any) => void;
  isSubmitting: boolean;
  title: string;
}

const PetFormModal: React.FC<PetFormModalProps> = ({
  isOpen,
  onClose,
  pet,
  onSubmit,
  isSubmitting,
  title
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-[var(--primary-green)]">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <PetForm
              pet={pet}
              onSubmit={onSubmit}
              onCancel={onClose}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetFormModal;
