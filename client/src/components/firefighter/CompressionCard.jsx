/**
 * CompressionCard.jsx
 *
 * Displays minimum-viable compression suggestions from suggestCompression().
 * Each row shows the original task and the compressed alternative.
 *
 * Props:
 *   compressions {object[]}  Output of suggestCompression()
 *   loading      {boolean}   Skeleton state
 *
 * Standalone — no context or store imports.
 */

import React, { useState } from 'react';

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeasibleBadge({ feasible }) {
  const colour = feasible ? '#00FF88' : '#FF8C00';
  const label  = feasible ? 'Fits Today' : 'Tight';
  return (
    <span style={{
      fontFamily:    'Orbitron, monospace',
      fontSize:      8,
      fontWeight:    700,
      letterSpacing: '0.12em',
      color:         colour,
      background:    `${colour}12`,
      border:        `1px solid ${colour}25`,
      borderRadius:  4,
      padding:       '2px 7px',
      textTransform: 'uppercase',
      flexShrink:    0,
    }}>
      {label}
    </span>
  );
}

function TimeSavingBar({ saved, total }) {
  const pct = total > 0 ? Math.min((saved / total) * 100, 100) : 0;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   4,
      }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
          Time saving
        </span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#00FF88' }}>
          −{saved}m
        </span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
        <div style={{
          height:      3,
          width:       `${pct}%`,
          background:  'linear-gradient(90deg, #00D4FF, #00FF88)',
          borderRadius: 3,
          transition:  'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

function CompressionRow({ item }) {
  const [expanded, setExpanded] = useState(false);

  const title    = item.commitment?.title ?? item.commitment?.name ?? 'Task';
  const duration = item.commitment
    ? (item.commitment.effectiveDurationMinutes ?? item.commitment.durationMinutes ?? 0)
    : 0;

  return (
    <div style={{
      borderRadius: 10,
      border:       '1px solid rgba(255,255,255,0.07)',
      overflow:     'hidden',
      marginBottom: 8,
      background:   expanded ? 'rgba(255,255,255,0.02)' : 'transparent',
      transition:   'background 0.2s ease',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width:      '100%',
          background: 'transparent',
          border:     'none',
          cursor:     'pointer',
          padding:    '12px 14px',
          display:    'flex',
          alignItems: 'center',
          gap:        10,
          textAlign:  'left',
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>✂️</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize:   10,
              color:      'rgba(255,255,255,0.4)',
              textDecoration: 'line-through',
            }}>
              {duration}m
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>→</span>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize:   10,
              color:      '#00FF88',
              fontWeight: 600,
            }}>
              {item.compressedMinutes}m
            </span>
            <FeasibleBadge feasible={item.feasible} />
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

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* MVP description */}
          <div style={{ marginTop: 10 }}>
            <div style={{
              fontFamily:    'Orbitron, monospace',
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.14em',
              color:         '#00D4FF',
              textTransform: 'uppercase',
              marginBottom:  6,
              opacity:       0.8,
            }}>
              MVP Alternative
            </div>
            <div style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      12,
              color:         'rgba(255,255,255,0.75)',
              lineHeight:    1.6,
              padding:       '10px 12px',
              background:    'rgba(0,212,255,0.05)',
              borderRadius:  7,
              border:        '1px solid rgba(0,212,255,0.12)',
              borderLeft:    '3px solid #00D4FF',
            }}>
              {item.compressed}
            </div>
          </div>

          <TimeSavingBar saved={item.timeSavedMinutes} total={duration} />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {{ compressions: object[], loading?: boolean }} props
 */
export function CompressionCard({ compressions = [], loading = false }) {
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

  const totalSaved = compressions.reduce((s, c) => s + (c.timeSavedMinutes ?? 0), 0);

  return (
    <div style={cardStyle}>
      <Header count={compressions.length} totalSaved={totalSaved} />

      {compressions.length === 0 ? (
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   13,
          color:      'rgba(255,255,255,0.3)',
          padding:    '14px 0',
          fontStyle:  'italic',
          textAlign:  'center',
        }}>
          No tasks need compression — all fit within available time.
        </div>
      ) : (
        compressions.map((item, idx) => (
          <CompressionRow key={item.commitment?.id ?? idx} item={item} />
        ))
      )}

      {totalSaved > 0 && (
        <div style={{
          marginTop:   12,
          padding:     '10px 14px',
          background:  'rgba(0,255,136,0.05)',
          borderRadius: 8,
          border:      '1px solid rgba(0,255,136,0.12)',
          fontFamily:  'Inter, sans-serif',
          fontSize:    12,
          color:       '#00FF88',
          textAlign:   'center',
        }}>
          ⚡ Applying all compressions saves <strong>{totalSaved}m</strong> today
        </div>
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

function Header({ count, totalSaved }) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      marginBottom:   18,
    }}>
      <div style={{
        fontFamily:    'Orbitron, monospace',
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: '0.15em',
        color:         '#00D4FF',
        textTransform: 'uppercase',
      }}>
        ✂️ Task Compression
      </div>
      {count !== undefined && count > 0 && (
        <span style={{
          fontFamily:    'JetBrains Mono, monospace',
          fontSize:      10,
          color:         '#00FF88',
          background:    'rgba(0,255,136,0.08)',
          border:        '1px solid rgba(0,255,136,0.2)',
          borderRadius:  20,
          padding:       '2px 10px',
        }}>
          saves ~{totalSaved}m
        </span>
      )}
    </div>
  );
}
