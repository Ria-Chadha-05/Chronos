/**
 * WhatChangedCard.jsx
 *
 * Compares two consecutive ChronosReports (previous vs current) and
 * surfaces meaningful deltas: capacity shifts, new conflicts, rescue
 * activation, firefighter triggers, blocker changes, reality gap changes.
 *
 * Purely presentational — receives pre-computed snapshots.
 * No engine logic. No business calculations.
 */

import React, { useMemo } from 'react';
import { Card, CardHeader } from '../ui/index.jsx';

// ─── Config ───────────────────────────────────────────────────────────────────

const CHANGE_KINDS = {
  improved:  { color: 'var(--green)', border: 'rgba(0,255,136,0.22)', bg: 'rgba(0,255,136,0.06)', arrow: '↑', icon: '✓' },
  worsened:  { color: 'var(--red)',   border: 'rgba(255,51,102,0.26)', bg: 'rgba(255,51,102,0.07)', arrow: '↓', icon: '⚠' },
  new:       { color: 'var(--amber)', border: 'rgba(255,140,0,0.26)',  bg: 'rgba(255,140,0,0.07)',  arrow: '→', icon: '＋' },
  resolved:  { color: 'var(--cyan)',  border: 'rgba(0,212,255,0.22)',  bg: 'rgba(0,212,255,0.06)',  arrow: '→', icon: '✔' },
  neutral:   { color: 'var(--muted)', border: 'var(--border)',          bg: 'rgba(8,15,30,0.50)',    arrow: '→', icon: '•' },
};

// ─── Diff helpers ─────────────────────────────────────────────────────────────

function numDiff(prev, curr) {
  const p = Number(prev ?? 0);
  const c = Number(curr ?? 0);
  const delta = c - p;
  return { prev: p, curr: c, delta, pct: p === 0 ? null : Math.round((delta / p) * 100) };
}

function severityRank(s) {
  return { Critical: 4, High: 3, Medium: 2, Low: 1, None: 0 }[s] ?? 0;
}

// ─── Build change list from two reports ──────────────────────────────────────

function buildChanges(prev, curr) {
  if (!prev || !curr) return [];
  const changes = [];

  // ── Capacity ────────────────────────────────────────────────────────────────
  const cap = numDiff(prev.capacityReport?.score, curr.capacityReport?.score);
  if (Math.abs(cap.delta) >= 5) {
    const improved = cap.delta > 0;
    changes.push({
      id: 'cap',
      kind: improved ? 'improved' : 'worsened',
      title: `Capacity ${improved ? 'improved' : 'declined'} ${Math.abs(Math.round(cap.delta))}%`,
      detail: `${Math.round(cap.prev)}% → ${Math.round(cap.curr)}% · ${curr.capacityReport?.status ?? ''}`,
      engine: 'Capacity',
    });
  }

  // ── Conflicts ───────────────────────────────────────────────────────────────
  const conflicts = numDiff(prev.conflictReport?.totalConflicts, curr.conflictReport?.totalConflicts);
  if (conflicts.delta > 0) {
    changes.push({
      id: 'conflicts-new',
      kind: 'worsened',
      title: `${conflicts.delta} new conflict${conflicts.delta > 1 ? 's' : ''} detected`,
      detail: `${conflicts.prev} → ${conflicts.curr} conflicts`,
      engine: 'Conflict',
    });
  } else if (conflicts.delta < 0) {
    changes.push({
      id: 'conflicts-resolved',
      kind: 'resolved',
      title: `${Math.abs(conflicts.delta)} conflict${Math.abs(conflicts.delta) > 1 ? 's' : ''} resolved`,
      detail: `${conflicts.prev} → ${conflicts.curr} conflicts`,
      engine: 'Conflict',
    });
  }

  // ── Reality gap ─────────────────────────────────────────────────────────────
  const prevRealRank = severityRank(prev.realityReport?.severity);
  const currRealRank = severityRank(curr.realityReport?.severity);
  if (currRealRank > prevRealRank) {
    changes.push({
      id: 'reality-worse',
      kind: 'worsened',
      title: `Reality gap escalated to ${curr.realityReport?.severity}`,
      detail: `${prev.realityReport?.severity ?? 'None'} → ${curr.realityReport?.severity}`,
      engine: 'Reality Gap',
    });
  } else if (currRealRank < prevRealRank) {
    changes.push({
      id: 'reality-better',
      kind: 'improved',
      title: `Reality gap reduced to ${curr.realityReport?.severity}`,
      detail: `${prev.realityReport?.severity} → ${curr.realityReport?.severity ?? 'None'}`,
      engine: 'Reality Gap',
    });
  }

  // ── Firefighter activation ───────────────────────────────────────────────────
  const ffPrev = !!prev.firefighterReport?.isActive;
  const ffCurr = !!curr.firefighterReport?.isActive;
  if (!ffPrev && ffCurr) {
    changes.push({
      id: 'ff-activated',
      kind: 'worsened',
      title: '🔥 Firefighter mode activated',
      detail: curr.firefighterReport?.triggerReason ?? 'Emergency threshold exceeded.',
      engine: 'Firefighter',
    });
  } else if (ffPrev && !ffCurr) {
    changes.push({
      id: 'ff-resolved',
      kind: 'resolved',
      title: '🔥 Firefighter mode resolved',
      detail: 'Emergency conditions no longer met.',
      engine: 'Firefighter',
    });
  }

  // ── Rescue activation ────────────────────────────────────────────────────────
  const rescuePrev = !!prev.rescueReport?.activated;
  const rescueCurr = !!curr.rescueReport?.activated;
  if (!rescuePrev && rescueCurr) {
    changes.push({
      id: 'rescue-activated',
      kind: 'new',
      title: `🚨 Rescue mode activated (${curr.rescueReport?.severity})`,
      detail: curr.rescueReport?.summary ?? 'Overload detected.',
      engine: 'Rescue',
    });
  } else if (rescuePrev && !rescueCurr) {
    changes.push({
      id: 'rescue-resolved',
      kind: 'resolved',
      title: '🚨 Rescue mode deactivated',
      detail: 'Schedule returned to manageable levels.',
      engine: 'Rescue',
    });
  }

  // ── Blockers ────────────────────────────────────────────────────────────────
  const blockers = numDiff(prev.blockerReport?.totalBlockedCount, curr.blockerReport?.totalBlockedCount);
  if (blockers.delta > 0) {
    changes.push({
      id: 'blockers-new',
      kind: 'worsened',
      title: `${blockers.delta} new blocked task${blockers.delta > 1 ? 's' : ''}`,
      detail: `${blockers.prev} → ${blockers.curr} blocked`,
      engine: 'Blocker Breaker',
    });
  } else if (blockers.delta < 0) {
    changes.push({
      id: 'blockers-resolved',
      kind: 'improved',
      title: `${Math.abs(blockers.delta)} task${Math.abs(blockers.delta) > 1 ? 's' : ''} unblocked`,
      detail: `${blockers.prev} → ${blockers.curr} blocked`,
      engine: 'Blocker Breaker',
    });
  }

  // ── Commitment count ────────────────────────────────────────────────────────
  const commitments = numDiff(prev.meta?.totalCommitments, curr.meta?.totalCommitments);
  if (commitments.delta > 0) {
    changes.push({
      id: 'commitment-added',
      kind: 'new',
      title: `${commitments.delta} commitment${commitments.delta > 1 ? 's' : ''} added`,
      detail: `Total: ${commitments.prev} → ${commitments.curr}`,
      engine: 'Commitment Store',
    });
  } else if (commitments.delta < 0) {
    changes.push({
      id: 'commitment-removed',
      kind: 'neutral',
      title: `${Math.abs(commitments.delta)} commitment${Math.abs(commitments.delta) > 1 ? 's' : ''} removed`,
      detail: `Total: ${commitments.prev} → ${commitments.curr}`,
      engine: 'Commitment Store',
    });
  }

  // ── Today's load ────────────────────────────────────────────────────────────
  const today = numDiff(prev.meta?.todayCommitmentCount, curr.meta?.todayCommitmentCount);
  if (Math.abs(today.delta) > 0) {
    const moreLoad = today.delta > 0;
    changes.push({
      id: 'today-load',
      kind: moreLoad ? 'worsened' : 'improved',
      title: `Today's load ${moreLoad ? 'increased' : 'decreased'} by ${Math.abs(today.delta)}`,
      detail: `${today.prev} → ${today.curr} commitments today`,
      engine: 'Capacity',
    });
  }

  return changes;
}

// ─── Change row ───────────────────────────────────────────────────────────────

function ChangeRow({ change }) {
  const cfg = CHANGE_KINDS[change.kind] || CHANGE_KINDS.neutral;

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: '10px 13px',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 10,
    }}>
      <div style={{
        fontFamily: 'Orbitron',
        fontSize: 14,
        color: cfg.color,
        minWidth: 18,
        marginTop: 1,
        flexShrink: 0,
      }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 800, color: cfg.color, marginBottom: 2 }}>
          {change.title}
        </div>
        {change.detail && (
          <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>{change.detail}</div>
        )}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono',
        fontSize: 7,
        color: 'var(--dim)',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        marginTop: 2,
        flexShrink: 0,
      }}>
        {change.engine}
      </div>
    </div>
  );
}

// ─── Legend dot ───────────────────────────────────────────────────────────────

function LegendDot({ kind, label }) {
  const cfg = CHANGE_KINDS[kind] || CHANGE_KINDS.neutral;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {object} prevReport  - previous ChronosReport snapshot (or null on first load)
 * @param {object} currReport  - current ChronosReport
 * @param {string} sinceLabel  - human label like "since yesterday" or "since last check"
 */
export default function WhatChangedCard({ prevReport, currReport, sinceLabel = 'since last check' }) {
  const changes = useMemo(
    () => buildChanges(prevReport, currReport),
    [prevReport, currReport],
  );

  const improved = changes.filter(c => c.kind === 'improved' || c.kind === 'resolved').length;
  const worsened = changes.filter(c => c.kind === 'worsened').length;
  const added    = changes.filter(c => c.kind === 'new').length;

  if (!prevReport) {
    return (
      <Card>
        <CardHeader title="◎ What Changed" />
        <div style={{
          padding: 18,
          background: 'rgba(8,15,30,0.55)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Baseline snapshot established. Changes will appear on next update.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="◎ What Changed">
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)' }}>
          {sinceLabel}
        </span>
      </CardHeader>

      {changes.length === 0 ? (
        <div style={{
          padding: 18,
          background: 'rgba(0,255,136,0.06)',
          border: '1px solid rgba(0,255,136,0.22)',
          borderRadius: 14,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 12, fontWeight: 800, color: 'var(--green)', marginBottom: 5 }}>
            No significant changes
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            Your schedule is stable {sinceLabel}.
          </div>
        </div>
      ) : (
        <>
          {/* Summary badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {worsened > 0 && (
              <div style={{
                fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--red)',
                border: '1px solid rgba(255,51,102,0.28)', background: 'rgba(255,51,102,0.07)',
                padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                ↓ {worsened} worse
              </div>
            )}
            {improved > 0 && (
              <div style={{
                fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--green)',
                border: '1px solid rgba(0,255,136,0.28)', background: 'rgba(0,255,136,0.07)',
                padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                ↑ {improved} better
              </div>
            )}
            {added > 0 && (
              <div style={{
                fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--amber)',
                border: '1px solid rgba(255,140,0,0.28)', background: 'rgba(255,140,0,0.07)',
                padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                ＋ {added} new
              </div>
            )}
          </div>

          {/* Change rows */}
          <div style={{ display: 'grid', gap: 7 }}>
            {changes.map(c => <ChangeRow key={c.id} change={c} />)}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
            <LegendDot kind="improved"  label="Improved"  />
            <LegendDot kind="worsened"  label="Worsened"  />
            <LegendDot kind="new"       label="New"       />
            <LegendDot kind="resolved"  label="Resolved"  />
          </div>
        </>
      )}
    </Card>
  );
}
