/**
 * ConsequenceDashboardCard.jsx
 *
 * Compact Deadline Consequence Simulator card for the Dashboard.
 *
 * The card exposes a scenario picker (populated from consequenceDemoScenarios)
 * and runs simulateScenario on demand, displaying a condensed view of the
 * simulation report: recommendation, capacity delta, and top tradeoffs.
 *
 * Props:
 *   commitments   {object[]}   Current commitments (todayCommitments from report)
 *   demoScenarios {object[]}   Optional preset scenarios array
 *   className     {string}
 */

import React, { useState, useMemo } from 'react';
import { runConsequenceSimulation } from '../../services/chronosReport.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RECOMMEND_STYLES = {
  accept:   { color: 'var(--green)',  icon: '✅' },
  reject:   { color: 'var(--red)',    icon: '❌' },
  caution:  { color: 'var(--amber)',  icon: '⚠️' },
  neutral:  { color: 'var(--cyan)',   icon: 'ℹ️' },
};

function resolveRecommendStyle(verdict) {
  const v = (verdict ?? '').toLowerCase();
  if (v.includes('accept') || v.includes('proceed')) return RECOMMEND_STYLES.accept;
  if (v.includes('reject') || v.includes('avoid'))   return RECOMMEND_STYLES.reject;
  if (v.includes('caution') || v.includes('warn'))   return RECOMMEND_STYLES.caution;
  return RECOMMEND_STYLES.neutral;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConsequenceDashboardCard({
  commitments   = [],
  demoScenarios = [],
  className     = '',
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [hasRun, setHasRun]           = useState(false);
  const [simReport, setSimReport]     = useState(null);

  const scenario = demoScenarios[selectedIdx] ?? null;

  function runSim() {
    if (!scenario) return;
    const report = runConsequenceSimulation(
      scenario.currentCommitments ?? commitments,
      scenario.scenario,
    );
    setSimReport(report);
    setHasRun(true);
  }

  const recStyle = simReport
    ? resolveRecommendStyle(simReport.recommendation?.verdict)
    : RECOMMEND_STYLES.neutral;

  const capacityDelta = simReport?.capacityImpact
    ? simReport.capacityImpact.delta ?? 0
    : null;

  const topTradeoffs = useMemo(
    () => (simReport?.tradeoffs ?? []).slice(0, 3),
    [simReport],
  );

  return (
    <div
      className={className}
      style={{
        display:      'grid',
        gap:          12,
        padding:      18,
        background:   'rgba(155,89,255,0.06)',
        border:       '1px solid rgba(155,89,255,0.22)',
        borderRadius: 14,
      }}
    >
      {/* Header */}
      <div style={{
        fontFamily:    'JetBrains Mono, monospace',
        fontSize:      8,
        color:         'var(--muted)',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        marginBottom:  -4,
      }}>Deadline Consequence Simulator</div>

      {/* Scenario picker */}
      {demoScenarios.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {demoScenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => { setSelectedIdx(i); setHasRun(false); setSimReport(null); }}
              style={{
                padding:      '4px 10px',
                borderRadius: 999,
                border:       `1px solid ${i === selectedIdx ? 'rgba(155,89,255,0.55)' : 'var(--border)'}`,
                background:   i === selectedIdx ? 'rgba(155,89,255,0.14)' : 'transparent',
                color:        i === selectedIdx ? 'var(--purple)' : 'var(--muted)',
                fontFamily:   'JetBrains Mono, monospace',
                fontSize:     9,
                cursor:       'pointer',
                whiteSpace:   'nowrap',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          No preset scenarios. Add one to simulate.
        </div>
      )}

      {/* Description */}
      {scenario && (
        <div style={{
          fontSize:   11,
          color:      'var(--muted)',
          lineHeight: 1.45,
          padding:    '8px 10px',
          background: 'rgba(8,15,30,0.55)',
          border:     '1px solid var(--border)',
          borderRadius: 8,
        }}>
          {scenario.description}
        </div>
      )}

      {/* Run button */}
      <button
        onClick={runSim}
        disabled={!scenario}
        style={{
          padding:      '8px 14px',
          borderRadius: 8,
          border:       '1px solid rgba(155,89,255,0.45)',
          background:   scenario ? 'rgba(155,89,255,0.14)' : 'rgba(155,89,255,0.04)',
          color:        scenario ? 'var(--purple)' : 'var(--muted)',
          fontFamily:   'Orbitron, monospace',
          fontSize:     9,
          fontWeight:   800,
          letterSpacing:'0.1em',
          textTransform:'uppercase',
          cursor:       scenario ? 'pointer' : 'default',
          opacity:      scenario ? 1 : 0.5,
        }}
      >
        🔮 Simulate Consequence
      </button>

      {/* Results */}
      {hasRun && simReport && (
        <div style={{ display: 'grid', gap: 8 }}>
          {/* Recommendation */}
          <div style={{
            padding:      '10px 12px',
            background:   `${recStyle.color}14`,
            border:       `1px solid ${recStyle.color}33`,
            borderRadius: 10,
          }}>
            <div style={{
              fontFamily:    'JetBrains Mono, monospace',
              fontSize:      8,
              color:         'var(--muted)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom:  5,
            }}>Recommendation</div>
            <div style={{
              fontFamily:  'Orbitron, monospace',
              fontSize:    10,
              fontWeight:  800,
              color:       recStyle.color,
              marginBottom:4,
            }}>{recStyle.icon} {simReport.recommendation?.verdict ?? '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.45 }}>
              {simReport.recommendation?.summary ?? simReport.recommendation?.reason ?? ''}
            </div>
          </div>

          {/* Capacity delta */}
          {capacityDelta !== null && (
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              padding:        '9px 12px',
              background:     'rgba(8,15,30,0.78)',
              border:         '1px solid var(--border)',
              borderRadius:   9,
            }}>
              <span style={{
                fontFamily:    'JetBrains Mono, monospace',
                fontSize:      8,
                color:         'var(--muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>Capacity Impact</span>
              <span style={{
                fontFamily: 'Orbitron, monospace',
                fontSize:   13,
                fontWeight: 900,
                color:      capacityDelta > 0 ? 'var(--red)' : capacityDelta < 0 ? 'var(--green)' : 'var(--muted)',
              }}>
                {capacityDelta > 0 ? '+' : ''}{Math.round(capacityDelta)}%
              </span>
            </div>
          )}

          {/* Top tradeoffs */}
          {topTradeoffs.length > 0 && (
            <div style={{ display: 'grid', gap: 5 }}>
              <div style={{
                fontFamily:    'JetBrains Mono, monospace',
                fontSize:      8,
                color:         'var(--muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom:  2,
              }}>Tradeoffs</div>
              {topTradeoffs.map((t, i) => (
                <div key={i} style={{
                  padding:      '8px 10px',
                  background:   'rgba(8,15,30,0.78)',
                  border:       '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize:     10,
                  color:        'var(--text)',
                  lineHeight:   1.4,
                }}>
                  <span style={{ color: t.type === 'negative' ? 'var(--red)' : t.type === 'positive' ? 'var(--green)' : 'var(--amber)', marginRight: 5 }}>
                    {t.type === 'negative' ? '▼' : t.type === 'positive' ? '▲' : '◆'}
                  </span>
                  {t.description ?? t.label ?? String(t)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
