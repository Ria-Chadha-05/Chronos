/**
 * RiskCard.jsx
 *
 * Displays the top risks extracted from the Executive Report:
 * - Firefighter emergencies
 * - Critical blockers
 * - High reality gap
 * - Capacity overload
 * - High-severity conflicts
 *
 * Purely presentational. Receives pre-computed data.
 */

import React from 'react';
import { Card, CardHeader } from '../ui/index.jsx';

// ─── Risk level config ────────────────────────────────────────────────────────

const RISK_LEVEL = {
  critical: {
    color: 'var(--red)',
    border: 'rgba(255,51,102,0.32)',
    bg: 'rgba(255,51,102,0.09)',
    bar: '#FF3366',
    icon: '🔴',
  },
  high: {
    color: 'var(--red)',
    border: 'rgba(255,51,102,0.20)',
    bg: 'rgba(255,51,102,0.06)',
    bar: '#FF6688',
    icon: '🟠',
  },
  medium: {
    color: 'var(--amber)',
    border: 'rgba(255,140,0,0.26)',
    bg: 'rgba(255,140,0,0.06)',
    bar: '#FF8C00',
    icon: '🟡',
  },
  low: {
    color: 'var(--cyan)',
    border: 'rgba(0,212,255,0.20)',
    bg: 'rgba(0,212,255,0.05)',
    bar: '#00D4FF',
    icon: '🔵',
  },
  normal: {
    color: 'var(--green)',
    border: 'rgba(0,255,136,0.20)',
    bg: 'rgba(0,255,136,0.05)',
    bar: '#00FF88',
    icon: '🟢',
  },
};

// ─── Derive risks from executiveReport + chronosReport ───────────────────────

function deriveRisks(executiveReport, chronosReport) {
  const risks = [];

  if (!executiveReport || !chronosReport) return risks;

  const {
    firefighterReport,
    rescueReport,
    blockerReport,
    realityReport,
    capacityReport,
    conflictReport,
  } = chronosReport;

  // Firefighter emergency
  if (firefighterReport?.isActive) {
    const score = firefighterReport.emergencyScore?.score ?? 100;
    risks.push({
      id: 'risk-ff',
      level: 'critical',
      title: '🔥 Emergency Day',
      description: firefighterReport.triggerReason ?? 'Firefighter mode triggered.',
      score,
      engine: 'Firefighter',
      mitigation: 'Open Firefighter Recovery Plan for immediate triage.',
    });
  }

  // Critical blockers
  const criticalCount = blockerReport?.criticalBlockers?.totalCritical ?? 0;
  if (criticalCount > 0) {
    risks.push({
      id: 'risk-blocker-critical',
      level: 'critical',
      title: `⛔ ${criticalCount} Critical Blocker${criticalCount > 1 ? 's' : ''}`,
      description: blockerReport.summary ?? 'Critical tasks cannot proceed.',
      score: Math.min(90 + criticalCount * 3, 100),
      engine: 'Blocker Breaker',
      mitigation: 'Resolve dependencies or escalate to unblock forward progress.',
    });
  }

  // Rescue activation
  if (rescueReport?.activated && !firefighterReport?.isActive) {
    const sevScore = { Critical: 85, High: 70, Medium: 50, Low: 30 }[rescueReport.severity] ?? 50;
    risks.push({
      id: 'risk-rescue',
      level: rescueReport.severity === 'Critical' ? 'high' : 'medium',
      title: `🚨 Rescue Mode (${rescueReport.severity})`,
      description: rescueReport.summary ?? 'Schedule overload requires triage.',
      score: sevScore,
      engine: 'Rescue',
      mitigation: `${rescueReport.commitmentsPostponed ?? 0} commitments can be postponed to free capacity.`,
    });
  }

  // High reality gap
  if (realityReport?.severity === 'High' || realityReport?.severity === 'Critical') {
    risks.push({
      id: 'risk-reality',
      level: realityReport.severity === 'Critical' ? 'critical' : 'high',
      title: `⚠ Reality Gap — ${realityReport.severity}`,
      description: realityReport.summary ?? 'Committed work exceeds realistic capacity.',
      score: realityReport.severity === 'Critical' ? 88 : 72,
      engine: 'Reality Gap',
      mitigation: realityReport.recommendation ?? 'Reduce commitments or extend timeline.',
    });
  }

  // Capacity overload
  const capScore = capacityReport?.score ?? 100;
  if (capScore < 50) {
    risks.push({
      id: 'risk-capacity',
      level: capScore < 30 ? 'high' : 'medium',
      title: `◎ Capacity at ${Math.round(capScore)}%`,
      description: capacityReport.recommendation ?? 'Today\'s load exceeds sustainable limits.',
      score: Math.round(100 - capScore),
      engine: 'Capacity',
      mitigation: 'Defer lower-priority tasks to restore healthy capacity margin.',
    });
  }

  // High-severity conflicts
  if (conflictReport?.highSeverity && conflictReport.totalConflicts > 0) {
    risks.push({
      id: 'risk-conflict',
      level: 'medium',
      title: `⚡ ${conflictReport.totalConflicts} Scheduling Conflict${conflictReport.totalConflicts > 1 ? 's' : ''}`,
      description: conflictReport.summary ?? 'Overlapping commitments need resolution.',
      score: Math.min(40 + conflictReport.totalConflicts * 8, 80),
      engine: 'Conflict',
      mitigation: 'Resolve or reschedule overlapping commitments.',
    });
  }

  // Non-critical blockers
  const totalBlocked = blockerReport?.totalBlockedCount ?? 0;
  if (totalBlocked > 0 && criticalCount === 0) {
    risks.push({
      id: 'risk-blocker',
      level: 'low',
      title: `⛔ ${totalBlocked} Blocked Task${totalBlocked > 1 ? 's' : ''}`,
      description: blockerReport.summary ?? 'Tasks waiting on external dependencies.',
      score: Math.min(20 + totalBlocked * 5, 50),
      engine: 'Blocker Breaker',
      mitigation: 'Send reminders or find parallel work to stay productive.',
    });
  }

  // Sort by score desc
  return risks.sort((a, b) => b.score - a.score);
}

// ─── Risk score bar ───────────────────────────────────────────────────────────

function RiskBar({ score, color }) {
  return (
    <div style={{ height: 3, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        height: '100%',
        width: `${Math.min(score, 100)}%`,
        background: color,
        borderRadius: 999,
        boxShadow: `0 0 6px ${color}`,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

// ─── Risk row ─────────────────────────────────────────────────────────────────

function RiskRow({ risk, index }) {
  const cfg = RISK_LEVEL[risk.level] || RISK_LEVEL.low;

  return (
    <div style={{
      padding: '13px 15px',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 5 }}>
        <div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 800, color: cfg.color, marginBottom: 3 }}>
            {risk.title}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{risk.description}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 15, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>
            {risk.score}
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)', textTransform: 'uppercase' }}>
            risk
          </div>
        </div>
      </div>
      <RiskBar score={risk.score} color={cfg.bar} />
      {risk.mitigation && (
        <div style={{
          marginTop: 8,
          padding: '6px 9px',
          background: 'rgba(8,15,30,0.45)',
          border: '1px solid var(--border)',
          borderRadius: 7,
          fontSize: 10,
          color: 'var(--muted)',
          lineHeight: 1.4,
        }}>
          <span style={{ color: 'var(--dim)', fontFamily: 'JetBrains Mono', fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: 5 }}>Mitigation:</span>
          {risk.mitigation}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)', textTransform: 'uppercase' }}>
          {risk.engine}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RiskCard({ executiveReport, chronosReport }) {
  const risks = deriveRisks(executiveReport, chronosReport);

  if (risks.length === 0) {
    return (
      <Card success>
        <CardHeader title="⬡ Risk Assessment" />
        <div style={{
          padding: 18,
          background: 'rgba(0,255,136,0.06)',
          border: '1px solid rgba(0,255,136,0.22)',
          borderRadius: 14,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 800, color: 'var(--green)', marginBottom: 6 }}>
            All Clear
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            No significant risks detected across all engines.
          </div>
        </div>
      </Card>
    );
  }

  const topRisk = risks[0];
  const topCfg  = RISK_LEVEL[topRisk.level] || RISK_LEVEL.low;

  return (
    <Card>
      <CardHeader title="⬡ Risk Assessment">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)' }}>
            {risks.length} risk{risks.length > 1 ? 's' : ''} detected
          </span>
          <span style={{
            fontFamily: 'Orbitron', fontSize: 9, fontWeight: 800,
            color: topCfg.color, textTransform: 'uppercase',
          }}>
            {topRisk.level}
          </span>
        </div>
      </CardHeader>

      <div style={{ display: 'grid', gap: 10 }}>
        {risks.map((risk, i) => (
          <RiskRow key={risk.id} risk={risk} index={i} />
        ))}
      </div>
    </Card>
  );
}
