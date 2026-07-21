/**
 * RecommendationCard.jsx
 *
 * Renders the final recommendation (Accept / Reject / Reschedule / etc.)
 * with its reasoning and confidence.
 *
 * @prop {object} recommendation - Output of generateRecommendation(): { action, reason, confidence }.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

const ACTION_COLOR = {
  Accept: '#00FF88',
  Proceed: '#00FF88',
  Reject: '#FF3366',
  Avoid: '#FF3366',
  Reschedule: '#00D4FF',
  'Delay another task': '#00D4FF',
  'Split work': '#FF8C00',
  'Compress work': '#FF8C00',
  Delegate: '#9B59FF',
};

const ACTION_ICON = {
  Accept: '✅',
  Proceed: '✅',
  Reject: '⛔',
  Avoid: '⛔',
  Reschedule: '🔄',
  'Delay another task': '⏳',
  'Split work': '✂️',
  'Compress work': '🗜️',
  Delegate: '🤝',
};

export default function RecommendationCard({ recommendation = null, loading = false, className = '' }) {
  if (loading || !recommendation) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-5 ${className}`}>
        <div className="h-3 w-28 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="h-12 rounded bg-[#111D35] animate-pulse" />
      </div>
    );
  }

  const { action, reason, confidence } = recommendation;
  const color = ACTION_COLOR[action] ?? '#7A9ABB';
  const icon = ACTION_ICON[action] ?? '💡';

  return (
    <div
      className={`rounded-xl border bg-[#0D1628] p-5 space-y-3 ${className}`}
      style={{ borderColor: `${color}33`, boxShadow: `inset 0 0 24px ${color}1A` }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[10px] tracking-widest uppercase text-[#7A9ABB]">🧭 Recommendation</h3>
        {typeof confidence === 'number' && (
          <span className="text-xs font-mono text-[#3D5A7A]">{Math.round(confidence * 100)}% confidence</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{icon}</span>
        <span className="font-display text-xl font-bold" style={{ color }}>{action}</span>
      </div>

      <p className="text-sm text-[#7A9ABB] leading-relaxed border-l-2 pl-3" style={{ borderColor: `${color}55` }}>
        {reason}
      </p>
    </div>
  );
}
