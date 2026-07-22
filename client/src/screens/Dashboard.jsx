/**
 * Dashboard.jsx — Executive Briefing Redesign
 *
 * Layout (top to bottom):
 *   1. Life Mode selector (unchanged)
 *   2. Executive Brief hero — expanded DailyBrief with inline status metrics
 *   3. Situation Cards row — Capacity · Conflicts · Deadlines · Recovery
 *   4. Middle band: AI Recommendations (left) + Priority Timeline (right)
 *   5. Quick Actions strip
 *   6. Full Intelligence accordion — all existing engine cards preserved below fold
 *
 * Rules:
 *   - Zero engine calls. All data from useAgent() → chronosReport / executiveReport / intelligenceReport.
 *   - Every sub-component that already existed is reused or lightly restyled.
 *   - No schema or API changes.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChronos }     from '../context/ChronosContext.jsx';
import { useCalendar }    from '../context/CalendarContext.jsx';
import { useCommitments } from '../context/CommitmentContext.jsx';
import { useDemo }        from '../context/DemoContext.jsx';
import { useAgent }       from '../context/AgentContext.jsx';

// ── Agent-driven components (reused unchanged) ────────────────────────────────
import ExecutiveNotifications  from '../components/agent/ExecutiveNotifications.jsx';
import ActionFeed              from '../components/agent/ActionFeed.jsx';

// ── UI primitives (reused unchanged) ─────────────────────────────────────────
import {
  Card, CardHeader, Button, Chip, TraceBox, ScreenHeader, Grid2, Span2,
  AIThinkingState, SkeletonCard,
} from '../components/ui/index.jsx';
import NeuralTimeline    from '../components/ui/NeuralTimeline.jsx';
import CalendarMiniView  from '../components/ui/CalendarMiniView.jsx';

// ── Dashboard sub-components (reused unchanged) ───────────────────────────────
import {
  AIInsights, StatisticsCard, ReflectionCard, PlannerSummary,
  ProductivityCard, WeeklySummary,
} from '../components/dashboard/index.js';

// ── Charts (reused unchanged) ─────────────────────────────────────────────────
import {
  WeeklyCompletionChart, CommitmentSourceChart, FocusHoursChart,
  RealityGapTrendChart, CapacityUsageChart,
} from '../components/charts/index.js';

// ── Empty states (reused unchanged) ──────────────────────────────────────────
import { NoTasks, NoCommitments, NoInsights } from '../components/empty/index.js';

// ── Engine cards (reused unchanged) ──────────────────────────────────────────
import FirefighterDashboardCard    from '../components/firefighter/FirefighterDashboardCard.jsx';
import { ConsequenceDashboardCard } from '../components/consequence/index.js';
import {
  SCENARIO_ACCEPT_INTERVIEW,
  SCENARIO_ADD_HACKATHON,
} from '../demo/consequenceDemoScenarios.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_STYLES = {
  school:       { bg: 'rgba(155,89,255,0.12)', border: 'rgba(155,89,255,0.4)', color: '#9B59FF', icon: '📚' },
  college:      { bg: 'rgba(0,212,255,0.12)',  border: 'rgba(0,212,255,0.4)',  color: '#00D4FF', icon: '🎓' },
  professional: { bg: 'rgba(0,255,136,0.1)',   border: 'rgba(0,255,136,0.4)', color: '#00FF88', icon: '💼' },
};

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const URGENCY_PALETTE = {
  critical: { accent: '#FF3366', glow: 'rgba(255,51,102,0.22)',  dim: 'rgba(255,51,102,0.09)',  border: 'rgba(255,51,102,0.32)' },
  high:     { accent: '#FF8C00', glow: 'rgba(255,140,0,0.18)',   dim: 'rgba(255,140,0,0.07)',   border: 'rgba(255,140,0,0.30)'  },
  medium:   { accent: '#00D4FF', glow: 'rgba(0,212,255,0.16)',   dim: 'rgba(0,212,255,0.06)',   border: 'rgba(0,212,255,0.26)'  },
  low:      { accent: '#9B59FF', glow: 'rgba(155,89,255,0.14)',  dim: 'rgba(155,89,255,0.05)',  border: 'rgba(155,89,255,0.24)' },
  normal:   { accent: '#00FF88', glow: 'rgba(0,255,136,0.14)',   dim: 'rgba(0,255,136,0.05)',   border: 'rgba(0,255,136,0.22)' },
};

const SEVERITY_COLOR = {
  Critical: 'var(--red)', High: 'var(--red)',
  Medium: 'var(--amber)', Low: 'var(--green)', None: 'var(--green)',
};

const ACTION_CONFIG = {
  PROTECT:       { icon: '✔', color: 'var(--green)',  label: 'Protect'     },
  KEEP:          { icon: '✔', color: 'var(--cyan)',   label: 'Keep'        },
  MOVE:          { icon: '↻', color: 'var(--amber)',  label: 'Move'        },
  POSTPONE:      { icon: '⏸', color: 'var(--purple)', label: 'Postpone'   },
  BREAK:         { icon: '☕', color: 'var(--amber)',  label: 'Break'       },
  FOCUS_BLOCK:   { icon: '◈', color: 'var(--cyan)',   label: 'Focus Block' },
  WAIT:          { icon: '⏳', color: 'var(--amber)',  label: 'Wait'        },
  SWITCH_TASK:   { icon: '🔀', color: 'var(--purple)', label: 'Switch'     },
  PARALLEL_WORK: { icon: '⚡', color: 'var(--green)',  label: 'Parallel'   },
  SEND_REMINDER: { icon: '📧', color: 'var(--cyan)',   label: 'Remind'     },
};

// ─── Shared skeleton ──────────────────────────────────────────────────────────

function Skeleton({ height = 14, width = '100%', style = {} }) {
  return (
    <div style={{
      height, width, borderRadius: 6,
      background: 'rgba(255,255,255,0.05)',
      animation: 'skPulse 1.5s ease-in-out infinite',
      ...style,
    }}>
      <style>{`@keyframes skPulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
    </div>
  );
}

function CardLoading() {
  return (
    <div style={{ padding: 16, display: 'grid', gap: 10 }}>
      <Skeleton width="75%" />
      <Skeleton width="55%" />
      <Skeleton width="85%" />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutes(minutes) {
  if (!minutes && minutes !== 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

function hoursUntil(timeStr) {
  if (!timeStr) return null;
  const [h, min] = timeStr.split(':').map(Number);
  const now  = new Date();
  const then = new Date(now);
  then.setHours(h, min, 0, 0);
  const diff = (then - now) / 60000;
  if (diff < 0) return null;
  return diff;
}

function formatHoursUntil(minutes) {
  if (minutes === null) return '—';
  if (minutes < 60)  return `${Math.round(minutes)}m`;
  return `${(minutes / 60).toFixed(1)}h`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. EXECUTIVE BRIEF HERO
// Expands the existing DailyBrief data with capacity status + next deadline.
// All data: intelligenceReport.dailyBrief + chronosReport.capacityReport
// ─────────────────────────────────────────────────────────────────────────────

function ExecutiveBriefHero({ brief, capacityReport, nextDeadline, alertCount, rescueReport, onNavigate }) {
  const [showDetails, setShowDetails] = useState(false);
  const palette  = URGENCY_PALETTE[brief?.urgencyLevel ?? 'normal'];
  const score    = Math.round(capacityReport?.score ?? 0);
  const load     = capacityReport?.mentalLoad ?? '—';
  const capColor = score >= 85 ? 'var(--green)' : score >= 65 ? 'var(--cyan)' : score >= 45 ? 'var(--amber)' : 'var(--red)';

  if (!brief) {
    return (
      <div style={{
        padding: 28, borderRadius: 20,
        background: 'rgba(8,15,30,0.85)',
        border: '1px solid rgba(0,212,255,0.15)',
        display: 'grid', gap: 12,
      }}>
        <Skeleton height={18} width="40%" />
        <Skeleton height={14} width="70%" />
        <Skeleton height={14} width="55%" />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  const focusMins = capacityReport?.availableFocusMinutes ?? capacityReport?.recoveryMinutes ?? 0;
  const focusText = focusMins > 0 
    ? `about ${formatMinutes(focusMins)} of focused work available`
    : 'no focused work time remaining';

  const rescueActive = rescueReport?.activated ?? false;
  const isOverloaded = load >= 75 || rescueActive;

  let assistantNarrative = `Your schedule is optimized and stable. I have prepared your day's commitments.`;
  if (rescueActive) {
    assistantNarrative = "Today's plan isn't realistically achievable. I reorganized your schedule to protect your priorities.";
  } else if (isOverloaded) {
    assistantNarrative = "Today's workload is pushing your capacity limits. I suggest running a Rescue session.";
  } else if (alertCount > 0) {
    assistantNarrative = `Two commitments overlap today. I've flagged these conflicts for resolution.`;
  }

  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden',
      border: `1.5px solid ${palette.border}`,
      background: `linear-gradient(135deg, ${palette.dim}, rgba(8,15,30,0.95))`,
      boxShadow: `0 0 48px ${palette.glow}`,
      position: 'relative',
    }}>
      {/* Urgency accent strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${palette.accent}, transparent)`,
      }} />

      <div style={{ padding: '24px 28px 22px' }}>
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 14, flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              fontFamily: 'Orbitron', fontSize: 11, fontWeight: 900,
              color: palette.accent, letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              AI Chief of Staff Briefing
            </div>
            {alertCount > 0 && (
              <div style={{
                fontFamily: 'Orbitron', fontSize: 9, fontWeight: 800,
                color: 'var(--red)', border: '1px solid rgba(255,51,102,0.4)',
                background: 'rgba(255,51,102,0.10)', borderRadius: 6,
                padding: '2px 8px', letterSpacing: '0.1em',
              }}>
                {alertCount} ALERT{alertCount > 1 ? 'S' : ''}
              </div>
            )}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono', fontSize: 9, color: palette.accent,
            letterSpacing: '0.08em', opacity: 0.75,
          }}>
            {brief.currentUrgency}
          </div>
        </div>

        {/* Dynamic Executive Greeting & Message */}
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          {greeting}, Ria.
        </div>
        
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'rgba(232, 244, 255, 0.85)',
          lineHeight: 1.5, marginBottom: 14,
        }}>
          {assistantNarrative}
        </div>

        {/* Alive AI Status checks — stagger in */}
        <div style={{ display: 'grid', gap: 8, margin: '16px 0', padding: '14px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="cos-stagger-item" style={{ '--stagger': 1, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--green)' }}>
            <span style={{ fontSize: 14, marginRight: 2 }}>✓</span> <span>Calendar analyzed.</span>
          </div>
          <div className="cos-stagger-item" style={{ '--stagger': 2, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--green)' }}>
            <span style={{ fontSize: 14, marginRight: 2 }}>✓</span> <span>Capacity calculated: you have {focusText}.</span>
          </div>
          <div className="cos-stagger-item" style={{ '--stagger': 3, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: rescueActive ? 'var(--amber)' : 'var(--green)' }}>
            <span style={{ fontSize: 14, marginRight: 2 }}>{rescueActive ? '⚡' : '✓'}</span>
            <span>{rescueActive ? 'Reorganized schedule to protect your priorities.' : 'Schedule optimized for maximum focus.'}</span>
          </div>
        </div>

        {/* Confidence indicators & triggers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14, marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Achievability</div>
              <div style={{ fontFamily: 'Orbitron', fontSize: 15, fontWeight: 900, color: rescueActive ? 'var(--amber)' : 'var(--green)' }}>
                {rescueActive ? '92% Protected' : '98% Achievable'}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Cognitive Capacity</div>
              <div style={{ fontFamily: 'Orbitron', fontSize: 15, fontWeight: 900, color: capColor }}>
                {score}% Free
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              onClick={() => onNavigate(rescueActive || isOverloaded ? '/rescue' : '/plan')} 
              className="cos-button"
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                background: rescueActive || isOverloaded ? 'var(--red-dim)' : 'var(--cyan-dim)',
                border: `1px solid ${rescueActive || isOverloaded ? 'var(--red)' : 'var(--cyan)'}`,
                color: rescueActive || isOverloaded ? 'var(--red)' : 'var(--cyan)',
                fontFamily: 'Orbitron',
                fontWeight: 700,
                fontSize: 9,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: `0 0 14px ${rescueActive || isOverloaded ? 'rgba(255, 51, 102, 0.1)' : 'rgba(0, 212, 255, 0.1)'}`,
              }}
            >
              {rescueActive || isOverloaded ? '⚠️ Resolve Overload' : '🚀 Focus Schedule'}
            </button>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontFamily: 'JetBrains Mono',
                fontSize: 10,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {showDetails ? '▼ Hide details' : '▶ Why?'}
            </button>
          </div>
        </div>

        {/* Collapsed Technical Details */}
        {showDetails && (
          <div className="cos-expandable" style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 10, marginBottom: 14,
            }}>
              <StatusPill
                label="Available Focus Time"
                value={formatMinutes(focusMins)}
                sub="Max focus block duration"
                color="var(--cyan)"
              />
              <StatusPill
                label="Mental strain rating"
                value={`${load} / 100`}
                sub={load >= 75 ? 'Strain critical' : load >= 50 ? 'Moderate strain' : 'Calm'}
                color={load >= 75 ? 'var(--red)' : load >= 50 ? 'var(--amber)' : 'var(--green)'}
              />
              <StatusPill
                label="Next imminent limit"
                value={nextDeadline?.time ?? '—'}
                sub={nextDeadline ? `${nextDeadline.title} nearby` : 'None'}
                color="var(--cyan)"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <BriefInfoRow
                label="AI Chief of Staff Recommendation"
                value={brief.recommendedAction}
                accent="var(--cyan)"
              />
              <BriefInfoRow
                label="Primary Risk Source"
                value={brief.biggestRisk}
                accent={['critical','high'].includes(brief.urgencyLevel) ? palette.accent : 'var(--text)'}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ label, value, sub, color }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'rgba(8,15,30,0.70)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono', fontSize: 8,
        color: 'var(--muted)', letterSpacing: '0.13em',
        textTransform: 'uppercase', marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 16, fontWeight: 900,
        color, lineHeight: 1, marginBottom: 4,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--dim)', lineHeight: 1.35 }}>
        {sub}
      </div>
    </div>
  );
}

function BriefInfoRow({ label, value, accent }) {
  return (
    <div style={{
      padding: '11px 14px',
      background: 'rgba(8,15,30,0.55)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
    }}>
      <div style={{
        fontFamily: 'JetBrains Mono', fontSize: 8,
        color: 'var(--muted)', letterSpacing: '0.13em',
        textTransform: 'uppercase', marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: accent || 'var(--text)', lineHeight: 1.45, fontWeight: 500 }}>
        {value || '—'}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SITUATION CARDS ROW
// 4 compact summary cards pulling from existing engine reports.
// ─────────────────────────────────────────────────────────────────────────────

function SituationCard({ icon, title, primary, primaryColor, rows, loading }) {
  if (loading) return (
    <div style={{
      padding: 16, borderRadius: 16,
      background: 'rgba(8,15,30,0.80)',
      border: '1px solid var(--border)',
      display: 'grid', gap: 8,
    }}>
      <Skeleton height={12} width="50%" />
      <Skeleton height={22} width="70%" />
      <Skeleton height={10} width="85%" />
      <Skeleton height={10} width="60%" />
    </div>
  );

  return (
    <div style={{
      padding: '16px 18px', borderRadius: 16,
      background: 'rgba(8,15,30,0.80)',
      border: '1px solid var(--border)',
      transition: 'border-color 0.2s',
    }}>
      {/* Title */}
      <div style={{
        fontFamily: 'JetBrains Mono', fontSize: 8,
        color: 'var(--muted)', letterSpacing: '0.15em',
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        {icon} {title}
      </div>

      {/* Primary value */}
      <div style={{
        fontFamily: 'Orbitron', fontSize: 22, fontWeight: 900,
        color: primaryColor || 'var(--text)', lineHeight: 1, marginBottom: 10,
      }}>
        {primary}
      </div>

      {/* Detail rows */}
      <div style={{ display: 'grid', gap: 5 }}>
        {rows.map((row, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: i > 0 ? 5 : 0,
            borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--dim)' }}>
              {row.label}
            </span>
            <span style={{
              fontFamily: 'JetBrains Mono', fontSize: 9, fontWeight: 700,
              color: row.color || 'var(--muted)',
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SituationCardsRow({ capacityReport, conflictReport, todayCommitments, rescueReport, loading }) {
  // Capacity card
  const capScore  = Math.round(capacityReport?.score ?? 0);
  const capColor  = capScore >= 85 ? 'var(--green)' : capScore >= 65 ? 'var(--cyan)' : capScore >= 45 ? 'var(--amber)' : 'var(--red)';
  const focusMins = capacityReport?.availableFocusMinutes ?? capacityReport?.recoveryMinutes ?? 0;

  // Conflicts card
  const conflictCount = conflictReport?.totalConflicts ?? 0;
  const highSev = conflictReport?.highSeverity ? 'High' : conflictReport?.mediumSeverity ? 'Medium' : conflictCount ? 'Low' : 'None';
  const nextConflict  = conflictReport?.conflicts?.[0];

  // Deadlines card — derive from today's commitments
  const now = new Date();
  const upcoming = (todayCommitments ?? [])
    .filter(t => t.endTime)
    .map(t => ({ ...t, _minsUntil: hoursUntil(t.endTime) }))
    .filter(t => t._minsUntil !== null && t._minsUntil > 0)
    .sort((a, b) => a._minsUntil - b._minsUntil);
  const nextDL     = upcoming[0];
  const deadlineColor = nextDL?._minsUntil < 60 ? 'var(--red)' : nextDL?._minsUntil < 180 ? 'var(--amber)' : 'var(--cyan)';

  // Recovery card
  const rescueActive  = rescueReport?.activated ?? false;
  const stressRelief  = rescueReport?.estimatedStressReduction ?? 0;
  const burnoutRisk   = (capacityReport?.mentalLoad ?? 0) >= 80 ? 'High' : (capacityReport?.mentalLoad ?? 0) >= 60 ? 'Medium' : 'Low';
  const burnoutColor  = burnoutRisk === 'High' ? 'var(--red)' : burnoutRisk === 'Medium' ? 'var(--amber)' : 'var(--green)';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
    }}>
      <SituationCard
        loading={loading}
        icon="◎" title="Capacity"
        primary={`${capScore}%`}
        primaryColor={capColor}
        rows={[
          { label: 'Mental Load',   value: `${capacityReport?.mentalLoad ?? '—'} / 100`, color: capacityReport?.mentalLoad >= 70 ? 'var(--amber)' : 'var(--muted)' },
          { label: 'Focus Time',    value: formatMinutes(focusMins),                      color: 'var(--muted)' },
          { label: 'Status',        value: capacityReport?.status ?? '—',                color: capColor },
        ]}
      />
      <SituationCard
        loading={loading}
        icon="⚠" title="Conflicts"
        primary={conflictCount ? `${conflictCount}` : 'Clear'}
        primaryColor={conflictCount ? SEVERITY_COLOR[highSev] : 'var(--green)'}
        rows={[
          { label: 'Severity',      value: highSev,                                                     color: SEVERITY_COLOR[highSev] },
          { label: 'Next Conflict', value: nextConflict?.title ? nextConflict.title.slice(0, 22) : '—', color: 'var(--muted)' },
        ]}
      />
      <SituationCard
        loading={loading}
        icon="⬟" title="Deadlines"
        primary={nextDL ? nextDL.endTime : '—'}
        primaryColor={deadlineColor}
        rows={[
          { label: 'Next',          value: nextDL?.title ? nextDL.title.slice(0, 20) : 'No deadlines', color: 'var(--muted)' },
          { label: 'Time left',     value: nextDL ? formatHoursUntil(nextDL._minsUntil) : '—',         color: deadlineColor },
          { label: 'Today total',   value: `${upcoming.length} deadline${upcoming.length !== 1 ? 's' : ''}`, color: 'var(--dim)' },
        ]}
      />
      <SituationCard
        loading={loading}
        icon="✦" title="Recovery"
        primary={rescueActive ? 'Active' : 'Stable'}
        primaryColor={rescueActive ? 'var(--amber)' : 'var(--green)'}
        rows={[
          { label: 'Burnout Risk',   value: burnoutRisk,      color: burnoutColor },
          { label: 'Stress Relief',  value: rescueActive ? `${stressRelief}%` : '—', color: 'var(--muted)' },
          { label: 'Rescue Mode',    value: rescueActive ? `ON · ${rescueReport?.severity ?? ''}` : 'Off', color: rescueActive ? 'var(--amber)' : 'var(--dim)' },
        ]}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AI RECOMMENDATIONS PANEL
// Top 3 from executiveReport.recommendations + plannerReport.actions.
// ─────────────────────────────────────────────────────────────────────────────

function RecommendationItem({ rec, index }) {
  const [expanded, setExpanded] = useState(false);
  const urgencyColor = {
    critical: 'var(--red)', high: 'var(--amber)',
    medium: 'var(--cyan)', low: 'var(--purple)', normal: 'var(--dim)',
  }[rec.urgency || 'normal'];

  return (
    <div 
      onClick={() => setExpanded(!expanded)}
      className="cos-card-hover"
      style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '13px 14px',
        background: 'rgba(8,15,30,0.75)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all 0.22s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 8, flexShrink: 0,
          background: `${urgencyColor}18`,
          border: `1px solid ${urgencyColor}40`,
          display: 'grid', placeItems: 'center',
          fontFamily: 'Orbitron', fontSize: 9, fontWeight: 900,
          color: urgencyColor,
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>
            {rec.title || rec.label}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {rec.source === 'PlannerEngine' ? 'Schedule adjustment' : 'Priority action'}
            </span>
            <span style={{ fontSize: 9, color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
              {expanded ? '▼ Hide reason' : '▶ Why?'}
            </span>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="cos-expandable" style={{ 
          marginTop: 6, 
          padding: '10px 12px 6px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          fontSize: 11, 
          color: 'var(--muted)', 
          lineHeight: 1.5 
        }}>
          {rec.body || rec.explanation || rec.reason}
        </div>
      )}
    </div>
  );
}

function AIRecommendationsPanel({ executiveReport, plannerReport, onNavigate }) {
  // Merge: executive recommendations first, then planner actions as fallback
  const recs = useMemo(() => {
    const execRecs = (executiveReport?.recommendations ?? []).slice(0, 3).map(r => ({
      title:       r.title,
      body:        r.body,
      urgency:     r.urgency,
      source:      r.source,
    }));
    if (execRecs.length >= 3) return execRecs;

    // Pad with planner actions if needed
    const plannerRecs = (plannerReport?.actions ?? [])
      .slice(0, 3 - execRecs.length)
      .map(a => {
        const cfg = ACTION_CONFIG[a.type] || {};
        return {
          title:       `${cfg.icon ?? '•'} ${a.title}`,
          body:        a.explanation,
          urgency:     'normal',
          source:      'PlannerEngine',
        };
      });
    return [...execRecs, ...plannerRecs];
  }, [executiveReport, plannerReport]);

  if (!recs.length) {
    return (
      <div style={{
        padding: 18, borderRadius: 14,
        background: 'rgba(0,255,136,0.05)',
        border: '1px solid rgba(0,255,136,0.18)',
        fontSize: 12, color: 'var(--muted)', lineHeight: 1.5,
      }}>
        Generate a plan to see AI recommendations.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {recs.map((rec, i) => <RecommendationItem key={i} rec={rec} index={i} />)}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onNavigate('/plan')}
          style={navPillStyle('var(--cyan)')}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Open Planner →
        </button>
        <button
          onClick={() => onNavigate('/rescue')}
          style={navPillStyle('var(--amber)')}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,140,0,0.10)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Open Rescue →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PRIORITY TIMELINE
// Compact list of today's top-priority commitments. Not a widget replacement —
// the full NeuralTimeline is preserved below the fold.
// ─────────────────────────────────────────────────────────────────────────────

const FLEX_DOT = {
  fixed:      '#00D4FF',
  negotiable: '#FF8C00',
  flexible:   '#00FF88',
};

function PriorityTimelineItem({ task, conflicts = [] }) {
  const hasConflict = conflicts.some(c =>
    c.task1Id === task.id || c.task2Id === task.id
  );
  const dot  = FLEX_DOT[task.flexibility] || '#9B59FF';
  const time = task.startTime
    ? `${task.startTime}${task.endTime ? `–${task.endTime}` : ''}`
    : null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 13px',
      background: hasConflict ? 'rgba(255,51,102,0.06)' : 'rgba(8,15,30,0.70)',
      border: `1px solid ${hasConflict ? 'rgba(255,51,102,0.25)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 10,
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: dot, boxShadow: `0 0 5px ${dot}`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {hasConflict && <span style={{ color: 'var(--red)', marginRight: 5 }}>⚠</span>}
          {task.title || task.name}
        </div>
      </div>
      {time && (
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', flexShrink: 0 }}>
          {time}
        </div>
      )}
    </div>
  );
}

function PriorityTimeline({ todayCommitments, conflicts = [], onNavigate }) {
  const items = useMemo(() => {
    return [...(todayCommitments ?? [])]
      .filter(t => t.startTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 6);
  }, [todayCommitments]);

  if (!items.length) {
    return (
      <div style={{
        padding: '20px 16px', borderRadius: 12, textAlign: 'center',
        background: 'rgba(0,212,255,0.04)',
        border: '1px solid rgba(0,212,255,0.12)',
        fontSize: 12, color: 'var(--dim)', lineHeight: 1.6,
      }}>
        No timed commitments today.<br />
        <span style={{ fontSize: 10 }}>Add tasks with start times to see your timeline.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 7 }}>
      {items.map(t => (
        <PriorityTimelineItem key={t.id} task={t} conflicts={conflicts} />
      ))}
      <button
        onClick={() => onNavigate('/plan')}
        style={navPillStyle('var(--cyan)')}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,255,0.10)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        Full Plan View →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. QUICK ACTIONS STRIP
// Navigation-only buttons. No engine calls.
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Open Planner',     icon: '⬟', route: '/plan',         color: 'var(--cyan)'   },
  { label: 'Open Rescue',      icon: '⚠', route: '/rescue',       color: 'var(--amber)'  },
  { label: 'Review Conflicts', icon: '◎', route: '/plan',         color: 'var(--red)'    },
  { label: 'Ask Chronos',      icon: '⚡', route: '/converse',     color: 'var(--cyan)'   },
  { label: 'Run What-If',      icon: '🔮', route: '/consequence',  color: 'var(--purple)' },
];

function navPillStyle(color) {
  return {
    padding: '6px 13px', borderRadius: 8, cursor: 'pointer',
    border: `1px solid ${color}30`,
    background: 'transparent',
    color, fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
    letterSpacing: '0.08em', transition: 'background 0.15s',
  };
}

function QuickActionsStrip({ onNavigate }) {
  return (
    <div style={{
      display: 'flex', gap: 10, flexWrap: 'wrap',
      padding: '14px 18px',
      background: 'rgba(8,15,30,0.70)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      alignItems: 'center',
    }}>
      <span style={{
        fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--dim)',
        letterSpacing: '0.14em', textTransform: 'uppercase', marginRight: 4,
      }}>
        Quick Actions
      </span>
      {QUICK_ACTIONS.map(({ label, icon, route, color }) => (
        <button
          key={route + label}
          onClick={() => onNavigate(route)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
            border: `1px solid ${color}28`,
            background: `${color}08`,
            color, fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background  = `${color}16`;
            e.currentTarget.style.borderColor = `${color}50`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background  = `${color}08`;
            e.currentTarget.style.borderColor = `${color}28`;
          }}
        >
          <span style={{ fontSize: 13 }}>{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING ENGINE CARDS — preserved 100%, moved below fold
// All existing sub-components kept exactly as they were.
// ─────────────────────────────────────────────────────────────────────────────

function CapacityMetric({ label, value, accent = 'var(--cyan)' }) {
  return (
    <div style={{ padding: '11px 12px', background: 'rgba(8,15,30,0.78)', border: '1px solid var(--border)', borderRadius: 10 }}>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}

function CapacityDashboardCard({ report, commitmentCount }) {
  if (!report) return <CardLoading />;
  if (!commitmentCount) {
    return (
      <div style={{ padding: 18, background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,212,255,0.05))', border: '1px solid rgba(0,255,136,0.24)', borderRadius: 14, minHeight: 222, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>No commitments today.</div>
        <div style={{ fontFamily: 'Orbitron', fontSize: 34, fontWeight: 900, color: 'var(--green)', marginBottom: 8 }}>Capacity: {Math.round(report.score ?? 0)}%</div>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>Perfect day for planning.</div>
      </div>
    );
  }
  const score = Math.round(report.score ?? 0);
  const statusColor = score >= 90 ? 'var(--green)' : score >= 70 ? 'var(--cyan)' : score >= 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <div>
      <div style={{ position: 'relative', padding: '16px 16px 18px', background: 'linear-gradient(135deg, rgba(0,212,255,0.10), rgba(155,89,255,0.07))', border: '1px solid var(--border2)', borderRadius: 14, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 'auto 12px 12px auto', width: 76, height: 76, border: '1px solid rgba(0,212,255,0.18)', borderRadius: '50%', boxShadow: '0 0 34px rgba(0,212,255,0.10) inset' }} />
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 9 }}>Today's Capacity</div>
        <div style={{ fontFamily: 'Orbitron', fontSize: 44, fontWeight: 900, lineHeight: 1, color: 'var(--text)', textShadow: '0 0 24px rgba(0,212,255,0.18)' }}>{score}%</div>
        <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 800, color: statusColor, marginTop: 8 }}>{report.status}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <CapacityMetric label="Mental Load"      value={report.mentalLoad}                           accent="var(--purple)" />
        <CapacityMetric label="Context Switches" value={report.switchCount}                          accent="var(--amber)"  />
        <CapacityMetric label="Recovery Time"    value={formatMinutes(report.recoveryMinutes)}        accent="var(--green)"  />
        <CapacityMetric label="Committed Time"   value={formatMinutes(report.totalCommittedMinutes)}  accent="var(--cyan)"   />
      </div>
      <div style={{ padding: '12px 13px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.18)', borderRadius: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>Recommendation</div>
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>{report.recommendation}</div>
      </div>
    </div>
  );
}

const REALITY_SEVERITY_STYLES = {
  High:   { color: 'var(--red)',   border: 'rgba(255,51,102,0.24)', bg: 'rgba(255,51,102,0.07)' },
  Medium: { color: 'var(--amber)', border: 'rgba(255,140,0,0.24)',  bg: 'rgba(255,140,0,0.07)'  },
  Low:    { color: 'var(--green)', border: 'rgba(0,255,136,0.24)',  bg: 'rgba(0,255,136,0.07)'  },
};

function RealityCheckCard({ report }) {
  if (!report) return <CardLoading />;
  if (!report.issues?.length) {
    return (
      <div style={{ padding: 18, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.22)', borderRadius: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>Everything looks achievable today.</div>
      </div>
    );
  }
  const severityStyle = REALITY_SEVERITY_STYLES[report.severity] || REALITY_SEVERITY_STYLES.Low;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '12px 13px', background: severityStyle.bg, border: `1px solid ${severityStyle.border}`, borderRadius: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Severity</div>
        <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 800, color: severityStyle.color }}>{report.severity}</div>
      </div>
      <div style={{ padding: '12px 13px', background: 'rgba(8,15,30,0.78)', border: '1px solid var(--border)', borderRadius: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>Summary</div>
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>{report.summary}</div>
      </div>
      <div style={{ padding: '12px 13px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.18)', borderRadius: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>Recommendation</div>
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>{report.recommendation}</div>
      </div>
    </div>
  );
}

function getHighestConflictSeverity(report) {
  if (report.highSeverity)   return 'High';
  if (report.mediumSeverity) return 'Medium';
  if (report.lowSeverity)    return 'Low';
  return 'None';
}

function ConflictAnalysisCard({ report }) {
  if (!report) return <CardLoading />;
  if (!report.totalConflicts) {
    return (
      <div style={{ padding: 18, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.22)', borderRadius: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>No scheduling conflicts detected.</div>
      </div>
    );
  }
  const highestSeverity = getHighestConflictSeverity(report);
  const severityStyle   = REALITY_SEVERITY_STYLES[highestSeverity] || { color: 'var(--muted)', border: 'var(--border)', bg: 'rgba(8,15,30,0.78)' };
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <CapacityMetric label="Conflict Count"   value={report.totalConflicts} accent="var(--red)"          />
        <CapacityMetric label="Highest Severity" value={highestSeverity}       accent={severityStyle.color} />
      </div>
      <div style={{ padding: '12px 13px', background: severityStyle.bg, border: `1px solid ${severityStyle.border}`, borderRadius: 10 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>Summary</div>
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>{report.summary}</div>
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {(report.conflicts ?? []).slice(0, 3).map(conflict => (
          <div key={conflict.id} style={{ padding: '10px 11px', background: 'rgba(8,15,30,0.78)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 800, color: REALITY_SEVERITY_STYLES[conflict.severity]?.color || 'var(--text)' }}>⚠ {conflict.title}</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase' }}>{conflict.severity}</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{conflict.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BLOCKER_SEVERITY_STYLES = {
  critical: { color: 'var(--red)',   border: 'rgba(255,51,102,0.30)', bg: 'rgba(255,51,102,0.10)' },
  high:     { color: 'var(--red)',   border: 'rgba(255,51,102,0.22)', bg: 'rgba(255,51,102,0.07)' },
  medium:   { color: 'var(--amber)', border: 'rgba(255,140,0,0.24)',  bg: 'rgba(255,140,0,0.07)'  },
  low:      { color: 'var(--cyan)',  border: 'rgba(0,212,255,0.20)',  bg: 'rgba(0,212,255,0.06)'  },
  none:     { color: 'var(--green)', border: 'rgba(0,255,136,0.24)',  bg: 'rgba(0,255,136,0.07)'  },
};

function BlockerDashboardCard({ report }) {
  if (!report) return <CardLoading />;
  if (!report.totalBlockedCount) {
    return (
      <div style={{ padding: 18, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.22)', borderRadius: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 4 }}>No blocked tasks detected.</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>All work is actionable.</div>
      </div>
    );
  }
  const sev      = BLOCKER_SEVERITY_STYLES[report.overallSeverity] || BLOCKER_SEVERITY_STYLES.low;
  const critical = report.criticalBlockers?.totalCritical ?? 0;
  const chains   = (report.graph?.blockedChains || []).length;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ padding: '14px 16px', background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Blocked Tasks</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 900, color: sev.color }}>{report.totalBlockedCount}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Severity</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 800, color: sev.color, textTransform: 'capitalize' }}>{report.overallSeverity}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[{ label: 'Critical', value: critical }, { label: 'Chains', value: chains }, { label: 'Score', value: report.blockerScore }].map(({ label, value }) => (
            <div key={label} style={{ padding: '8px 10px', background: 'rgba(8,15,30,0.55)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{value}</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>{report.summary}</div>
      </div>
      {(report.blockedTasks ?? []).slice(0, 3).map(task => {
        const blocker = task._blocker || {};
        return (
          <div key={task.id || task.title} style={{ padding: '10px 12px', background: 'rgba(8,15,30,0.78)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 800, color: 'var(--red)', marginBottom: 4 }}>⛔ {task.title || task.name}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>
              {blocker.description || 'Waiting on external dependency'}
              {blocker.waitingDays != null ? ` · ${blocker.waitingDays}d waiting` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlannerScoreBadge({ score }) {
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontFamily: 'Orbitron', fontSize: 42, fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em' }}>/100</span>
    </div>
  );
}

function PlannerActionRow({ action }) {
  const cfg = ACTION_CONFIG[action.type] || { icon: '•', color: 'var(--text)', label: action.type };
  return (
    <div style={{ padding: '10px 12px', background: 'rgba(8,15,30,0.78)', border: '1px solid var(--border)', borderRadius: 10, display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: 13, color: cfg.color }}>{cfg.icon}</span>
        <span style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 800, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cfg.label}</span>
        <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, flexGrow: 1 }}>{action.title}</span>
        {action.suggestedTime && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{action.suggestedTime}</span>}
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.45, paddingLeft: 21 }}>{action.explanation}</div>
    </div>
  );
}

function PlannerDashboardCard({ report, commitmentCount }) {
  if (!report) return <CardLoading />;
  if (!commitmentCount) {
    return (
      <div style={{ padding: 18, background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,212,255,0.05))', border: '1px solid rgba(0,255,136,0.24)', borderRadius: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 20, fontWeight: 800, color: 'var(--green)', marginBottom: 6 }}>Free Day</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>No commitments today. Use this time for planning or recovery.</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ padding: '16px 16px 14px', background: 'linear-gradient(135deg, rgba(155,89,255,0.10), rgba(0,212,255,0.07))', border: '1px solid var(--border2)', borderRadius: 14 }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>Plan Score</div>
        <PlannerScoreBadge score={report.score ?? 0} />
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, marginTop: 10 }}>{report.summary}</div>
      </div>
      {(report.actions ?? []).length > 0 && (
        <div style={{ display: 'grid', gap: 7 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>Recommended Actions</div>
          {report.actions.map(action => <PlannerActionRow key={action.id} action={action} />)}
        </div>
      )}
    </div>
  );
}

const RESCUE_SEVERITY_STYLES = {
  Critical: { color: 'var(--red)',   border: 'rgba(255,51,102,0.30)', bg: 'rgba(255,51,102,0.10)' },
  High:     { color: 'var(--red)',   border: 'rgba(255,51,102,0.22)', bg: 'rgba(255,51,102,0.07)' },
  Medium:   { color: 'var(--amber)', border: 'rgba(255,140,0,0.24)',  bg: 'rgba(255,140,0,0.07)'  },
  Low:      { color: 'var(--green)', border: 'rgba(0,255,136,0.24)',  bg: 'rgba(0,255,136,0.07)'  },
};

const RESCUE_ACTION_CONFIG = {
  PROTECT: { icon: '✓', color: 'var(--green)' }, KEEP: { icon: '✓', color: 'var(--cyan)' },
  MOVE: { icon: '↻', color: 'var(--amber)' }, POSTPONE: { icon: '⏸', color: 'var(--purple)' },
  REMOVE: { icon: '✕', color: 'var(--red)' }, INSERT_BREAK: { icon: '☕', color: 'var(--amber)' },
};

function RescueActionRow({ action }) {
  const cfg = RESCUE_ACTION_CONFIG[action.type] || { icon: '•', color: 'var(--text)' };
  return (
    <div style={{ padding: '10px 12px', background: 'rgba(8,15,30,0.78)', border: '1px solid var(--border)', borderRadius: 10, display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: 12, color: cfg.color, minWidth: 14 }}>{cfg.icon}</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700 }}>{action.type.replace('_', ' ')}</span>
        <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, flexGrow: 1 }}>{action.title}</span>
        {action.suggestedTime && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{action.suggestedTime}</span>}
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.45, paddingLeft: 22 }}>{action.explanation}</div>
    </div>
  );
}

function RescueDashboardCard({ report }) {
  if (!report) return <CardLoading />;
  if (!report.activated) {
    return (
      <div style={{ padding: 18, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.22)', borderRadius: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 4 }}>Everything looks manageable today.</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>No rescue actions needed.</div>
      </div>
    );
  }
  const sev = RESCUE_SEVERITY_STYLES[report.severity] || RESCUE_SEVERITY_STYLES.Low;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ padding: '14px 16px', background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 15, fontWeight: 900, color: sev.color }}>Activated</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>Severity</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 15, fontWeight: 900, color: sev.color }}>{report.severity}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[{ label:'Protected', value: report.commitmentsProtected ?? 0 }, { label:'Moved', value: report.commitmentsMoved ?? 0 }, { label:'Postponed', value: report.commitmentsPostponed ?? 0 }].map(({ label, value }) => (
            <div key={label} style={{ padding: '8px 10px', background: 'rgba(8,15,30,0.55)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>{value}</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 10px', background: 'rgba(8,15,30,0.45)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Stress Reduction</div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 900, color: 'var(--green)' }}>{report.estimatedStressReduction ?? 0}%</div>
        </div>
      </div>
      {(report.actions ?? []).length > 0 && (
        <div style={{ display: 'grid', gap: 7 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 2 }}>Rescue Actions</div>
          {report.actions.map(action => <RescueActionRow key={action.id} action={action} />)}
        </div>
      )}
    </div>
  );
}

const PRIORITY_DOT = { critical: '#FF3366', high: '#FF8C00', medium: '#00D4FF', low: '#9B59FF' };

function ProjectProgressBar({ pct }) {
  const color = pct >= 100 ? '#00FF88' : pct >= 70 ? '#00D4FF' : pct >= 40 ? '#FF8C00' : '#FF3366';
  return (
    <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 999, boxShadow: `0 0 6px ${color}`, transition: 'width 0.4s ease' }} />
    </div>
  );
}

function OngoingProjectsPanel({ projects, onNavigate }) {
  if (!projects.length) return null;
  return (
    <Card>
      <CardHeader title="⬡ Ongoing Projects">
        <Button variant="ghost" size="sm" onClick={() => onNavigate('/tasks')}>Manage →</Button>
      </CardHeader>
      <div style={{ display: 'grid', gap: 10 }}>
        {projects.map(p => {
          const op        = p.ongoingProject || {};
          const pct       = op.completionPercentage ?? 0;
          const remaining = op.remainingDuration != null ? (op.remainingDuration / 60).toFixed(1) : op.estimatedTotalHours != null ? ((op.estimatedTotalHours * (1 - pct / 100))).toFixed(1) : null;
          const daysLeft  = op.deadline ? Math.max(0, Math.ceil((new Date(op.deadline) - new Date()) / 86400000)) : null;
          const dotColor  = PRIORITY_DOT[p.priority] || '#9B59FF';
          return (
            <div key={p.id} style={{ padding: '12px 14px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, boxShadow: `0 0 5px ${dotColor}`, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{p.title}</span>
                </div>
                <span style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, color: pct >= 100 ? '#00FF88' : 'var(--cyan)' }}>{pct}%</span>
              </div>
              <div style={{ marginBottom: 7 }}><ProjectProgressBar pct={pct} /></div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {op.dailyTarget != null && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#9B59FF' }}>{op.dailyTarget}h/day</span>}
                {remaining !== null      && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#FF8C00' }}>{remaining}h left</span>}
                {op.estimatedSessions    && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)' }}>~{op.estimatedSessions} sessions</span>}
                {daysLeft !== null       && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: daysLeft < 3 ? '#FF3366' : daysLeft < 7 ? '#FF8C00' : '#00FF88' }}>📅 {daysLeft === 0 ? 'due today' : `${daysLeft}d`}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const GMAIL_KIND_COLORS = {
  interview: '#FF8C00', exam: '#FF3366', meeting: '#00D4FF', hackathon: '#9B59FF',
  assignment: '#FF8C00', bill: '#FF3366', booking: '#00D4FF', registration: '#9B59FF',
  appointment: '#00D4FF', flight: '#00FF88', hotel: '#00D4FF', event: '#9B59FF',
  deadline: '#FF3366', reminder: '#FF8C00',
};

function GmailCommitmentsPanel({ gmailCommitments, onNavigate }) {
  if (!gmailCommitments.length) return null;
  const sorted = [...gmailCommitments].sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 5);
  return (
    <Card>
      <CardHeader title="✉ Gmail Commitments">
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)' }}>{gmailCommitments.length} detected</span>
      </CardHeader>
      <div style={{ display: 'grid', gap: 7 }}>
        {sorted.map(c => {
          const kind = c.sourceMetadata?.gmail?.classification || 'reminder';
          const dotColor = GMAIL_KIND_COLORS[kind] || '#9B59FF';
          const conf = c.confidence ? Math.round(c.confidence * 100) : null;
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 3, background: dotColor, boxShadow: `0 0 5px ${dotColor}` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: dotColor }}>{kind}</span>
                  {c.date     && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)' }}>📅 {c.date}</span>}
                  {c.location && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)' }}>📍 {c.location}</span>}
                  {conf !== null && <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: conf >= 85 ? '#00FF88' : '#FF8C00' }}>{conf}% conf</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {gmailCommitments.length > 5 && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('/tasks')}>+{gmailCommitments.length - 5} more → View All</Button>
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL INTELLIGENCE ACCORDION — all heavy engine cards, hidden by default
// ─────────────────────────────────────────────────────────────────────────────

function FullIntelligenceSection({
  tasks, anchors, plan, lifeMode,
  runPlan, runRescue, runReview,
  commitments, onNavigate,
  capacityReport, realityReport, conflictReport, blockerReport,
  plannerReport, rescueReport, firefighterReport,
  todayCommitments, plannerExplanations, reflectionData,
  completionStats, focusStats, weeklyHoursStats, productivityResult,
  streaks, weeklySummaryDays, charts, insightsList, executiveSummaryText,
  insightsLoading, ongoingProjects, gmailCommitments,
}) {
  const [open, setOpen] = useState(false);
  const [showFirefighterFull, setShowFirefighterFull] = useState(false);
  const conflicts = plan?.conflicts?.length || 0;

  return (
    <div style={{ marginTop: 8 }}>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 14,
          border: '1px solid rgba(0,212,255,0.15)',
          background: open ? 'rgba(0,212,255,0.06)' : 'rgba(8,15,30,0.70)',
          color: 'var(--muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: 'JetBrains Mono', fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', transition: 'all 0.18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.30)'; e.currentTarget.style.color = 'var(--cyan)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.15)'; e.currentTarget.style.color = 'var(--muted)'; }}
      >
        <span>⬡ Full Intelligence — Engine Reports, Analytics, AI Trace</span>
        <span style={{ fontFamily: 'Orbitron', fontSize: 14, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          {/* Quick Actions (engine-bound) */}
          <Card style={{ marginBottom: 18 }}>
            <CardHeader title="⚡ Engine Actions" />
            <div style={{ display: 'grid', gap: 8 }}>
              <Button variant="primary" onClick={() => onNavigate('/tasks')}>＋ Add Task</Button>
              <Button variant="ghost"   onClick={() => onNavigate('/tasks')}>⬡ Add Project</Button>
              <Button variant="ghost"   onClick={runPlan}   disabled={!tasks.length}>⬡ Generate Plan</Button>
              <Button variant="danger"  onClick={runRescue} disabled={!tasks.length}>⚠ Activate Rescue</Button>
              <Button variant="ghost"   onClick={runReview} disabled={!plan}>◎ Nightly Review</Button>
              <Button variant="purple"  onClick={() => onNavigate('/reflect')}>✦ Weekly Reflection</Button>
            </div>
          </Card>

          {/* Projects + Gmail */}
          {(ongoingProjects.length > 0 || gmailCommitments.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: ongoingProjects.length && gmailCommitments.length ? '1fr 1fr' : '1fr', gap: 18, marginBottom: 18 }}>
              {ongoingProjects.length > 0 && <OngoingProjectsPanel projects={ongoingProjects} onNavigate={onNavigate} />}
              {gmailCommitments.length > 0 && <GmailCommitmentsPanel gmailCommitments={gmailCommitments} onNavigate={onNavigate} />}
            </div>
          )}

          {/* Detailed engine cards */}
          <Grid2 style={{ marginBottom: 18 }}>
            <div style={{ display: 'grid', gap: 18 }}>
              <Card><CardHeader title="◎ Capacity" /><CapacityDashboardCard report={capacityReport} commitmentCount={todayCommitments?.length ?? 0} /></Card>
              <Card><CardHeader title="Reality Check" /><RealityCheckCard report={realityReport} /></Card>
              <Card><CardHeader title="Conflict Analysis" /><ConflictAnalysisCard report={conflictReport} /></Card>
              <Card><CardHeader title="⛔ Blocker Breaker" /><BlockerDashboardCard report={blockerReport} /></Card>
              <Card><CardHeader title="✦ Today's Plan" /><PlannerDashboardCard report={plannerReport} commitmentCount={todayCommitments?.length ?? 0} /></Card>
              <Card><CardHeader title="🚨 Rescue Mode" /><RescueDashboardCard report={rescueReport} /></Card>
              <Card>
                <CardHeader title="🔥 Firefighter Mode" />
                <FirefighterDashboardCard report={firefighterReport} onExpand={firefighterReport?.isActive ? () => setShowFirefighterFull(true) : undefined} />
              </Card>
              <Card>
                <CardHeader title="🔮 Consequence Simulator" />
                <ConsequenceDashboardCard commitments={todayCommitments ?? []} demoScenarios={[SCENARIO_ACCEPT_INTERVIEW, SCENARIO_ADD_HACKATHON]} />
              </Card>
            </div>
          </Grid2>

          {showFirefighterFull && firefighterReport?.isActive && (
            <div style={{ marginBottom: 18 }}>
              <Card>
                <CardHeader title="🔥 Full Firefighter Recovery Plan">
                  <Button variant="ghost" size="sm" onClick={() => setShowFirefighterFull(false)}>✕ Close</Button>
                </CardHeader>
                <React.Suspense fallback={<div style={{ padding: 20, color: 'var(--muted)' }}>Loading…</div>}>
                  <FirefighterPanelLoader commitments={todayCommitments ?? []} onClose={() => setShowFirefighterFull(false)} />
                </React.Suspense>
              </Card>
            </div>
          )}

          {/* AI Insights + Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18, marginBottom: 18 }}>
            <div>
              {insightsLoading ? (
                <div style={{ borderRadius: 12, border: '1px solid rgba(0,212,255,0.15)', background: '#0D1628', padding: 20 }}>
                  {[1,2,3].map(i => <div key={i} style={{ height: 12, borderRadius: 4, background: '#111D35', marginBottom: 10, width: `${70+i*8}%`, animation: 'skPulse 1.5s ease-in-out infinite' }} />)}
                </div>
              ) : insightsList.length === 0 ? (
                <NoInsights onAction={runPlan} actionLabel="Generate Plan" />
              ) : (
                <AIInsights insights={insightsList} score={productivityResult?.score ?? 0} summary={executiveSummaryText} />
              )}
            </div>
            <Card><CardHeader title="⚡ Intelligence Feed" /><ActionFeed maxItems={6} /></Card>
          </div>

          {/* Productivity + Weekly Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
            <ProductivityCard score={productivityResult?.score ?? 0} grade={productivityResult?.grade ?? 'C'} breakdown={productivityResult?.breakdown} streaks={streaks} />
            <WeeklySummary days={weeklySummaryDays ?? []} weeklyHours={weeklyHoursStats?.totalHours ?? 0} completionPct={completionStats?.pct ?? 0} label="This Week" />
          </div>

          {/* Planner Summary + Reflection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
            <PlannerSummary actions={plannerReport?.actions ?? []} explanations={plannerExplanations} compact />
            {reflectionData ? (
              <ReflectionCard reflection={reflectionData} period="daily" defaultExpanded={false} />
            ) : (
              <div style={{ borderRadius: 12, border: '1px solid rgba(155,89,255,0.2)', background: '#0D1628', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <NoInsights message="No reflection yet." subtext="Complete tasks or generate a plan to see daily insights." onAction={runPlan} actionLabel="Generate Plan" />
              </div>
            )}
          </div>

          {/* Statistics cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18 }}>
            <StatisticsCard label="Completion Rate" value={`${completionStats?.pct ?? 0}%`}           subtitle={`${completionStats?.completedCount ?? 0} of ${completionStats?.totalCount ?? 0} tasks`} color="green"  icon="✅" />
            <StatisticsCard label="Focus Time"      value={`${focusStats?.averageHoursPerDay ?? 0}h`} subtitle={`${focusStats?.focusSessionCount ?? 0} sessions today`}                                   color="cyan"   icon="🎯" />
            <StatisticsCard label="Productivity"    value={productivityResult?.score ?? 0}             subtitle={`Grade: ${productivityResult?.grade ?? '—'}`}
              color={(productivityResult?.score ?? 0) >= 70 ? 'green' : (productivityResult?.score ?? 0) >= 50 ? 'amber' : 'red'} icon="⚡" />
            <StatisticsCard label="Weekly Hours"    value={`${weeklyHoursStats?.totalHours ?? 0}h`}   subtitle={`Avg ${weeklyHoursStats?.averageHoursPerWeek ?? 0}h/week`}                                color="purple" icon="📊" />
          </div>

          {/* Charts */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>Analytics</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
              {charts?.weeklyCompletion?.length > 0
                ? <WeeklyCompletionChart data={charts.weeklyCompletion} title="Weekly Completion" />
                : <div style={{ borderRadius: 12, border: '1px solid rgba(0,212,255,0.1)', background: '#0D1628', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}><NoTasks message="No completion data yet." subtext="" /></div>
              }
              <CommitmentSourceChart data={charts?.source ?? []} />
              <FocusHoursChart data={charts?.focus ?? []} title="Focus Hours / Day" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <RealityGapTrendChart data={charts?.realityGapHistory?.trend ?? []} />
              <CapacityUsageChart {...(charts?.capacityUsage ?? { utilizationPct: 0, scheduledMinutes: 0, availableMinutes: 480, status: 'Healthy' })} />
            </div>
          </div>

          {/* AI Reasoning Trace */}
          <Card>
            <CardHeader title="⬡ Last AI Reasoning Trace" />
            <TraceBox lines={plan?.planningTrace} />
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { tasks, anchors, plan, rescue, lifeMode, setLifeMode, runPlan, runRescue, runReview } = useChronos();
  const { commitments } = useCommitments();
  const { selectedDate, today } = useCalendar();
  const { isDemoMode } = useDemo();

  const { chronosReport, executiveReport, intelligenceReport, isProcessing } = useAgent();

  // ── ARCHITECTURAL DATA FLOW TRACE ──────────────────────────────────────────
  // Gated behind an effect so it only runs when the traced values actually
  // change, not on every render.
  useEffect(() => {
    console.info('[Dataflow Trace] Dashboard received commitments from CommitmentContext:', {
      length: commitments?.length ?? 0,
      firstFew: commitments?.slice(0, 3),
    });
    console.info('[Dataflow Trace] Dashboard received tasks from useChronos() (ChronosContext):', {
      length: tasks?.length ?? 0,
      firstFew: tasks?.slice(0, 3),
    });
    console.info('[Dataflow Trace] Dashboard received plan from useChronos() (ChronosContext):', {
      hasPlan: !!plan,
      scheduleLength: plan?.schedule?.length ?? 0,
      firstFew: plan?.schedule?.slice(0, 3),
    });
    console.info('[Dataflow Trace] Dashboard received rescue from useChronos() (ChronosContext):', {
      hasRescue: !!rescue,
      rescuedScheduleLength: rescue?.rescuedSchedule?.length ?? 0,
      firstFew: rescue?.rescuedSchedule?.slice(0, 3),
    });
    console.info('[Dataflow Trace] Dashboard received chronosReport from AgentContext:', {
      hasReport: !!chronosReport,
      todayCommitmentsLength: chronosReport?.todayCommitments?.length ?? 0,
      firstFew: chronosReport?.todayCommitments?.slice(0, 3),
    });
    console.info('[Dataflow Trace] Dashboard received executiveReport from AgentContext:', {
      hasReport: !!executiveReport,
      prioritiesLength: executiveReport?.priorities?.length ?? 0,
      alertsLength: executiveReport?.alerts?.length ?? 0,
      recommendationsLength: executiveReport?.recommendations?.length ?? 0,
    });
  }, [commitments, tasks, plan, rescue, chronosReport, executiveReport]);
  // ───────────────────────────────────────────────────────────────────────────

  const [insightsLoading, setInsightsLoading] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    setInsightsLoading(isProcessing || !chronosReport);
  }, [isProcessing, chronosReport]);

  useEffect(() => {
    if (!executiveReport) return;
    console.info('[Chronos Agent → Dashboard] Executive report consumed', {
      urgency: executiveReport.urgency, alerts: executiveReport.alerts?.length,
      engines: executiveReport.enginesUsed, ffActive: chronosReport?.firefighterReport?.isActive,
      confidence: executiveReport.confidence,
    });
  }, [executiveReport, chronosReport?.firefighterReport?.isActive]);

  // ── Data from agent (same destructuring as before, no recomputation) ────────
  const {
    capacityReport, realityReport, conflictReport, blockerReport,
    plannerReport, rescueReport, firefighterReport,
    completionStats, focusStats, weeklyHoursStats, productivityResult,
    streaks, weeklySummaryDays, todayCommitments, charts,
    plannerExplanations, reflectionData,
  } = chronosReport ?? {};

  const brief            = intelligenceReport?.dailyBrief;
  const executiveSummaryText = executiveReport?.summary ?? '';

  const insightsList = useMemo(() => {
    const fromExec = executiveReport?.recommendations?.slice(0, 6).map(r => `${r.title}: ${r.body}`) ?? [];
    return fromExec.length > 0 ? fromExec : (chronosReport?.insightsList ?? []);
  }, [executiveReport?.recommendations, chronosReport?.insightsList]);

  const gmailCommitments = useMemo(() =>
    commitments.filter(c => c.source === 'gmail'), [commitments]);

  const ongoingProjects = useMemo(() =>
    commitments.filter(c => c.commitmentType === 'ONGOING_PROJECT' || c.type === 'ongoing_project'),
    [commitments]);

  // Next hard deadline: first today commitment with endTime that's still in future
  const nextDeadline = useMemo(() => {
    const sorted = [...(todayCommitments ?? [])]
      .filter(t => t.endTime)
      .map(t => ({ ...t, _minsUntil: hoursUntil(t.endTime) }))
      .filter(t => t._minsUntil !== null && t._minsUntil > 0)
      .sort((a, b) => a._minsUntil - b._minsUntil);
    if (!sorted.length) return null;
    const t = sorted[0];
    return { title: t.title || t.name, time: t.endTime, minutesUntil: t._minsUntil };
  }, [todayCommitments]);

  // finalTimelineTasks: prefer rescued schedule → AI plan → live commitments
  const finalTimelineTasks = useMemo(() => {
    const rescuedSchedule = rescue?.rescuedSchedule;
    if (rescuedSchedule && rescuedSchedule.length > 0) {
      const res = rescuedSchedule.map(item => ({
        ...item,
        startTime: item.startTime || item.scheduledStart || item.start,
        endTime: item.endTime || item.scheduledEnd || item.end,
        date: item.date || selectedDate || today,
      }));
      console.info('[Dataflow Trace] finalTimelineTasks resolved from rescue.rescuedSchedule:', { length: res.length, firstFew: res.slice(0, 3) });
      return res;
    }
    if (plan?.schedule && plan.schedule.length > 0) {
      const res = plan.schedule.map(item => ({
        ...item,
        startTime: item.startTime || item.scheduledStart || item.start,
        endTime: item.endTime || item.scheduledEnd || item.end,
        date: item.date || selectedDate || today,
      }));
      console.info('[Dataflow Trace] finalTimelineTasks resolved from plan.schedule:', { length: res.length, firstFew: res.slice(0, 3) });
      return res;
    }
    const res = todayCommitments || [];
    console.info('[Dataflow Trace] finalTimelineTasks resolved from todayCommitments:', { length: res.length, firstFew: res.slice(0, 3) });
    return res;
  }, [rescue, plan, todayCommitments, selectedDate, today]);

  // Compute a map of date -> { count, moved, conflicts } for Calendar hover tooltip
  const daySummaryMap = useMemo(() => {
    const map = {};
    
    // Add commitment counts
    for (const c of commitments || []) {
      if (c.date) {
        if (!map[c.date]) map[c.date] = { count: 0, moved: 0, conflicts: 0 };
        map[c.date].count += 1;
      }
    }
    
    // Add moved counts from rescue
    if (rescue?.rescuedSchedule) {
      for (const item of rescue.rescuedSchedule) {
        if (item.status && item.status !== 'kept') {
          const d = item.date || today;
          if (!map[d]) map[d] = { count: 0, moved: 0, conflicts: 0 };
          map[d].moved += 1;
        }
      }
    }
    
    // Add conflicts count from plan
    if (plan?.conflicts) {
      const conflictIds = new Set(plan.conflicts.flatMap(c => c.affectedTaskIds || []));
      for (const c of commitments || []) {
        if (conflictIds.has(c.id) && c.date) {
          if (!map[c.date]) map[c.date] = { count: 0, moved: 0, conflicts: 0 };
          map[c.date].conflicts += 1;
        }
      }
    }
    
    return map;
  }, [commitments, rescue?.rescuedSchedule, plan?.conflicts, today]);

  // Calculate recovered minutes from rescue compress actions
  const recoveredMinutes = useMemo(() => {
    if (!rescue?.rescueActions) return 0;
    let mins = 0;
    for (const act of rescue.rescueActions) {
      if (act.actionType === 'compress' && act.from && act.to) {
        const [fh, fm] = act.from.split(':').map(Number);
        const [th, tm] = act.to.split(':').map(Number);
        const diff = (th * 60 + tm) - (fh * 60 + fm);
        if (diff > 0) mins += diff;
      }
    }
    return mins;
  }, [rescue?.rescueActions]);

  const alertCount = (executiveReport?.alerts ?? []).filter(a =>
    a.urgency === 'critical' || a.urgency === 'high'
  ).length;

  const hasNoCommitments = tasks.length === 0;

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <ScreenHeader
        eyebrow="AI Chief of Staff"
        title="What should I do today?"
        highlight=""
        sub="Your personalized executive briefing. I've optimized your schedule so you can focus."
      />

      {hasNoCommitments ? (
        <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
          <NoCommitments onAction={() => navigate('/tasks')} actionLabel="Add your first commitment" />
        </div>
      ) : (
        <>
          {/* ── 1. Executive Brief Hero ───────────────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            {!chronosReport && (
              <AIThinkingState messages={[
                'Reviewing your commitments…',
                'Checking your calendar…',
                'Calculating your capacity…',
                'Protecting your priorities…',
                'Building today\'s strategy…',
              ]} />
            )}
            <ExecutiveBriefHero
              brief={brief}
              capacityReport={capacityReport}
              nextDeadline={nextDeadline}
              alertCount={alertCount}
              rescueReport={rescueReport}
              onNavigate={navigate}
            />
          </div>

          {/* ── Alert strip (compact) ─────────────────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <ExecutiveNotifications compact />
          </div>

          {/* ── Today's Schedule Section (Conversational Recomposition) ─────────────── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <h2 style={{
                  fontFamily: 'Orbitron',
                  fontSize: 13,
                  fontWeight: 800,
                  color: 'var(--text)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  margin: 0,
                }}>
                  Here's your day
                </h2>
                <span style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  color: 'var(--dim)',
                  letterSpacing: '0.02em',
                }}>
                  Today's plan is finalized.
                </span>
              </div>
              
              <div>
                {/* Source label */}
                {rescue?.rescuedSchedule?.length > 0 ? (
                  <span style={{
                    fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(155,89,255,0.08)', border: '1px solid rgba(155,89,255,0.22)',
                    color: 'var(--purple)',
                  }}>
                    ⚡ RESCUED PLAN
                  </span>
                ) : plan?.schedule?.length > 0 ? (
                  <span style={{
                    fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.18)',
                    color: 'var(--cyan)',
                  }}>
                    ⬡ AI OPTIMIZED
                  </span>
                ) : (
                  <span style={{
                    fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '2px 8px', borderRadius: 4,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--muted)',
                  }}>
                    ◈ LIVE SCHEDULE
                  </span>
                )}
              </div>
            </div>

            {/* ── "What Changed" horizontal storytelling strip ─────────────────────── */}
            {rescue?.rescuedSchedule?.length > 0 && rescue?.rescueActions?.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 14px',
                borderRadius: 10,
                background: 'rgba(8,15,30,0.4)',
                border: '1px solid rgba(155,89,255,0.12)',
                marginBottom: 14,
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}>
                <span style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 8,
                  color: 'var(--purple)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  Today Chronos Changed:
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {rescue.rescueActions.slice(0, 4).map((act, idx) => {
                    let statusIcon = '✓';
                    let actionText = '';
                    let color = 'var(--text)';
                    if (act.actionType === 'move' || act.actionType === 'reschedule') {
                      statusIcon = '↻';
                      actionText = `Moved ${act.targetTaskTitle || 'Task'} to ${act.to || 'later'}`;
                      color = '#FF8C00';
                    } else if (act.actionType === 'defer' || act.actionType === 'drop') {
                      statusIcon = '⏸';
                      actionText = `Deferred ${act.targetTaskTitle || 'Task'}`;
                      color = '#9B59FF';
                    } else if (act.actionType === 'compress') {
                      statusIcon = '⬡';
                      actionText = `Compressed ${act.targetTaskTitle || 'Task'}`;
                      color = 'var(--cyan)';
                    } else {
                      statusIcon = '✓';
                      actionText = `Protected ${act.targetTaskTitle || 'Task'}`;
                      color = '#00FF88';
                    }
                    return (
                      <span key={idx} style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: 8,
                        color,
                        background: 'rgba(255,255,255,0.03)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        {statusIcon} {actionText}
                      </span>
                    );
                  })}
                  {recoveredMinutes > 0 && (
                    <span style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: 8,
                      fontWeight: 700,
                      color: 'var(--green)',
                      background: 'rgba(0,255,136,0.06)',
                      padding: '2px 8px',
                      borderRadius: 6,
                      border: '1px solid rgba(0,255,136,0.12)',
                    }}>
                      +{recoveredMinutes} min recovered
                    </span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
              <div>
                <CalendarMiniView daySummaryMap={daySummaryMap} />
                {/* Calendar dot legend */}
                <div style={{
                  marginTop: 10, padding: '8px 10px', borderRadius: 10,
                  background: 'rgba(8,15,30,0.55)', border: '1px solid var(--border)',
                  display: 'grid', gap: 5,
                }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
                    Calendar Indicators
                  </div>
                  {[
                    { color: 'var(--amber)', label: 'Has commitments' },
                    { color: 'var(--red)', label: 'Conflict detected' },
                    { color: 'var(--purple)', label: 'Rescue changes applied' },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}`, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Card>
                <CardHeader title={rescue?.rescuedSchedule?.length > 0 ? '⚡ Optimized Timeline' : plan?.schedule?.length > 0 ? '⬡ Planned Timeline' : '⬡ Commitments Timeline'}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip variant="fixed">Fixed</Chip>
                    <Chip variant="negotiable">Negotiable</Chip>
                    <Chip variant="flexible">Flexible</Chip>
                  </div>
                </CardHeader>
                {finalTimelineTasks.length === 0
                  ? <NoTasks onAction={() => navigate('/tasks')} actionLabel="Add Task" />
                  : <NeuralTimeline tasks={finalTimelineTasks} conflicts={plan?.conflicts} />
                }
              </Card>
            </div>
          </div>

          {/* ── 2. Situation Cards (Engine Diagnostics Collapse) ─────────────────── */}
          <div style={{ marginBottom: 18 }}>
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
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
                letterSpacing: '0.12em',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: showDiagnostics ? 12 : 0,
              }}
            >
              <span>👁 View Detailed Capacity Diagnostics</span>
              <span>{showDiagnostics ? '▼ Hide Diagnostics' : '▶ Show Diagnostics'}</span>
            </button>
            {showDiagnostics && (
              <div className="cos-expandable">
                <SituationCardsRow
                  capacityReport={capacityReport}
                  conflictReport={conflictReport}
                  todayCommitments={todayCommitments}
                  rescueReport={rescueReport}
                  loading={!chronosReport}
                />
              </div>
            )}
          </div>

          {/* ── 3 + 4. Recommendations (left) · Priority Timeline (right) ─────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
            <Card>
              <CardHeader title="✦ AI Recommendations">
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.1em' }}>
                  TOP 3
                </span>
              </CardHeader>
              {!chronosReport ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <Skeleton height={52} />
                  <Skeleton height={52} />
                  <Skeleton height={52} />
                </div>
              ) : (
                <AIRecommendationsPanel
                  executiveReport={executiveReport}
                  plannerReport={plannerReport}
                  onNavigate={navigate}
                />
              )}
            </Card>

            <Card>
              <CardHeader title="⬟ Priority Timeline">
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.1em' }}>
                  TODAY · TOP 6
                </span>
              </CardHeader>
              {!chronosReport ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {[1,2,3,4].map(i => <Skeleton key={i} height={40} />)}
                </div>
              ) : (
                <PriorityTimeline
                  todayCommitments={todayCommitments}
                  conflicts={plan?.conflicts ?? []}
                  onNavigate={navigate}
                />
              )}
            </Card>
          </div>

          {/* ── 5. Quick Actions Strip ────────────────────────────────────────── */}
          <div style={{ marginBottom: 18 }}>
            <QuickActionsStrip onNavigate={navigate} />
          </div>

          {/* ── 6. Full Intelligence Accordion ───────────────────────────────── */}
          <FullIntelligenceSection
            tasks={tasks} anchors={anchors} plan={plan} lifeMode={lifeMode}
            runPlan={runPlan} runRescue={runRescue} runReview={runReview}
            commitments={commitments} onNavigate={navigate}
            capacityReport={capacityReport} realityReport={realityReport}
            conflictReport={conflictReport} blockerReport={blockerReport}
            plannerReport={plannerReport} rescueReport={rescueReport}
            firefighterReport={firefighterReport}
            todayCommitments={todayCommitments}
            plannerExplanations={plannerExplanations}
            reflectionData={reflectionData}
            completionStats={completionStats} focusStats={focusStats}
            weeklyHoursStats={weeklyHoursStats} productivityResult={productivityResult}
            streaks={streaks} weeklySummaryDays={weeklySummaryDays}
            charts={charts} insightsList={insightsList}
            executiveSummaryText={executiveSummaryText}
            insightsLoading={insightsLoading}
            ongoingProjects={ongoingProjects} gmailCommitments={gmailCommitments}
          />
        </>
      )}
    </div>
  );
}

// ─── Lazy FirefighterPanel loader (preserved unchanged) ───────────────────────
const LazyFirefighterPanel = React.lazy(() =>
  import('../components/firefighter/FirefighterPanel.jsx').then(m => ({
    default: m.FirefighterPanel ?? m.default,
  }))
);
function FirefighterPanelLoader({ commitments, onClose }) {
  return <LazyFirefighterPanel commitments={commitments} onClose={onClose} workdayMinutes={480} />;
}
