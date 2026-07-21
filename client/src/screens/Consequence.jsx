/**
 * Consequence.jsx
 *
 * Full-page Deadline Consequence Simulator screen.
 *
 * Lets users pick a preset scenario (or a future custom commitment) and
 * instantly see a full simulation report: before/after timeline, capacity
 * impact, reality gap change, new conflicts, tradeoffs, and a recommendation.
 *
 * Route: /consequence
 */

import React, { useState, useMemo } from 'react';
import { useChronos }      from '../context/ChronosContext.jsx';
import { useCalendar }     from '../context/CalendarContext.jsx';
import { useDemo }         from '../context/DemoContext.jsx';
import { ScreenHeader }    from '../components/ui/index.jsx';
import { ConsequencePanel } from '../components/consequence/index.js';
import {
  ALL_CONSEQUENCE_DEMO_SCENARIOS,
  SCENARIO_ACCEPT_INTERVIEW,
} from '../demo/consequenceDemoScenarios.js';
import { simulateScenario } from '../services/consequenceSimulatorEngine.js';
import { isCommitmentOnDate } from '../services/chronosReport.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function runSim(currentCommitments, scenario) {
  try {
    return simulateScenario(currentCommitments, scenario);
  } catch (err) {
    console.warn('[ConsequenceScreen] simulateScenario error:', err);
    return null;
  }
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Consequence() {
  const { tasks }      = useChronos();
  const { today }      = useCalendar();
  const { isDemoMode } = useDemo();

  const liveCommitments = useMemo(
    () => tasks.filter(t => isCommitmentOnDate(t, today)),
    [tasks, today],
  );

  // Scenario picker state
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [report, setReport]           = useState(null);

  const scenario = ALL_CONSEQUENCE_DEMO_SCENARIOS[selectedIdx] ?? null;

  function handleSimulate() {
    if (!scenario) return;
    setLoading(true);
    setReport(null);
    // micro delay so loading state renders before sync computation
    setTimeout(() => {
      const commitments = scenario.currentCommitments ?? liveCommitments;
      const result      = runSim(commitments, scenario.scenario);
      setReport(result);
      setLoading(false);
    }, 60);
  }

  // Auto-run first scenario in demo mode
  const autoRanRef = React.useRef(false);
  React.useEffect(() => {
    if (isDemoMode && !autoRanRef.current && scenario) {
      autoRanRef.current = true;
      handleSimulate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode]);

  return (
    <div>
      <ScreenHeader
        eyebrow="What-If Intelligence"
        title="Deadline Consequence"
        highlight="Simulator"
        sub="Pick any commitment you're considering. Chronos shows you exactly what breaks, what shifts, and whether to accept — before you commit."
      />

      {/* ── Scenario picker grid ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontFamily:    'JetBrains Mono, monospace',
          fontSize:      8,
          color:         'var(--muted)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          marginBottom:  10,
        }}>Choose a Scenario</div>

        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap:                 10,
        }}>
          {ALL_CONSEQUENCE_DEMO_SCENARIOS.map((s, i) => {
            const isSelected = i === selectedIdx;
            return (
              <button
                key={i}
                onClick={() => { setSelectedIdx(i); setReport(null); }}
                style={{
                  padding:      '12px 14px',
                  textAlign:    'left',
                  background:   isSelected ? 'rgba(155,89,255,0.10)' : 'rgba(8,15,30,0.65)',
                  border:       `1px solid ${isSelected ? 'rgba(155,89,255,0.55)' : 'var(--border)'}`,
                  borderRadius: 12,
                  cursor:       'pointer',
                  transition:   'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{
                  fontFamily:  'Orbitron, monospace',
                  fontSize:    10,
                  fontWeight:  800,
                  color:       isSelected ? 'var(--purple)' : 'var(--text)',
                  marginBottom: 4,
                }}>{s.label}</div>
                <div style={{
                  fontSize:   10,
                  color:      'var(--muted)',
                  lineHeight: 1.45,
                }}>{s.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Live data note ─────────────────────────────────────────────────── */}
      {!isDemoMode && liveCommitments.length > 0 && (
        <div style={{
          padding:      '8px 12px',
          marginBottom: 16,
          background:   'rgba(0,212,255,0.06)',
          border:       '1px solid rgba(0,212,255,0.20)',
          borderRadius: 8,
          fontFamily:   'JetBrains Mono, monospace',
          fontSize:     10,
          color:        'var(--cyan)',
        }}>
          📡 Simulating against your {liveCommitments.length} real commitments for today ({today}).
        </div>
      )}

      {/* ── Simulate button ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={handleSimulate}
          disabled={!scenario || loading}
          style={{
            padding:      '12px 28px',
            background:   scenario ? 'linear-gradient(135deg, rgba(155,89,255,0.22), rgba(0,212,255,0.12))' : 'rgba(155,89,255,0.05)',
            border:       `1px solid ${scenario ? 'rgba(155,89,255,0.55)' : 'rgba(155,89,255,0.15)'}`,
            borderRadius: 10,
            fontFamily:   'Orbitron, monospace',
            fontSize:     11,
            fontWeight:   800,
            color:        scenario ? 'var(--purple)' : 'var(--dim)',
            letterSpacing:'0.12em',
            textTransform:'uppercase',
            cursor:       scenario && !loading ? 'pointer' : 'default',
            opacity:      scenario && !loading ? 1 : 0.65,
            transition:   'opacity 0.15s',
          }}
        >
          {loading ? '⏳ Simulating…' : '🔮 Simulate Consequence'}
        </button>
      </div>

      {/* ── Report ─────────────────────────────────────────────────────────── */}
      {(loading || report) && (
        <ConsequencePanel
          report={report}
          loading={loading}
          title={scenario ? `What if: ${scenario.label}?` : 'Simulation'}
        />
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!loading && !report && (
        <div style={{
          marginTop:   40,
          textAlign:   'center',
          padding:     '40px 20px',
          background:  'rgba(8,15,30,0.65)',
          border:      '1px dashed rgba(155,89,255,0.25)',
          borderRadius: 16,
        }}>
          <div style={{
            fontFamily:  'Orbitron, monospace',
            fontSize:    28,
            marginBottom: 10,
            opacity:     0.25,
          }}>🔮</div>
          <div style={{
            fontFamily:    'Orbitron, monospace',
            fontSize:      13,
            fontWeight:    800,
            color:         'var(--muted)',
            letterSpacing: '0.08em',
            marginBottom:  6,
          }}>Select a scenario and hit Simulate</div>
          <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.55 }}>
            Chronos will predict capacity impact, new conflicts, tradeoffs, and give a clear Proceed / Reject recommendation.
          </div>
        </div>
      )}
    </div>
  );
}
