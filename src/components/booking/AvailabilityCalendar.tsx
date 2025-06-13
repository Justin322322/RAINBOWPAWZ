'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  Square3Stack3DIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

type TimeSlot = {
  id: string;
  start: string;
  end: string;
  availableServices?: number[];
  isBooked?: boolean;
};

type DayAvailability = {
  date: string;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
};

type CalendarDay = {
  type: 'empty' | 'day';
  date?: Date;
  dateString?: string;
  isAvailable?: boolean;
  timeSlots?: TimeSlot[];
};

interface AvailabilityCalendarProps {
  providerId: number;
  onAvailabilityChange?: (availability: DayAvailability[]) => void;
  onSaveSuccess?: () => void;
}

export default function AvailabilityCalendar({ providerId, onAvailabilityChange, onSaveSuccess }: AvailabilityCalendarProps) {
  // Enhanced view state
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [showBulkActions, setShowBulkActions] = useState<boolean>(false);
  const [showQuickPresets, setShowQuickPresets] = useState<boolean>(false);
  const [showCopyModal, setShowCopyModal] = useState<boolean>(false);
  const [selectedMonthToCopy, setSelectedMonthToCopy] = useState<string>('');
  const [targetMonths, setTargetMonths] = useState<string[]>([]);
  const [selectedQuickSetupPackages, setSelectedQuickSetupPackages] = useState<number[]>([]);
  const [weekdayStartTime, setWeekdayStartTime] = useState<string>("09:00");
  const [weekdayEndTime, setWeekdayEndTime] = useState<string>("17:00");
  const [weekendStartTime, setWeekendStartTime] = useState<string>("10:00");
  const [weekendEndTime, setWeekendEndTime] = useState<string>("16:00");
  
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const savedMonth = typeof window !== "undefined" ? localStorage.getItem('availabilityCalendarMonth') : null;
    if (savedMonth) {
      try {
        return new Date(savedMonth);
      } catch (e) {
        return new Date();
      }
    }
    return new Date();
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availabilityData, setAvailabilityData] = useState<DayAvailability[]>(() => {
    // Try to load cached data from localStorage
    if (typeof window !== "undefined") {
      const cachedData = localStorage.getItem(`availabilityData_${providerId}`);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          return parsed;
        } catch (e) {
        }
      }
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState<boolean>(false);
  const [timeSlotStart, setTimeSlotStart] = useState<string>("09:00");
  const [timeSlotEnd, setTimeSlotEnd] = useState<string>("10:00");
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<number[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(false);
  const [serviceSelectionError, setServiceSelectionError] = useState<string | null>(null);
  const [dataInitialized, setDataInitialized] = useState<boolean>(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('Time slot updated successfully!');
  const [packageLoadError, setPackageLoadError] = useState<string | null>(null);
  const [showConflictMessage, setShowConflictMessage] = useState<boolean>(false);
  const [conflictMessage, setConflictMessage] = useState<string>('');
  const [calendarKey, setCalendarKey] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem('availabilityCalendarMonth', currentMonth.toISOString());
    }
  }, [currentMonth]);

  useEffect(() => {
  }, [availabilityData]);

  // Define functions before useEffect hooks that reference them
  const fetchProviderPackages = useCallback(async () => {
    if (!providerId || providerId <= 0) return;
    try {
      setLoadingPackages(true);
      setPackageLoadError(null); // Reset error state
      const response = await fetch(`/api/packages?providerId=${providerId}&t=${Date.now()}`);

      if (!response.ok) {
        // Get detailed error information
        const errorText = await response.text();
        try {
          const errorJson = JSON.parse(errorText);
          const errorMessage = errorJson.error || errorJson.details || `Failed to fetch provider packages: ${response.status}`;
          setPackageLoadError(errorMessage);
          throw new Error(errorMessage);
        } catch (parseError) {
          const errorMessage = `Failed to fetch provider packages: ${response.status} - ${errorText.substring(0, 100)}`;
          setPackageLoadError(errorMessage);
          throw new Error(errorMessage);
        }
      }

      const data = await response.json();
      setAvailablePackages(data.packages || []);
    } catch (err) {
      setAvailablePackages([]);
    } finally {
      setLoadingPackages(false);
    }
  }, [providerId]);

  const fetchAvailabilityData = useCallback(async (clearExisting = true) => {
    if (!providerId || providerId <= 0) {
      setError("Cannot fetch availability without a valid Provider ID.");
      if (clearExisting) setAvailabilityData([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Get the first and last day that will be displayed in the calendar
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      // First day of the month
      const firstDay = new Date(year, month, 1);
      // Last day of the month
      const lastDay = new Date(year, month + 1, 0);

      // First day shown in calendar (could be previous month)
      const firstCalendarDay = new Date(year, month, 1);
      // Last day shown in calendar (could be next month)
      const lastCalendarDay = new Date(year, month + 1, 0);

      // Format dates for API
      const startDate = firstCalendarDay.toISOString().split('T')[0];
      const endDate = lastCalendarDay.toISOString().split('T')[0];

      const monthString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;

      // Add a timestamp to force fresh data
      const timestamp = new Date().getTime();
      const url = `/api/cremation/availability?providerId=${providerId}&startDate=${startDate}&endDate=${endDate}&month=${monthString}&t=${timestamp}`;

      console.log(`Fetching availability data from: ${url}`);

      const headers = new Headers({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Using fetch with more robust options
      const response = await fetch(url, {
        headers,
        method: 'GET',
        credentials: 'same-origin', // Include cookies in the request
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `Failed to fetch data: ${response.statusText}`);
        } catch (parseError) {
          throw new Error(`HTTP error ${response.status}: ${errorText.substring(0, 100)}`);
        }
      }

      const data = await response.json();

      // Now fetch bookings to mark booked slots
      let bookedSlots: { date: string; time: string; }[] = [];
      try {
        const bookingsResponse = await fetch(`/api/cremation/bookings?providerId=${providerId}`, {
          headers,
          method: 'GET',
          credentials: 'same-origin',
        });
        
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json();
          
          // Extract all bookings that are not cancelled
          const bookings = bookingsData.bookings || [];
          bookedSlots = bookings
            .filter((booking: any) => booking.status !== 'cancelled')
            .map((booking: any) => ({
              date: booking.booking_date ? booking.booking_date.split('T')[0] : null,
              time: booking.booking_time ? booking.booking_time.substring(0, 5) : null
            }))
            .filter((booking: any) => booking.date && booking.time);
        }
      } catch (bookingError) {
        console.error('Error fetching bookings:', bookingError);
        // Continue with availability data, even if bookings failed
      }

      if (Array.isArray(data.availability)) {
        if (data.availability.length === 0) {
        }

        // Validate and clean availability data
        const validatedData = data.availability.map((day: any) => {
          // Ensure timeSlots is always an array
          const timeSlots = Array.isArray(day.timeSlots) ?
            day.timeSlots.map((slot: any) => {
              // Check if this slot is booked
              const isBooked = bookedSlots.some(
                booking => booking.date === day.date && booking.time === slot.start
              );
              
              return {
                ...slot,
                id: slot.id || Date.now().toString() + Math.random().toString(36).substring(2, 9), // Ensure each slot has a unique ID
                isBooked: isBooked
              };
            }) :
            [];

          // Check for days with time slots
          if (timeSlots.length > 0) {
              // Time slots available
          }

          return {
            date: day.date,
            isAvailable: Boolean(day.isAvailable), // Force boolean
            timeSlots: timeSlots
          };
        });

        // Log overall availability stats
        const availableDays = validatedData.filter((day: DayAvailability) => day.isAvailable).length;
        const daysWithTimeSlots = validatedData.filter((day: DayAvailability) => day.timeSlots && day.timeSlots.length > 0).length;
        const totalTimeSlots = validatedData.reduce((total: number, day: DayAvailability) => total + (day.timeSlots ? day.timeSlots.length : 0), 0);

        setAvailabilityData(prevData => {
          // If clearExisting is true, just use the new data
          if (clearExisting) {
            return validatedData;
          }

          // Otherwise, merge old and new data with new data taking precedence
          const finalDataMap = new Map(prevData.map((item: DayAvailability) => [item.date, item]));

          // Log the dates we're updating
          validatedData.forEach((item: DayAvailability) => {
            const existing = finalDataMap.get(item.date);
            if (existing) {
              // Updated existing date
            } else {
              // New date added
            }
            finalDataMap.set(item.date, item);
          });

          const sortedData = Array.from(finalDataMap.values()).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            // Handle cases where dates might be invalid, though they should be YYYY-MM-DD strings
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateA.getTime() - dateB.getTime();
          });

          const daysWithSlots = sortedData.filter(d => d.timeSlots.length > 0);

          return sortedData;
        });

        // Force calendar re-render
        forceCalendarRefresh();

        if (validatedData.length === 0) {
          setError('No availability data found for this month.');
        } else {
          setError(null);
        }

        if (onAvailabilityChange) onAvailabilityChange(validatedData);
      } else {
        // Don't clear the entire state, just log the error
        setError('Unexpected response from server.');
      }
    } catch (err) {
      console.error('Error fetching availability data:', err);
      setError(`Failed to fetch availability: ${err instanceof Error ? err.message : String(err)}`);
      // Don't clear availability data on error to preserve existing state
      
      // If this is a network error, try to fallback to cached data
      if (err instanceof Error && err.message.includes('fetch')) {
        console.log('Network error detected, checking for cached data');
        if (typeof window !== 'undefined') {
          const cachedData = localStorage.getItem(`availabilityData_${providerId}`);
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setAvailabilityData(parsed);
                setError('Using cached data due to network error');
              }
            } catch (parseError) {
              console.error('Error parsing cached data:', parseError);
            }
          }
        }
      }
    } finally {
      setLoading(false);
      forceCalendarRefresh(); // Always force refresh calendar after data fetching completes
    }
  }, [providerId, currentMonth, onAvailabilityChange]);

  // Force calendar to re-render
  const forceCalendarRefresh = () => {
    setCalendarKey(prev => prev + 1);
  };

  useEffect(() => {
    if (providerId && providerId > 0) {
      // Clear any existing data first to ensure we get fresh data
      setAvailabilityData([]);
      fetchAvailabilityData(true);
      fetchProviderPackages();
    } else {
      setAvailabilityData([]);
      setAvailablePackages([]);
    }
  }, [providerId, fetchAvailabilityData, fetchProviderPackages]);

  useEffect(() => {
    if (providerId && providerId > 0) {
      fetchAvailabilityData(false); // Don't clear existing data
    }
  }, [currentMonth, providerId, fetchAvailabilityData]);

  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return () => {}; // Return empty cleanup function for else case
  }, [showSuccessMessage]);

  // Add effect to refetch data when needed
  useEffect(() => {
    // Set up periodic refresh for data synchronization
    const refreshInterval = setInterval(() => {
      if (providerId && providerId > 0) {
        fetchAvailabilityData();
      }
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(refreshInterval);
  }, [providerId, fetchAvailabilityData]);

  // Add effect to cache data whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && providerId && availabilityData.length > 0) {
      localStorage.setItem(`availabilityData_${providerId}`, JSON.stringify(availabilityData));
    }
  }, [availabilityData, providerId]);



  const saveAvailability = async (updatedDayAvailability: DayAvailability) => {
    if (!providerId || providerId <= 0) {
      setError("Cannot save availability without a valid Provider ID.");
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Update local state FIRST for immediate feedback
      setAvailabilityData(prevData => {
        const newData = [...prevData];
        const existingIndex = newData.findIndex(day => day.date === updatedDayAvailability.date);

        if (existingIndex >= 0) {
          newData[existingIndex] = {...updatedDayAvailability};
        } else {
          newData.push({...updatedDayAvailability});
        }

        return newData;
      });

      // Ensure each time slot has an id and availableServices is properly formatted
      const fixedTimeSlots = updatedDayAvailability.timeSlots.map(slot => ({
        ...slot,
        id: slot.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
        availableServices: Array.isArray(slot.availableServices) ? slot.availableServices : []
      }));

      // Prepare the data payload
      const payload = {
        providerId,
        availability: {
          ...updatedDayAvailability,
          timeSlots: fixedTimeSlots
        }
      };


      const response = await fetch('/api/cremation/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();

        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to save availability data');
        } catch (parseError) {
          throw new Error(`Failed to save: HTTP error ${response.status}`);
        }
      }

      const responseData = await response.json();

      // After successfully saving to the server, force a refresh to get the latest data
      // Add a slight delay to ensure database commit
      setTimeout(() => {
        fetchAvailabilityData(true); // Force clear and fetch fresh data
      }, 500);

      // Force calendar re-render to ensure UI reflects the latest data
      forceCalendarRefresh();

      // Show success message
      setSuccessMessage('Time slot updated successfully!');
      setShowSuccessMessage(true);

      // Call the callback
      onSaveSuccess?.();

    } catch (err) {
      setError(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);

      // Don't refresh data on error to preserve local changes
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay();
    const days: CalendarDay[] = [];



    // Add empty cells for days of previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ type: 'empty' });
    }

    // Add cells for days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dateString = formatDateToString(date);

      // Find availability info for this date with exact string matching
      const availabilityInfo = availabilityData.find((day: DayAvailability) => {
        return day.date === dateString;
      });

      // Ensure timeSlots is always an array
      const timeSlots = availabilityInfo && Array.isArray(availabilityInfo.timeSlots)
        ? [...availabilityInfo.timeSlots]
        : [];

      // A day is available if it has time slots or is explicitly marked as available
      const isAvailable = timeSlots.length > 0 || (availabilityInfo && availabilityInfo.isAvailable);

      days.push({
        type: 'day',
        date,
        dateString,
        isAvailable,
        timeSlots,
      });
    }

    // Fill remaining cells with empty cells to complete the grid
    const remainingCells = (Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7) - (firstDayOfWeek + daysInMonth);
    for (let i = 0; i < remainingCells; i++) {
      days.push({ type: 'empty' });
    }

    return days;
  };
  
  // Year view helper function
  const getMonthsInYear = () => {
    const months = [];
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(currentYear, month, 1);
      const monthData = availabilityData.filter(day => {
        const date = new Date(day.date);
        return date.getFullYear() === currentYear && date.getMonth() === month;
      });
      
      const availableDays = monthData.filter(day => day.timeSlots.length > 0).length;
      const totalTimeSlots = monthData.reduce((total, day) => total + day.timeSlots.length, 0);
      
      months.push({
        date: monthDate,
        name: monthDate.toLocaleString('default', { month: 'long' }),
        availableDays,
        totalTimeSlots,
        hasAvailability: availableDays > 0
      });
    }
    return months;
  };

  // Fix for date discrepancy - ensure we're using the correct date without timezone issues
  const formatDateToString = (date: Date): string => {
    // Create a new date object to avoid modifying the original
    const d = new Date(date);
    // Get year, month, and day components
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(d.getDate()).padStart(2, '0');

    // Format as YYYY-MM-DD
    return `${year}-${month}-${day}`;
  };
  const handlePreviousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  
  // Enhanced navigation functions
  const handlePreviousYear = () => setCurrentYear(prev => prev - 1);
  const handleNextYear = () => setCurrentYear(prev => prev + 1);
  
  // Quick preset functions with batch operations
  const applyWeekdaysOnly = async () => {
    if (!selectedQuickSetupPackages || selectedQuickSetupPackages.length === 0) {
      setServiceSelectionError("Please select at least one service for the time slots");
      return;
    }

    if (weekdayStartTime >= weekdayEndTime) {
      setServiceSelectionError("Weekday end time must be after start time");
      return;
    }

    setLoading(true);
    const batchData: DayAvailability[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('Setting weekday availability for year:', currentYear);
    
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, month, day);
        const dayOfWeek = date.getDay();
        
        // Only process weekdays (Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Skip weekends explicitly
          continue;
        }
        
        // Skip past dates
        if (date < today) {
          continue;
        }
        
        const dateString = formatDateToString(date);
        
        // Always set weekday availability, replacing any existing slots
        batchData.push({
          date: dateString,
          isAvailable: true,
          timeSlots: [
            {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
              start: weekdayStartTime,
              end: weekdayEndTime,
              availableServices: selectedQuickSetupPackages
            }
          ]
        });
      }
    }
    
    console.log('Weekday batch data prepared:', batchData.length, 'days');
    
    // Batch API call instead of individual calls
    try {
      const response = await fetch('/api/cremation/availability/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId,
          availabilityBatch: batchData
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to set bulk availability');
      }

      // Update local state
      setAvailabilityData(prevData => {
        const newData = [...prevData];
        batchData.forEach(dayData => {
          const existingIndex = newData.findIndex(day => day.date === dayData.date);
          if (existingIndex >= 0) {
            newData[existingIndex] = dayData;
          } else {
            newData.push(dayData);
          }
        });
        return newData;
      });
      
      // Show comprehensive toast message
      if (result.successCount > 0 && (!result.errors || result.errors.length === 0)) {
        showToast(`✅ Weekday availability set for ${result.successCount} days! (${weekdayStartTime}-${weekdayEndTime})`, 'success');
        setShowQuickPresets(false);
      } else if (result.successCount > 0 && result.errors && result.errors.length > 0) {
        showToast(`⚠️ Weekday availability partially set: ${result.successCount} successful, ${result.errors.length} failed`, 'warning');
      } else {
        showToast(`❌ Failed to set weekday availability: ${result.errors?.length || 0} errors occurred`, 'error');
      }
      
      // Refresh the calendar data
      fetchAvailabilityData(false);
      
    } catch (error) {
      showToast(`Failed to set weekday availability: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const applyWeekendsOnly = async () => {
    if (!selectedQuickSetupPackages || selectedQuickSetupPackages.length === 0) {
      setServiceSelectionError("Please select at least one service for the time slots");
      return;
    }

    if (weekendStartTime >= weekendEndTime) {
      setServiceSelectionError("Weekend end time must be after start time");
      return;
    }

    setLoading(true);
    const batchData: DayAvailability[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('Setting weekend availability for year:', currentYear);
    
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, month, day);
        const dayOfWeek = date.getDay();
        
        // Only process weekends (Sunday=0, Saturday=6)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          // Skip weekdays explicitly
          continue;
        }
        
        // Skip past dates
        if (date < today) {
          continue;
        }
        
        const dateString = formatDateToString(date);
        
        // Always set weekend availability, replacing any existing slots
        batchData.push({
          date: dateString,
          isAvailable: true,
          timeSlots: [
            {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
              start: weekendStartTime,
              end: weekendEndTime,
              availableServices: selectedQuickSetupPackages
            }
          ]
        });
      }
    }
    
    console.log('Weekend batch data prepared:', batchData.length, 'days');
    
    // Batch API call
    try {
      const response = await fetch('/api/cremation/availability/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId,
          availabilityBatch: batchData
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to set bulk availability');
      }

      // Update local state
      setAvailabilityData(prevData => {
        const newData = [...prevData];
        batchData.forEach(dayData => {
          const existingIndex = newData.findIndex(day => day.date === dayData.date);
          if (existingIndex >= 0) {
            newData[existingIndex] = dayData;
          } else {
            newData.push(dayData);
          }
        });
        return newData;
      });
      
      // Show comprehensive toast message
      if (result.successCount > 0 && (!result.errors || result.errors.length === 0)) {
        showToast(`✅ Weekend availability set for ${result.successCount} days! (${weekendStartTime}-${weekendEndTime})`, 'success');
        setShowQuickPresets(false);
      } else if (result.successCount > 0 && result.errors && result.errors.length > 0) {
        showToast(`⚠️ Weekend availability partially set: ${result.successCount} successful, ${result.errors.length} failed`, 'warning');
      } else {
        showToast(`❌ Failed to set weekend availability: ${result.errors?.length || 0} errors occurred`, 'error');
      }
      
      // Refresh the calendar data
      fetchAvailabilityData(false);
      
    } catch (error) {
      showToast(`Failed to set weekend availability: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const clearAllAvailability = async () => {
    if (!confirm('Are you sure you want to clear all availability? This cannot be undone.')) return;
    
    setLoading(true);
    
    try {
      // Prepare batch data to clear all availability
      const batchData = availabilityData.map(day => ({
        date: day.date,
        isAvailable: false,
        timeSlots: []
      }));

      if (batchData.length === 0) {
        showToast('No availability data to clear', 'info');
        setLoading(false);
        return;
      }

      // Use batch API for clearing
      const response = await fetch('/api/cremation/availability/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId,
          availabilityBatch: batchData
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clear availability');
      }

      // Update local state
      setAvailabilityData([]);
      
      // Show single consolidated toast message
      showToast(`✅ All availability cleared successfully! (${result.successCount} days processed)`, 'success');
      setShowQuickPresets(false);
      
      // Refresh data
      fetchAvailabilityData(false);
    } catch (error) {
      showToast(`Failed to clear availability: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Copy availability functions
  const copyMonthAvailability = async () => {
    if (!selectedMonthToCopy || targetMonths.length === 0) {
      alert('Please select source month and target months');
      return;
    }
    
    const [sourceYear, sourceMonth] = selectedMonthToCopy.split('-').map(Number);
    const sourceData = availabilityData.filter(day => {
      const date = new Date(day.date);
      return date.getFullYear() === sourceYear && date.getMonth() === sourceMonth - 1;
    });
    
    if (sourceData.length === 0) {
      alert('No availability data found for the selected source month');
      return;
    }
    
    const promises = [];
    for (const targetMonthStr of targetMonths) {
      const [targetYear, targetMonth] = targetMonthStr.split('-').map(Number);
      
      for (const sourceDay of sourceData) {
        if (sourceDay.timeSlots.length === 0) continue;
        
        const sourceDate = new Date(sourceDay.date);
        const targetDate = new Date(targetYear, targetMonth - 1, sourceDate.getDate());
        
        // Skip if target date doesn't exist (e.g., Feb 30)
        if (targetDate.getMonth() !== targetMonth - 1) continue;
        
        const targetDateString = formatDateToString(targetDate);
        const newDay: DayAvailability = {
          date: targetDateString,
          isAvailable: sourceDay.isAvailable,
          timeSlots: sourceDay.timeSlots.map(slot => ({
            ...slot,
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9)
          }))
        };
        
        promises.push(saveAvailability(newDay));
      }
    }
    
    await Promise.all(promises);
    setSuccessMessage(`Availability copied to ${targetMonths.length} month(s)!`);
    setShowSuccessMessage(true);
    setShowCopyModal(false);
    setSelectedMonthToCopy('');
    setTargetMonths([]);
  };
  const handleDayClick = (date: Date) => {
    // Prevent selecting past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      return;
    }

    setSelectedDate(date);

    // Fetch the day data directly from availabilityData
    const dateString = formatDateToString(date);
    const dayData = availabilityData.find(day => day.date === dateString);

    // If the selected date is not in the current month, we may need to switch months
    const selectedMonth = date.getMonth();
    const currentViewMonth = currentMonth.getMonth();

    if (selectedMonth !== currentViewMonth) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }

    // Check if we have data for the selected day
  };

  const toggleDayAvailability = (date: Date) => {
    const dateString = formatDateToString(date);
    const existingDay = availabilityData.find(day => day.date === dateString);

    // Create updated day with toggled availability but preserve time slots
    const updatedDay: DayAvailability = {
      date: dateString,
      isAvailable: existingDay ? !existingDay.isAvailable : true,
      // Always preserve existing time slots when toggling availability
      timeSlots: existingDay?.timeSlots || []
    };

    // Save the availability
    saveAvailability(updatedDay);
  };



  const handleAddTimeSlot = () => {
    if (!selectedDate) {
      setShowTimeSlotModal(false);
      return;
    }

    // Validate time inputs
    if (!timeSlotStart || !timeSlotEnd) {
      setServiceSelectionError("Please select both start and end times");
      return;
    }

    // Check if end time is after start time
    if (timeSlotStart >= timeSlotEnd) {
      setServiceSelectionError("End time must be after start time");
      return;
    }

    // If no packages are available, show a warning but still allow creating time slots
    if (availablePackages.length === 0) {
      setServiceSelectionError("Warning: No packages available. Time slot will be created but won&apos;t be visible to customers until packages are added.");

      // Create a default package selection to allow the time slot to be saved
      setSelectedPackages([0]); // Use 0 as a placeholder ID
    }
    // Otherwise, ensure at least one service is selected
    else if (selectedPackages.length === 0) {
      setServiceSelectionError("Please select at least one service");
      return;
    }


    // Format the date to string for API
    const dateString = formatDateToString(selectedDate);

    // Find existing day or create a new one
    const existingDay = availabilityData.find(day => day.date === dateString);

    // Check for time slot conflicts
    if (existingDay && existingDay.timeSlots.length > 0) {
      const newStartTime = timeSlotStart;
      const newEndTime = timeSlotEnd;

      // Check if new time slot overlaps with any existing time slot
      const hasConflict = existingDay.timeSlots.some(slot => {
        const existingStart = slot.start;
        const existingEnd = slot.end;

        // Check if new slot overlaps with existing slot
        return (newStartTime < existingEnd && newEndTime > existingStart);
      });

      if (hasConflict) {
        setServiceSelectionError("This time slot conflicts with an existing time slot");
        setConflictMessage(`Time slot conflict: ${newStartTime} - ${newEndTime} overlaps with an existing time slot`);
        setShowConflictMessage(true);
        return;
      }
    }

    // Build the new time slot
    const newTimeSlot: TimeSlot = {
      id: Date.now().toString(),
      start: timeSlotStart,
      end: timeSlotEnd,
      availableServices: selectedPackages // Always include selected packages
    };

    // Create the updated day object - ALWAYS set isAvailable to true when adding a time slot
    const updatedDay: DayAvailability = {
      date: dateString,
      isAvailable: true, // Always make the day available when adding a time slot
      timeSlots: existingDay && Array.isArray(existingDay.timeSlots)
        ? [...existingDay.timeSlots, newTimeSlot]
        : [newTimeSlot]
    };


    // Save the availability to backend
    saveAvailability(updatedDay);

    // Close modal and reset state
    setShowTimeSlotModal(false);
    setSelectedPackages([]);
    setServiceSelectionError(null);

    // Show success message
    setSuccessMessage('Time slot added successfully!');
    setShowSuccessMessage(true);
  };

  const handleRemoveTimeSlot = async (dateString: string, timeSlotId: string) => {
    try {
      // Show loading state
      setLoading(true);
      setError(null);

      // First update local state for immediate feedback
      const existingDay = availabilityData.find(day => day.date === dateString);
      if (!existingDay) {
        showToast("Could not find the selected day's data.", 'error');
        setLoading(false);
        return;
      }

      // Update local state
      const updatedSlots = existingDay.timeSlots.filter(slot => slot.id !== timeSlotId);
      const updatedDay: DayAvailability = { ...existingDay, timeSlots: updatedSlots };

      // Call the API to delete the time slot from the database
      const response = await fetch(`/api/cremation/availability/timeslot?slotId=${timeSlotId}&providerId=${providerId}&date=${dateString}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.error || `Failed to delete time slot (HTTP ${response.status})`);
      }

      // Get response data for successful deletion
      const responseData = await response.json();

      // After successfully deleting from the database, update the local state
      setAvailabilityData(prevData => {
        const newData = [...prevData];
        const existingIndex = newData.findIndex(day => day.date === dateString);

        if (existingIndex >= 0) {
          newData[existingIndex] = {...updatedDay};
        }

        return newData;
      });

      // Show success message for time slot deletion
      showToast('Time slot deleted successfully!', 'success');

      // Force calendar re-render
      forceCalendarRefresh();

    } catch (error) {
      console.error('Error removing time slot:', error);
      showToast(`Failed to remove time slot: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');

      // Try one more approach - clear all slots for the date
      try {
        console.log('Attempting to clear all slots for date:', dateString);
        const clearResponse = await fetch(`/api/cremation/availability/debug?action=clear-date&date=${dateString}&providerId=${providerId}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        const clearResponseData = await clearResponse.json();
        console.log('Clear date response:', clearResponseData);

        if (clearResponse.ok && clearResponseData.affectedRows > 0) {
          showToast(`Cleared ${clearResponseData.affectedRows} time slots for ${dateString}`, 'success');

          // Force refresh after clearing
          setTimeout(() => {
            fetchAvailabilityData(true);
          }, 1000);
        } else {
          // Revert local state changes on error
          fetchAvailabilityData(true);
        }
      } catch (clearErr) {
        console.error('Error clearing date slots:', clearErr);
        // Revert local state changes on error
        fetchAvailabilityData(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePackageSelection = (packageId: number) => {
    setSelectedPackages(prev => prev.includes(packageId) ? prev.filter(id => id !== packageId) : [...prev, packageId]);
    if (serviceSelectionError) setServiceSelectionError(null);
  };

  const days = getDaysInMonth();
  const selectedDayData = selectedDate ? availabilityData.find(day => day.date === formatDateToString(selectedDate)) : null;

  const handleRefreshData = () => {
    // Clear any stale data first
    setAvailabilityData([]);
    // Then fetch fresh data
    fetchAvailabilityData();
    forceCalendarRefresh();
  };

  const isDisabled = !providerId || providerId <= 0;

  useEffect(() => {
    // Add this effect to trace when availabilityData changes

    // Force re-render of the calendar data
  }, [availabilityData]);

  // Add this effect to hide conflict message after a timeout
  useEffect(() => {
    if (showConflictMessage) {
      const timer = setTimeout(() => {
        setShowConflictMessage(false);
      }, 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    }
    return () => {}; // Return empty cleanup function for else case
  }, [showConflictMessage]);

  return (
    <div className="w-full">
      {/* Enhanced Calendar Header */}
      <div className="space-y-4 mb-4">
        {/* View Toggle & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'month' 
                    ? 'bg-white text-[var(--primary-green)] shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Month
              </button>
              <button
                type="button"
                onClick={() => setViewMode('year')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'year' 
                    ? 'bg-white text-[var(--primary-green)] shadow-sm' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                Year
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
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
              onClick={() => setShowCopyModal(true)}
              className="px-3 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium hover:bg-purple-100 transition-colors"
              disabled={isDisabled}
            >
              <DocumentDuplicateIcon className="h-4 w-4 inline mr-1" />
              <span className="hidden sm:inline">Copy Month</span>
              <span className="sm:hidden">Copy</span>
            </button>
            <button
              type="button"
              onClick={handleRefreshData}
              className="px-3 py-1 bg-gray-50 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-100 transition-colors"
              disabled={isDisabled}
            >
              <ArrowPathIcon className="h-4 w-4 inline mr-1" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Navigation Header */}
        {viewMode === 'month' ? (
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={isDisabled}
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={isDisabled}
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handlePreviousYear}
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={isDisabled}
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-lg font-semibold">{currentYear}</h2>
            <button
              type="button"
              onClick={handleNextYear}
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={isDisabled}
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        )}

        {/* Quick Presets Panel */}
        {showQuickPresets && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-3">Quick Setup Options</h3>
            
            {/* Time Settings */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                Time Slot Settings
              </label>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
                {/* Weekday Times */}
                <div className="bg-white border border-blue-200 rounded-md p-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Weekdays (Mon-Fri)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start</label>
                      <input
                        type="time"
                        value={weekdayStartTime}
                        onChange={(e) => setWeekdayStartTime(e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End</label>
                      <input
                        type="time"
                        value={weekdayEndTime}
                        onChange={(e) => setWeekdayEndTime(e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Weekend Times */}
                <div className="bg-white border border-blue-200 rounded-md p-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Weekends (Sat-Sun)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start</label>
                      <input
                        type="time"
                        value={weekendStartTime}
                        onChange={(e) => setWeekendStartTime(e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End</label>
                      <input
                        type="time"
                        value={weekendEndTime}
                        onChange={(e) => setWeekendEndTime(e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                Select Services for Time Slots: <span className="text-red-500">*</span>
              </label>
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
                  {availablePackages.map((pkg: any) => (
                    <div key={pkg.id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        id={`quick-setup-package-${pkg.id}`}
                        checked={selectedQuickSetupPackages.includes(pkg.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuickSetupPackages([...selectedQuickSetupPackages, pkg.id]);
                          } else {
                            setSelectedQuickSetupPackages(selectedQuickSetupPackages.filter(id => id !== pkg.id));
                          }
                          setServiceSelectionError(null);
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`quick-setup-package-${pkg.id}`} className="ml-2 text-sm text-gray-700">
                        {pkg.name} (₱{pkg.price?.toLocaleString()})
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-600 bg-white border border-blue-200 rounded-md p-2">
                  No service packages available. Please create packages first.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={applyWeekdaysOnly}
                disabled={selectedQuickSetupPackages.length === 0}
                className="px-3 py-2 bg-green-100 text-green-800 rounded-md text-xs font-medium hover:bg-green-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <ClockIcon className="h-4 w-4 inline mr-1" />
                Weekdays ({weekdayStartTime}-{weekdayEndTime})
              </button>
              <button
                type="button"
                onClick={applyWeekendsOnly}
                disabled={selectedQuickSetupPackages.length === 0}
                className="px-3 py-2 bg-orange-100 text-orange-800 rounded-md text-xs font-medium hover:bg-orange-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Weekends ({weekendStartTime}-{weekendEndTime})
              </button>
              <button
                type="button"
                onClick={clearAllAvailability}
                className="px-3 py-2 bg-red-100 text-red-800 rounded-md text-xs font-medium hover:bg-red-200 transition-colors sm:col-span-2 lg:col-span-1"
              >
                <TrashIcon className="h-4 w-4 inline mr-1" />
                Clear All
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200 flex justify-between items-center">
              <div className="text-xs text-blue-700">
                {selectedQuickSetupPackages.length > 0 ? 
                  `${selectedQuickSetupPackages.length} service(s) selected` : 
                  'Select services first'
                }
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuickPresets(false);
                  setServiceSelectionError(null);
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Close Panel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Content */}
      {viewMode === 'month' ? (
        <>
          {/* Monthly Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          <div key={calendarKey} className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {getDaysInMonth().map((day, index) => {
              const isPastDay = day.date && day.date < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <div key={index} className="aspect-square p-0.5">
                  {day.type === 'empty' ? (
                    <div className="h-full"></div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => !isPastDay && handleDayClick(day.date!)}
                      disabled={isPastDay}
                      className={`
                        h-full w-full flex flex-col items-center justify-center rounded-md p-0.5 sm:p-1 transition-colors text-xs sm:text-sm
                        ${isPastDay ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                          day.timeSlots && day.timeSlots.length > 0
                            ? 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                        }
                        ${selectedDate && day.dateString === formatDateToString(selectedDate)
                          ? 'ring-2 ring-[var(--primary-green)]'
                          : ''
                        }
                      `}
                    >
                      <span className="text-xs sm:text-sm font-medium">
                        {day.date!.getDate()}
                      </span>
                      {day.timeSlots && day.timeSlots.length > 0 && !isPastDay && (
                        <div className="flex flex-col items-center mt-0.5 sm:mt-1">
                          <div className={`px-1 py-0.5 rounded-sm text-xs font-medium ${
                            day.timeSlots.some(slot => slot.isBooked) 
                              ? 'bg-orange-200 text-orange-800' 
                              : 'bg-green-200 text-green-800'
                          }`}>
                            <span className="hidden sm:inline">{day.timeSlots.length} slots</span>
                            <span className="sm:hidden">{day.timeSlots.length}</span>
                          </div>
                          {day.timeSlots.some(slot => slot.isBooked) && (
                            <div className="mt-0.5 px-1 py-0.5 bg-red-200 rounded-sm text-xs font-medium text-red-800">
                              <span className="hidden sm:inline">Has bookings</span>
                              <span className="sm:hidden">Booked</span>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Yearly Calendar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getMonthsInYear().map((month, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  month.hasAvailability
                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => {
                  setCurrentMonth(month.date);
                  setViewMode('month');
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-800">{month.name}</h3>
                  {month.hasAvailability && (
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  )}
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Available Days:</span>
                    <span className="font-medium">{month.availableDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time Slots:</span>
                    <span className="font-medium">{month.totalTimeSlots}</span>
                  </div>
                </div>
                {month.hasAvailability && (
                  <div className="mt-2 text-xs text-green-700 font-medium">
                    Click to view details
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Messages and Status */}
      {isDisabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <p className="text-yellow-700">
            <ExclamationCircleIcon className="h-5 w-5 inline mr-2" />
            Provider ID is not valid. Calendar operations are disabled.
          </p>
        </div>
      )}

      {packageLoadError && !isDisabled && (
        <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-4">
          <p className="text-orange-700 text-sm">
            <ExclamationCircleIcon className="h-5 w-5 inline mr-2" />
            Error loading packages: {packageLoadError}
          </p>
          <p className="text-orange-700 text-xs mt-1">
            You can still set up availability, but you won&apos;t be able to select specific packages for time slots.
          </p>
        </div>
      )}

      {loading && !isDisabled ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--primary-green)]"></div>
        </div>
      ) : (
        selectedDate ? (
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium">
                {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setServiceSelectionError(null);
                  setSelectedPackages([]);
                  setShowTimeSlotModal(true);
                }}
                className="flex items-center px-3 py-1 bg-[var(--primary-green)] text-white rounded-md text-xs font-medium hover:bg-[var(--primary-green-hover)] ml-4"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Add Time Slot
              </button>
            </div>

            {selectedDayData && selectedDayData.timeSlots.length > 0 ? (
              <div className="space-y-2 mt-2">
                <h4 className="text-sm font-medium text-gray-600">Time Slots:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {selectedDayData.timeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 rounded-md border gap-2 ${
                        slot.isBooked 
                          ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className={`font-medium text-sm ${slot.isBooked ? 'text-red-700' : 'text-gray-700'}`}>
                          {slot.start} - {slot.end}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {slot.isBooked && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                              Booked
                            </span>
                          )}
                          {slot.availableServices && slot.availableServices.length > 0 && !slot.isBooked && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              {slot.availableServices.length} service{slot.availableServices.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTimeSlot(selectedDayData.date, slot.id)}
                        className={`${slot.isBooked ? 'text-red-600 hover:text-red-800' : 'text-red-500 hover:text-red-700'} p-2 hover:bg-red-50 rounded-full self-end sm:self-center`}
                        title={slot.isBooked ? "Remove booked time slot" : "Remove time slot"}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-md border border-gray-200">
                <p>No time slots have been added for this day.</p>
                <p className="mt-2">Click &quot;Add Time Slot&quot; to set available times for bookings.</p>
              </div>
            )}
          </div>
        ) : (
          !isDisabled && (
            <div className="mt-6 text-center py-6 text-gray-500 bg-gray-50 rounded-md border border-gray-200">
              <p>Please select a date on the calendar to add or view time slots.</p>
            </div>
          )
        )
      )}

      {/* Modals */}
      {showTimeSlotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Add Time Slot</h3>
              <button type="button" onClick={() => setShowTimeSlotModal(false)}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={timeSlotStart}
                  onChange={(e) => setTimeSlotStart(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={timeSlotEnd}
                  onChange={(e) => setTimeSlotEnd(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Services for this Time Slot <span className="text-red-500">*</span>
                </label>
                {serviceSelectionError && (
                  <div className="flex items-center mt-1 mb-2 text-sm text-red-600">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                    {serviceSelectionError}
                  </div>
                )}
                {loadingPackages ? (
                  <div className="text-center py-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[var(--primary-green)] mx-auto"></div>
                  </div>
                ) : availablePackages.length > 0 ? (
                  <div className="max-h-32 sm:max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {availablePackages.map((pkg: any) => (
                      <div key={pkg.id} className="flex items-center py-1">
                        <input
                          type="checkbox"
                          id={`package-${pkg.id}`}
                          checked={selectedPackages.includes(pkg.id)}
                          onChange={() => togglePackageSelection(pkg.id)}
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
                <button
                  type="button"
                  onClick={() => setShowTimeSlotModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddTimeSlot}
                  className="px-4 py-2 bg-[var(--primary-green)] text-white rounded-md"
                >
                  Add Time Slot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}