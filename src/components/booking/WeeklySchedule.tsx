'use client';

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  availableServices?: number[];
}

interface DaySchedule {
  date: string;
  dayName: string;
  dayNumber: number;
  month: string;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
  isToday: boolean;
  isPast: boolean;
  bookingCount?: number;
  hasBookings?: boolean;
}

interface WeeklyScheduleProps {
  providerId: number;
  onDayClick?: (date: string) => void;
}

export default function WeeklySchedule({ providerId, onDayClick }: WeeklyScheduleProps) {
  const [weekDays, setWeekDays] = useState<DaySchedule[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getStartOfWeek(new Date()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the start of the week (Sunday)
  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  // Format date to YYYY-MM-DD
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get day name
  function getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Get month name
  function getMonthName(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short' });
  }

  // Check if date is today
  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  // Check if date is in the past
  function isPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  // Navigate to previous week
  const handlePreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() - 7);
    setCurrentWeekStart(newWeekStart);
  };

  // Navigate to next week
  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + 7);
    setCurrentWeekStart(newWeekStart);
  };

  // Navigate to current week
  const handleToday = () => {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  };

  // Fetch availability data for the week
  useEffect(() => {
    const fetchWeeklyAvailability = async () => {
      setLoading(true);
      setError(null);

      try {
        // Calculate the end of the week (6 days after start)
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startDate = formatDate(currentWeekStart);
        const endDate = formatDate(weekEnd);

        // Fetch availability data for the week range
        const [availabilityResponse, bookingsResponse] = await Promise.all([
          fetch(`/api/cremation/availability?providerId=${providerId}&startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/cremation/bookings/week?providerId=${providerId}&startDate=${startDate}&endDate=${endDate}`)
        ]);

        if (!availabilityResponse.ok) {
          throw new Error('Failed to fetch availability data');
        }

        const data = await availabilityResponse.json();
        
        // Get booking counts (don't fail if this endpoint errors)
        let bookingCounts: Record<string, number> = {};
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json();
          bookingCounts = bookingsData.bookingCounts || {};
        }
        
        // Generate 7 days for the week
        const days: DaySchedule[] = [];
        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(currentWeekStart);
          currentDate.setDate(currentDate.getDate() + i);
          const dateString = formatDate(currentDate);

          // Find the availability data for this date
          const availabilityForDate = data.availability?.find(
            (item: any) => item.date === dateString
          );

          const bookingCount = bookingCounts[dateString] || 0;
          
          days.push({
            date: dateString,
            dayName: getDayName(currentDate),
            dayNumber: currentDate.getDate(),
            month: getMonthName(currentDate),
            isAvailable: availabilityForDate?.isAvailable || false,
            timeSlots: availabilityForDate?.timeSlots || [],
            isToday: isToday(currentDate),
            isPast: isPast(currentDate),
            bookingCount,
            hasBookings: bookingCount > 0,
          });
        }

        setWeekDays(days);
      } catch (err) {
        console.error('Error fetching weekly availability:', err);
        setError(err instanceof Error ? err.message : 'Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };

    if (providerId) {
      fetchWeeklyAvailability();
    }
  }, [providerId, currentWeekStart]);

  // Get week range display
  const getWeekRangeDisplay = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startMonth = currentWeekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const year = currentWeekStart.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${currentWeekStart.getDate()} - ${weekEnd.getDate()}, ${year}`;
    } else {
      return `${startMonth} ${currentWeekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${year}`;
    }
  };

  if (loading && weekDays.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={() => setCurrentWeekStart(getStartOfWeek(new Date()))}
          className="mt-4 px-4 py-2 text-sm bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePreviousWeek}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Previous Week"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {getWeekRangeDisplay()}
          </span>
          <button
            onClick={handleToday}
            className="ml-2 px-3 py-1 text-xs bg-[var(--primary-green)] text-white rounded-md hover:bg-[var(--primary-green-hover)]"
          >
            Today
          </button>
        </div>

        <button
          onClick={handleNextWeek}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Next Week"
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Week Grid - 7 Day Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
        {weekDays.map((day) => (
          <div
            key={day.date}
            onClick={() => onDayClick && onDayClick(day.date)}
            className={`
              relative rounded-lg border-2 p-3 transition-all cursor-pointer
              ${day.isToday 
                ? 'border-[var(--primary-green)] bg-green-50' 
                : day.hasBookings && !day.isPast
                  ? 'border-blue-300 bg-blue-50'
                  : day.isPast 
                    ? 'border-gray-200 bg-gray-50 opacity-60' 
                    : 'border-gray-200 bg-white hover:border-[var(--primary-green)] hover:shadow-md'
              }
            `}
          >
            {/* Day Header */}
            <div className="text-center mb-2 pb-2 border-b border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase">
                {day.dayName}
              </div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-2xl font-bold text-gray-900">
                  {day.dayNumber}
                </span>
                <span className="text-xs text-gray-500 mt-2">
                  {day.month}
                </span>
              </div>
              {day.isToday && (
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-[var(--primary-green)] text-white rounded-full">
                    Today
                  </span>
                </div>
              )}
              {/* Booking Indicator */}
              {day.hasBookings && !day.isPast && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {day.bookingCount} {day.bookingCount === 1 ? 'booking' : 'bookings'}
                  </span>
                </div>
              )}
            </div>

            {/* Time Slots */}
            <div className="space-y-1.5">
              {day.timeSlots.length > 0 ? (
                <>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                    <ClockIcon className="h-3 w-3" />
                    <span className="font-medium">{day.timeSlots.length} slot{day.timeSlots.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                    {day.timeSlots.map((slot, index) => (
                      <div
                        key={slot.id || index}
                        className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center justify-center gap-1"
                      >
                        <span className="font-medium">
                          {slot.start} - {slot.end}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="text-xs text-gray-400">
                    {day.isPast ? 'Past' : 'No slots'}
                  </div>
                </div>
              )}
            </div>

            {/* Availability Badge */}
            {!day.isPast && (
              <div className="absolute top-2 right-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    day.hasBookings ? 'bg-blue-500' : day.isAvailable ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  title={day.hasBookings ? 'Has Bookings' : day.isAvailable ? 'Available' : 'Unavailable'}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-gray-600 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          <span>Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-[var(--primary-green)] rounded"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
}

