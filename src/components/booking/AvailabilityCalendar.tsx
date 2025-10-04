'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/context/ToastContext';
import CalendarHeader from './CalendarHeader';
import QuickPresetsPanel from './QuickPresetsPanel';
import TimeSlotModal from './TimeSlotModal';
import MonthGrid from './MonthGrid';
import YearOverview from './YearOverview';
import { TimeSlot, DayAvailability, CalendarDay } from './types';
import { PlusIcon, TrashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

// Types moved to ./types for reuse

interface AvailabilityCalendarProps {
  providerId: number;
  onAvailabilityChange?: (availability: DayAvailability[]) => void;
  onSaveSuccess?: () => void;
  compact?: boolean;
}

export default function AvailabilityCalendar({ providerId, onAvailabilityChange, onSaveSuccess, compact = false }: AvailabilityCalendarProps) {
  // Enhanced view state
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [_showBulkActions, _setShowBulkActions] = useState<boolean>(false);
  const [showQuickPresets, setShowQuickPresets] = useState<boolean>(false);
  const [selectedQuickSetupPackages, setSelectedQuickSetupPackages] = useState<number[]>([]);
  const [weekdayStartTime, setWeekdayStartTime] = useState<string>("09:00");
  const [weekdayEndTime, setWeekdayEndTime] = useState<string>("17:00");
  const [weekendStartTime, setWeekendStartTime] = useState<string>("10:00");
  const [weekendEndTime, setWeekendEndTime] = useState<string>("16:00");
  
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const savedMonth = typeof window !== "undefined" ? localStorage.getItem('availabilityCalendarMonth') : null;
    if (savedMonth) {
      try {
        const savedDate = new Date(savedMonth);
        const now = new Date();

        // Only use saved month if it's from the current year and not too far in the past
        // This prevents showing old months like June when it's actually December
        if (savedDate.getFullYear() === now.getFullYear() &&
            savedDate.getMonth() >= now.getMonth() - 1) { // Allow previous month
          return savedDate;
        }
      } catch {
        // If parsing fails, fall through to current date
      }
    }
    // Default to current month
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
        } catch {
        }
      }
    }
    return [];
  });
  const [_loading, setLoading] = useState<boolean>(false);
  const [_savingSlot, setSavingSlot] = useState<boolean>(false);
  const [_deletingSlot, setDeletingSlot] = useState<boolean>(false);
  const [_error, setError] = useState<string | null>(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState<boolean>(false);
  const [timeSlotStart, setTimeSlotStart] = useState<string>("09:00");
  const [timeSlotEnd, setTimeSlotEnd] = useState<string>("10:00");
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<number[]>([]);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(false);
  const [serviceSelectionError, setServiceSelectionError] = useState<string | null>(null);
  const [_dataInitialized, _setDataInitialized] = useState<boolean>(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [_successMessage, setSuccessMessage] = useState<string>('Time slot updated successfully!');
  const [packageLoadError, setPackageLoadError] = useState<string | null>(null);
  const [showConflictMessage, setShowConflictMessage] = useState<boolean>(false);
  const [_conflictMessage, setConflictMessage] = useState<string>('');
  const [calendarKey, setCalendarKey] = useState<number>(0);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const latestSaveControllerRef = useRef<AbortController | null>(null);

  // Abort any in-flight save on unmount
  useEffect(() => {
    return () => {
      if (latestSaveControllerRef.current) {
        latestSaveControllerRef.current.abort();
        latestSaveControllerRef.current = null;
      }
    };
  }, []);

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
        } catch {
          const errorMessage = `Failed to fetch provider packages: ${response.status} - ${errorText.substring(0, 100)}`;
          setPackageLoadError(errorMessage);
          throw new Error(errorMessage);
        }
      }

      const data = await response.json();
      setAvailablePackages(data.packages || []);
    } catch {
      setAvailablePackages([]);
    } finally {
      setLoadingPackages(false);
    }
  }, [providerId]);

  const fetchAvailabilityData = useCallback(async (clearExisting = true, silent = false) => {
    if (!providerId || providerId <= 0) {
      if (!silent) {
        setError("Cannot fetch availability without a valid Provider ID.");
      }
      if (clearExisting) setAvailabilityData([]);
      return;
    }
    try {
      if (!silent) setLoading(true);
      if (!silent) {
        setError(null);
      }

      let startDate, endDate, monthString;

      // Determine date range based on view mode
      if (viewMode === 'year') {
        // For year view, fetch entire year
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        
        startDate = yearStart.toISOString().split('T')[0];
        endDate = yearEnd.toISOString().split('T')[0];
        monthString = `${currentYear}`;
        
      } else {
        // For month view, fetch single month
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // First day shown in calendar (could be previous month)
        const firstCalendarDay = new Date(year, month, 1);
        // Last day shown in calendar (could be next month)
        const lastCalendarDay = new Date(year, month + 1, 0);

        // Format dates for API
        startDate = firstCalendarDay.toISOString().split('T')[0];
        endDate = lastCalendarDay.toISOString().split('T')[0];
        monthString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        
      }

      // Add a timestamp to force fresh data
      const timestamp = new Date().getTime();
      const url = `/api/cremation/availability?providerId=${providerId}&startDate=${startDate}&endDate=${endDate}&month=${monthString}&t=${timestamp}`;


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
        } catch {
          throw new Error(`HTTP error ${response.status}: ${errorText.substring(0, 100)}`);
        }
      }

      const data = await response.json();

      // Now fetch bookings to mark booked slots and booked days
      let bookedSlots: { date: string; time: string; }[] = [];
      const bookedDatesSet: Set<string> = new Set();
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
            .map((booking: any) => {
              // Handle both raw database format and formatted API response
              let timeForComparison = null;
              
              // Try to get raw booking_time first (from database)
              if (booking.booking_time) {
                // Raw format: "09:00:00" or "09:00"
                timeForComparison = booking.booking_time.substring(0, 5);
              } 
              // Fallback to formatted scheduledTime
              else if (booking.scheduledTime) {
                // Formatted: "09:00 AM" -> extract "09:00"
                const timeMatch = booking.scheduledTime.match(/(\d{1,2}:\d{2})/);
                timeForComparison = timeMatch ? timeMatch[1] : null;
              }
              
              const dateStr = booking.booking_date ? booking.booking_date.split('T')[0] : null;
              if (dateStr) {
                bookedDatesSet.add(dateStr);
              }
              return {
                date: dateStr,
                time: timeForComparison,
                status: booking.status
              };
            })
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
            timeSlots: timeSlots,
            hasBookings: bookedDatesSet.has(day.date)
          };
        });

        // Additional validation: Double-check booking status for all data
        // This ensures isBooked is set correctly for year view calculations
        validatedData.forEach((day: DayAvailability) => {
          day.timeSlots.forEach((slot: TimeSlot) => {
            const shouldBeBooked = bookedSlots.some(
              booking => booking.date === day.date && booking.time === slot.start
            );
            if (slot.isBooked !== shouldBeBooked) {
              slot.isBooked = shouldBeBooked;
            }
          });
        });
        
        setAvailabilityData(prevData => {
          // If clearExisting is true, just use the new data
          if (clearExisting) {
            return validatedData;
          }

          // Otherwise, merge old and new data with new data taking precedence
          const finalDataMap = new Map(prevData.map((item: DayAvailability) => [item.date, item]));

          validatedData.forEach((item: DayAvailability) => {
            finalDataMap.set(item.date, item);
          });

          const sortedData = Array.from(finalDataMap.values()).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateA.getTime() - dateB.getTime();
          });

          return sortedData;
        });

        // Force calendar re-render when not silent
        if (!silent) forceCalendarRefresh();
          
        if (validatedData.length === 0) {
          if (!silent) {
            setError('No availability data found for this month.');
          }
        } else {
          if (!silent) {
            setError(null);
          }
        }

        if (onAvailabilityChange) onAvailabilityChange(validatedData);
      } else {
        // Don't clear the entire state, just log the error
        if (!silent) {
          setError('Unexpected response from server.');
        }
      }
    } catch (err) {
      console.error('Error fetching availability data:', err);
      if (!silent) {
        setError(`Failed to fetch availability: ${err instanceof Error ? err.message : String(err)}`);
      }
      // Don't clear availability data on error to preserve existing state
      
      // If this is a network error, try to fallback to cached data
      if (err instanceof Error && err.message.includes('fetch')) {
        if (typeof window !== 'undefined') {
          const cachedData = localStorage.getItem(`availabilityData_${providerId}`);
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setAvailabilityData(parsed);
                if (!silent) {
                  setError('Using cached data due to network error');
                }
              }
            } catch (parseError) {
              console.error('Error parsing cached data:', parseError);
            }
          }
        }
      }
    } finally {
      if (!silent) setLoading(false);
      if (!silent) forceCalendarRefresh();
    }
  }, [providerId, currentMonth, onAvailabilityChange, viewMode, currentYear]);

  // Force calendar to re-render
  const forceCalendarRefresh = () => {
    setCalendarKey(prev => prev + 1);
  };

  // Reset to current month when component mounts or provider changes
  useEffect(() => {
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);

    // Clear old localStorage data that might be causing issues
    if (typeof window !== "undefined") {
      const savedMonth = localStorage.getItem('availabilityCalendarMonth');
      if (savedMonth) {
        try {
          const savedDate = new Date(savedMonth);
          // If saved date is more than 2 months old, clear it
          const monthsDiff = (now.getFullYear() - savedDate.getFullYear()) * 12 + (now.getMonth() - savedDate.getMonth());
          if (monthsDiff > 2) {
            localStorage.removeItem('availabilityCalendarMonth');
          }
        } catch {
          localStorage.removeItem('availabilityCalendarMonth');
        }
      }
    }

    // Reset to current month when provider changes
    setCurrentMonth(currentDate);
  }, [providerId]); // Only reset when provider changes, not when user navigates

  useEffect(() => {
    if (providerId && providerId > 0) {
      // Ajax-like: do not clear UI; fetch silently to avoid flashes
      fetchAvailabilityData(true, true);
      fetchProviderPackages();
    } else {
      setAvailabilityData([]);
      setAvailablePackages([]);
    }
  }, [providerId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (providerId && providerId > 0) {
      fetchAvailabilityData(false, true); // silent refresh on month change
    }
  }, [currentMonth, providerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add effect to refetch data when view mode changes
  useEffect(() => {
    if (providerId && providerId > 0) {
      fetchAvailabilityData(true, true); // silent refresh on view change
    }
  }, [viewMode, currentYear, providerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Force refresh when switching to year view to ensure booking data is current
  // Remove extra year-view forced fetch to keep UI static

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



  const saveAvailability = async (
    updatedDayAvailability: DayAvailability,
    options?: { silent?: boolean; signal?: AbortSignal }
  ) => {
    if (!providerId || providerId <= 0) {
      setError("Cannot save availability without a valid Provider ID.");
      return;
    }
    try {
      if (!options?.silent) setLoading(true);
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
        signal: options?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();

        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to save availability data');
        } catch {
          throw new Error(`Failed to save: HTTP error ${response.status}`);
        }
      }

      const _responseData = await response.json();

      // After saving, refresh in the background (silent when requested)
      setTimeout(() => {
        fetchAvailabilityData(true, Boolean(options?.silent));
      }, 300);

      // Force calendar re-render when not silent
      if (!options?.silent) forceCalendarRefresh();

      if (!options?.silent) {
      setSuccessMessage('Time slot updated successfully!');
      setShowSuccessMessage(true);
      }

      // Call the callback
      onSaveSuccess?.();

    } catch (err) {
      // Ignore abort errors quietly; a newer save is in-flight
      if ((err as any)?.name === 'AbortError') {
        return;
      }
      setError(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);

      // Don't refresh data on error to preserve local changes
    } finally {
      if (!options?.silent) setLoading(false);
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
      const isAvailable = timeSlots.length > 0 || Boolean(availabilityInfo?.isAvailable);

      days.push({
        type: 'day',
        date,
        isAvailable,
        timeSlots,
        hasBookings: Boolean((availabilityInfo as any)?.hasBookings),
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
      
      // Only count days that have at least one NON-BOOKED time slot AND are not in the past
      const availableDays = monthData.filter(day => {
        // Check if the day is in the past
        const dayDate = new Date(day.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
        dayDate.setHours(0, 0, 0, 0);
        
        const isPastDay = dayDate < today;
        
        // If it's a past day, don't count it as available
        if (isPastDay) {
          return false;
        }
        
        const availableSlots = day.timeSlots.filter(slot => {
          // Explicitly check for isBooked being false or undefined
          // If isBooked is undefined, consider it available (legacy data)
          // If isBooked is explicitly true, consider it booked
          const isSlotBooked = slot.isBooked === true;
          return !isSlotBooked;
        });
        return availableSlots.length > 0;
      }).length;
      
      // Only count NON-BOOKED time slots from NON-PAST days
      const totalTimeSlots = monthData.reduce((total, day) => {
        // Check if the day is in the past
        const dayDate = new Date(day.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dayDate.setHours(0, 0, 0, 0);
        
        const isPastDay = dayDate < today;
        
        // If it's a past day, don't count any slots
        if (isPastDay) {
          return total;
        }
        
        const availableSlots = day.timeSlots.filter(slot => {
          const isSlotBooked = slot.isBooked === true;
          return !isSlotBooked;
        });
        return total + availableSlots.length;
      }, 0);
      
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
  const _handlePreviousMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const _handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  
  // Enhanced navigation functions
  const _handlePreviousYear = () => setCurrentYear(prev => prev - 1);
  const _handleNextYear = () => setCurrentYear(prev => prev + 1);
  
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
  
  const clearAllAvailability = () => {
    setShowClearConfirmModal(true);
  };

  const handleClearAllConfirm = async () => {
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

      // Update local state to empty array to immediately reflect in UI
      setAvailabilityData([]);
      
      // Force calendar re-render by incrementing key
      setCalendarKey(prev => prev + 1);
      
      // Show single consolidated toast message
      showToast(`✅ All availability cleared successfully! (${result.successCount} days processed)`, 'success');
      setShowQuickPresets(false);
      
      // Refresh data after a short delay to ensure UI updates
      setTimeout(() => {
        fetchAvailabilityData(false);
      }, 100);
    } catch (error) {
      showToast(`Failed to clear availability: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
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
    const _dayData = availabilityData.find(day => day.date === dateString);

    // If the selected date is not in the current month, we may need to switch months
    const selectedMonth = date.getMonth();
    const currentViewMonth = currentMonth.getMonth();

    if (selectedMonth !== currentViewMonth) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }

    // Check if we have data for the selected day
  };

  const _toggleDayAvailability = (date: Date) => {
    const dateString = formatDateToString(date);
    const existingDay = availabilityData.find(day => day.date === dateString);

    // Create updated day with toggled availability but preserve time slots
    const updatedDay: DayAvailability = {
      date: dateString,
      isAvailable: existingDay ? !existingDay.isAvailable : true,
      // Always preserve existing time slots when toggling availability
      timeSlots: existingDay?.timeSlots || []
    };

    // Save the availability with cancellation to avoid overlapping saves
    if (latestSaveControllerRef.current) {
      latestSaveControllerRef.current.abort();
    }
    const controller = new AbortController();
    latestSaveControllerRef.current = controller;
    saveAvailability(updatedDay, { signal: controller.signal })
      .finally(() => {
        if (latestSaveControllerRef.current === controller) {
          latestSaveControllerRef.current = null;
        }
      });
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

    // Build the new time slot (temporary negative id for stable optimistic key)
    const newTimeSlot: TimeSlot = {
      id: `temp-${Date.now()}`,
      start: timeSlotStart,
      end: timeSlotEnd,
      availableServices: selectedPackages // Always include selected packages
    };

    // Create the updated day object - ALWAYS set isAvailable to true when adding a time slot
    const updatedDay: DayAvailability = {
      date: dateString,
      isAvailable: true, // Always make the day available when adding a time slot
      timeSlots: (() => {
        const base = existingDay && Array.isArray(existingDay.timeSlots)
          ? [...existingDay.timeSlots, newTimeSlot]
          : [newTimeSlot];
        return base.sort((a, b) => a.start.localeCompare(b.start));
      })()
    };


    // Save the availability to backend silently for smooth animation with cancellation
    setSavingSlot(true);
    // Abort any previous in-flight save
    if (latestSaveControllerRef.current) {
      latestSaveControllerRef.current.abort();
    }
    const controller = new AbortController();
    latestSaveControllerRef.current = controller;
    saveAvailability(updatedDay, { silent: true, signal: controller.signal })
      .finally(() => {
        // Clear ref if this is still the latest controller
        if (latestSaveControllerRef.current === controller) {
          latestSaveControllerRef.current = null;
        }
        setSavingSlot(false);
      });

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
      setDeletingSlot(true);
      setError(null);

      // First update local state for immediate feedback
      const existingDay = availabilityData.find(day => day.date === dateString);
      if (!existingDay) {
        showToast("Could not find the selected day's data.", 'error');
        setLoading(false);
        return;
      }

      // Update local state
      const updatedSlots = existingDay.timeSlots
        .filter(slot => slot.id !== timeSlotId)
        .sort((a, b) => a.start.localeCompare(b.start));
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

      // Consume response (ignore body), but surface parsing issues for visibility
      try {
        await response.json();
      } catch (parseError) {
        console.warn(
          'Failed to parse JSON response after deleting time slot; response may have no body or be non-JSON.',
          parseError
        );
      }

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

      // Force calendar re-render handled by state update + animations

      // Refetch availability data to ensure booking status is up to date
      // Use a small delay to allow database changes to propagate
      setTimeout(() => {
        fetchAvailabilityData(false, true); // Silent refresh
      }, 300);

    } catch (error) {
      console.error('Error removing time slot:', error);
      showToast(`Failed to remove time slot: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');

      // Final fallback: refresh data to sync state silently
      fetchAvailabilityData(true, true);
    } finally {
      setDeletingSlot(false);
    }
  };

  const togglePackageSelection = (packageId: number) => {
    setSelectedPackages(prev => prev.includes(packageId) ? prev.filter(id => id !== packageId) : [...prev, packageId]);
    if (serviceSelectionError) setServiceSelectionError(null);
  };

  const _days = getDaysInMonth();
  const selectedDayData = selectedDate ? availabilityData.find(day => day.date === formatDateToString(selectedDate)) : null;

  const handleRefreshData = () => {
    // Ajax-like: fetch fresh data silently without clearing state
    fetchAvailabilityData(false, true);
  };

  const isDisabled = (!providerId || providerId <= 0) || _loading;

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
    <div className={compact ? "w-full max-w-5xl mx-auto" : "w-full"}>
      <CalendarHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onPrevMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
        onNextMonth={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
        onPrevYear={() => setCurrentYear((prev) => prev - 1)}
        onNextYear={() => setCurrentYear((prev) => prev + 1)}
        onToday={() => {
                  const now = new Date();
                  setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
        isDisabled={isDisabled}
        showQuickPresets={showQuickPresets}
        setShowQuickPresets={setShowQuickPresets}
        onRefresh={handleRefreshData}
      />

      {showQuickPresets && (
        <QuickPresetsPanel
          weekdayStartTime={weekdayStartTime}
          setWeekdayStartTime={setWeekdayStartTime}
          weekdayEndTime={weekdayEndTime}
          setWeekdayEndTime={setWeekdayEndTime}
          weekendStartTime={weekendStartTime}
          setWeekendStartTime={setWeekendStartTime}
          weekendEndTime={weekendEndTime}
          setWeekendEndTime={setWeekendEndTime}
          serviceSelectionError={serviceSelectionError}
          loadingPackages={loadingPackages}
          availablePackages={availablePackages}
          selectedQuickSetupPackages={selectedQuickSetupPackages}
          setSelectedQuickSetupPackages={setSelectedQuickSetupPackages}
          onApplyWeekdays={applyWeekdaysOnly}
          onApplyWeekends={applyWeekendsOnly}
          onClearAll={clearAllAvailability}
          onClose={() => {
            setShowQuickPresets(false);
                          setServiceSelectionError(null);
                        }}
        />
      )}

      {/* Calendar Content */}
      {viewMode === 'month' ? (
        <MonthGrid
          days={_days}
          selectedDate={selectedDate}
          formatDateToString={formatDateToString}
          onDayClick={handleDayClick}
          compact={compact}
        />
      ) : (
        <YearOverview
          calendarKey={calendarKey}
          getMonthsInYear={getMonthsInYear}
          onSelectMonth={(date) => {
            setCurrentMonth(date);
                  setViewMode('month');
                }}
        />
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

      {selectedDate ? (
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium">
                {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <motion.button
                whileTap={{ scale: 0.98 }}
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
              </motion.button>
            </div>

            {selectedDayData && selectedDayData.timeSlots.length > 0 ? (
              <div className="space-y-2 mt-2">
                <h4 className="text-sm font-medium text-gray-600">Time Slots:</h4>
                <div className="grid grid-cols-1 gap-2">
                  <AnimatePresence initial={false}>
                  {selectedDayData.timeSlots.map((slot) => (
                    <motion.div
                      layout
                      key={slot.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
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
                    </motion.div>
                  ))}
                  </AnimatePresence>
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
        )}

      {/* Modals */}
      <TimeSlotModal
        open={showTimeSlotModal}
        onClose={() => setShowTimeSlotModal(false)}
        start={timeSlotStart}
        setStart={setTimeSlotStart}
        end={timeSlotEnd}
        setEnd={setTimeSlotEnd}
        availablePackages={availablePackages}
        selectedPackages={selectedPackages}
        togglePackage={togglePackageSelection}
        loadingPackages={loadingPackages}
        error={serviceSelectionError}
        onSubmit={handleAddTimeSlot}
      />

      {/* Clear All Confirmation Modal */}
      <ConfirmationModal
        isOpen={showClearConfirmModal}
        onClose={() => setShowClearConfirmModal(false)}
        onConfirm={handleClearAllConfirm}
        title="Clear All Availability"
        message="Are you sure you want to clear all availability? This action cannot be undone and will remove all scheduled time slots."
        confirmText="Clear All"
        cancelText="Cancel"
        variant="danger"
        icon={<ExclamationCircleIcon className="h-6 w-6 text-red-600" />}
        successMessage="All availability has been cleared successfully!"
      />
    </div>
  );
}
