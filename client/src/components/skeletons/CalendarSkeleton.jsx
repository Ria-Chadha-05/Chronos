/**
 * CalendarSkeleton.jsx
 *
 * Skeleton loader for the calendar mini-view and full calendar views.
 *
 * @prop {'mini'|'full'} [variant='mini'] - Layout variant.
 * @prop {string} [className='']
 */

import React from 'react';

function Pulse({ className = '', style = {} }) {
  return <div className={`rounded bg-[#111D35] animate-pulse ${className}`} style={style} />;
}

function MiniCalendar() {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0D1628] p-4">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <Pulse className="w-5 h-5 rounded" />
        <Pulse className="h-3 w-20" />
        <Pulse className="w-5 h-5 rounded" />
      </div>
      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }, (_, i) => <Pulse key={i} className="h-2 rounded" />)}
      </div>
      {/* Day cells */}
      {Array.from({ length: 5 }, (_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1 mb-1">
          {Array.from({ length: 7 }, (_, col) => (
            <Pulse key={col} className="h-6 rounded" style={{ opacity: 0.6 + Math.random() * 0.4 }} />
          ))}
        </div>
      ))}
      {/* Event list below */}
      <div className="mt-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Pulse className="w-1.5 h-6 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Pulse className="h-2.5" style={{ width: `${55 + i * 10}%` }} />
              <Pulse className="h-2" style={{ width: `${35 + i * 8}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullCalendar() {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0D1628] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Pulse className="h-4 w-32" />
        <div className="flex gap-2">
          <Pulse className="h-7 w-16 rounded-lg" />
          <Pulse className="h-7 w-16 rounded-lg" />
          <Pulse className="h-7 w-16 rounded-lg" />
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {Array.from({ length: 7 }, (_, i) => <Pulse key={i} className="h-3 rounded" />)}
      </div>
      {/* Time grid rows */}
      {Array.from({ length: 8 }, (_, row) => (
        <div key={row} className="grid grid-cols-7 gap-2 mb-2 items-start">
          <Pulse className="h-2 rounded w-8" />
          {Array.from({ length: 6 }, (_, col) => {
            const hasEvent = Math.random() > 0.65;
            return hasEvent
              ? <Pulse key={col} className="rounded-md" style={{ height: `${24 + Math.floor(Math.random() * 36)}px` }} />
              : <div key={col} />;
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * CalendarSkeleton component.
 * @param {object} props
 */
export default function CalendarSkeleton({ variant = 'mini', className = '' }) {
  return (
    <div className={className} aria-label="Loading calendar…" aria-busy="true">
      {variant === 'full' ? <FullCalendar /> : <MiniCalendar />}
    </div>
  );
}
