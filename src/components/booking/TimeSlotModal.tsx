'use client';

import React, { useEffect } from 'react';
import { XMarkIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PackageData } from '@/types/packages';

interface ServicePackage {
  id: number;
  name: string;
  price?: number;
}

interface TimeSlotModalProps {
  open: boolean;
  onClose: () => void;
  start: string;
  setStart: (v: string) => void;
  end: string;
  setEnd: (v: string) => void;
  availablePackages: PackageData[];
  selectedPackages: number[];
  togglePackage: (id: number) => void;
  loadingPackages: boolean;
  error: string | null;
  onSubmit: () => void;
}

function parseTimeToMinutes(value: string): number | null {
  if (!value) return null;
  const parts = value.split(':');
  if (parts.length < 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

export default function TimeSlotModal({ open, onClose, start, setStart, end, setEnd, availablePackages, selectedPackages, togglePackage, loadingPackages, error, onSubmit }: TimeSlotModalProps) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const timeError: string | null = (() => {
    if (!start || !end) return null;
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    if (startMinutes == null || endMinutes == null) return null;
    return endMinutes <= startMinutes ? 'End time must be later than start time.' : null;
  })();

  const handleSubmit = () => {
    if (timeError) return;
    onSubmit();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="timeslot-modal-title"
            className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden"
            initial={{ y: shouldReduceMotion ? 0 : 16, opacity: shouldReduceMotion ? 1 : 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: shouldReduceMotion ? 0 : 12, opacity: shouldReduceMotion ? 1 : 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: 'easeOut' }}
          >
            <div className="bg-[var(--primary-green)] text-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
              <h3 id="timeslot-modal-title" className="text-lg sm:text-xl font-medium text-white">Add Time Slot</h3>
              <button type="button" onClick={onClose} className="text-white hover:text-white/80 transition-colors duration-200 flex-shrink-0 ml-2" aria-label="Close dialog">
                <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={`w-full p-2 border rounded-md ${timeError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                aria-invalid={!!timeError}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                min={start || undefined}
                className={`w-full p-2 border rounded-md ${timeError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                aria-invalid={!!timeError}
                aria-describedby={timeError ? 'time-error' : undefined}
                required
              />
              {timeError && (
                <div id="time-error" className="flex items-center mt-1 text-sm text-red-600">
                  <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                  {timeError}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Services for this Time Slot</label>
              {error && (
                <div className="flex items-center mt-1 mb-2 text-sm text-red-600">
                  <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                  {error}
                </div>
              )}
              {loadingPackages ? (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[var(--primary-green)] mx-auto"></div>
                </div>
              ) : availablePackages.length > 0 ? (
                <div className="max-h-32 sm:max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {availablePackages.map((pkg: ServicePackage) => (
                    <div key={pkg.id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        id={`package-${pkg.id}`}
                        checked={selectedPackages.includes(pkg.id)}
                        onChange={() => togglePackage(pkg.id)}
                        className="h-4 w-4 text-[var(--primary-green)] border-gray-300 rounded focus:ring-[var(--primary-green)]"
                      />
                      <label htmlFor={`package-${pkg.id}`} className="ml-2 text-sm text-gray-700">
                        {pkg.name} (₱{pkg.price?.toLocaleString()})
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-2">No service packages available. Please create packages first.</p>
                  <p className="text-xs text-amber-600">You can still create time slots, but they won&apos;t be visible to customers until packages are added.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loadingPackages || !!timeError || !start || !end}
                aria-busy={loadingPackages}
                className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed disabled:saturate-75"
              >
                {loadingPackages ? 'Loading…' : 'Add Time Slot'}
              </button>
            </div>
          </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


