/**
 * WeeklySummary.jsx
 *
 * A 7-day activity heatmap strip showing completion rates per day,
 * total hours, and key week statistics.
 *
 * @prop {Array<{date:string, completionPct:number, hours:number, tasks:number}>} days
 *   Array of 7 daily summaries (Mon–Sun or any 7 days).
 * @prop {number} [weeklyHours=0] - Total hours for the week.
 * @prop {number} [completionPct=0] - Overall weekly completion %.
 * @prop {string} [label='This Week'] - Header label.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function heatColor(pct) {
  if (pct >= 90) return { bg: 'rgba(0,255,136,0.6)',  border: 'rgba(0,255,136,0.8)'  };
  if (pct >= 70) return { bg: 'rgba(0,255,136,0.3)',  border: 'rgba(0,255,136,0.5)'  };
  if (pct >= 50) return { bg: 'rgba(0,212,255,0.2)',  border: 'rgba(0,212,255,0.4)'  };
  if (pct >= 25) return { bg: 'rgba(255,140,0,0.15)', border: 'rgba(255,140,0,0.3)'  };
  if (pct > 0)   return { bg: 'rgba(255,51,102,0.1)', border: 'rgba(255,51,102,0.2)' };
  return           { bg: 'rgba(255,255,255,0.03)',    border: 'rgba(255,255,255,0.06)' };
}

function DayCell({ day, index }) {
  const label = day?.label ?? DAY_LABELS[index] ?? '?';
  const pct = day?.completionPct ?? 0;
  const hours = day?.hours ?? 0;
  const isToday = day?.isToday ?? false;
  const colors = heatColor(pct);

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className={`text-[10px] font-display tracking-widest uppercase ${isToday ? 'text-[#00D4FF]' : 'text-[#3D5A7A]'}`}>
        {label}
      </span>
      <div
        title={`${pct}% complete · ${hours}h`}
        className="w-full aspect-square rounded-md border transition-all duration-200 hover:scale-105 cursor-default flex items-end justify-center pb-0.5"
        style={{ background: colors.bg, borderColor: colors.border }}
      >
        {pct > 0 && (
          <span className="text-[9px] font-mono text-white/60 leading-none">{pct}%</span>
        )}
      </div>
      <span className="text-[9px] font-mono text-[#3D5A7A]">
        {hours > 0 ? `${hours}h` : '—'}
      </span>
    </div>
  );
}

/**
 * WeeklySummary component.
 * @param {object} props
 */
export default function WeeklySummary({
  days = [],
  weeklyHours = 0,
  completionPct = 0,
  label = 'This Week',
  loading = false,
  className = '',
}) {
  const displayDays = days.length > 0
    ? days
    : Array.from({ length: 7 }, (_, i) => ({ label: DAY_LABELS[i], completionPct: 0, hours: 0 }));

  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#0D1628] p-5 ${className}`}>
        <div className="h-3 w-20 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="flex gap-2">
          {[1,2,3,4,5,6,7].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="h-2 w-5 rounded bg-[#111D35] animate-pulse" />
              <div className="w-full aspect-square rounded-md bg-[#111D35] animate-pulse" />
              <div className="h-2 w-4 rounded bg-[#111D35] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[rgba(0,212,255,0.15)] bg-[#0D1628] p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="font-display text-xs tracking-widest text-[#7A9ABB] uppercase">{label}</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-display text-xs text-[#3D5A7A]">Hours</div>
            <div className="font-display text-sm font-bold text-[#00D4FF]">{weeklyHours}h</div>
          </div>
          <div className="text-right">
            <div className="font-display text-xs text-[#3D5A7A]">Done</div>
            <div className="font-display text-sm font-bold text-[#00FF88]">{completionPct}%</div>
          </div>
        </div>
      </div>

      {/* Day cells */}
      <div className="flex gap-1.5">
        {displayDays.slice(0, 7).map((day, i) => (
          <DayCell key={day?.date ?? i} day={day} index={i} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 justify-end">
        <span className="text-[9px] text-[#3D5A7A] uppercase tracking-widest">Less</span>
        {[0, 25, 50, 75, 100].map((p) => {
          const c = heatColor(p);
          return (
            <div
              key={p}
              className="w-2.5 h-2.5 rounded-sm border"
              style={{ background: c.bg, borderColor: c.border }}
            />
          );
        })}
        <span className="text-[9px] text-[#3D5A7A] uppercase tracking-widest">More</span>
      </div>
    </div>
  );
}
