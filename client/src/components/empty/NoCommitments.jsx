/**
 * NoCommitments.jsx
 *
 * Empty state shown when no commitments are loaded (calendar + tasks empty).
 *
 * @prop {string} [message='No commitments loaded.']
 * @prop {string} [subtext]
 * @prop {Function} [onConnect] - Callback to connect calendar.
 * @prop {Function} [onAddManual] - Callback to add manual commitment.
 * @prop {string} [className='']
 */

import React from 'react';

/**
 * NoCommitments component.
 * @param {object} props
 */
export default function NoCommitments({
  message = 'No commitments loaded.',
  subtext = 'Connect your Google Calendar or add tasks manually to let Chronos start planning.',
  onConnect = null,
  onAddManual = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 text-center ${className}`}>
      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-full border border-[rgba(0,212,255,0.2)] bg-[#0D1628] flex items-center justify-center text-4xl">
          📭
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#111D35] border border-[rgba(255,140,0,0.4)] flex items-center justify-center text-xs">
          0
        </div>
      </div>
      <h3 className="font-display text-sm text-[#7A9ABB] mb-1">{message}</h3>
      <p className="text-xs text-[#3D5A7A] max-w-[260px] leading-relaxed mb-5">{subtext}</p>
      {(onConnect || onAddManual) && (
        <div className="flex gap-2">
          {onConnect && (
            <button
              onClick={onConnect}
              className="px-4 py-2 rounded-lg text-xs font-display tracking-widest uppercase text-[#050A14] bg-[#00D4FF] hover:bg-[#00bfe8] transition-colors"
            >
              Connect Calendar
            </button>
          )}
          {onAddManual && (
            <button
              onClick={onAddManual}
              className="px-4 py-2 rounded-lg text-xs font-display tracking-widest uppercase text-[#7A9ABB] border border-[rgba(122,154,187,0.3)] hover:border-[rgba(0,212,255,0.4)] hover:text-[#00D4FF] transition-colors"
            >
              Add Manually
            </button>
          )}
        </div>
      )}
    </div>
  );
}
