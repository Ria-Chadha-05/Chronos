/**
 * ExecutiveSummaryCard.jsx
 *
 * Presentational card that renders the ExecutiveReport's situational
 * summary, urgency level, active alerts, and ordered priorities.
 *
 * Receives pre-computed ExecutiveReport — performs no calculations.
 */

import React, { useState } from 'react';
import { Card, CardHeader, Button } from '../ui/index.jsx';

// ─── Urgency config ───────────────────────────────────────────────────────────

const URGENCY = {
  critical: {
    color: 'var(--red)',
    border: 'rgba(255,51,102,0.35)',
    bg: 'rgba(255,51,102,0.10)',
    glow: '0 0 24px rgba(255,51,102,0.18)',
    badge: '🔴 CRITICAL',
  },
  high: {
    color: 'var(--red)',
    border: 'rgba(255,51,102,0.22)',
    bg: 'rgba(255,51,102,0.07)',
    glow: '0 0 18px rgba(255,51,102,0.10)',
    badge: '🟠 HIGH',
  },
  medium: {
    color: 'var(--amber)',
    border: 'rgba(255,140,0,0.28)',
    bg: 'rgba(255,140,0,0.07)',
    glow: '0 0 16px rgba(255,140,0,0.10)',
    badge: '🟡 MEDIUM',
  },
  low: {
    color: 'var(--cyan)',
    border: 'rgba(0,212,255,0.22)',
    bg: 'rgba(0,212,255,0.06)',
    glow: 'none',
    badge: '🔵 LOW',
  },
  normal: {
    color: 'var(--green)',
    border: 'rgba(0,255,136,0.22)',
    bg: 'rgba(0,255,136,0.06)',
    glow: 'none',
    badge: '🟢 NOMINAL',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertRow({ alert }) {
  const u = URGENCY[alert.urgency] || URGENCY.normal;
  return (
    <div style={{
      padding: '10px 13px',
      background: u.bg,
      border: `1px solid ${u.border}`,
      borderRadius: 10,
      display: 'grid',
      gap: 3,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 800, color: u.color }}>
          {alert.title}
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono', fontSize: 7, color: u.color,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          border: `1px solid ${u.border}`, borderRadius: 4, padding: '1px 6px',
        }}>
          {alert.engine}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{alert.body}</div>
    </div>
  );
}

function PriorityRow({ priority }) {
  const u = URGENCY[priority.urgency] || URGENCY.normal;
  return (
    <div style={{
      padding: '10px 13px',
      background: 'rgba(8,15,30,0.78)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 13, fontWeight: 900,
        color: u.color, minWidth: 22, marginTop: 1,
      }}>
        #{priority.rank}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 800, color: 'var(--text)', marginBottom: 3 }}>
          {priority.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>{priority.reason}</div>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)',
        textTransform: 'uppercase', whiteSpace: 'nowrap', marginTop: 2,
      }}>
        {priority.engine}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ExecutiveSummaryCard({ executiveReport, onAskAI }) {
  const [expanded, setExpanded] = useState(false);

  if (!executiveReport) return null;

  const {
    summary,
    urgency = 'normal',
    priorities = [],
    alerts = [],
    explanation = '',
    enginesUsed = [],
    confidence = 0,
    actions = [],
  } = executiveReport;

  const u = URGENCY[urgency] || URGENCY.normal;
  const visiblePriorities = expanded ? priorities : priorities.slice(0, 3);

  return (
    <Card style={{ boxShadow: u.glow }}>
      <CardHeader title="🧠 Executive Intelligence">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontFamily: 'JetBrains Mono', fontSize: 8, color: u.color,
            border: `1px solid ${u.border}`, background: u.bg,
            padding: '2px 8px', borderRadius: 999,
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            {u.badge}
          </span>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)' }}>
            {confidence}% confidence
          </span>
        </div>
      </CardHeader>

      {/* Situational Summary */}
      <div style={{
        padding: '14px 16px',
        background: u.bg,
        border: `1px solid ${u.border}`,
        borderRadius: 12,
        marginBottom: 16,
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)',
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 7,
        }}>
          Situational Summary
        </div>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{summary}</div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)',
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            Active Alerts
          </div>
          <div style={{ display: 'grid', gap: 7 }}>
            {alerts.map(alert => <AlertRow key={alert.id} alert={alert} />)}
          </div>
        </div>
      )}

      {/* Priorities */}
      {priorities.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)',
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            Today's Priorities
          </div>
          <div style={{ display: 'grid', gap: 7 }}>
            {visiblePriorities.map(p => <PriorityRow key={p.rank} priority={p} />)}
          </div>
          {priorities.length > 3 && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                marginTop: 8, background: 'none', border: 'none',
                fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)',
                cursor: 'pointer', textDecoration: 'underline', padding: 0,
              }}
            >
              {expanded ? 'Show less' : `+${priorities.length - 3} more priorities`}
            </button>
          )}
        </div>
      )}

      {/* Explanation (collapsed by default) */}
      {explanation && (
        <div style={{
          padding: '10px 13px',
          background: 'rgba(8,15,30,0.55)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          fontSize: 11,
          color: 'var(--muted)',
          lineHeight: 1.5,
          marginBottom: 14,
        }}>
          <span style={{
            fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 6,
          }}>
            Reasoning:
          </span>
          {explanation}
        </div>
      )}

      {/* Footer: engines + ask AI button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
          }}>
            Engines:
          </span>
          {enginesUsed.map(e => (
            <span key={e} style={{
              fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px',
            }}>
              {e}
            </span>
          ))}
        </div>
        {onAskAI && (
          <Button variant="purple" size="sm" onClick={onAskAI}>
            ✦ Ask Intelligence Center
          </Button>
        )}
      </div>
    </Card>
  );
}
