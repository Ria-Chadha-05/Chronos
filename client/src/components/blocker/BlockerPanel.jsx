/**
 * BlockerPanel.jsx
 *
 * Top-level container for the Blocker Breaker subsystem.
 *
 * Orchestrates the full blocker view: runs the engine, renders
 * the summary header, tabs between views, and delegates to sub-cards.
 *
 * @prop {Array<object>} tasks        - All tasks (raw or pre-enriched).
 * @prop {string}        [userName=''] - User's name for reminder drafts.
 * @prop {boolean}       [loading=false] - Show skeleton state.
 * @prop {string}        [className='']  - Extra Tailwind classes.
 */

import React, { useState, useMemo } from 'react';
import { generateBlockerReport } from '../../services/blockerBreakerEngine.js';
import BlockerSummary    from './BlockerSummary.jsx';
import WaitingCard       from './WaitingCard.jsx';
import DependencyGraphCard from './DependencyGraphCard.jsx';
import DelayImpactCard   from './DelayImpactCard.jsx';
import SuggestionCard    from './SuggestionCard.jsx';
import ReminderDraftCard from './ReminderDraftCard.jsx';

const TABS = [
  { id: 'waiting',    label: 'Waiting',     emoji: '⏳' },
  { id: 'graph',      label: 'Graph',       emoji: '🔗' },
  { id: 'impact',     label: 'Impact',      emoji: '📉' },
  { id: 'actions',    label: 'Actions',     emoji: '💡' },
  { id: 'drafts',     label: 'Drafts',      emoji: '✉️' },
];

const SEVERITY_COLORS = {
  critical: { border: 'rgba(255,51,102,0.4)',  glow: 'rgba(255,51,102,0.15)', dot: '#FF3366', label: 'CRITICAL' },
  high:     { border: 'rgba(255,140,0,0.4)',   glow: 'rgba(255,140,0,0.12)',  dot: '#FF8C00', label: 'HIGH' },
  medium:   { border: 'rgba(0,212,255,0.25)',  glow: 'rgba(0,212,255,0.08)', dot: '#00D4FF', label: 'MEDIUM' },
  low:      { border: 'rgba(0,212,255,0.15)',  glow: 'transparent',           dot: '#3D5A7A', label: 'LOW' },
  none:     { border: 'rgba(0,255,136,0.2)',   glow: 'transparent',           dot: '#00FF88', label: 'CLEAR' },
};

/**
 * BlockerPanel component.
 * @param {object} props
 */
export default function BlockerPanel({
  tasks     = [],
  userName  = '',
  loading   = false,
  className = '',
}) {
  const [activeTab, setActiveTab] = useState('waiting');

  const report = useMemo(
    () => generateBlockerReport(tasks, { userName }),
    [tasks, userName]
  );

  const colors = SEVERITY_COLORS[report.overallSeverity] || SEVERITY_COLORS.none;

  if (loading) {
    return (
      <div className={`rounded-2xl border border-[rgba(0,212,255,0.15)] bg-[#0D1628] p-6 ${className}`}>
        <div className="h-5 w-48 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[#111D35] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border bg-[#0D1628] overflow-hidden ${className}`}
      style={{
        borderColor: colors.border,
        boxShadow: `0 0 32px ${colors.glow}`,
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🧱</span>
            <div>
              <h2 className="font-display text-xs tracking-widest text-[#7A9ABB] uppercase">
                Blocker Breaker
              </h2>
              <p className="text-[11px] text-[#3D5A7A] mt-0.5">
                {report.totalBlockedCount} blocked · {report.graph.edges.length} dependencies
              </p>
            </div>
          </div>

          {/* Severity badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-medium"
            style={{ borderColor: colors.border, color: colors.dot }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: colors.dot }}
            />
            {colors.label}
          </div>
        </div>

        {/* Summary bar */}
        <BlockerSummary report={report} />

        {/* Tabs */}
        <div className="flex gap-1 mt-4 -mx-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium transition-all"
                style={{
                  background: isActive ? '#111D35' : 'transparent',
                  color: isActive ? '#00D4FF' : '#3D5A7A',
                  borderBottom: isActive ? '2px solid #00D4FF' : '2px solid transparent',
                }}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                {tab.id === 'waiting' && report.totalBlockedCount > 0 && (
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: colors.dot, color: '#050A14' }}
                  >
                    {report.totalBlockedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      <div className="bg-[#111D35] px-6 py-5 min-h-[240px]">
        {activeTab === 'waiting' && (
          <div className="space-y-3">
            {report.blockedTasks.length === 0 ? (
              <EmptyState icon="✅" text="No blocked tasks. Your work is flowing freely." />
            ) : (
              report.blockedTasks.map((task) => (
                <WaitingCard key={task.id} task={task} />
              ))
            )}
          </div>
        )}

        {activeTab === 'graph' && (
          <DependencyGraphCard graph={report.graph} />
        )}

        {activeTab === 'impact' && (
          <div className="space-y-3">
            {report.delayImpacts.length === 0 ? (
              <EmptyState icon="📊" text="No delay impact data available." />
            ) : (
              report.delayImpacts.map((item) => (
                <DelayImpactCard key={item.taskId} data={item} />
              ))
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-3">
            {report.suggestions.length === 0 ? (
              <EmptyState icon="💡" text="No suggestions available." />
            ) : (
              report.suggestions.map((item) => (
                <SuggestionCard key={item.taskId} data={item} />
              ))
            )}
          </div>
        )}

        {activeTab === 'drafts' && (
          <div className="space-y-3">
            {report.blockedTasks.filter((t) => t._blocker?.contactRole).length === 0 ? (
              <EmptyState icon="✉️" text="No tasks with identified contacts for drafting." />
            ) : (
              report.blockedTasks
                .filter((t) => t._blocker?.contactRole)
                .slice(0, 4)
                .map((task) => (
                  <ReminderDraftCard
                    key={task.id}
                    task={task}
                    userName={userName}
                  />
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Small inline empty state helper (not exported) */
function EmptyState({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-3xl mb-3">{icon}</span>
      <p className="text-sm text-[#3D5A7A]">{text}</p>
    </div>
  );
}
