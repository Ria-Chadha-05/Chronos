/**
 * ProductivityCard.jsx
 *
 * Displays the productivity score with grade, score breakdown bars,
 * and streak information.
 *
 * @prop {number} score - 0–100 productivity score.
 * @prop {string} grade - 'S'|'A'|'B'|'C'|'D'|'F'
 * @prop {object} [breakdown] - { completionScore, focusScore, capacityScore, realityScore }
 * @prop {object} [streaks] - Output of calculateAllStreaks() or subset.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

const GRADE_CONFIG = {
  S: { color: '#00FF88', label: 'Perfect',    bg: 'rgba(0,255,136,0.12)'  },
  A: { color: '#00D4FF', label: 'Excellent',  bg: 'rgba(0,212,255,0.12)'  },
  B: { color: '#9B59FF', label: 'Good',       bg: 'rgba(155,89,255,0.12)' },
  C: { color: '#FF8C00', label: 'Fair',       bg: 'rgba(255,140,0,0.12)'  },
  D: { color: '#FF3366', label: 'Low',        bg: 'rgba(255,51,102,0.12)' },
  F: { color: '#FF3366', label: 'Critical',   bg: 'rgba(255,51,102,0.12)' },
};

function BreakdownBar({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#7A9ABB]">{label}</span>
        <span className="font-mono" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="h-1 rounded-full bg-[#111D35] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function StreakPill({ label, current, icon }) {
  if (current == null || current === 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111D35] border border-[rgba(255,255,255,0.05)]">
      <span className="text-sm">{icon}</span>
      <span className="font-mono text-xs text-[#00D4FF]">{current}</span>
      <span className="text-xs text-[#3D5A7A]">{label}</span>
    </div>
  );
}

/**
 * ProductivityCard component.
 * @param {object} props
 */
export default function ProductivityCard({
  score = 0,
  grade = 'C',
  breakdown = null,
  streaks = null,
  loading = false,
  className = '',
}) {
  const cfg = GRADE_CONFIG[grade] ?? GRADE_CONFIG.C;

  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-5 ${className}`}>
        <div className="flex gap-4 mb-4">
          <div className="h-14 w-14 rounded-lg bg-[#111D35] animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 rounded bg-[#111D35] animate-pulse" />
            <div className="h-5 w-32 rounded bg-[#111D35] animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 rounded bg-[#111D35] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border bg-[#0D1628] p-5 space-y-4 ${className}`}
      style={{ borderColor: `${cfg.color}33`, boxShadow: `inset 0 0 24px ${cfg.bg}` }}
    >
      {/* Score + Grade */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 font-display text-2xl font-bold"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44` }}
        >
          {grade}
        </div>
        <div>
          <p className="font-display text-[10px] tracking-widest text-[#7A9ABB] uppercase mb-1">
            Productivity Score
          </p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold" style={{ color: cfg.color }}>{score}</span>
            <span className="text-sm text-[#3D5A7A]">/ 100</span>
            <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1.5 rounded-full bg-[#111D35] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: cfg.color }}
        />
      </div>

      {/* Breakdown */}
      {breakdown && (
        <div className="space-y-2.5 pt-1">
          <BreakdownBar label="Completion"   value={breakdown.completionScore}  max={35} color="#00FF88" />
          <BreakdownBar label="Focus Time"   value={breakdown.focusScore}       max={25} color="#00D4FF" />
          <BreakdownBar label="Capacity"     value={breakdown.capacityScore}    max={20} color="#9B59FF" />
          <BreakdownBar label="Reality Gap"  value={breakdown.realityScore}     max={20} color="#FF8C00" />
        </div>
      )}

      {/* Active streaks */}
      {streaks && (
        <div className="pt-1">
          <p className="font-display text-[10px] tracking-widest text-[#3D5A7A] uppercase mb-2">Active Streaks</p>
          <div className="flex flex-wrap gap-1.5">
            <StreakPill icon="📋" label="day plan"   current={streaks.planning?.currentStreak} />
            <StreakPill icon="🎯" label="deep work"  current={streaks.deepWork?.currentStreak} />
            <StreakPill icon="📚" label="study"      current={streaks.study?.currentStreak} />
            <StreakPill icon="💪" label="workout"    current={streaks.workout?.currentStreak} />
            <StreakPill icon="✅" label="tasks"      current={streaks.taskCompletion?.currentStreak} />
          </div>
        </div>
      )}
    </div>
  );
}
