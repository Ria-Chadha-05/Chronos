import React, { useState } from 'react';
import { useChronos } from '../context/ChronosContext.jsx';
import { Card, CardHeader, Button, TraceBox, EmptyState, ScreenHeader, Grid2, SectionLabel } from '../components/ui/index.jsx';

const LIFE_AREAS = [
  { id: 'academics',     label: 'Academics',     icon: '📚', color: '#00D4FF' },
  { id: 'internship',    label: 'Internship',     icon: '💼', color: '#9B59FF' },
  { id: 'relationships', label: 'Relationships',  icon: '❤️', color: '#FF3366' },
  { id: 'health',        label: 'Health',         icon: '💪', color: '#00FF88' },
  { id: 'rest',          label: 'Rest',           icon: '😴', color: '#FF8C00' },
  { id: 'personal',      label: 'Personal',       icon: '✨', color: '#7A9ABB' },
];

const STATUS_COLORS = {
  thriving:   '#00FF88',
  balanced:   '#00D4FF',
  neglected:  '#FF8C00',
  overloaded: '#FF3366',
};

const SCORE_LABELS = [
  ['Productivity', 'productivity', '#00D4FF'],
  ['Balance',      'balance',      '#00FF88'],
  ['Wellbeing',    'wellbeing',    '#FF8C00'],
  ['Overall',      'overall',      '#9B59FF'],
];

export default function Reflect() {
  const { reflection, runReflection } = useChronos();
  const [ratings, setRatings] = useState({ academics: 5, internship: 5, relationships: 5, health: 5, rest: 5, personal: 5 });
  const [feelings, setFeelings] = useState('');
  const [showTrace, setShowTrace] = useState(false);

  const handleSubmit = async () => {
    const lifeAreas = Object.entries(ratings).map(([area, score]) => ({ area, score, outOf: 10 }));
    await runReflection(lifeAreas, feelings);
  };

  return (
    <div>
      <ScreenHeader
        eyebrow="AI Chief of Staff"
        title="What did I learn?"
        highlight=""
        sub="Review your energy, focus, and life balance to help me optimize next week's schedule."
      />

      <Grid2>
        {/* Left — input */}
        <div>
          <Card style={{ marginBottom: 18 }}>
            <CardHeader title="✦ Life Area Ratings" />
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
              How well was each area maintained this week? (0 = neglected, 10 = thriving)
            </p>
            {LIFE_AREAS.map((area, idx) => (
              <div key={area.id} className="cos-stagger-item" style={{ '--stagger': idx + 1, padding: '12px 14px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, color: area.color, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {area.icon} {area.label}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: area.color }}>{ratings[area.id]}/10</span>
                </div>
                <input
                  type="range"
                  min={0} max={10}
                  value={ratings[area.id]}
                  onChange={e => setRatings(r => ({ ...r, [area.id]: +e.target.value }))}
                  style={{ accentColor: area.color }}
                />
              </div>
            ))}
          </Card>

          <Card>
            <CardHeader title="💬 How did the week feel?" />
            <textarea
              value={feelings}
              onChange={e => setFeelings(e.target.value)}
              placeholder="What felt missing? What was too much? What do you want more of next week? Be honest — Chronos uses this to rebalance your priorities."
              style={{ minHeight: 100, marginBottom: 12 }}
            />
            <button
              onClick={handleSubmit}
              className="cos-button"
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: 12,
                background: 'var(--cyan-dim)',
                border: '1px solid var(--cyan)',
                color: 'var(--cyan)',
                fontFamily: 'Orbitron',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 0 14px rgba(0, 212, 255, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              ✦ Generate Weekly Reflection
            </button>
          </Card>
        </div>

        {/* Right — results */}
        <div>
          {!reflection ? (
            <Card>
              <EmptyState icon="✦" title="No reflection yet" sub="Rate your week and submit to see insights." />
            </Card>
          ) : (
            <>
              {/* Week scores */}
              <Card style={{ marginBottom: 18 }}>
                <CardHeader title="◎ Week Scores" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {SCORE_LABELS.map(([label, key, color]) => (
                    <div key={key} style={{ textAlign: 'center', padding: 12, background: 'var(--deep)', border: `1px solid ${color}30`, borderRadius: 10 }}>
                      <div style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 900, color }}>{reflection.weekScore?.[key] || 0}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Next week focus */}
              <Card style={{ marginBottom: 18 }}>
                <CardHeader title="⚡ Next Week Focus" />
                <div style={{ padding: '12px 14px', background: 'var(--cyan-dim)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10, fontSize: 14, fontWeight: 600, lineHeight: 1.5 }}>
                  {reflection.nextWeekFocus}
                </div>
              </Card>

              {/* Life area insights */}
              <Card style={{ marginBottom: 18 }}>
                <CardHeader title="✦ Insights & Actions" />
                {(reflection.reflectionInsights || []).map((ins, i) => {
                  const area = LIFE_AREAS.find(a => a.id === ins.area);
                  return (
                    <div key={i} className="cos-stagger-item" style={{ '--stagger': i + 1, padding: '13px 14px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                        <span style={{ color: area?.color || 'var(--cyan)' }}>{area?.icon || '◈'} {ins.area}</span>
                        <span style={{ color: 'var(--dim)', margin: '0 6px' }}>—</span>
                        <span style={{ color: STATUS_COLORS[ins.status] || 'var(--muted)' }}>{ins.status}</span>
                      </div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{ins.insight}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>→ {ins.nextWeekAction}</div>
                    </div>
                  );
                })}
              </Card>

              {/* Trace */}
              <div style={{ marginTop: 18 }}>
                <button
                  onClick={() => setShowTrace(!showTrace)}
                  className="cos-button"
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: 12,
                    border: '1px solid rgba(0, 212, 255, 0.12)',
                    background: 'rgba(8,15,30,0.55)',
                    color: 'var(--muted)',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>👁 View Reflection Trace Logs</span>
                  <span>{showTrace ? '▼ Hide Trace' : '▶ Show Trace'}</span>
                </button>
                {showTrace && (
                  <div className="cos-expandable" style={{ marginTop: 12 }}>
                    <Card>
                      <CardHeader title="⬡ Reflection Trace" />
                      <TraceBox lines={reflection.reflectionTrace} />
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Grid2>
    </div>
  );
}
