/**
 * ScenarioComparisonCard.jsx
 *
 * High-level summary row of the current → proposed → difference metrics
 * (available, scheduled, free, deep work, overload, recovery, planner score).
 *
 * @prop {object} comparison - Output of compareSchedules(): { current, proposed, difference }.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

const METRICS = [
  { key: 'scheduledMinutes', label: 'Scheduled', unit: 'm' },
  { key: 'freeMinutes', label: 'Free', unit: 'm' },
  { key: 'deepWorkMinutes', label: 'Deep Work', unit: 'm' },
  { key: 'overloadMinutes', label: 'Overload', unit: 'm' },
  { key: 'recoveryMinutes', label: 'Recovery', unit: 'm' },
  { key: 'plannerScore', label: 'Planner Score', unit: '' },
];

function diffColor(value, inverse = false) {
  if (value === 0) return '#7A9ABB';
  const positive = inverse ? value < 0 : value > 0;
  return positive ? '#00FF88' : '#FF3366';
}

export default function ScenarioComparisonCard({ comparison = null, loading = false, className = '' }) {
  if (loading || !comparison) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-44 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded bg-[#111D35] animate-pulse" />)}
        </div>
      </div>
    );
  }

  const { current, proposed, difference } = comparison;
  // Metrics where a higher number is worse (overload) get inverse coloring.
  const inverseMetrics = new Set(['overloadMinutes']);

  return (
    <div className={`rounded-xl border border-[rgba(0,212,255,0.15)] bg-[#0D1628] p-4 ${className}`}>
      <h3 className="font-display text-[10px] tracking-widest uppercase text-[#7A9ABB] mb-3">
        🔁 Current → Proposed → Difference
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-[#3D5A7A] font-display">
              <th className="text-left pb-2">Metric</th>
              <th className="text-right pb-2">Current</th>
              <th className="text-right pb-2">Proposed</th>
              <th className="text-right pb-2">Δ</th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map(({ key, label, unit }) => {
              const diff = difference[key];
              const color = diffColor(diff, inverseMetrics.has(key));
              return (
                <tr key={key} className="border-t border-[rgba(255,255,255,0.04)]">
                  <td className="py-1.5 text-[#7A9ABB]">{label}</td>
                  <td className="py-1.5 text-right text-[#7A9ABB] font-mono">{current[key]}{unit}</td>
                  <td className="py-1.5 text-right text-[#00D4FF] font-mono">{proposed[key]}{unit}</td>
                  <td className="py-1.5 text-right font-mono font-bold" style={{ color }}>
                    {diff > 0 ? `+${diff}` : diff}{unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
