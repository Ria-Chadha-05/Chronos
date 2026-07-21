/**
 * PlannerSummary.jsx
 *
 * Renders a list of planner actions taken by Chronos with
 * natural-language explanations from the Explanation Engine.
 *
 * @prop {object[]} actions - Array of PlannerAction objects.
 * @prop {object} [explanations] - Output of explainPlannerActions().
 * @prop {boolean} [compact=false] - Show condensed list.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React, { useState } from 'react';

const ACTION_STYLES = {
  KEEP:        { icon: '✅', color: '#00FF88', bg: 'rgba(0,255,136,0.08)',  label: 'Kept' },
  MOVE:        { icon: '🔄', color: '#00D4FF', bg: 'rgba(0,212,255,0.08)',  label: 'Moved' },
  POSTPONE:    { icon: '⏩', color: '#FF8C00', bg: 'rgba(255,140,0,0.08)',  label: 'Postponed' },
  PROTECT:     { icon: '🛡️', color: '#9B59FF', bg: 'rgba(155,89,255,0.08)', label: 'Protected' },
  BREAK:       { icon: '🧩', color: '#00D4FF', bg: 'rgba(0,212,255,0.08)',  label: 'Split' },
  FOCUS_BLOCK:   { icon: '🎯', color: '#00FF88', bg: 'rgba(0,255,136,0.08)', label: 'Focus Block' },
  WAIT:          { icon: '⏳', color: '#FF8C00', bg: 'rgba(255,140,0,0.08)',  label: 'Waiting' },
  SEND_REMINDER: { icon: '📧', color: '#00D4FF', bg: 'rgba(0,212,255,0.08)',  label: 'Reminder' },
  SWITCH_TASK:   { icon: '🔀', color: '#9B59FF', bg: 'rgba(155,89,255,0.08)', label: 'Switch' },
  PARALLEL_WORK: { icon: '⚡', color: '#00FF88', bg: 'rgba(0,255,136,0.08)', label: 'Parallel' },
  UNKNOWN:     { icon: 'ℹ️', color: '#7A9ABB', bg: 'rgba(122,154,187,0.06)', label: 'Action' },
};

function ActionRow({ action, line }) {
  const style = ACTION_STYLES[action.type] ?? ACTION_STYLES.UNKNOWN;
  return (
    <div
      className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm"
      style={{ background: style.bg }}
    >
      <span className="mt-0.5 shrink-0 text-base leading-none">{style.icon}</span>
      <div className="flex-1 min-w-0">
        <span className="font-medium" style={{ color: style.color }}>{style.label}</span>
        <span className="text-[#7A9ABB] ml-1">{line ?? action.explanation ?? action.title ?? ''}</span>
      </div>
    </div>
  );
}

/**
 * PlannerSummary component.
 * @param {object} props
 */
export default function PlannerSummary({
  actions = [],
  explanations = null,
  compact = false,
  loading = false,
  className = '',
}) {
  const [showAll, setShowAll] = useState(false);

  const actionLines = explanations?.actionLines ?? [];
  const visible = compact && !showAll ? actions.slice(0, 3) : actions;

  const typeCount = actions.reduce((acc, a) => {
    const t = a.type ?? 'UNKNOWN';
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#0D1628] p-5 ${className}`}>
        <div className="h-3 w-28 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-9 rounded-lg bg-[#111D35] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[rgba(0,212,255,0.15)] bg-[#0D1628] p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-display text-xs tracking-widest text-[#7A9ABB] uppercase">
            Planner Actions
          </h3>
        </div>
        <span className="font-mono text-xs text-[#3D5A7A]">{actions.length} total</span>
      </div>

      {/* Summary chips */}
      {Object.entries(typeCount).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(typeCount).map(([type, count]) => {
            const s = ACTION_STYLES[type] ?? ACTION_STYLES.UNKNOWN;
            return (
              <span
                key={type}
                className="px-2 py-0.5 rounded-full font-mono text-xs"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}33` }}
              >
                {s.label} ×{count}
              </span>
            );
          })}
        </div>
      )}

      {/* Summary line */}
      {explanations?.summary && (
        <p className="text-xs text-[#7A9ABB] mb-3">{explanations.summary}</p>
      )}

      {/* Action list */}
      {actions.length === 0 ? (
        <p className="text-sm text-[#3D5A7A] italic text-center py-3">No planner actions yet.</p>
      ) : (
        <div className="space-y-1.5">
          {visible.map((action, i) => (
            <ActionRow key={action.id ?? i} action={action} line={actionLines[i]} />
          ))}
          {compact && actions.length > 3 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-xs text-[#00D4FF] hover:text-white transition-colors mt-1 pl-1"
            >
              {showAll ? 'Show less' : `+${actions.length - 3} more actions`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
