'use client';

import React from 'react';

interface YearMonthSummary {
  date: Date;
  name: string;
  availableDays: number;
  totalTimeSlots: number;
  hasAvailability: boolean;
}

interface YearOverviewProps {
  calendarKey: number;
  getMonthsInYear: () => YearMonthSummary[];
  onSelectMonth: (date: Date) => void;
}

export default function YearOverview({ calendarKey, getMonthsInYear, onSelectMonth }: YearOverviewProps) {
  const monthsInYear = getMonthsInYear();

  return (
    <div key={`year-${calendarKey}-${monthsInYear.length}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {monthsInYear.map((month) => (
        <button
          key={month.date.toISOString()}
          type="button"
          className={`w-full text-left border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
            month.hasAvailability ? 'border-green-200 bg-green-50 hover:bg-green-100' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => onSelectMonth(month.date)}
          aria-label={`View ${month.name} availability details`}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-gray-800">{month.name}</h3>
            {month.hasAvailability && (
              <div
                className="w-3 h-3 bg-green-500 rounded-full"
                role="img"
                aria-label="Availability status: available"
              >
                <span className="sr-only">Availability status: available</span>
              </div>
            )}
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Available Days:</span>
              <span className="font-medium">{month.availableDays}</span>
            </div>
            <div className="flex justify-between">
              <span>Available Slots:</span>
              <span className="font-medium">{month.totalTimeSlots}</span>
            </div>
          </div>
          {month.hasAvailability && <div className="mt-2 text-xs text-green-700 font-medium">Click to view details</div>}
        </button>
      ))}
    </div>
  );
}


