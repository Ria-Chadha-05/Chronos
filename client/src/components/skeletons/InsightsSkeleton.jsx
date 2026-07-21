/**
 * InsightsSkeleton.jsx
 *
 * Skeleton loader for the AI Insights panel.
 *
 * @prop {number} [lines=4] - Number of insight line placeholders.
 * @prop {string} [className='']
 */

import React from 'react';

function Pulse({ className = '', style = {} }) {
  return <div className={`rounded bg-[#111D35] animate-pulse ${className}`} style={style} />;
}

/**
 * InsightsSkeleton component.
 * @param {object} props
 */
export default function InsightsSkeleton({ lines = 4, className = '' }) {
  const lineWidths = [82, 68, 75, 60, 88, 55, 70];

  return (
    <div
      className={`rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#0D1628] p-5 ${className}`}
      aria-label="Loading insights…"
      aria-busy="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Pulse className="w-6 h-6 rounded" />
          <Pulse className="h-2.5 w-20" />
        </div>
        <Pulse className="h-7 w-12 rounded-lg" />
      </div>

      {/* Summary line */}
      <Pulse className="h-3 w-full mb-1" />
      <Pulse className="h-3 w-4/5 mb-4" />

      {/* Insight lines */}
      <div className="space-y-3">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="flex items-start gap-2">
            <Pulse className="w-4 h-4 rounded shrink-0 mt-0.5" />
            <Pulse className="h-3 flex-1" style={{ width: `${lineWidths[i % lineWidths.length]}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
