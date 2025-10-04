'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';

interface AvailabilityEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: number;
  onSaveSuccess?: () => void;
  initialDate?: string;
}

export default function AvailabilityEditorModal({
  isOpen,
  onClose,
  providerId,
  onSaveSuccess,
  initialDate: _initialDate,
}: AvailabilityEditorModalProps) {
  
  const handleSaveSuccess = () => {
    if (onSaveSuccess) {
      onSaveSuccess();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Header */}
                <div className="bg-[var(--primary-green)] px-6 py-6 text-white">
                  <button
                    type="button"
                    className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>

                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-7 w-7" />
                    <div>
                      <Dialog.Title as="h3" className="text-2xl font-bold">
                        Manage Your Availability
                      </Dialog.Title>
                      <p className="text-white text-opacity-90 text-sm mt-1">
                        Set your available days and time slots for cremation services
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 bg-gray-50" style={{ height: 'calc(100vh - 250px)', overflowY: 'auto', overflowX: 'hidden' }}>
                  <AvailabilityCalendar
                    providerId={providerId}
                    onAvailabilityChange={() => {}}
                    onSaveSuccess={handleSaveSuccess}
                    compact={true}
                  />
                </div>

                {/* Footer */}
                <div className="bg-white px-6 py-4 border-t border-gray-200 flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Tip: Click on any date to add or edit time slots
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

