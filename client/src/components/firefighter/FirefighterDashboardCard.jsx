/**
 * FirefighterDashboardCard.jsx
 *
 * Compact Firefighter Mode summary card for the Dashboard grid.
 * Shows emergency score, severity, and top-3 recovery actions.
 * Links out to full FirefighterPanel via a callback.
 *
 * Props:
 *   report      {object}    Output of generateFirefighterReport()
 *   onExpand    {function}  Optional — called when "View Full Report" is clicked
 */

import React from 'react';

// ─── Severity colour map ──────────────────────────────────────────────────────

const SEV_STYLES = {
  normal:   { color: 'var(--green)',  border: 'rgba(0,255,136,0.24)',  bg: 'rgba(0,255,136,0.07)'  },
  low:      { color: 'var(--green)',  border: 'rgba(0,255,136,0.24)',  bg: 'rgba(0,255,136,0.07)'  },
  moderate: { color: 'var(--amber)',  border: 'rgba(255,140,0,0.24)',  bg: 'rgba(255,140,0,0.07)'  },
  high:     { color: 'var(--red)',    border: 'rgba(255,51,102,0.24)', bg: 'rgba(255,51,102,0.08)' },
  critical: { color: 'var(--red)',    border: 'rgba(255,51,102,0.34)', bg: 'rgba(255,51,102,0.12)' },
};

function resolveStyle(report) {
  const level = report?.severity?.level ?? report?.emergencyScore?.level ?? 'normal';
  return SEV_STYLES[level] ?? SEV_STYLES.normal;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Metric({ label, value, accent = 'var(--cyan)' }) {
  return (
    <div style={{
      padding:    '9px 11px',
      background: 'rgba(8,15,30,0.78)',
      border:     '1px solid var(--border)',
      borderRadius: 9,
      textAlign:  'center',
    }}>
      <div style={{
        fontFamily:    'Orbitron, monospace',
        fontSize:      18,
        fontWeight:    900,
        color:         accent,
        lineHeight:    1,
        marginBottom:  3,
      }}>{value}</div>
      <div style={{
        fontFamily:    'JetBrains Mono, monospace',
        fontSize:      7,
        color:         'var(--muted)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>{label}</div>
    </div>
  );
}

function RecoveryItem({ item }) {
  return (
    <div style={{
      padding:      '9px 11px',
      background:   'rgba(8,15,30,0.78)',
      border:       '1px solid var(--border)',
      borderRadius: 9,
      display:      'grid',
      gap:          3,
    }}>
      <div style={{
        fontFamily:  'Orbitron, monospace',
        fontSize:    9,
        fontWeight:  800,
        color:       'var(--cyan)',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
      }}>{item.action}</div>
      <div style={{
        fontSize:   11,
        color:      'var(--text)',
        fontWeight: 600,
        lineHeight: 1.3,
      }}>{item.title ?? item.name ?? '—'}</div>
      {item.reason && (
        <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>{item.reason}</div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function FirefighterDashboardCard({ report, onExpand }) {
  if (!report) return null;

  const isActive = report.isActive;

  if (!isActive) {
    return (
      <div style={{
        padding:      18,
        background:   'rgba(0,255,136,0.06)',
        border:       '1px solid rgba(0,255,136,0.22)',
        borderRadius: 14,
      }}>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 4 }}>
          Day is within normal capacity.
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          Firefighter Mode is standing by.
        </div>
      </div>
    );
  }

  const sev         = resolveStyle(report);
  const score       = report.emergencyScore?.score ?? 0;
  const level       = (report.severity?.level ?? 'normal').toUpperCase();
  const keepCount   = (report.recovery?.keepList  ?? []).length;
  const deferCount  = (report.recovery?.deferList ?? []).length;
  const comprCount  = (report.recovery?.compressionList ?? []).length;

  // Top-3 most actionable recovery items
  const topItems = [
    ...(report.recovery?.deferList      ?? []).slice(0, 2),
    ...(report.recovery?.compressionList ?? []).slice(0, 1),
  ].slice(0, 3);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* Score + level banner */}
      <div style={{
        padding:      '14px 16px',
        background:   sev.bg,
        border:       `1px solid ${sev.border}`,
        borderRadius: 14,
      }}>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   10,
        }}>
          <div>
            <div style={{
              fontFamily:    'JetBrains Mono, monospace',
              fontSize:      8,
              color:         'var(--muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom:  4,
            }}>Emergency Score</div>
            <div style={{
              fontFamily: 'Orbitron, monospace',
              fontSize:   28,
              fontWeight: 900,
              color:      sev.color,
              lineHeight: 1,
            }}>{score}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily:    'JetBrains Mono, monospace',
              fontSize:      8,
              color:         'var(--muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom:  4,
            }}>Level</div>
            <div style={{
              fontFamily:  'Orbitron, monospace',
              fontSize:    13,
              fontWeight:  900,
              color:       sev.color,
            }}>{level}</div>
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          <Metric label="Keep"    value={keepCount}  accent="var(--green)" />
          <Metric label="Defer"   value={deferCount} accent="var(--red)"   />
          <Metric label="Compress" value={comprCount} accent="var(--amber)" />
        </div>

        {/* Trigger reason */}
        <div style={{
          fontSize:   11,
          color:      'var(--text)',
          lineHeight: 1.45,
          opacity:    0.85,
        }}>{report.triggerReason}</div>
      </div>

      {/* Top recovery items */}
      {topItems.length > 0 && (
        <div style={{ display: 'grid', gap: 7 }}>
          <div style={{
            fontFamily:    'JetBrains Mono, monospace',
            fontSize:      8,
            color:         'var(--muted)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom:  2,
          }}>Recovery Actions</div>
          {topItems.map((item, i) => (
            <RecoveryItem key={item.id ?? i} item={item} />
          ))}
        </div>
      )}

      {/* Expand link */}
      {onExpand && (
        <button
          onClick={onExpand}
          style={{
            width:       '100%',
            padding:     '9px 14px',
            background:  `${sev.color}14`,
            border:      `1px solid ${sev.border}`,
            borderRadius: 9,
            fontFamily:  'Orbitron, monospace',
            fontSize:    9,
            fontWeight:  800,
            color:       sev.color,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor:      'pointer',
          }}
        >
          View Full Recovery Plan →
        </button>
      )}
    </div>
  );
}
