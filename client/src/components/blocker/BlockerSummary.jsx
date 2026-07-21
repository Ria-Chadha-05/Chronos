/**
 * BlockerSummary.jsx
 *
 * Compact summary strip rendered at the top of BlockerPanel.
 * Shows key metrics at a glance: total blocked, critical count,
 * critical paths, and the overall blocker score.
 *
 * @prop {object}  report     - Full report from generateBlockerReport().
 * @prop {string}  [className=''] - Extra Tailwind classes.
 */

import React from 'react';

const SCORE_COLOR = (score) => {
  if (score === 0)   return '#00FF88';
  if (score <= 25)   return '#00D4FF';
  if (score <= 50)   return '#FF8C00';
  return '#FF3366';
};

const SCORE_LABEL = (score) => {
  if (score === 0)   return 'All Clear';
  if (score <= 25)   return 'Manageable';
  if (score <= 50)   return 'Under Pressure';
  if (score <= 75)   return 'High Risk';
  return 'Critical';
};

/**
 * BlockerSummary component.
 * @param {object} props
 */
export default function BlockerSummary({ report = {}, className = '' }) {
  const {
    totalBlockedCount = 0,
    criticalBlockers  = {},
    graph             = {},
    blockerScore      = 0,
    insights          = [],
  } = report;

  const critical     = criticalBlockers?.totalCritical ?? 0;
  const critPaths    = (graph?.criticalPaths || []).length;
  const scoreColor   = SCORE_COLOR(blockerScore);
  const scoreLabel   = SCORE_LABEL(blockerScore);

  const stats = [
    { label: 'Blocked',  value: totalBlockedCount,           color: totalBlockedCount > 0 ? '#FF3366' : '#00FF88' },
    { label: 'Critical', value: critical,                    color: critical > 0           ? '#FF3366' : '#3D5A7A' },
    { label: 'Chains',   value: (graph?.blockedChains || []).length, color: '#00D4FF' },
    { label: 'At Risk',  value: critPaths,                   color: critPaths > 0          ? '#FF8C00' : '#3D5A7A' },
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Stat chips */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-lg border border-[rgba(0,212,255,0.1)] bg-[#080F1E] px-3 py-2 text-center"
          >
            <p className="font-display text-lg font-bold" style={{ color }}>
              {value}
            </p>
            <p className="text-[10px] text-[#3D5A7A] uppercase tracking-wider mt-0.5">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Blocker score bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-[#080F1E] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, blockerScore)}%`,
              background: `linear-gradient(90deg, ${scoreColor}88, ${scoreColor})`,
              boxShadow: `0 0 8px ${scoreColor}66`,
            }}
          />
        </div>
        <span className="text-[11px] font-mono shrink-0" style={{ color: scoreColor }}>
          {scoreLabel}
        </span>
      </div>

      {/* Top insight */}
      {insights.length > 0 && (
        <p className="text-[12px] text-[#7A9ABB] leading-relaxed border-l-2 border-[rgba(0,212,255,0.3)] pl-3">
          {insights[0]}
        </p>
      )}
    </div>
  );
}
