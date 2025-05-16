'use client';

import { useState, useEffect } from 'react';
import { CalendarIcon, ClockIcon, CheckIcon } from '@heroicons/react/24/outline';

type TimeSlot = {
  id: string;
  start: string;
  end: string;
  availableServices?: number[];
};

type DayAvailability = {
  date: string;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
};

interface TimeSlotSelectorProps {
  providerId: number;
  onDateTimeSelected: (date: string, timeSlot: TimeSlot | null) => void;
  selectedDate?: string;
  selectedTimeSlot?: TimeSlot | null;
  packageId?: number;
}

export default function TimeSlotSelector({
  providerId,
  onDateTimeSelected,
  selectedDate,
  selectedTimeSlot,
  packageId
}: TimeSlotSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [availabilityData, setAvailabilityData] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDateState, setSelectedDateState] = useState<string | undefined>(selectedDate);
  const [selectedTimeSlotState, setSelectedTimeSlotState] = useState<TimeSlot | null>(selectedTimeSlot || null);
  const [error, setError] = useState<string | null>(null);

  // Update internal state when props change
  useEffect(() => {
    if (selectedDate) {
      setSelectedDateState(selectedDate);
    }
    if (selectedTimeSlot) {
      setSelectedTimeSlotState(selectedTimeSlot);
    }
  }, [selectedDate, selectedTimeSlot]);

  // Fetch availability data when component mounts or provider/month changes
  useEffect(() => {
    if (providerId) {
      console.log(`[TimeSlotSelector] Provider ID changed to ${providerId}, fetching availability data...`);
      fetchAvailabilityData();
    }
  }, [providerId, currentMonth]);

  // Make sure we display time slots for the selected date on component load
  useEffect(() => {
    if (selectedDate && availabilityData.length > 0) {
      const selectedDayData = availabilityData.find(day => day.date === selectedDate);
      if (selectedDayData) {
        console.log(`[TimeSlotSelector] Found data for pre-selected date ${selectedDate}: ${selectedDayData.timeSlots.length} time slots`);
      } else {
        console.log(`[TimeSlotSelector] No data found for pre-selected date ${selectedDate}`);
      }
    }
  }, [selectedDate, availabilityData]);

  const fetchAvailabilityData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format for month: YYYY-MM
      const monthString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      console.log(`[TimeSlotSelector] Fetching availability for provider ${providerId}, month ${monthString}, package ${packageId || 'any'}`);
      const response = await fetch(`/api/cremation/availability?providerId=${providerId}&month=${monthString}&t=${timestamp}`);

      if (!response.ok) {
        console.warn(`[TimeSlotSelector] Failed to fetch availability data: ${response.status} ${response.statusText}`);
        setError('No available time slots found. Please contact the service provider.');
        setAvailabilityData([]);
        return;
      }

      const data = await response.json();

      // Debug data received from API
      console.log(`[TimeSlotSelector] Got availability data with ${data.availability?.length || 0} days`);
      if (data.availability?.length > 0) {
        const daysWithSlots = data.availability.filter((day: any) => day.timeSlots?.length > 0);
        console.log(`[TimeSlotSelector] Days with time slots: ${daysWithSlots.length}`);
        daysWithSlots.forEach((day: any) => {
          console.log(`[TimeSlotSelector] Day ${day.date}: ${day.timeSlots.length} slots`);
        });
      }

      setAvailabilityData(data.availability || []);
    } catch (error) {
      console.error('[TimeSlotSelector] Error fetching availability data:', error);
      setError('No available time slots found. Please contact the service provider.');
      setAvailabilityData([]);
    } finally {
      setLoading(false);
    }
  };

  // Get days in the current month for the calendar
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();

    // Create the calendar days array
    const days = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ type: 'empty' });
    }

    // Add actual days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateString = formatDateToString(date);
      const availabilityInfo = availabilityData.find(day => day.date === dateString);

      console.log(`[TimeSlotSelector] Checking day ${dateString}: Found in availabilityData=${!!availabilityInfo}`);
      if (availabilityInfo) {
        console.log(`[TimeSlotSelector] Day ${dateString}: isAvailable=${availabilityInfo.isAvailable}, timeSlots=${availabilityInfo.timeSlots?.length || 0}`);
      }

      // Only include days that are available and have time slots
      let filteredTimeSlots = availabilityInfo?.timeSlots || [];

      // If packageId is provided, filter time slots that have this package available
      if (packageId && filteredTimeSlots.length > 0) {
        const unfilteredCount = filteredTimeSlots.length;
        filteredTimeSlots = filteredTimeSlots.filter(slot => {
          // Special case: if availableServices is empty or null, make it available for all
          if (!slot.availableServices || slot.availableServices.length === 0) {
            return true;
          }
          // Check if this package is included in the available services
          return slot.availableServices.includes(packageId);
        });
        console.log(`[TimeSlotSelector] Day ${dateString}: Filtered slots from ${unfilteredCount} to ${filteredTimeSlots.length} for package ${packageId}`);
      }

      // A day is available if:
      // 1. The day is marked as available in the provider_availability table AND
      // 2. There is at least one time slot for this day AND
      // 3. The day is not in the past
      const isAvailable = (availabilityInfo?.isAvailable === true) &&
                        (filteredTimeSlots.length > 0) &&
                        (date >= new Date(new Date().setHours(0, 0, 0, 0))); // No past dates

      console.log(`[TimeSlotSelector] Day ${dateString}: Final availability=${isAvailable}, has ${filteredTimeSlots.length} filtered slots`);

      days.push({
        type: 'day',
        date,
        dateString,
        isAvailable,
        timeSlots: filteredTimeSlots,
      });
    }

    return days;
  };

  const formatDateToString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handlePreviousMonth = () => {
    // Only allow going back to current month
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    if (new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1) > currentMonthStart) {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    }
  };

  const handleNextMonth = () => {
    // Allow viewing up to 3 months in advance
    const today = new Date();
    const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, 1);

    if (new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1) < threeMonthsLater) {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    }
  };

  const handleDateSelect = (dateString: string, timeSlots: TimeSlot[]) => {
    console.log(`[TimeSlotSelector] Date selected: ${dateString} with ${timeSlots.length} time slots`);
    setSelectedDateState(dateString);
    setSelectedTimeSlotState(null); // Clear time slot selection when date changes

    // Clear any local error when a date is selected
    if (error) setError(null);

    // Check if this date has time slots
    const hasTimeSlots = timeSlots && timeSlots.length > 0;
    if (hasTimeSlots) {
      console.log(`[TimeSlotSelector] Date has time slots, keeping parent selection active`);
      // We don't notify the parent yet to prevent validation errors
      // The parent will be notified when a time slot is selected
    } else {
      console.log(`[TimeSlotSelector] Date has no time slots, showing message`);

      // Only show a message about no available slots, not an error
      if (timeSlots.length === 0) {
        setError('This date has no available time slots. Please select another date.');
      }
    }
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    console.log(`[TimeSlotSelector] Time slot selected: ${timeSlot.start}-${timeSlot.end} (ID: ${timeSlot.id})`);
    setSelectedTimeSlotState(timeSlot);

    if (selectedDateState) {
      console.log(`[TimeSlotSelector] Notifying parent of selection: date=${selectedDateState}, time=${timeSlot.start}-${timeSlot.end}`);
      // Now that both date and time slot are selected, notify the parent
      // This is the proper time to trigger validation if needed
      onDateTimeSelected(selectedDateState, timeSlot);
    } else {
      console.log(`[TimeSlotSelector] Cannot notify parent - no date selected`);
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;

      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      return timeString;
    }
  };

  // Get available time slots for the selected date
  const getAvailableTimeSlots = () => {
    if (!selectedDateState) {
      console.log('[TimeSlotSelector] No selected date, returning empty time slots');
      return [];
    }

    const selectedDayData = availabilityData.find(day => day.date === selectedDateState);
    if (!selectedDayData) {
      console.log(`[TimeSlotSelector] No data found for selected date ${selectedDateState}`);
      return [];
    }

    console.log(`[TimeSlotSelector] Found data for selected date ${selectedDateState}: isAvailable=${selectedDayData.isAvailable}, timeSlots=${selectedDayData.timeSlots?.length || 0}`);

    let timeSlots = selectedDayData.timeSlots || [];

    // If time slots array is empty, show a more specific message
    if (timeSlots.length === 0) {
      console.log(`[TimeSlotSelector] No time slots available for ${selectedDateState}`);
    }

    // If packageId is provided, filter time slots that have this package available
    if (packageId && timeSlots.length > 0) {
      console.log(`[TimeSlotSelector] Filtering ${timeSlots.length} time slots for package ${packageId}`);
      const originalCount = timeSlots.length;

      timeSlots = timeSlots.filter(slot => {
        // No available services defined means all services are available
        if (!slot.availableServices || slot.availableServices.length === 0) {
          console.log(`[TimeSlotSelector] Slot ${slot.id} (${slot.start}-${slot.end}) has no specific services restrictions, keeping it`);
          return true;
        }

        // Check if this package is included in the available services
        const hasPackage = slot.availableServices.includes(packageId);
        if (hasPackage) {
          console.log(`[TimeSlotSelector] Slot ${slot.id} (${slot.start}-${slot.end}) includes package ${packageId}`);
        } else {
          console.log(`[TimeSlotSelector] Slot ${slot.id} (${slot.start}-${slot.end}) does NOT include package ${packageId}, available services:`, slot.availableServices);
        }
        return hasPackage;
      });

      console.log(`[TimeSlotSelector] After filtering: ${timeSlots.length} of ${originalCount} time slots available for package ${packageId}`);

      // If filtering results in no time slots, show a message
      if (timeSlots.length === 0) {
        console.log(`[TimeSlotSelector] No time slots available for package ${packageId} on ${selectedDateState} after filtering`);
      }
    }

    return timeSlots;
  };

  const days = getDaysInMonth();

  // Get available time slots for the selected date, filtered by package if needed
  const availableTimeSlots = getAvailableTimeSlots();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Select Date & Time</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Month navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePreviousMonth}
          className="p-2 rounded-md hover:bg-gray-100"
          disabled={new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getTime() <= new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h4 className="text-base font-medium">
          {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h4>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
        </div>
      ) : (
        <>
          {/* Calendar */}
          <div className="mb-6">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => (
                <div key={index} className="aspect-square">
                  {day.type === 'empty' ? (
                    <div className="h-full"></div>
                  ) : (
                    <button
                      onClick={(e) => {
                        // Prevent default to avoid page reload
                        e.preventDefault();

                        if (day.isAvailable) {
                          handleDateSelect(day.dateString, day.timeSlots || []);
                        } else if (day.date && day.date >= new Date(new Date().setHours(0, 0, 0, 0))) {
                          // If day is not available but not a past date, show a message
                          setError('No available time slots for this date');
                        }
                      }}
                      type="button" // Explicitly set type to button to prevent form submission
                      disabled={!day.isAvailable}
                      className={`h-full w-full flex flex-col items-center justify-center rounded-md text-sm ${
                        day.isAvailable
                          ? selectedDateState === day.dateString
                            ? 'bg-[var(--primary-green)] text-white font-medium'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {day.type === 'day' && day.date ? day.date.getDate() : ''}
                      {day.isAvailable && day.timeSlots && day.timeSlots.length > 0 && (
                        <span className="text-[8px] mt-0.5">{day.timeSlots.length} slots</span>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Time Slot Selection */}
          {selectedDateState && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                Available Time Slots for {new Date(selectedDateState).toLocaleDateString('default', { month: 'long', day: 'numeric' })}
              </h4>

              {availableTimeSlots.length > 0 ? (
                <>
                  {!selectedTimeSlotState && (
                    <div className="mb-3 text-center py-2 text-blue-600 bg-blue-50 rounded-md border border-blue-200">
                      Please select one of the available time slots below
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableTimeSlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={(e) => {
                          e.preventDefault(); // Prevent default to avoid page reload
                          handleTimeSlotSelect(slot);
                        }}
                        type="button" // Explicitly set type to button to prevent form submission
                        className={`flex items-center justify-center px-2 py-3 text-sm rounded-md ${
                          selectedTimeSlotState?.id === slot.id
                            ? 'bg-[var(--primary-green)] text-white font-medium'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatTime(slot.start)}
                        {selectedTimeSlotState?.id === slot.id && (
                          <CheckIcon className="h-4 w-4 ml-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-yellow-600 bg-yellow-50 rounded-md border border-yellow-200">
                  No available time slots for this date. Please select another date.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}