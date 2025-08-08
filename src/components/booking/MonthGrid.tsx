'use client';

import React from 'react';
import { useReducedMotion } from 'framer-motion';
import { CalendarDay } from './types';

interface MonthGridProps {
  days: CalendarDay[];
  selectedDate: Date | null;
  formatDateToString: (d: Date) => string;
  onDayClick: (d: Date) => void;
}

function MonthGrid({ days, selectedDate, formatDateToString, onDayClick }: MonthGridProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((day, index) => {
          return (
            <div key={index} className="aspect-square p-0.5">
              {day.type === 'empty' ? (
                <div className="h-full"></div>
              ) : (
                (() => {
                  const isPastDay = day.date < new Date(new Date().setHours(0, 0, 0, 0));
                  const isSelected = selectedDate ? formatDateToString(day.date) === formatDateToString(selectedDate) : false;
                  return (
                    <button
                      type="button"
                      onClick={() => !isPastDay && onDayClick(day.date)}
                      disabled={isPastDay}
                      className={`
                        h-full w-full flex flex-col items-center justify-center rounded-md p-0.5 sm:p-1 transition-colors text-xs sm:text-sm
                        ${isPastDay ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : day.timeSlots.length > 0 ? 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-800'}
                        ${isSelected ? 'ring-2 ring-[var(--primary-green)]' : ''}
                      `}
                    >
                      <span className="text-xs sm:text-sm font-medium">{day.date.getDate()}</span>
                      {day.timeSlots.length > 0 && !isPastDay && (
                        <div className="flex flex-col items-center mt-0.5 sm:mt-1">
                          <div
                            className={`px-1 py-0.5 rounded-sm text-xs font-medium ${
                              day.timeSlots.some((slot) => slot.isBooked) ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'
                            }`}
                          >
                            <span className="hidden sm:inline">{day.timeSlots.length} slots</span>
                            <span className="sm:hidden">{day.timeSlots.length}</span>
                          </div>
                          {day.timeSlots.some((slot) => slot.isBooked) && (
                            <div className="mt-0.5 px-1 py-0.5 bg-red-200 rounded-sm text-xs font-medium text-red-800">
                              <span className="hidden sm:inline">Has bookings</span>
                              <span className="sm:hidden">Booked</span>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })()
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default React.memo(MonthGrid);


