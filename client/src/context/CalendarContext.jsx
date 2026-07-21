import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const CalendarContext = createContext(null);

/**
 * Format a Date as YYYY-MM-DD in local time — matches commitmentTransformer.formatDate output.
 */
export function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CalendarProvider({ children }) {
  const today = toLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  // viewMonth: YYYY-MM string controlling which month the mini-calendar shows
  const [viewMonth, setViewMonth] = useState(today.slice(0, 7));

  const goToPrevMonth = useCallback(() => {
    setViewMonth(ym => {
      const [y, m] = ym.split('-').map(Number);
      const d = new Date(y, m - 2, 1);
      return toLocalDateString(d).slice(0, 7);
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth(ym => {
      const [y, m] = ym.split('-').map(Number);
      const d = new Date(y, m, 1);
      return toLocalDateString(d).slice(0, 7);
    });
  }, []);

  const goToToday = useCallback(() => {
    const t = toLocalDateString(new Date());
    setSelectedDate(t);
    setViewMonth(t.slice(0, 7));
  }, []);

  const selectDate = useCallback((dateStr) => {
    setSelectedDate(dateStr);
    setViewMonth(dateStr.slice(0, 7));
  }, []);

  const value = useMemo(() => ({
    selectedDate,
    setSelectedDate: selectDate,
    viewMonth,
    setViewMonth,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    today,
  }), [selectedDate, selectDate, viewMonth, goToPrevMonth, goToNextMonth, goToToday, today]);

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}
