/**
 * StatisticsCard.jsx
 *
 * A reusable metric card for the Chronos dashboard.
 * Displays a single KPI with a label, value, optional trend indicator,
 * and optional subtitle.
 *
 * @prop {string} label - Metric name (e.g. "Completion Rate").
 * @prop {string|number} value - Primary value to display (e.g. "75%" or 42).
 * @prop {string} [subtitle] - Secondary context (e.g. "9 of 12 tasks").
 * @prop {'up'|'down'|'flat'|null} [trend=null] - Trend direction.
 * @prop {string} [trendLabel] - Human text for the trend (e.g. "+8% vs last week").
 * @prop {'cyan'|'green'|'amber'|'red'|'purple'} [color='cyan'] - Accent color.
 * @prop {string} [icon] - Emoji or icon character.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

const COLOR_MAP = {
  cyan:   { text: '#00D4FF', border: 'rgba(0,212,255,0.2)',   glow: 'rgba(0,212,255,0.12)'   },
  green:  { text: '#00FF88', border: 'rgba(0,255,136,0.2)',   glow: 'rgba(0,255,136,0.12)'   },
  amber:  { text: '#FF8C00', border: 'rgba(255,140,0,0.2)',   glow: 'rgba(255,140,0,0.12)'   },
  red:    { text: '#FF3366', border: 'rgba(255,51,102,0.2)',  glow: 'rgba(255,51,102,0.12)'  },
  purple: { text: '#9B59FF', border: 'rgba(155,89,255,0.2)',  glow: 'rgba(155,89,255,0.12)'  },
};

const TREND_ICON = { up: '↑', down: '↓', flat: '→' };
const TREND_COLOR = { up: '#00FF88', down: '#FF3366', flat: '#7A9ABB' };

/**
 * StatisticsCard component.
 * @param {object} props
 */
export default function StatisticsCard({
  label = '',
  value = '—',
  subtitle = '',
  trend = null,
  trendLabel = '',
  color = 'cyan',
  icon = '',
  loading = false,
  className = '',
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.cyan;

  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-20 rounded bg-[#111D35] animate-pulse mb-3" />
        <div className="h-7 w-16 rounded bg-[#111D35] animate-pulse mb-2" />
        <div className="h-2.5 w-24 rounded bg-[#111D35] animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border bg-[#0D1628] p-4 transition-all duration-200 hover:scale-[1.01] ${className}`}
      style={{
        borderColor: c.border,
        boxShadow: `inset 0 0 20px ${c.glow}`,
      }}
    >
      {/* Label row */}
      <div className="flex items-center gap-1.5 mb-2">
        {icon && <span className="text-sm leading-none">{icon}</span>}
        <span className="font-display text-[10px] tracking-widest uppercase text-[#7A9ABB]">
          {label}
        </span>
      </div>

      {/* Value */}
      <div
        className="font-display text-2xl font-bold leading-none mb-1"
        style={{ color: c.text }}
      >
        {value}
      </div>

      {/* Subtitle + trend */}
      <div className="flex items-center justify-between mt-1.5">
        {subtitle && (
          <span className="text-xs text-[#3D5A7A]">{subtitle}</span>
        )}
        {trend && (
          <span
            className="text-xs font-mono font-medium flex items-center gap-0.5"
            style={{ color: TREND_COLOR[trend] }}
          >
            <span>{TREND_ICON[trend]}</span>
            {trendLabel && <span>{trendLabel}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
