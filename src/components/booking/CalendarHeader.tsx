'use client';

import { CalendarIcon, CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon, DocumentDuplicateIcon, SparklesIcon } from '@heroicons/react/24/outline';
import React from 'react';

interface CalendarHeaderProps {
  viewMode: 'month' | 'year';
  setViewMode: (mode: 'month' | 'year') => void;
  currentMonth: Date;
  currentYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPrevYear: () => void;
  onNextYear: () => void;
  onToday: () => void;
  isDisabled: boolean;
  showQuickPresets: boolean;
  setShowQuickPresets: (show: boolean) => void;
  onShowCopyMonth: () => void;
  onRefresh: () => void;
}

export default function CalendarHeader({
  viewMode,
  setViewMode,
  currentMonth,
  currentYear,
  onPrevMonth,
  onNextMonth,
  onPrevYear,
  onNextYear,
  onToday,
  isDisabled,
  showQuickPresets,
  setShowQuickPresets,
  onShowCopyMonth,
  onRefresh,
}: CalendarHeaderProps) {
  return (
    <div className="space-y-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'month' ? 'bg-white text-[var(--primary-green)] shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode('year')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'year' ? 'bg-white text-[var(--primary-green)] shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
              Year
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickPresets(!showQuickPresets)}
            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors"
            disabled={isDisabled}
          >
            <SparklesIcon className="h-4 w-4 inline mr-1" />
            Quick Setup
          </button>
          <button
            type="button"
            onClick={onShowCopyMonth}
            className="px-3 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium hover:bg-purple-100 transition-colors"
            disabled={isDisabled}
          >
            <DocumentDuplicateIcon className="h-4 w-4 inline mr-1" />
            <span className="hidden sm:inline">Copy Month</span>
            <span className="sm:hidden">Copy</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-100 transition-colors"
            disabled={isDisabled}
          >
            <ArrowPathIcon className="h-4 w-4 inline mr-1" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="flex justify-between items-center">
          <button type="button" onClick={onPrevMonth} className="p-2 hover:bg-gray-100 rounded-full" disabled={isDisabled}>
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              type="button"
              onClick={onToday}
              className="px-2 py-1 text-xs bg-[var(--primary-green)] text-white rounded-md hover:bg-green-700 transition-colors"
              disabled={isDisabled}
            >
              Today
            </button>
          </div>
          <button type="button" onClick={onNextMonth} className="p-2 hover:bg-gray-100 rounded-full" disabled={isDisabled}>
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <button type="button" onClick={onPrevYear} className="p-2 hover:bg-gray-100 rounded-full" disabled={isDisabled}>
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold">{currentYear}</h2>
          <button type="button" onClick={onNextYear} className="p-2 hover:bg-gray-100 rounded-full" disabled={isDisabled}>
            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
}


