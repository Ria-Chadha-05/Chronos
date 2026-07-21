/**
 * AIInsights.jsx
 *
 * Dashboard widget that renders natural-language AI-generated insights
 * from the Explanation Engine. Fully prop-driven, no context imports.
 *
 * @prop {string[]} insights - Array of insight strings to display.
 * @prop {number} [score] - Overall day score 0–100.
 * @prop {string} [summary] - One-line summary shown at the top.
 * @prop {boolean} [loading=false] - Show skeleton state.
 * @prop {string} [className=''] - Extra Tailwind classes.
 */

import React from 'react';

const SCORE_COLOR = (score) => {
  if (score >= 80) return { text: '#00FF88', glow: 'rgba(0,255,136,0.25)', label: 'Excellent' };
  if (score >= 65) return { text: '#00D4FF', glow: 'rgba(0,212,255,0.25)', label: 'Good' };
  if (score >= 45) return { text: '#FF8C00', glow: 'rgba(255,140,0,0.25)', label: 'Fair' };
  return { text: '#FF3366', glow: 'rgba(255,51,102,0.25)', label: 'Needs Attention' };
};

const INSIGHT_ICON = (text = '') => {
  if (text.startsWith('⚠️') || text.startsWith('📉')) return null; // keep emoji
  if (text.includes('overload') || text.includes('conflict')) return '⚡';
  if (text.includes('anchor') || text.includes('protect')) return '🛡️';
  if (text.includes('focus') || text.includes('deep work')) return '🎯';
  if (text.includes('complet')) return '✅';
  return '💡';
};

/**
 * AIInsights component
 * @param {object} props
 */
export default function AIInsights({
  insights = [],
  score = null,
  summary = '',
  loading = false,
  className = '',
}) {
  const colors = score != null ? SCORE_COLOR(score) : null;

  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(0,212,255,0.15)] bg-[#0D1628] p-5 ${className}`}>
        <div className="h-4 w-28 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 rounded bg-[#111D35] animate-pulse" style={{ width: `${70 + i * 8}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[rgba(0,212,255,0.15)] bg-[#0D1628] p-5 ${className}`}
      style={{ boxShadow: colors ? `0 0 24px ${colors.glow}` : undefined }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <h3 className="font-display text-xs tracking-widest text-[#7A9ABB] uppercase">
            AI Insights
          </h3>
        </div>
        {score != null && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#3D5A7A]">{colors.label}</span>
            <span
              className="font-display text-xl font-bold"
              style={{ color: colors.text }}
            >
              {score}
            </span>
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <p className="text-sm text-[#7A9ABB] mb-4 leading-relaxed border-l-2 border-[rgba(0,212,255,0.3)] pl-3">
          {summary}
        </p>
      )}

      {/* Insight list */}
      {insights.length === 0 ? (
        <p className="text-sm text-[#3D5A7A] italic">No insights available yet. Complete your plan to generate insights.</p>
      ) : (
        <ul className="space-y-2">
          {insights.map((insight, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-[#7A9ABB] leading-relaxed animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="mt-0.5 shrink-0 text-base leading-none">
                {insight.match(/^[\u{1F000}-\u{1FFFF}]/u) ? '' : INSIGHT_ICON(insight)}
              </span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
