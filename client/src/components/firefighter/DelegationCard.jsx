/**
 * DelegationCard.jsx
 *
 * Displays delegation suggestions produced by suggestDelegation().
 * Each suggestion shows the task, strategy type, reasoning, and suggested action.
 *
 * Props:
 *   delegations {object[]}  Output of suggestDelegation()
 *   loading     {boolean}   Skeleton state
 *
 * Standalone — no context or store imports.
 */

import React, { useState } from 'react';

// ─── Strategy config ──────────────────────────────────────────────────────────

const STRATEGY_CONFIG = {
  delegate: {
    label:  'Delegate',
    colour: '#9B59FF',
    icon:   '🤝',
  },
  pair_work: {
    label:  'Pair Work',
    colour: '#00D4FF',
    icon:   '👥',
  },
  ask_teammate: {
    label:  'Ask Teammate',
    colour: '#00FF88',
    icon:   '💬',
  },
  postpone: {
    label:  'Postpone',
    colour: '#FF8C00',
    icon:   '📅',
  },
  reduce_scope: {
    label:  'Reduce Scope',
    colour: '#FF8C00',
    icon:   '✂️',
  },
};

const PRIORITY_COLOURS = {
  critical:  '#FF3366',
  important: '#FF8C00',
  optional:  '#00D4FF',
  droppable: '#7A9ABB',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StrategyBadge({ strategy }) {
  const cfg    = STRATEGY_CONFIG[strategy] ?? { label: strategy, colour: '#7A9ABB', icon: '⚙️' };
  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           5,
      fontFamily:    'Orbitron, monospace',
      fontSize:      9,
      fontWeight:    700,
      letterSpacing: '0.12em',
      color:         cfg.colour,
      background:    `${cfg.colour}14`,
      border:        `1px solid ${cfg.colour}30`,
      borderRadius:  5,
      padding:       '3px 8px',
      textTransform: 'uppercase',
      flexShrink:    0,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function DelegationRow({ item }) {
  const [expanded, setExpanded] = useState(false);
  const cfg    = STRATEGY_CONFIG[item.strategy] ?? { colour: '#7A9ABB', icon: '⚙️' };
  const title  = item.commitment?.title ?? item.commitment?.name ?? 'Task';
  const pColour = PRIORITY_COLOURS[item.priority] ?? '#7A9ABB';

  return (
    <div style={{
      borderRadius:  10,
      border:        `1px solid rgba(255,255,255,0.07)`,
      overflow:      'hidden',
      marginBottom:  8,
    }}>
      {/* Row header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width:      '100%',
          background: expanded ? 'rgba(255,255,255,0.04)' : 'transparent',
          border:     'none',
          cursor:     'pointer',
          padding:    '12px 14px',
          display:    'flex',
          alignItems: 'center',
          gap:        10,
          textAlign:  'left',
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily:   'Inter, sans-serif',
            fontSize:     13,
            fontWeight:   500,
            color:        'rgba(255,255,255,0.88)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <StrategyBadge strategy={item.strategy} />
            <span style={{
              fontFamily:    'Orbitron, monospace',
              fontSize:      8,
              fontWeight:    700,
              letterSpacing: '0.1em',
              color:         pColour,
              textTransform: 'uppercase',
            }}>
              {item.priority}
            </span>
          </div>
        </div>
        <span style={{
          color:      'rgba(255,255,255,0.3)',
          fontSize:   11,
          transform:  expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
        }}>
          ▼
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding:    '10px 14px 14px',
          borderTop:  '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.025)',
        }}>
          <DetailRow label="Why" text={item.reasoning} colour={cfg.colour} />
          <DetailRow label="Action" text={item.suggestedAction} colour={cfg.colour} />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, text, colour }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontFamily:    'Orbitron, monospace',
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: '0.14em',
        color:         colour,
        textTransform: 'uppercase',
        marginBottom:  4,
        opacity:       0.8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Inter, sans-serif',
        fontSize:   12,
        color:      'rgba(255,255,255,0.7)',
        lineHeight: 1.55,
      }}>
        {text}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {{ delegations: object[], loading?: boolean }} props
 */
export function DelegationCard({ delegations = [], loading = false }) {
  if (loading) {
    return (
      <div style={cardStyle}>
        <Header />
        {[1, 2].map(i => (
          <div key={i} style={{
            height:       56,
            background:   'rgba(255,255,255,0.04)',
            borderRadius: 8,
            marginBottom: 8,
          }} />
        ))}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <Header count={delegations.length} />

      {delegations.length === 0 ? (
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   13,
          color:      'rgba(255,255,255,0.3)',
          padding:    '14px 0',
          fontStyle:  'italic',
          textAlign:  'center',
        }}>
          No delegatable tasks identified for today.
        </div>
      ) : (
        delegations.map((item, idx) => (
          <DelegationRow key={item.commitment?.id ?? idx} item={item} />
        ))
      )}
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

const cardStyle = {
  background:   'rgba(13,22,40,0.95)',
  border:       '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18,
  padding:      22,
};

function Header({ count }) {
  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      justifyContent: 'space-between',
      marginBottom:  18,
    }}>
      <div style={{
        fontFamily:    'Orbitron, monospace',
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: '0.15em',
        color:         '#9B59FF',
        textTransform: 'uppercase',
      }}>
        🤝 Delegation Options
      </div>
      {count !== undefined && count > 0 && (
        <span style={{
          fontFamily:    'Orbitron, monospace',
          fontSize:      10,
          fontWeight:    700,
          color:         '#9B59FF',
          background:    'rgba(155,89,255,0.12)',
          border:        '1px solid rgba(155,89,255,0.3)',
          borderRadius:  20,
          padding:       '2px 10px',
        }}>
          {count} available
        </span>
      )}
    </div>
  );
}
