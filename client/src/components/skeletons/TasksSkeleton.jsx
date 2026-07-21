/**
 * TasksSkeleton.jsx
 *
 * Skeleton loader for the Tasks screen — shows task row placeholders.
 *
 * @prop {number} [count=6] - Number of skeleton task rows to show.
 * @prop {boolean} [showHeader=true] - Include the top filter bar skeleton.
 * @prop {string} [className='']
 */

import React from 'react';

function Pulse({ className = '', style = {} }) {
  return <div className={`rounded bg-[#111D35] animate-pulse ${className}`} style={style} />;
}

function TaskRow({ index }) {
  const widths = [72, 60, 80, 55, 68, 76];
  const w = widths[index % widths.length];
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[#0D1628]">
      <Pulse className="w-4 h-4 rounded shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Pulse className="h-3" style={{ width: `${w}%` }} />
        <Pulse className="h-2" style={{ width: `${w * 0.6}%` }} />
      </div>
      <Pulse className="h-5 w-16 rounded-full shrink-0" />
      <Pulse className="w-5 h-5 rounded shrink-0" />
    </div>
  );
}

/**
 * TasksSkeleton component.
 * @param {object} props
 */
export default function TasksSkeleton({ count = 6, showHeader = true, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-label="Loading tasks…" aria-busy="true">
      {showHeader && (
        <div className="flex items-center gap-2 mb-1">
          <Pulse className="h-8 flex-1 rounded-lg" />
          <Pulse className="h-8 w-24 rounded-lg" />
          <Pulse className="h-8 w-20 rounded-lg" />
        </div>
      )}
      {Array.from({ length: count }, (_, i) => (
        <TaskRow key={i} index={i} />
      ))}
    </div>
  );
}
