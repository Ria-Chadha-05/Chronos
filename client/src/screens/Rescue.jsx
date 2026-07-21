import React, { useState } from 'react';
import { useChronos } from '../context/ChronosContext.jsx';
import { Card, CardHeader, Button, Chip, TraceBox, EmptyState, ScreenHeader, Grid2 } from '../components/ui/index.jsx';
import { useToast } from '../context/ToastContext.jsx';

const ACTION_ICONS  = { compress: '⟳', split: '⟶', move: '→', defer: '→', drop: '✕', delegate: '⤴' };
const ACTION_COLORS = {
  compress:  { bg: 'rgba(0,212,255,0.08)',  color: '#00D4FF' },
  split:     { bg: 'rgba(155,89,255,0.08)', color: '#9B59FF' },
  move:      { bg: 'rgba(255,140,0,0.08)',  color: '#FF8C00' },
  defer:     { bg: 'rgba(255,140,0,0.08)',  color: '#FF8C00' },
  drop:      { bg: 'rgba(255,51,102,0.08)', color: '#FF3366' },
  delegate:  { bg: 'rgba(0,255,136,0.08)',  color: '#00FF88' },
};

function RescueAction({ action, index, approved, onApprove, onReject }) {
  const c = ACTION_COLORS[action.actionType] || ACTION_COLORS.move;
  const state = approved[index];

  return (
    <div style={{
      display: 'flex', gap: 12, padding: 14,
      background: 'var(--deep)', border: '1px solid var(--border)',
      borderRadius: 10, marginBottom: 8,
      opacity: state ? 0.55 : 1,
      animation: 'slideIn 0.35s ease',
      transition: 'opacity 0.3s',
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 7, display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0, background: c.bg, color: c.color }}>
        {ACTION_ICONS[action.actionType] || '⚡'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{action.targetTaskTitle}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 5 }}>{action.reason}</div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--dim)', marginBottom: action.userMustApprove && !state ? 8 : 0 }}>
          {action.from} → {action.to}
        </div>
        {action.userMustApprove && !state ? (
          <div style={{ display: 'flex', gap: 7 }}>
            <Button variant="success" size="xs" onClick={() => onApprove(index)}>✓ Approve</Button>
            <Button variant="ghost"   size="xs" onClick={() => onReject(index)}>✕ Reject</Button>
          </div>
        ) : (
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: state === 'rejected' ? 'var(--red)' : 'var(--green)' }}>
            {state === 'rejected' ? '✕ Rejected' : `✓ ${action.userMustApprove ? 'Approved' : 'Auto-applied'}`}
          </div>
        )}
      </div>
    </div>
  );
}

function FirefighterDraft({ draft }) {
  const { toast } = useToast();
  const copy = () => { navigator.clipboard?.writeText(draft.body); toast('Copied to clipboard', 'success'); };

  return (
    <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--amber)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>✉ {draft.type}</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--dim)' }}>To: {draft.to}</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{draft.subject}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono' }}>{draft.body}</div>
      <Button variant="primary" size="xs" onClick={copy} style={{ marginTop: 10 }}>Copy Draft</Button>
    </div>
  );
}

export default function Rescue() {
  const { rescue, runRescue, runReview } = useChronos();
  const [approved, setApproved] = useState({});
  const [showTrace, setShowTrace] = useState(false);

  const approveAll = () => {
    const all = {};
    rescue?.rescueActions?.forEach((_, i) => { all[i] = 'approved'; });
    setApproved(all);
  };

  if (!rescue) {
    return (
      <div>
        <ScreenHeader eyebrow="AI Chief of Staff" title="How did Chronos save my day?" highlight="" sub="I reorganized your schedule and protected your high-priority commitments." />
        <Card>
          <EmptyState
            icon="⚠"
            title="Recovery plan standing by"
            sub="No emergency detected. If your schedule becomes overloaded, I will suggest a recovery plan here."
            action={<Button variant="danger" onClick={runRescue}>⚠ Force Rescue</Button>}
          />
        </Card>
      </div>
    );
  }

  const { rescueActions, rescuedSchedule, rescueSummary, firefighterDrafts, rescueTrace } = rescue;
  const sorted = [...(rescuedSchedule || [])].sort((a, b) => (a.scheduledStart || '').localeCompare(b.scheduledStart || ''));

  return (
    <div>
      <ScreenHeader
        eyebrow="AI Chief of Staff"
        title="How did Chronos save my day?"
        highlight=""
        sub="I reorganized your schedule, postponed lower-priority tasks, and protected your critical focus windows."
      />

      {/* Action row & Primary action */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          onClick={approveAll}
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
          ✓ Accept Rescue Plan
        </button>
        <Button variant="ghost" size="sm" onClick={runRescue}>↺ Re-run Rescue</Button>
        <Button variant="ghost" size="sm" onClick={runReview}>◎ Proceed to Review</Button>
      </div>

      <Card danger style={{ marginBottom: 18 }}>
        <CardHeader title="⚠ Recovery Summary" />
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>{rescueSummary}</p>
      </Card>

      <Grid2 style={{ marginBottom: 18 }}>
        {/* Actions */}
        <Card>
          <CardHeader title="⚡ Recovery Actions" />
          {rescueActions?.length
            ? rescueActions.map((a, i) => (
              <div key={i} className="cos-stagger-item" style={{ '--stagger': i + 1 }}>
                <RescueAction
                  action={a} index={i} approved={approved}
                  onApprove={idx => setApproved(p => ({ ...p, [idx]: 'approved' }))}
                  onReject={idx  => setApproved(p => ({ ...p, [idx]: 'rejected' }))}
                />
              </div>
            ))
            : <EmptyState icon="⚡" title="No actions" sub="Rescue found no required changes." />
          }
        </Card>

        {/* Rescued schedule */}
        <Card>
          <CardHeader title="◈ Rescued Schedule" />
          {sorted.map((item, i) => (
            <div key={i} className="cos-stagger-item" style={{ '--stagger': i + 1, display: 'flex', gap: 12, padding: '12px 14px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 7 }}>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', minWidth: 85 }}>
                {item.scheduledStart || '--:--'}<br />↓<br />{item.scheduledEnd || '--:--'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.title}</div>
                <Chip variant={item.status || 'kept'}>{item.status}</Chip>
              </div>
            </div>
          ))}
        </Card>
      </Grid2>

      {/* Firefighter Mode */}
      {firefighterDrafts?.length > 0 && (
        <Card style={{ marginBottom: 18 }}>
          <CardHeader title="✉️ Suggested Recovery Messages" />
          <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 14, lineHeight: 1.5 }}>
            I've drafted these messages to reschedule or delegate conflicts. Review before sending.
          </p>
          {firefighterDrafts.map((d, i) => (
            <div key={i} className="cos-stagger-item" style={{ '--stagger': i + 1 }}>
              <FirefighterDraft draft={d} />
            </div>
          ))}
        </Card>
      )}

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
          <span>👁 View AI Reasoning Trace Logs</span>
          <span>{showTrace ? '▼ Hide Trace' : '▶ Show Trace'}</span>
        </button>
        {showTrace && (
          <div className="cos-expandable" style={{ marginTop: 12 }}>
            <Card>
              <CardHeader title="⬡ Rescue Reasoning Trace" />
              <TraceBox lines={rescueTrace} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
