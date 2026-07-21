import React, { useState } from 'react';
import { useChronos } from '../context/ChronosContext.jsx';
import { Card, CardHeader, Button, Chip, TraceBox, EmptyState, CapBar, ScreenHeader, Grid2 } from '../components/ui/index.jsx';

function ScheduleItem({ item }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 7, animation: 'slideIn 0.3s ease' }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 85, paddingTop: 2 }}>
        {item.scheduledStart || '--:--'}<br />↓<br />{item.scheduledEnd || '--:--'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
          <Chip variant={item.flexibility}>{item.flexibility}</Chip>
          <Chip variant={item.priority}>{item.priority}</Chip>
          <Chip variant={item.energyMatch || 'good'}>⚡ {item.energyMatch || 'ok'}</Chip>
          <Chip variant={item.energyLoad || 'medium'}>{item.energyLoad}</Chip>
        </div>
        {item.reasoning && <div style={{ fontSize: 11, color: 'var(--dim)', fontStyle: 'italic' }}>{item.reasoning}</div>}
      </div>
    </div>
  );
}

function ConflictItem({ conflict }) {
  const isCritical = conflict.severity === 'critical';
  return (
    <div style={{
      marginBottom: 10, padding: '10px 12px', borderRadius: 10,
      border: `1px solid ${isCritical ? 'rgba(255,51,102,0.4)' : 'rgba(255,140,0,0.4)'}`,
      background: isCritical ? 'rgba(255,51,102,0.06)' : 'rgba(255,140,0,0.06)',
    }}>
      <div style={{ display: 'flex', gap: 7, marginBottom: 5 }}>
        <Chip variant={isCritical ? 'critical' : 'amber'}>{conflict.type}</Chip>
        <Chip variant={isCritical ? 'red' : 'amber'}>{conflict.severity}</Chip>
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>{conflict.description}</div>
    </div>
  );
}

export default function Plan() {
  const { plan, runPlan, runRescue, runReview } = useChronos();
  const [showCapacity, setShowCapacity] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  if (!plan) {
    return (
      <div>
        <ScreenHeader eyebrow="AI Chief of Staff" title="What plan did Chronos build?" highlight="" sub="I analyzed your commitments, resolved constraints, and built your optimal schedule." />
        <Card>
          <EmptyState
            icon="⬡"
            title="No schedule built yet"
            sub="Add your commitments and let me build your plan."
            action={<Button variant="primary" onClick={runPlan}>⬡ Generate Plan</Button>}
          />
        </Card>
      </div>
    );
  }

  const { schedule, conflicts, capacityAnalysis, realityGap, planningTrace } = plan;
  const hasConflicts = conflicts?.length > 0;
  const sorted = [...(schedule || [])].sort((a, b) => (a.scheduledStart || '').localeCompare(b.scheduledStart || ''));

  const hasGap = realityGap?.hasGap;
  const achievability = hasGap ? "Today's plan isn't realistically achievable" : "Your schedule is optimized and stable";
  const achievabilityColor = hasGap ? 'var(--red)' : 'var(--green)';

  return (
    <div>
      <ScreenHeader
        eyebrow="AI Chief of Staff"
        title="What plan did Chronos build?"
        highlight=""
        sub="Chronos analyzed your commitments, resolved scheduling constraints, and built your optimal day."
      />

      {/* ── Confidence Banner & Primary Action ───────────────────────────────── */}
      <div style={{
        padding: '16px 20px',
        borderRadius: 14,
        background: 'rgba(8,15,30,0.70)',
        border: '1px solid var(--border)',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>System Status</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: achievabilityColor, lineHeight: 1.4 }}>
            {achievability}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            onClick={hasConflicts ? runRescue : runReview}
            className="cos-button"
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              background: hasConflicts ? 'var(--red-dim)' : 'var(--cyan-dim)',
              border: `1px solid ${hasConflicts ? 'var(--red)' : 'var(--cyan)'}`,
              color: hasConflicts ? 'var(--red)' : 'var(--cyan)',
              fontFamily: 'Orbitron',
              fontWeight: 700,
              fontSize: 9,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: `0 0 14px ${hasConflicts ? 'rgba(255, 51, 102, 0.1)' : 'rgba(0, 212, 255, 0.1)'}`,
            }}
          >
            {hasConflicts ? '⚠️ Start Emergency Rescue' : '✓ Proceed to Review'}
          </button>
          <Button variant="ghost" size="sm" onClick={runPlan}>↺ Re-run Plan</Button>
        </div>
      </div>

      <Grid2 style={{ marginBottom: 18 }}>
        {/* Conflicts */}
        <Card danger={hasConflicts} success={!hasConflicts}>
          <CardHeader title="⚠ Conflicts Detected">
            {hasConflicts && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--red)' }}>{conflicts.length} found</span>}
          </CardHeader>
          {!hasConflicts
            ? <div style={{ color: 'var(--green)', fontFamily: 'JetBrains Mono', fontSize: 12, padding: '8px 0' }}>✓ No conflicts — schedule is clear and optimal</div>
            : conflicts.map((c, i) => <ConflictItem key={i} conflict={c} />)
          }
        </Card>

        {/* Capacity */}
        <Card>
          <CardHeader title="◎ Capacity Analysis">
            <button
              onClick={() => setShowCapacity(!showCapacity)}
              style={{ background: 'transparent', border: 'none', color: 'var(--cyan)', fontSize: 10, cursor: 'pointer', fontFamily: 'JetBrains Mono' }}
            >
              {showCapacity ? '▼ Hide Details' : '▶ Show Details'}
            </button>
          </CardHeader>
          {capacityAnalysis && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 10, fontWeight: 500 }}>
                You still have about {Math.round((capacityAnalysis.totalAvailableMinutes - capacityAnalysis.totalRequiredMinutes) / 60)} hours of focused work available.
              </div>
              
              {showCapacity && (
                <div className="cos-expandable" style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                    {[
                      ['Available', `${Math.round(capacityAnalysis.totalAvailableMinutes / 60)}h`, 'var(--cyan)'],
                      ['Required',  `${Math.round(capacityAnalysis.totalRequiredMinutes  / 60)}h`, capacityAnalysis.feasible ? 'var(--green)' : 'var(--red)'],
                      ['Reserve',   `${Math.round((capacityAnalysis.reserveMinutes || 0)  / 60)}h`, 'var(--muted)'],
                    ].map(([l, v, c]) => (
                      <div key={l}>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>{l}</div>
                        <div style={{ fontFamily: 'Orbitron', fontSize: 18, fontWeight: 900, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <CapBar required={capacityAnalysis.totalRequiredMinutes} available={capacityAnalysis.totalAvailableMinutes} />
                  {realityGap?.hasGap && (
                    <div style={{ marginTop: 10, padding: '8px 11px', background: 'var(--red-dim)', border: '1px solid rgba(255,51,102,0.3)', borderRadius: 8, fontSize: 11, color: 'var(--red)' }}>
                      <b>Reality Gap:</b> Today's plan isn't realistically achievable.
                      <div style={{ color: 'var(--muted)', marginTop: 3 }}>{realityGap.recommendation}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </Grid2>

      {/* Schedule */}
      <Card style={{ marginBottom: 18 }}>
        <CardHeader title="◈ Generated Schedule">
          {hasConflicts && (
            <Button variant="danger" size="sm" onClick={runRescue}>⚠️ Resolve Overload</Button>
          )}
        </CardHeader>
        {sorted.length
          ? sorted.map((item, idx) => (
              <div key={item.id} className="cos-stagger-item" style={{ '--stagger': idx + 1 }}>
                <ScheduleItem item={item} />
              </div>
            ))
          : <EmptyState icon="◈" title="No schedule" sub="Something went wrong with planning." />
        }
      </Card>

      {/* AI Trace */}
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
          <span>👁 View AI Planning Trace Logs</span>
          <span>{showTrace ? '▼ Hide Trace' : '▶ Show Trace'}</span>
        </button>
        {showTrace && (
          <div className="cos-expandable" style={{ marginTop: 12 }}>
            <Card>
              <CardHeader title="⬡ AI Planning Trace" />
              <TraceBox lines={planningTrace} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
