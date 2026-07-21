/**
 * Firefighter.jsx
 *
 * Full-page Firefighter Mode screen.
 *
 * Reads today's commitments from ChronosContext (or Demo mock data) and
 * passes them to FirefighterPanel for complete emergency recovery UI.
 * The engine runs inside FirefighterPanel via useMemo — this screen is
 * presentation-only.
 *
 * Route: /firefighter
 */

import React, { useMemo, useState } from 'react';
import { useChronos }     from '../context/ChronosContext.jsx';
import { useCalendar }    from '../context/CalendarContext.jsx';
import { useDemo }        from '../context/DemoContext.jsx';
import { ScreenHeader }   from '../components/ui/index.jsx';
import { FirefighterPanel } from '../components/firefighter/index.js';
import {
  MOCK_STUDENT_EMERGENCY,
  MOCK_PROFESSIONAL_EMERGENCY,
  MOCK_WARNING_DAY,
  FIREFIGHTER_SCENARIOS,
  getMockScenario,
} from '../demo/firefighter/index.js';
import { isCommitmentOnDate } from '../services/chronosReport.js';

// ─── Scenario picker (demo / dev) ─────────────────────────────────────────────

const DEMO_SCENARIOS = [
  { key: 'student',      label: '🎓 Student Emergency',      commitments: MOCK_STUDENT_EMERGENCY      },
  { key: 'professional', label: '💼 Professional Emergency', commitments: MOCK_PROFESSIONAL_EMERGENCY },
  { key: 'warning',      label: '⚠️ Warning Day',            commitments: MOCK_WARNING_DAY            },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Firefighter() {
  const { tasks }              = useChronos();
  const { today }              = useCalendar();
  const { isDemoMode }         = useDemo();
  const [demoKey, setDemoKey]  = useState(null);   // null → use real commitments

  // Today's commitments from the live task store
  const liveCommitments = useMemo(
    () => tasks.filter(t => isCommitmentOnDate(t, today)),
    [tasks, today],
  );

  // Which commitments to feed into the panel
  const activeCommitments = useMemo(() => {
    if (demoKey) {
      const scenario = DEMO_SCENARIOS.find(s => s.key === demoKey);
      return scenario ? scenario.commitments : liveCommitments;
    }
    if (isDemoMode) return MOCK_STUDENT_EMERGENCY;
    return liveCommitments;
  }, [demoKey, isDemoMode, liveCommitments]);

  return (
    <div>
      <ScreenHeader
        eyebrow="AI Chief of Staff"
        title="What emergency is happening?"
        highlight=""
        sub="Chronos detected a critical overload. I've ranked what to protect, suggested compressions, and drafted recovery messages."
      />

      {/* ── Scenario Switcher ───────────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        gap:            8,
        marginBottom:   22,
        flexWrap:       'wrap',
        alignItems:     'center',
      }}>
        <span style={{
          fontFamily:    'JetBrains Mono, monospace',
          fontSize:      9,
          color:         'var(--muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginRight:   4,
        }}>Scenario:</span>

        {/* Live data button */}
        {!isDemoMode && (
          <button
            onClick={() => setDemoKey(null)}
            style={{
              padding:      '4px 12px',
              borderRadius: 999,
              border:       `1px solid ${!demoKey ? 'rgba(0,255,136,0.55)' : 'var(--border)'}`,
              background:   !demoKey ? 'rgba(0,255,136,0.12)' : 'transparent',
              color:        !demoKey ? 'var(--green)' : 'var(--muted)',
              fontFamily:   'JetBrains Mono, monospace',
              fontSize:     9,
              cursor:       'pointer',
            }}
          >
            📡 Live Data ({liveCommitments.length} tasks)
          </button>
        )}

        {DEMO_SCENARIOS.map(s => (
          <button
            key={s.key}
            onClick={() => setDemoKey(s.key)}
            style={{
              padding:      '4px 12px',
              borderRadius: 999,
              border:       `1px solid ${demoKey === s.key || (isDemoMode && !demoKey && s.key === 'student') ? 'rgba(255,51,102,0.55)' : 'var(--border)'}`,
              background:   demoKey === s.key || (isDemoMode && !demoKey && s.key === 'student') ? 'rgba(255,51,102,0.12)' : 'transparent',
              color:        demoKey === s.key || (isDemoMode && !demoKey && s.key === 'student') ? 'var(--red)' : 'var(--muted)',
              fontFamily:   'JetBrains Mono, monospace',
              fontSize:     9,
              cursor:       'pointer',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Main panel ─────────────────────────────────────────────────────── */}
      <FirefighterPanel
        commitments={activeCommitments}
        workdayMinutes={480}
        senderName=""
      />
    </div>
  );
}
