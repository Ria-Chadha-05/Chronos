/**
 * ReviewInsightsPanel.jsx
 *
 * Placeholder UI for the Review → Reflect → Learn subsystem.
 *
 * This component is intentionally minimal — it exposes the data cleanly
 * so the Executive Dashboard redesign can style it however it needs.
 *
 * It does NOT redesign the dashboard. It is a drop-in that the Dashboard
 * can mount once a ReviewReflectionReport is available.
 *
 * Props:
 *   report  — ReviewReflectionReport (from runReviewPipeline())
 *   loading — boolean
 */

import React, { useState } from 'react';

// ─── Severity color mapping ───────────────────────────────────────────────────

const SEVERITY_COLORS = {
  positive: 'var(--green, #00FF88)',
  neutral:  'var(--cyan, #00D4FF)',
  warning:  'var(--amber, #FF8C00)',
  critical: 'var(--red, #FF3366)',
};

const PRIORITY_COLORS = {
  immediate:  'var(--red, #FF3366)',
  this_week:  'var(--amber, #FF8C00)',
  long_term:  'var(--cyan, #00D4FF)',
};

const TREND_ICONS = {
  improving: '↑',
  stable:    '→',
  worsening: '↓',
  new:       '★',
};

const TREND_COLORS = {
  improving: 'var(--green, #00FF88)',
  stable:    'var(--muted, #6B7A99)',
  worsening: 'var(--red, #FF3366)',
  new:       'var(--cyan, #00D4FF)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricPill({ label, value, accent }) {
  return (
    <div style={{
      padding: '8px 14px',
      background: 'var(--deep, #0A0E1A)',
      border: `1px solid ${accent || 'var(--border, #1E2435)'}22`,
      borderRadius: 8,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 20,
        fontWeight: 900,
        color: accent || 'var(--cyan, #00D4FF)',
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted, #6B7A99)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
      paddingBottom: 8,
      borderBottom: '1px solid var(--border, #1E2435)',
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{
        fontFamily: 'var(--font-display, Orbitron, sans-serif)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text, #E0E6F0)',
      }}>
        {title}
      </span>
    </div>
  );
}

function InsightCard({ insight }) {
  const color = SEVERITY_COLORS[insight.severity] || 'var(--muted)';
  return (
    <div style={{
      padding: '10px 14px',
      background: 'var(--deep, #0A0E1A)',
      border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      marginBottom: 8,
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: 'var(--text, #E0E6F0)' }}>
        {insight.title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted, #6B7A99)', lineHeight: 1.5 }}>
        {insight.body}
      </div>
      {insight.dataPoint && (
        <div style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 10,
          color: color,
          marginTop: 6,
          letterSpacing: '0.06em',
        }}>
          {insight.dataPoint}
        </div>
      )}
    </div>
  );
}

function PatternCard({ pattern }) {
  const trend = TREND_ICONS[pattern.trend] || '→';
  const trendColor = TREND_COLORS[pattern.trend] || 'var(--muted)';
  const confidence = Math.round(pattern.confidence * 100);

  return (
    <div style={{
      padding: '10px 14px',
      background: 'var(--deep, #0A0E1A)',
      border: '1px solid var(--border, #1E2435)',
      borderRadius: 8,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{pattern.title}</div>
        <div style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: 11,
          color: trendColor,
          marginLeft: 8,
          whiteSpace: 'nowrap',
        }}>
          {trend} {pattern.trend}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted, #6B7A99)', lineHeight: 1.4, marginBottom: 6 }}>
        {pattern.description}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono, monospace)',
          color: 'var(--muted, #6B7A99)',
          letterSpacing: '0.06em',
        }}>
          {pattern.occurrenceCount}× observed · {confidence}% confidence
        </span>
      </div>
    </div>
  );
}

function RecommendationCard({ rec }) {
  const color = PRIORITY_COLORS[rec.priority] || 'var(--cyan)';
  return (
    <div style={{
      padding: '10px 14px',
      background: 'var(--deep, #0A0E1A)',
      border: `1px solid var(--border, #1E2435)`,
      borderRadius: 8,
      marginBottom: 8,
      display: 'flex',
      gap: 12,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono, monospace)',
        fontSize: 9,
        color: color,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        paddingTop: 2,
        whiteSpace: 'nowrap',
        minWidth: 64,
      }}>
        {rec.priority.replace('_', ' ')}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{rec.title}</div>
        <div style={{ fontSize: 11, color: 'var(--muted, #6B7A99)', lineHeight: 1.5 }}>{rec.body}</div>
      </div>
    </div>
  );
}

// ─── Tab system ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',        label: 'Overview' },
  { id: 'reflection',      label: 'Reflection' },
  { id: 'patterns',        label: 'Patterns' },
  { id: 'recommendations', label: 'Coaching' },
];

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted, #6B7A99)', fontSize: 13 }}>
      <div style={{ marginBottom: 8, fontSize: 24 }}>◎</div>
      Generating behavioral insights…
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyReviewState({ onGenerate }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>◎</div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>No review data yet</div>
      <div style={{ color: 'var(--muted, #6B7A99)', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
        Run a period review to generate behavioral insights and coaching recommendations.
      </div>
      {onGenerate && (
        <button
          onClick={onGenerate}
          style={{
            padding: '8px 20px',
            background: 'var(--cyan, #00D4FF)',
            color: '#000',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.08em',
          }}
        >
          ◎ Generate Review
        </button>
      )}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ report }) {
  const { review, reflection } = report;
  const completionColor = review.commitments.completionRate >= 70
    ? 'var(--green, #00FF88)'
    : review.commitments.completionRate >= 50
    ? 'var(--amber, #FF8C00)'
    : 'var(--red, #FF3366)';

  const focusHours   = Math.round((review.time.deepWorkMinutes + review.time.projectMinutes) / 60 * 10) / 10;
  const meetingHours = Math.round(review.time.meetingMinutes / 60 * 10) / 10;

  return (
    <div>
      {/* Summary */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--deep, #0A0E1A)',
        border: '1px solid var(--border, #1E2435)',
        borderRadius: 10,
        fontSize: 13,
        color: 'var(--muted, #6B7A99)',
        lineHeight: 1.5,
        marginBottom: 16,
      }}>
        {review.summary}
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        <MetricPill
          label="Completion"
          value={`${review.commitments.completionRate}%`}
          accent={completionColor}
        />
        <MetricPill
          label="Focus"
          value={`${focusHours}h`}
          accent="var(--cyan, #00D4FF)"
        />
        <MetricPill
          label="Meetings"
          value={`${meetingHours}h`}
          accent="var(--purple, #9B59FF)"
        />
        <MetricPill
          label="Capacity"
          value={`${Math.round(review.capacityScore)}%`}
          accent={review.capacityScore >= 70 ? 'var(--green, #00FF88)' : 'var(--amber, #FF8C00)'}
        />
      </div>

      {/* Narrative */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: 10,
        fontSize: 13,
        lineHeight: 1.6,
        marginBottom: 16,
      }}>
        {reflection.narrative}
      </div>

      {/* Commitment breakdown */}
      <SectionTitle icon="◈" title="Commitment Breakdown" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Completed', value: review.commitments.completed, color: 'var(--green, #00FF88)' },
          { label: 'Missed',    value: review.commitments.missed,    color: 'var(--red, #FF3366)' },
          { label: 'Deferred',  value: review.commitments.deferred,  color: 'var(--amber, #FF8C00)' },
        ].map(m => (
          <MetricPill key={m.label} label={m.label} value={m.value} accent={m.color} />
        ))}
      </div>
    </div>
  );
}

// ─── Reflection tab ───────────────────────────────────────────────────────────

function ReflectionTab({ report }) {
  const { reflection } = report;
  return (
    <div>
      {reflection.positives.length > 0 && (
        <>
          <SectionTitle icon="✦" title="What Went Well" />
          {reflection.positives.map(i => <InsightCard key={i.id} insight={i} />)}
        </>
      )}

      {reflection.issues.length > 0 && (
        <>
          <SectionTitle icon="⚠" title="Issues & Blockers" />
          {reflection.issues.map(i => <InsightCard key={i.id} insight={i} />)}
        </>
      )}

      {reflection.observations.length > 0 && (
        <>
          <SectionTitle icon="◎" title="Observations" />
          {reflection.observations.map(i => <InsightCard key={i.id} insight={i} />)}
        </>
      )}

      {reflection.positives.length === 0 && reflection.issues.length === 0 && (
        <div style={{ color: 'var(--muted, #6B7A99)', fontSize: 13, textAlign: 'center', padding: 24 }}>
          No insights generated for this period.
        </div>
      )}
    </div>
  );
}

// ─── Patterns tab ─────────────────────────────────────────────────────────────

function PatternsTab({ report }) {
  const { learning } = report;

  if (learning.periodsAnalyzed < 2) {
    return (
      <div style={{ color: 'var(--muted, #6B7A99)', fontSize: 13, textAlign: 'center', padding: 24, lineHeight: 1.6 }}>
        <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>◈</div>
        {learning.profileSummary}
        <div style={{ marginTop: 8, fontSize: 11 }}>
          {learning.periodsSummary}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Profile */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(155, 89, 255, 0.06)',
        border: '1px solid rgba(155, 89, 255, 0.2)',
        borderRadius: 10,
        fontSize: 12,
        lineHeight: 1.5,
        marginBottom: 16,
        color: 'var(--text, #E0E6F0)',
      }}>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--muted)', marginBottom: 4, letterSpacing: '0.08em' }}>
          BEHAVIORAL PROFILE · {learning.periodsSummary}
        </div>
        {learning.profileSummary}
      </div>

      {learning.patterns.length > 0 && (
        <>
          <SectionTitle icon="◈" title="Recurring Patterns" />
          {learning.patterns.map(p => <PatternCard key={p.id} pattern={p} />)}
        </>
      )}

      {learning.improvements.length > 0 && (
        <>
          <SectionTitle icon="↑" title="Improving" />
          {learning.improvements.map((imp, i) => (
            <div key={i} style={{
              padding: '8px 14px',
              background: 'rgba(0, 255, 136, 0.06)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 6,
              color: 'var(--green, #00FF88)',
            }}>
              {imp}
            </div>
          ))}
        </>
      )}

      {learning.persistentChallenges.length > 0 && (
        <>
          <SectionTitle icon="↓" title="Persistent Challenges" />
          {learning.persistentChallenges.map((ch, i) => (
            <div key={i} style={{
              padding: '8px 14px',
              background: 'rgba(255, 51, 102, 0.06)',
              border: '1px solid rgba(255, 51, 102, 0.2)',
              borderRadius: 8,
              fontSize: 12,
              marginBottom: 6,
              color: 'var(--red, #FF3366)',
            }}>
              {ch}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Coaching tab ─────────────────────────────────────────────────────────────

function CoachingTab({ report }) {
  const { recommendations } = report;

  if (recommendations.length === 0) {
    return (
      <div style={{ color: 'var(--muted, #6B7A99)', fontSize: 13, textAlign: 'center', padding: 24 }}>
        No recommendations generated for this period.
      </div>
    );
  }

  const immediate = recommendations.filter(r => r.priority === 'immediate');
  const thisWeek  = recommendations.filter(r => r.priority === 'this_week');
  const longTerm  = recommendations.filter(r => r.priority === 'long_term');

  return (
    <div>
      {immediate.length > 0 && (
        <>
          <SectionTitle icon="⚡" title="Act Now" />
          {immediate.map(r => <RecommendationCard key={r.id} rec={r} />)}
        </>
      )}
      {thisWeek.length > 0 && (
        <>
          <SectionTitle icon="◎" title="This Week" />
          {thisWeek.map(r => <RecommendationCard key={r.id} rec={r} />)}
        </>
      )}
      {longTerm.length > 0 && (
        <>
          <SectionTitle icon="✦" title="Long-term Habits" />
          {longTerm.map(r => <RecommendationCard key={r.id} rec={r} />)}
        </>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * ReviewInsightsPanel
 *
 * Placeholder dashboard panel for the Review → Reflect → Learn subsystem.
 *
 * @param {object} props
 * @param {import('../../intelligence/review').ReviewReflectionReport | null} props.report
 * @param {boolean} props.loading
 * @param {() => void} [props.onGenerate] - Called when user requests a review
 */
export default function ReviewInsightsPanel({ report, loading = false, onGenerate }) {
  const [activeTab, setActiveTab] = useState('overview');

  // ── Styles ──────────────────────────────────────────────────────────────────
  const panelStyle = {
    background: 'var(--surface, #111827)',
    border: '1px solid var(--border, #1E2435)',
    borderRadius: 14,
    overflow: 'hidden',
  };

  const headerStyle = {
    padding: '16px 20px 12px',
    borderBottom: '1px solid var(--border, #1E2435)',
  };

  const tabBarStyle = {
    display: 'flex',
    gap: 4,
    padding: '10px 16px 0',
    borderBottom: '1px solid var(--border, #1E2435)',
    background: 'var(--deep, #0A0E1A)',
  };

  const contentStyle = {
    padding: '16px 20px',
    maxHeight: 480,
    overflowY: 'auto',
  };

  // ── Tab button ──────────────────────────────────────────────────────────────
  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        background: 'none',
        border: 'none',
        padding: '6px 12px 10px',
        cursor: 'pointer',
        fontSize: 11,
        fontFamily: 'var(--font-mono, monospace)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: activeTab === id ? 'var(--cyan, #00D4FF)' : 'var(--muted, #6B7A99)',
        borderBottom: activeTab === id ? '2px solid var(--cyan, #00D4FF)' : '2px solid transparent',
        marginBottom: -1,
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {label}
    </button>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 9,
              color: 'var(--muted, #6B7A99)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: 3,
            }}>
              Behavioral Intelligence
            </div>
            <div style={{
              fontFamily: 'var(--font-display, Orbitron, sans-serif)',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text, #E0E6F0)',
            }}>
              Review → Reflect → Learn
            </div>
          </div>
          {report && (
            <div style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 9,
              color: 'var(--muted, #6B7A99)',
              letterSpacing: '0.06em',
              textAlign: 'right',
            }}>
              <div style={{ textTransform: 'uppercase', marginBottom: 2 }}>{report.period}</div>
              <div>{report.periodStart?.slice(0, 10)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : !report || !report.review ? (
        <EmptyReviewState onGenerate={onGenerate} />
      ) : (
        <>
          {/* Tab bar */}
          <div style={tabBarStyle}>
            {TABS.map(t => <TabButton key={t.id} id={t.id} label={t.label} />)}
          </div>

          {/* Tab content */}
          <div style={contentStyle}>
            {activeTab === 'overview'        && <OverviewTab        report={report} />}
            {activeTab === 'reflection'      && <ReflectionTab      report={report} />}
            {activeTab === 'patterns'        && <PatternsTab        report={report} />}
            {activeTab === 'recommendations' && <CoachingTab        report={report} />}
          </div>
        </>
      )}
    </div>
  );
}
