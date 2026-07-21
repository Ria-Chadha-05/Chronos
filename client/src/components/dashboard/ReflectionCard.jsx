/**
 * ReflectionCard.jsx
 *
 * Renders a structured reflection report (daily / weekly / monthly) as a
 * card with collapsible sections for wins, bottlenecks, and recommendations.
 *
 * @prop {object} reflection - ReflectionReport from reflectionEngine.js.
 * @prop {'daily'|'weekly'|'monthly'} [period='daily'] - Overrides reflection.period.
 * @prop {boolean} [defaultExpanded=false] - Whether sections start expanded.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React, { useState } from 'react';

const PERIOD_LABELS = { daily: 'Today', weekly: 'This Week', monthly: 'This Month' };

const SCORE_COLOR = (score) => {
  if (score >= 80) return '#00FF88';
  if (score >= 65) return '#00D4FF';
  if (score >= 45) return '#FF8C00';
  return '#FF3366';
};

function Section({ title, icon, items, color, defaultExpanded }) {
  const [open, setOpen] = useState(defaultExpanded);

  if (!items || items.length === 0) return null;

  return (
    <div className="border-t border-[rgba(255,255,255,0.04)] pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <span className="text-base leading-none">{icon}</span>
        <span
          className="font-display text-[10px] tracking-widest uppercase flex-1"
          style={{ color }}
        >
          {title}
        </span>
        <span className="text-[#3D5A7A] text-xs transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5 pl-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#7A9ABB]">
              <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-current opacity-50" style={{ color }} />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * ReflectionCard component.
 * @param {object} props
 */
export default function ReflectionCard({
  reflection = null,
  period = 'daily',
  defaultExpanded = false,
  loading = false,
  className = '',
}) {
  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#0D1628] p-5 ${className}`}>
        <div className="h-3 w-24 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 rounded bg-[#111D35] animate-pulse" style={{ width: `${60 + i * 9}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!reflection) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-5 text-center ${className}`}>
        <p className="text-sm text-[#3D5A7A]">No reflection data available.</p>
      </div>
    );
  }

  const activePeriod = reflection.period ?? period;
  const periodLabel = PERIOD_LABELS[activePeriod] ?? activePeriod;
  const productivityColor = SCORE_COLOR(reflection.productivityScore ?? 0);
  const consistencyColor = SCORE_COLOR(reflection.consistencyScore ?? 0);

  return (
    <div className={`rounded-xl border border-[rgba(155,89,255,0.2)] bg-[#0D1628] p-5 space-y-4 ${className}`}
      style={{ boxShadow: 'inset 0 0 24px rgba(155,89,255,0.06)' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔮</span>
          <h3 className="font-display text-xs tracking-widest text-[#7A9ABB] uppercase">
            {periodLabel} Reflection
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="font-display text-xs text-[#3D5A7A] mb-0.5">Score</div>
            <div className="font-display text-lg font-bold" style={{ color: productivityColor }}>
              {reflection.productivityScore ?? '—'}
            </div>
          </div>
          <div className="text-center">
            <div className="font-display text-xs text-[#3D5A7A] mb-0.5">Consistency</div>
            <div className="font-display text-lg font-bold" style={{ color: consistencyColor }}>
              {reflection.consistencyScore ?? '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {reflection.summary && (
        <p className="text-sm text-[#7A9ABB] leading-relaxed border-l-2 border-[rgba(155,89,255,0.3)] pl-3">
          {reflection.summary}
        </p>
      )}

      {/* Sections */}
      <div className="space-y-3">
        <Section
          title="Wins"
          icon="🏆"
          items={reflection.wins}
          color="#00FF88"
          defaultExpanded={defaultExpanded}
        />
        <Section
          title="Bottlenecks"
          icon="⚠️"
          items={reflection.bottlenecks}
          color="#FF8C00"
          defaultExpanded={defaultExpanded}
        />
        <Section
          title="Recommendations"
          icon="💡"
          items={reflection.recommendations}
          color="#00D4FF"
          defaultExpanded={defaultExpanded}
        />
      </div>
    </div>
  );
}
