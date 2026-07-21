/**
 * DashboardSkeleton.jsx
 *
 * Full-page dashboard skeleton loader shown while commitment and
 * planner data is being fetched. Mirrors the dashboard grid layout.
 *
 * @prop {string} [className='']
 */

import React from 'react';

function Pulse({ className = '', style = {} }) {
  return (
    <div
      className={`rounded bg-[#111D35] animate-pulse ${className}`}
      style={style}
    />
  );
}

function CardShell({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0D1628] p-5 ${className}`}>
      {children}
    </div>
  );
}

/**
 * DashboardSkeleton component.
 * @param {object} props
 */
export default function DashboardSkeleton({ className = '' }) {
  return (
    <div className={`space-y-4 ${className}`} aria-label="Loading dashboard…" aria-busy="true">
      {/* Top stat cards row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <CardShell key={i}>
            <Pulse className="h-2.5 w-20 mb-3" />
            <Pulse className="h-6 w-14 mb-2" />
            <Pulse className="h-2 w-24" />
          </CardShell>
        ))}
      </div>

      {/* Main content row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left — timeline / planner */}
        <CardShell className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <Pulse className="h-3 w-28" />
            <Pulse className="h-3 w-16" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Pulse className="h-2.5 w-10 shrink-0" />
                <Pulse className="h-9 flex-1 rounded-lg" style={{ opacity: 1 - i * 0.12 }} />
              </div>
            ))}
          </div>
        </CardShell>

        {/* Right — capacity gauge + insights */}
        <div className="space-y-4">
          <CardShell>
            <Pulse className="h-2.5 w-24 mb-4" />
            <div className="flex items-center gap-4">
              <Pulse className="w-28 h-28 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Pulse className="h-2.5 w-full" />
                <Pulse className="h-2.5 w-4/5" />
                <Pulse className="h-2.5 w-3/5" />
              </div>
            </div>
          </CardShell>

          <CardShell>
            <Pulse className="h-2.5 w-20 mb-3" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Pulse key={i} className="h-3" style={{ width: `${70 + i * 8}%` }} />)}
            </div>
          </CardShell>
        </div>
      </div>

      {/* Bottom row — charts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <CardShell key={i}>
            <Pulse className="h-2.5 w-24 mb-3" />
            <Pulse className="h-24 w-full rounded-lg" />
          </CardShell>
        ))}
      </div>
    </div>
  );
}
