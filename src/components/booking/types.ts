export type TimeSlot = {
  id: string;
  start: string;
  end: string;
  availableServices?: number[];
  isBooked?: boolean;
};

export type DayAvailability = {
  date: string;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
};

type EmptyCalendarCell = {
  type: 'empty';
};

type DayCalendarCell = {
  type: 'day';
  date: Date;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
};

export type CalendarDay = EmptyCalendarCell | DayCalendarCell;


