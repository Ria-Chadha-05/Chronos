/**
 * RecoveryPlanCard.jsx
 *
 * Displays the recovery plan: tasks ranked into keep / defer / drop tiers.
 *
 * Props:
 *   keepList   {object[]}  Critical commitments to protect
 *   deferList  {object[]}  Important/optional tasks to move
 *   dropList   {object[]}  Droppable tasks
 *   loading    {boolean}   Show skeleton state
 *
 * Standalone — no context or store imports.
 */

import React, { useState } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  keep: {
    label:      'PROTECT',
    colour:     '#00D4FF',
    glow:       'rgba(0,212,255,0.2)',
    icon:       '🛡️',
    emptyMsg:   'No critical commitments today.',
    description: 'These cannot move — lock them in.',
  },
  defer: {
    label:      'DEFER',
    colour:     '#FF8C00',
    glow:       'rgba(255,140,0,0.2)',
    icon:       '📅',
    emptyMsg:   'Nothing to defer.',
    description: 'Push these to tomorrow or compress to MVP.',
  },
  drop: {
    label:      'DROP',
    colour:     '#FF3366',
    glow:       'rgba(255,51,102,0.2)',
    icon:       '🗑️',
    emptyMsg:   'Nothing to drop.',
    description: 'Let these go without guilt — they are the sacrifice.',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierSection({ tier, tasks, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cfg = TIER_CONFIG[tier];

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width:         '100%',
          border:        'none',
          cursor:        'pointer',
          padding:       '10px 14px',
          display:       'flex',
          alignItems:    'center',
          gap:           10,
          borderRadius:  10,
          borderLeft:    `3px solid ${cfg.colour}`,
          background:    `${cfg.colour}0A`,
          marginBottom:  expanded ? 8 : 0,
        }}
      >
        <span style={{ fontSize: 15 }}>{cfg.icon}</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{
            fontFamily:    'Orbitron, monospace',
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '0.18em',
            color:         cfg.colour,
          }}>
            {cfg.label} — {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   11,
            color:      'rgba(255,255,255,0.45)',
            marginTop:  2,
          }}>
            {cfg.description}
          </div>
        </div>
        <span style={{
          color:      cfg.colour,
          fontSize:   12,
          opacity:    0.7,
          transform:  expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s ease',
        }}>
          ▼
        </span>
      </button>

      {/* Task rows */}
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 6 }}>
          {tasks.length === 0 ? (
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   12,
              color:      'rgba(255,255,255,0.3)',
              padding:    '8px 14px',
              fontStyle:  'italic',
            }}>
              {cfg.emptyMsg}
            </div>
          ) : tasks.map(task => (
            <TaskRow key={task.id} task={task} colour={cfg.colour} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, colour }) {
  const title    = task.title ?? task.name ?? 'Untitled';
  const duration = task.effectiveDurationMinutes ?? task.durationMinutes ?? task.duration ?? 0;
  const source   = task.source ?? '';
  const type     = task.commitmentType ?? task.type ?? '';

  const sourceIcon = source.includes('calendar') ? '📅'
    : source.includes('gmail')                   ? '✉️'
    : type.includes('interview')                 ? '🤝'
    : type.includes('meeting')                   ? '📞'
    : type.includes('project')                   ? '📁'
    : '✔️';

  return (
    <div style={{
      display:       'flex',
      alignItems:    'flex-start',
      gap:           10,
      padding:       '10px 14px',
      background:    'rgba(255,255,255,0.025)',
      borderRadius:  8,
      border:        '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ fontSize: 13, marginTop: 1, flexShrink: 0 }}>{sourceIcon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      13,
          fontWeight:    500,
          color:         'rgba(255,255,255,0.9)',
          overflow:      'hidden',
          textOverflow:  'ellipsis',
          whiteSpace:    'nowrap',
        }}>
          {title}
        </div>
        {task.notes && (
          <div style={{
            fontFamily:   'Inter, sans-serif',
            fontSize:     11,
            color:        'rgba(255,255,255,0.4)',
            marginTop:    2,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {task.notes}
          </div>
        )}
      </div>
      {duration > 0 && (
        <span style={{
          fontFamily:    'JetBrains Mono, monospace',
          fontSize:      11,
          color:         colour,
          opacity:       0.7,
          flexShrink:    0,
          whiteSpace:    'nowrap',
        }}>
          {duration >= 60
            ? `${Math.round(duration / 60 * 10) / 10}h`
            : `${duration}m`}
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {{ keepList: object[], deferList: object[], dropList: object[],
 *            loading?: boolean }} props
 */
export function RecoveryPlanCard({ keepList = [], deferList = [], dropList = [], loading = false }) {
  if (loading) {
    return (
      <div style={cardStyle}>
        <CardHeader />
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height:       52,
            background:   'rgba(255,255,255,0.04)',
            borderRadius: 8,
            marginBottom: 8,
            animation:    'ff-pulse 1.5s ease-in-out infinite',
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <style>{`
        @keyframes ff-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <CardHeader />

      <TierSection tier="keep"  tasks={keepList}  defaultExpanded />
      <TierSection tier="defer" tasks={deferList} defaultExpanded />
      <TierSection tier="drop"  tasks={dropList}  defaultExpanded={false} />

      {/* Summary line */}
      <div style={{
        marginTop:     14,
        padding:       '10px 14px',
        background:    'rgba(0,212,255,0.04)',
        borderRadius:  8,
        border:        '1px solid rgba(0,212,255,0.12)',
        fontFamily:    'Inter, sans-serif',
        fontSize:      12,
        color:         'rgba(255,255,255,0.5)',
      }}>
        🛡️ {keepList.length} protected &nbsp;·&nbsp;
        📅 {deferList.length} deferred &nbsp;·&nbsp;
        🗑️ {dropList.length} dropped
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const cardStyle = {
  background:   'rgba(13,22,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18,
  padding:      22,
};

function CardHeader() {
  return (
    <div style={{
      fontFamily:    'Orbitron, monospace',
      fontSize:      11,
      fontWeight:    700,
      letterSpacing: '0.15em',
      color:         '#00D4FF',
      textTransform: 'uppercase',
      marginBottom:  18,
    }}>
      🗂 Recovery Plan
    </div>
  );
}
