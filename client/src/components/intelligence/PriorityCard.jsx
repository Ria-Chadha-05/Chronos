/**
 * PriorityCard.jsx
 *
 * Renders the ordered priority list from the Executive Report plus
 * planner actions from the ChronosReport. Purely presentational.
 */

import React, { useState } from 'react';
import { Card, CardHeader, Button } from '../ui/index.jsx';

// ─── Config ───────────────────────────────────────────────────────────────────

const URGENCY_COLORS = {
  critical: { color: 'var(--red)',   dot: '#FF3366', bg: 'rgba(255,51,102,0.08)' },
  high:     { color: 'var(--red)',   dot: '#FF6688', bg: 'rgba(255,51,102,0.05)' },
  medium:   { color: 'var(--amber)', dot: '#FF8C00', bg: 'rgba(255,140,0,0.05)'  },
  low:      { color: 'var(--cyan)',  dot: '#00D4FF', bg: 'rgba(0,212,255,0.05)'  },
  normal:   { color: 'var(--green)', dot: '#00FF88', bg: 'rgba(0,255,136,0.05)'  },
};

const PLANNER_ACTION_CONFIG = {
  PROTECT:       { icon: '✔', color: 'var(--green)',  label: 'Protected'    },
  KEEP:          { icon: '✔', color: 'var(--cyan)',   label: 'Keep'         },
  MOVE:          { icon: '↻', color: 'var(--amber)',  label: 'Move'         },
  POSTPONE:      { icon: '⏸', color: 'var(--purple)', label: 'Postpone'    },
  BREAK:         { icon: '☕', color: 'var(--amber)',  label: 'Break'        },
  FOCUS_BLOCK:   { icon: '◈', color: 'var(--cyan)',   label: 'Focus Block'  },
  WAIT:          { icon: '⏳', color: 'var(--amber)',  label: 'Wait'         },
  SEND_REMINDER: { icon: '📧', color: 'var(--cyan)',   label: 'Reminder'    },
  SWITCH_TASK:   { icon: '🔀', color: 'var(--purple)', label: 'Switch'      },
  PARALLEL_WORK: { icon: '⚡', color: 'var(--green)',  label: 'Parallel'    },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExecutivePriorityRow({ priority }) {
  const u = URGENCY_COLORS[priority.urgency] || URGENCY_COLORS.normal;

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: '12px 14px',
      background: u.bg,
      border: '1px solid var(--border)',
      borderRadius: 11,
    }}>
      {/* Rank bubble */}
      <div style={{
        minWidth: 28,
        height: 28,
        borderRadius: '50%',
        background: `${u.dot}22`,
        border: `1px solid ${u.dot}66`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: 11, fontWeight: 900, color: u.color }}>
          {priority.rank}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3 }}>
            {priority.title}
          </div>
          {priority.actionable && (
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--green)',
              border: '1px solid rgba(0,255,136,0.3)', borderRadius: 4,
              padding: '1px 5px', flexShrink: 0, textTransform: 'uppercase',
            }}>
              Actionable
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.45 }}>{priority.reason}</div>
        <div style={{ marginTop: 5, fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)', textTransform: 'uppercase' }}>
          {priority.engine}
        </div>
      </div>
    </div>
  );
}

function PlannerActionRow({ action }) {
  const cfg = PLANNER_ACTION_CONFIG[action.type] || { icon: '•', color: 'var(--text)', label: action.type };
  return (
    <div style={{
      padding: '9px 12px',
      background: 'rgba(8,15,30,0.70)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      display: 'grid',
      gap: 3,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: 12, color: cfg.color }}>{cfg.icon}</span>
        <span style={{
          fontFamily: 'Orbitron', fontSize: 9, fontWeight: 800, color: cfg.color,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, flexGrow: 1 }}>{action.title}</span>
        {action.suggestedTime && (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {action.suggestedTime}
          </span>
        )}
      </div>
      {action.explanation && (
        <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4, paddingLeft: 22 }}>
          {action.explanation}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PriorityCard({ executiveReport, chronosReport, onAskAI }) {
  const [tab, setTab] = useState('executive'); // 'executive' | 'planner'
  const [showAll, setShowAll] = useState(false);

  const priorities   = executiveReport?.priorities ?? [];
  const plannerActions = chronosReport?.plannerReport?.actions ?? [];
  const todayCount   = chronosReport?.meta?.todayCommitmentCount ?? 0;

  const visiblePriorities = showAll ? priorities : priorities.slice(0, 5);

  const tabStyle = (active) => ({
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: active ? 'var(--cyan)' : 'var(--muted)',
    background: active ? 'rgba(0,212,255,0.10)' : 'transparent',
    border: `1px solid ${active ? 'rgba(0,212,255,0.3)' : 'var(--border)'}`,
    borderRadius: 6,
    padding: '4px 10px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  });

  return (
    <Card>
      <CardHeader title="✦ Daily Priorities">
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={tabStyle(tab === 'executive')} onClick={() => setTab('executive')}>
            Executive ({priorities.length})
          </button>
          <button style={tabStyle(tab === 'planner')} onClick={() => setTab('planner')}>
            Planner ({plannerActions.length})
          </button>
        </div>
      </CardHeader>

      {tab === 'executive' && (
        <>
          {priorities.length === 0 ? (
            <div style={{
              padding: 18,
              background: 'rgba(0,255,136,0.06)',
              border: '1px solid rgba(0,255,136,0.22)',
              borderRadius: 14,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {todayCount === 0
                  ? 'No commitments today — a good day to plan ahead.'
                  : 'No priority actions required. Schedule looks healthy.'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gap: 8 }}>
                {visiblePriorities.map(p => (
                  <ExecutivePriorityRow key={p.rank} priority={p} />
                ))}
              </div>
              {priorities.length > 5 && (
                <button
                  onClick={() => setShowAll(s => !s)}
                  style={{
                    marginTop: 10, background: 'none', border: 'none',
                    fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)',
                    cursor: 'pointer', textDecoration: 'underline', padding: 0,
                  }}
                >
                  {showAll ? 'Show less' : `+${priorities.length - 5} more`}
                </button>
              )}
            </>
          )}
        </>
      )}

      {tab === 'planner' && (
        <>
          {plannerActions.length === 0 ? (
            <div style={{
              padding: 18,
              background: 'rgba(0,255,136,0.06)',
              border: '1px solid rgba(0,255,136,0.22)',
              borderRadius: 14,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>No planner actions. Generate a plan first.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 7 }}>
              {plannerActions.map(action => (
                <PlannerActionRow key={action.id} action={action} />
              ))}
            </div>
          )}
        </>
      )}

      {onAskAI && (
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => onAskAI('What can I postpone today?')}>
            What can I postpone? →
          </Button>
        </div>
      )}
    </Card>
  );
}
