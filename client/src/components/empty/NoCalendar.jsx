/**
 * NoCalendar.jsx
 *
 * Empty state for when Google Calendar is not connected.
 *
 * @prop {string} [message='Calendar not connected.']
 * @prop {string} [subtext]
 * @prop {Function} [onConnect] - Callback for Connect button.
 * @prop {string} [className='']
 */

import React from 'react';

/**
 * NoCalendar component.
 * @param {object} props
 */
export default function NoCalendar({
  message = 'Calendar not connected.',
  subtext = 'Connect your Google Calendar so Chronos can read your schedule and plan around your real commitments.',
  onConnect = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="w-18 h-18 mb-4 relative">
        <div className="w-16 h-16 rounded-2xl bg-[#0D1628] border border-[rgba(0,212,255,0.2)] flex items-center justify-center text-3xl mx-auto">
          📅
        </div>
        <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-[#FF3366] border-2 border-[#050A14] flex items-center justify-center">
          <span className="text-[8px] text-white font-bold">✕</span>
        </div>
      </div>
      <h3 className="font-display text-sm text-[#7A9ABB] mb-1">{message}</h3>
      <p className="text-xs text-[#3D5A7A] max-w-[240px] leading-relaxed mb-5">{subtext}</p>
      {onConnect && (
        <button
          onClick={onConnect}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-display tracking-widest uppercase bg-[#00D4FF] text-[#050A14] hover:bg-[#00bfe8] transition-colors"
        >
          <span>🔗</span>
          <span>Connect Google Calendar</span>
        </button>
      )}
    </div>
  );
}
