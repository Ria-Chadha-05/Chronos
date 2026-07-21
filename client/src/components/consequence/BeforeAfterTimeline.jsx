/**
 * BeforeAfterTimeline.jsx
 *
 * Visual bar comparison of scheduled vs. free time, current vs. proposed.
 *
 * @prop {object} comparison - Output of compareSchedules(): { current, proposed, difference }.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

function Bar({ label, scheduledMinutes, freeMinutes, overloadMinutes, color }) {
  const total = Math.max(1, scheduledMinutes + freeMinutes);
  const scheduledPct = Math.min(100, (scheduledMinutes / total) * 100);
  const overloadPct = Math.min(100 - scheduledPct, (overloadMinutes / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-widest font-display text-[#7A9ABB]">{label}</span>
        <span className="text-[10px] text-[#3D5A7A] font-mono">
          {Math.round(scheduledMinutes / 60)}h scheduled · {Math.round(freeMinutes / 60)}h free
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-[#111D35] overflow-hidden flex">
        <div className="h-full" style={{ width: `${scheduledPct}%`, background: color }} />
        {overloadPct > 0 && <div className="h-full" style={{ width: `${overloadPct}%`, background: '#FF3366' }} />}
      </div>
    </div>
  );
}

export default function BeforeAfterTimeline({ comparison = null, loading = false, className = '' }) {
  if (loading || !comparison) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-40 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="space-y-3">
          <div className="h-6 rounded bg-[#111D35] animate-pulse" />
          <div className="h-6 rounded bg-[#111D35] animate-pulse" />
        </div>
      </div>
    );
  }

  const { current, proposed, difference } = comparison;

  return (
    <div className={`rounded-xl border border-[rgba(0,212,255,0.15)] bg-[#0D1628] p-4 space-y-4 ${className}`}>
      <h3 className="font-display text-[10px] tracking-widest uppercase text-[#7A9ABB]">📊 Before / After Timeline</h3>

      <Bar label="Current" scheduledMinutes={current.scheduledMinutes} freeMinutes={current.freeMinutes} overloadMinutes={current.overloadMinutes} color="#00D4FF" />
      <Bar label="Proposed" scheduledMinutes={proposed.scheduledMinutes} freeMinutes={proposed.freeMinutes} overloadMinutes={proposed.overloadMinutes} color="#9B59FF" />

      <div className="pt-2 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between text-xs">
        <span className="text-[#3D5A7A]">Planner Score Change</span>
        <span
          className="font-display font-bold"
          style={{ color: difference.plannerScore >= 0 ? '#00FF88' : '#FF3366' }}
        >
          {difference.plannerScore >= 0 ? '+' : ''}{difference.plannerScore}
        </span>
      </div>
    </div>
  );
}
