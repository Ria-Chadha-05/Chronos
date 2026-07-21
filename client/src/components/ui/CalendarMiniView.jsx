import React, { useMemo, useState } from 'react';
import { useCalendar, toLocalDateString } from '../../context/CalendarContext.jsx';
import { useCommitments } from '../../context/CommitmentContext.jsx';
import { useChronos } from '../../context/ChronosContext.jsx';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function buildCalendarDays(viewMonth) {
  const [y, m] = viewMonth.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const totalDays = lastDay.getDate();

  const days = [];

  // Leading padding from previous month
  const prevMonthLastDay = new Date(y, m - 1, 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({
      dateStr: null,
      label: prevMonthLastDay - i,
      faded: true,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(y, m - 1, d);
    days.push({
      dateStr: toLocalDateString(date),
      label: d,
      faded: false,
    });
  }

  // Trailing padding
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ dateStr: null, label: d, faded: true });
  }

  return days;
}

export default function CalendarMiniView({ daySummaryMap = {} }) {
  const { selectedDate, viewMonth, goToPrevMonth, goToNextMonth, goToToday, setSelectedDate, today } = useCalendar();
  const { commitments } = useCommitments();
  const { plan, rescue } = useChronos() || {};
  const [hoveredDay, setHoveredDay] = useState(null);

  const [viewYear, viewMonthNum] = viewMonth.split('-').map(Number);

  // Build a set of dates that have events for dot indicators
  const eventDateSet = useMemo(() => {
    const s = new Set();
    for (const c of commitments) {
      if (c.date) s.add(c.date);
    }
    return s;
  }, [commitments]);

  // Build a set of dates affected by conflicts
  const conflictDates = useMemo(() => {
    const dates = new Set();
    if (!plan?.conflicts) return dates;
    const conflictIds = new Set(plan.conflicts.flatMap(c => c.affectedTaskIds || []));
    for (const c of commitments) {
      if (conflictIds.has(c.id) && c.date) {
        dates.add(c.date);
      }
    }
    return dates;
  }, [plan?.conflicts, commitments]);

  // Build a set of dates affected by rescue actions
  const rescueAffectedDates = useMemo(() => {
    const dates = new Set();
    if (!rescue?.rescuedSchedule) return dates;
    for (const item of rescue.rescuedSchedule) {
      if (item.status && item.status !== 'kept') {
        const d = item.date || today;
        dates.add(d);
      }
    }
    return dates;
  }, [rescue?.rescuedSchedule, today]);

  // Build a set of dates affected by overload
  const overloadDates = useMemo(() => {
    const dates = new Set();
    if (plan?.capacityAnalysis && !plan.capacityAnalysis.feasible) {
      dates.add(today);
    }
    return dates;
  }, [plan?.capacityAnalysis, today]);

  const days = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 18,
      padding: '16px 14px',
      userSelect: 'none',
      position: 'relative',
    }}>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={goToPrevMonth}
          style={NAV_BTN_STYLE}
          title="Previous month"
        >
          ‹
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Orbitron',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--cyan)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            {MONTH_NAMES[viewMonthNum - 1]}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 9,
            color: 'var(--muted)',
            marginTop: 1,
          }}>
            {viewYear}
          </div>
        </div>

        <button
          onClick={goToNextMonth}
          style={NAV_BTN_STYLE}
          title="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
        {WEEKDAYS.map(wd => (
          <div key={wd} style={{
            textAlign: 'center',
            fontFamily: 'JetBrains Mono',
            fontSize: 8,
            color: 'var(--dim)',
            letterSpacing: '0.08em',
            padding: '3px 0',
          }}>
            {wd}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {days.map((day, idx) => {
          const isSelected = day.dateStr === selectedDate;
          const isToday = day.dateStr === today;
          const hasEvents = day.dateStr && eventDateSet.has(day.dateStr);

          // Get summary values from parent map
          const summary = day.dateStr ? daySummaryMap[day.dateStr] : null;

          return (
            <button
              key={idx}
              onClick={() => day.dateStr && setSelectedDate(day.dateStr)}
              onMouseEnter={() => day.dateStr && setHoveredDay(day.dateStr)}
              onMouseLeave={() => setHoveredDay(null)}
              disabled={!day.dateStr}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                aspectRatio: '1',
                borderRadius: 7,
                border: isSelected
                  ? '1px solid var(--cyan)'
                  : isToday
                    ? '1px solid rgba(0,212,255,0.3)'
                    : '1px solid transparent',
                background: isSelected
                  ? 'rgba(0,212,255,0.18)'
                  : isToday
                    ? 'rgba(0,212,255,0.07)'
                    : 'transparent',
                color: day.faded
                  ? 'var(--dim)'
                  : isSelected
                    ? 'var(--cyan)'
                    : isToday
                      ? 'rgba(0,212,255,0.8)'
                      : 'var(--text)',
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                cursor: day.dateStr ? 'pointer' : 'default',
                opacity: day.dateStr ? 1 : 0.35,
                transition: 'all 0.15s',
                padding: '3px 1px',
                boxShadow: isSelected ? '0 0 10px rgba(0,212,255,0.25)' : 'none',
              }}
            >
              <span>{day.label}</span>
              <div style={{ display: 'flex', gap: 2, marginTop: 1, justifyContent: 'center', minHeight: 4 }}>
                {hasEvents && (
                  <div style={{
                    width: 3.5,
                    height: 3.5,
                    borderRadius: '50%',
                    background: isSelected ? 'var(--cyan)' : 'var(--amber)',
                    boxShadow: isSelected ? '0 0 4px var(--cyan)' : '0 0 3px var(--amber)',
                  }} />
                )}
                {day.dateStr && conflictDates.has(day.dateStr) && (
                  <div style={{
                    width: 3.5,
                    height: 3.5,
                    borderRadius: '50%',
                    background: 'var(--red)',
                    boxShadow: '0 0 3.5px var(--red)',
                  }} />
                )}
                {day.dateStr && rescueAffectedDates.has(day.dateStr) && (
                  <div style={{
                    width: 3.5,
                    height: 3.5,
                    borderRadius: '50%',
                    background: 'var(--purple)',
                    boxShadow: '0 0 3.5px var(--purple)',
                  }} />
                )}
                {day.dateStr && overloadDates.has(day.dateStr) && (
                  <div style={{
                    width: 3.5,
                    height: 3.5,
                    borderRadius: '50%',
                    background: 'var(--red)',
                    boxShadow: '0 0 3.5px var(--red)',
                    animation: 'conflict-pulse 1.5s infinite',
                  }} />
                )}
              </div>

              {/* Hover popup tooltip */}
              {hoveredDay === day.dateStr && summary && (
                <div style={{
                  position: 'absolute',
                  bottom: '125%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(8,15,30,0.96)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  zIndex: 99,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  textAlign: 'left',
                }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--text)', fontWeight: 700 }}>
                    {summary.count} commitment{summary.count !== 1 ? 's' : ''}
                  </div>
                  {summary.moved > 0 && (
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--amber)' }}>
                      ↻ {summary.moved} moved
                    </div>
                  )}
                  {summary.conflicts > 0 && (
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--red)' }}>
                      ⚠ {summary.conflicts} conflict{summary.conflicts !== 1 ? 's' : ''}
                    </div>
                  )}
                  {summary.count === 0 && (
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--dim)' }}>
                      Clear schedule
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Today button */}
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <button
          onClick={goToToday}
          style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 9,
            color: selectedDate === today ? 'var(--dim)' : 'var(--cyan)',
            background: 'transparent',
            border: 'none',
            cursor: selectedDate === today ? 'default' : 'pointer',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: selectedDate === today ? 0.4 : 1,
            transition: 'all 0.2s',
          }}
        >
          ◈ Today
        </button>
      </div>
    </div>
  );
}

const NAV_BTN_STYLE = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--deep)',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontFamily: 'JetBrains Mono',
  fontSize: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s',
  lineHeight: 1,
};
