'use client';

import React from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ExclamationCircleIcon, ClockIcon, CalendarIcon, TrashIcon } from '@heroicons/react/24/outline';

// Strongly typed package interface for quick setup selections
interface QuickSetupPackage {
  id: number;
  name: string;
  price?: number;
  images?: string[];
}

interface QuickPresetsPanelProps {
  weekdayStartTime: string;
  setWeekdayStartTime: (v: string) => void;
  weekdayEndTime: string;
  setWeekdayEndTime: (v: string) => void;
  weekendStartTime: string;
  setWeekendStartTime: (v: string) => void;
  weekendEndTime: string;
  setWeekendEndTime: (v: string) => void;
  serviceSelectionError: string | null;
  loadingPackages: boolean;
  availablePackages: QuickSetupPackage[];
  selectedQuickSetupPackages: number[];
  setSelectedQuickSetupPackages: (ids: number[]) => void;
  onApplyWeekdays: () => void;
  onApplyWeekends: () => void;
  onClearAll: () => void;
  onClose: () => void;
}

export default function QuickPresetsPanel(props: QuickPresetsPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const {
    weekdayStartTime,
    setWeekdayStartTime,
    weekdayEndTime,
    setWeekdayEndTime,
    weekendStartTime,
    setWeekendStartTime,
    weekendEndTime,
    setWeekendEndTime,
    serviceSelectionError,
    loadingPackages,
    availablePackages,
    selectedQuickSetupPackages,
    setSelectedQuickSetupPackages,
    onApplyWeekdays,
    onApplyWeekends,
    onClearAll,
    onClose,
  } = props;

  return (
    <AnimatePresence>
      <motion.div
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        initial={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : -6 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
      >
      <h3 className="text-sm font-medium text-blue-800 mb-3">Quick Setup Options</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-blue-800 mb-2">Time Slot Settings</label>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
          <div className="bg-white border border-blue-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Weekdays (Mon-Fri)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="weekdayStartTimeInput" className="block text-xs text-gray-600 mb-1">Start</label>
                <input id="weekdayStartTimeInput" type="time" value={weekdayStartTime} onChange={(e) => setWeekdayStartTime(e.target.value)} className="w-full p-1 border border-gray-300 rounded text-xs" />
              </div>
              <div>
                <label htmlFor="weekdayEndTimeInput" className="block text-xs text-gray-600 mb-1">End</label>
                <input id="weekdayEndTimeInput" type="time" value={weekdayEndTime} onChange={(e) => setWeekdayEndTime(e.target.value)} className="w-full p-1 border border-gray-300 rounded text-xs" />
              </div>
            </div>
          </div>
          <div className="bg-white border border-blue-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Weekends (Sat-Sun)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="weekendStartTimeInput" className="block text-xs text-gray-600 mb-1">Start</label>
                <input id="weekendStartTimeInput" type="time" value={weekendStartTime} onChange={(e) => setWeekendStartTime(e.target.value)} className="w-full p-1 border border-gray-300 rounded text-xs" />
              </div>
              <div>
                <label htmlFor="weekendEndTimeInput" className="block text-xs text-gray-600 mb-1">End</label>
                <input id="weekendEndTimeInput" type="time" value={weekendEndTime} onChange={(e) => setWeekendEndTime(e.target.value)} className="w-full p-1 border border-gray-300 rounded text-xs" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-blue-800 mb-2">Select Services for Time Slots:</label>
        {serviceSelectionError && (
          <div className="flex items-center mb-2 text-sm text-red-600">
            <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
            {serviceSelectionError}
          </div>
        )}
        {loadingPackages ? (
          <div className="text-center py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : availablePackages.length > 0 ? (
          <div className="max-h-32 overflow-y-auto border border-blue-200 rounded-md p-2 bg-white">
            {availablePackages.map((pkg: QuickSetupPackage) => (
              <div key={pkg.id} className="flex items-center py-1 gap-2">
                <input
                  type="checkbox"
                  id={`quick-setup-package-${pkg.id}`}
                  checked={selectedQuickSetupPackages.includes(pkg.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedQuickSetupPackages([...selectedQuickSetupPackages, pkg.id]);
                    } else {
                      setSelectedQuickSetupPackages(selectedQuickSetupPackages.filter((id) => id !== pkg.id));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                {pkg.images && pkg.images.length > 0 && (
                  <Image src={pkg.images[0]} alt="pkg" width={20} height={20} className="h-5 w-5 rounded object-cover border" unoptimized />
                )}
                <label htmlFor={`quick-setup-package-${pkg.id}`} className="text-sm text-gray-700 truncate">
                  {pkg.name} {typeof pkg.price === 'number' ? `(₱${pkg.price.toLocaleString()})` : ''}
                </label>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600 bg-white border border-blue-200 rounded-md p-2">No service packages available. Please create packages first.</div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <button type="button" onClick={onApplyWeekdays} disabled={selectedQuickSetupPackages.length === 0} className="px-3 py-2 bg-green-100 text-green-800 rounded-md text-xs font-medium hover:bg-green-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
          <ClockIcon className="h-4 w-4 inline mr-1" />
          Weekdays ({weekdayStartTime}-{weekdayEndTime})
        </button>
        <button type="button" onClick={onApplyWeekends} disabled={selectedQuickSetupPackages.length === 0} className="px-3 py-2 bg-orange-100 text-orange-800 rounded-md text-xs font-medium hover:bg-orange-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">
          <CalendarIcon className="h-4 w-4 inline mr-1" />
          Weekends ({weekendStartTime}-{weekendEndTime})
        </button>
        <button type="button" onClick={onClearAll} className="px-3 py-2 bg-red-100 text-red-800 rounded-md text-xs font-medium hover:bg-red-200 transition-colors sm:col-span-2 lg:col-span-1">
          <TrashIcon className="h-4 w-4 inline mr-1" />
          Clear All
        </button>
      </div>
      <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center">
        <div className="text-xs text-blue-700">
          {selectedQuickSetupPackages.length > 0 ? `${selectedQuickSetupPackages.length} service(s) selected` : 'Select services first'}
        </div>
        <button type="button" onClick={onClose} className="text-xs text-blue-600 hover:text-blue-800">
          Close Panel
        </button>
      </div>
      </motion.div>
    </AnimatePresence>
  );
}


