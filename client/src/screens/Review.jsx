import React, { useState } from 'react';
import { useChronos } from '../context/ChronosContext.jsx';
import { Card, CardHeader, Button, Chip, TraceBox, EmptyState, ScreenHeader, Grid2 } from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';

const TYPE_ICONS = { approve: '✓', warn: '⚠', celebrate: '✦', suggest: '→' };

function ReadinessMeter({ readiness }) {
  const score = readiness?.score || 0;
  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)';

  return (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <div style={{
        width: 130, height: 130, borderRadius: '50%',
        margin: '0 auto 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        border: `4px solid ${color}`,
        boxShadow: `0 0 28px ${color}44`,
      }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 36, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }}>/100</div>
      </div>
      <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color, letterSpacing: '0.1em', marginBottom: 8 }}>
        {readiness?.label || 'EVALUATING'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 260, margin: '0 auto' }}>
        {readiness?.headline}
      </div>
    </div>
  );
}

function AnchorStatusItem({ anchor }) {
  const dotColors = { protected: 'var(--green)', 'at-risk': 'var(--amber)', violated: 'var(--red)' };
  const chipVariant = { protected: 'green', 'at-risk': 'amber', violated: 'critical' };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--deep)', marginBottom: 7, fontSize: 12 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColors[anchor.status], boxShadow: `0 0 7px ${dotColors[anchor.status]}`, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{anchor.anchorName}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{anchor.note}</div>
      </div>
      <Chip variant={chipVariant[anchor.status] || 'medium'}>{anchor.status}</Chip>
    </div>
  );
}

function ReviewItem({ item }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: 14, background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, animation: 'slideIn 0.3s ease' }}>
      <div style={{ fontSize: 18, width: 32, textAlign: 'center', flexShrink: 0 }}>{TYPE_ICONS[item.type] || '◈'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
          {item.type} · {item.urgency}
        </div>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{item.title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{item.description}</div>
      </div>
    </div>
  );
}

export default function Review() {
  const { review, runReview, runRescue } = useChronos();
  const { toast } = useToast();
  const [showTrace, setShowTrace] = useState(false);

  if (!review) {
    return (
      <div>
        <ScreenHeader eyebrow="AI Chief of Staff" title="What happened today?" highlight="" sub="Chronos evaluates tomorrow's plan. Approve changes, protect anchors, lock in your readiness." />
        <Card>
          <EmptyState
            icon="◎"
            title="Review not yet run"
            sub="Generate a plan first, then let me run the nightly review."
            action={<Button variant="primary" onClick={runReview}>◎ Run Nightly Review</Button>}
          />
        </Card>
      </div>
    );
  }

  const { reviewItems, anchorStatus, tomorrowReadiness, nightlyTrace } = review;

  return (
    <div>
      <ScreenHeader
        eyebrow="AI Chief of Staff"
        title="What happened today?"
        highlight=""
        sub="Chronos evaluated your achievements today and optimized tomorrow's schedule."
      />

      {/* Action row & Primary action */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          onClick={() => toast("Tomorrow's plan locked 🚀", 'success')}
          className="cos-button"
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            background: 'var(--cyan-dim)',
            border: '1px solid var(--cyan)',
            color: 'var(--cyan)',
            fontFamily: 'Orbitron',
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 0 14px rgba(0, 212, 255, 0.1)',
          }}
        >
          ✓ Lock Tomorrow's Plan
        </button>
        <Button variant="ghost" size="sm" onClick={runReview}>↺ Re-run Review</Button>
        <Button variant="ghost" size="sm" onClick={runRescue}>⚠ Adjust Schedule</Button>
      </div>

      <Grid2 style={{ marginBottom: 18 }}>
        {/* Readiness */}
        <Card>
          <CardHeader title="◎ Tomorrow's Readiness" />
          <ReadinessMeter readiness={tomorrowReadiness} />
        </Card>

        {/* Anchor status */}
        <Card>
          <CardHeader title="⬟ Anchor Protection Status" />
          {!anchorStatus?.length
            ? <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>No anchors to evaluate.</div>
            : anchorStatus.map((a, i) => (
              <div key={i} className="cos-stagger-item" style={{ '--stagger': i + 1 }}>
                <AnchorStatusItem anchor={a} />
              </div>
            ))
          }
        </Card>
      </Grid2>

      {/* Review items */}
      <Card style={{ marginBottom: 18 }}>
        <CardHeader title="⚡ Items Requiring Your Decision" />
        {reviewItems?.length
          ? reviewItems.map((item, i) => (
            <div key={i} className="cos-stagger-item" style={{ '--stagger': i + 1 }}>
              <ReviewItem item={item} />
            </div>
          ))
          : <EmptyState icon="✓" title="Nothing to decide" sub="Plan looks good — ready to lock." />
        }
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
          <span>👁 View AI Evaluation Trace Logs</span>
          <span>{showTrace ? '▼ Hide Trace' : '▶ Show Trace'}</span>
        </button>
        {showTrace && (
          <div className="cos-expandable" style={{ marginTop: 12 }}>
            <Card>
              <CardHeader title="⬡ AI Evaluation Trace" />
              <TraceBox lines={nightlyTrace} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
