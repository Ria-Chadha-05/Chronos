/**
 * DelayImpactCard.jsx
 *
 * Displays the downstream delay impact analysis for a single blocked task.
 * Shows downstream task count, deadlines at risk, capacity impact,
 * and the planner impact description.
 *
 * @prop {object} data        - One item from report.delayImpacts:
 *                              { taskId, taskTitle, impact }
 * @prop {string} [className=''] - Extra Tailwind classes.
 */

import React, { useState } from 'react';

const IMPACT_COLORS = {
  low:    { bar: '#00D4FF', text: '#00D4FF', bg: 'rgba(0,212,255,0.06)' },
  medium: { bar: '#FF8C00', text: '#FF8C00', bg: 'rgba(255,140,0,0.06)' },
  high:   { bar: '#FF3366', text: '#FF3366', bg: 'rgba(255,51,102,0.06)' },
};

function impactLevel(score) {
  if (score >= 60) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/**
 * DelayImpactCard component.
 * @param {object} props
 */
export default function DelayImpactCard({ data = {}, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const { taskTitle = 'Unknown task', impact = {} } = data;

  const {
    downstreamCount    = 0,
    deadlinesAtRisk    = [],
    addedRealityGap    = 0,
    capacityImpact     = 0,
    plannerImpact      = '',
    totalDelayDays     = 0,
    impactScore        = 0,
  } = impact;

  const level  = impactLevel(impactScore);
  const colors = IMPACT_COLORS[level];

  return (
    <div
      className={`rounded-xl border border-[rgba(0,212,255,0.12)] overflow-hidden ${className}`}
      style={{ background: colors.bg }}
    >
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#E8F4FF] truncate">{taskTitle}</p>
          <p className="text-xs text-[#7A9ABB] mt-0.5">{plannerImpact}</p>
        </div>

        {/* Score ring */}
        <div className="flex flex-col items-center shrink-0">
          <span
            className="font-display text-lg font-bold"
            style={{ color: colors.text }}
          >
            {impactScore}
          </span>
          <span className="text-[9px] text-[#3D5A7A] uppercase">impact</span>
        </div>

        {/* Expand */}
        <span
          className="text-[#3D5A7A] text-xs transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>

      {/* Score bar */}
      <div className="px-4 pb-1">
        <div className="h-1 rounded-full bg-[#080F1E] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, impactScore)}%`,
              background: `linear-gradient(90deg, ${colors.bar}66, ${colors.bar})`,
            }}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 divide-x divide-[rgba(0,212,255,0.08)] px-4 pb-3 mt-2">
        <MiniStat label="Downstream" value={downstreamCount} unit="tasks" />
        <MiniStat label="Delay est." value={totalDelayDays} unit="days" />
        <MiniStat label="Capacity" value={`~${capacityImpact}h`} unit="blocked" />
      </div>

      {/* Expanded: deadlines at risk */}
      {expanded && deadlinesAtRisk.length > 0 && (
        <div
          className="border-t border-[rgba(0,212,255,0.08)] px-4 py-3 space-y-2"
        >
          <p className="text-[11px] uppercase tracking-wider text-[#3D5A7A]">
            Deadlines at risk
          </p>
          {deadlinesAtRisk.map((d) => (
            <div key={d.taskId} className="flex items-center justify-between text-xs">
              <span className="text-[#7A9ABB] truncate flex-1">{d.title}</span>
              <span
                className="ml-3 shrink-0 font-mono"
                style={{ color: d.daysUntil <= 2 ? '#FF3366' : d.daysUntil <= 5 ? '#FF8C00' : '#7A9ABB' }}
              >
                {d.daysUntil === 0 ? 'TODAY' : d.daysUntil === 1 ? 'TOMORROW' : `in ${d.daysUntil}d`}
              </span>
            </div>
          ))}
          {addedRealityGap > 0 && (
            <p className="text-xs text-[#3D5A7A] pt-1">
              +{addedRealityGap} pts added to reality gap if unresolved.
            </p>
          )}
        </div>
      )}

      {expanded && deadlinesAtRisk.length === 0 && (
        <div className="border-t border-[rgba(0,212,255,0.08)] px-4 py-3">
          <p className="text-xs text-[#3D5A7A]">No immediate deadlines at risk downstream.</p>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, unit }) {
  return (
    <div className="px-3 text-center">
      <p className="font-display font-bold text-base text-[#E8F4FF]">{value}</p>
      <p className="text-[10px] text-[#3D5A7A] uppercase tracking-wide leading-tight">{label}</p>
      {unit && <p className="text-[9px] text-[#3D5A7A]">{unit}</p>}
    </div>
  );
}
