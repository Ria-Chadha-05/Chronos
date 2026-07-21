/**
 * SuggestionCard.jsx
 *
 * Renders AI-generated unblock suggestions for a single blocked task.
 * Shows the primary suggestion prominently and lists alternatives below.
 *
 * @prop {object} data        - One item from report.suggestions:
 *                              { taskId, taskTitle, suggestions, primarySuggestion, summary }
 * @prop {string} [className=''] - Extra Tailwind classes.
 */

import React, { useState } from 'react';

const ACTION_META = {
  send_reminder:        { emoji: '📩', color: '#00D4FF' },
  escalate:             { emoji: '🚨', color: '#FF3366' },
  ask_teammate:         { emoji: '👥', color: '#9B59FF' },
  split_task:           { emoji: '✂️',  color: '#00D4FF' },
  start_parallel:       { emoji: '⚡', color: '#00FF88' },
  prepare_prerequisites:{ emoji: '📋', color: '#FF8C00' },
  wait:                 { emoji: '⏳', color: '#3D5A7A' },
  cancel:               { emoji: '🗑️',  color: '#3D5A7A' },
  reduce_scope:         { emoji: '📉', color: '#FF8C00' },
  schedule_meeting:     { emoji: '📅', color: '#9B59FF' },
  find_alternative:     { emoji: '🔍', color: '#00D4FF' },
};

const EFFORT_BADGE = {
  low:    { label: 'Low effort',    color: '#00FF88' },
  medium: { label: 'Medium effort', color: '#FF8C00' },
  high:   { label: 'High effort',   color: '#FF3366' },
};

/**
 * SuggestionCard component.
 * @param {object} props
 */
export default function SuggestionCard({ data = {}, className = '' }) {
  const [showAll, setShowAll] = useState(false);

  const {
    taskTitle         = 'Unknown task',
    suggestions       = [],
    primarySuggestion = null,
  } = data;

  if (!primarySuggestion && suggestions.length === 0) {
    return (
      <div className={`rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#080F1E] px-4 py-3 ${className}`}>
        <p className="text-xs text-[#3D5A7A]">No suggestions available for this task.</p>
      </div>
    );
  }

  const primary = primarySuggestion || suggestions[0];
  const rest    = suggestions.slice(1);
  const meta    = ACTION_META[primary.action] || { emoji: '💡', color: '#00D4FF' };
  const effort  = EFFORT_BADGE[primary.effort] || EFFORT_BADGE.medium;

  return (
    <div
      className={`rounded-xl border border-[rgba(0,212,255,0.12)] overflow-hidden ${className}`}
    >
      {/* Task label */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[11px] uppercase tracking-wider text-[#3D5A7A]">
          {taskTitle}
        </p>
      </div>

      {/* Primary suggestion */}
      <div
        className="mx-4 mb-3 rounded-lg border px-4 py-3"
        style={{
          borderColor: `${meta.color}44`,
          background: `${meta.color}0D`,
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0 mt-0.5">{meta.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className="text-sm font-semibold"
                style={{ color: meta.color }}
              >
                {primary.label}
              </span>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ color: effort.color, background: `${effort.color}18` }}
              >
                {effort.label}
              </span>
            </div>
            <p className="text-xs text-[#7A9ABB] leading-relaxed">
              {primary.reasoning}
            </p>
          </div>
        </div>
      </div>

      {/* Alternative suggestions */}
      {rest.length > 0 && (
        <div className="px-4 pb-3">
          <button
            className="text-[11px] text-[#3D5A7A] hover:text-[#00D4FF] transition-colors mb-2"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? '▾ Hide alternatives' : `▸ ${rest.length} alternative${rest.length !== 1 ? 's' : ''}`}
          </button>

          {showAll && (
            <div className="space-y-2">
              {rest.map((s, i) => {
                const m = ACTION_META[s.action] || { emoji: '💡', color: '#3D5A7A' };
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-[rgba(0,212,255,0.08)] bg-[rgba(0,212,255,0.03)] px-3 py-2"
                  >
                    <span className="text-base shrink-0">{m.emoji}</span>
                    <div>
                      <p className="text-xs font-medium text-[#7A9ABB]">{s.label}</p>
                      <p className="text-[11px] text-[#3D5A7A] mt-0.5 leading-relaxed">
                        {s.reasoning}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
