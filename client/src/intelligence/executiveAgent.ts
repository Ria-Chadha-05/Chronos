/**
 * executiveAgent.ts
 *
 * Executive Intelligence Layer for Chronos
 *
 * Acts as the AI brain that orchestrates all deterministic engines.
 * Consumes a ChronosReport, detects significance, prioritises events,
 * and produces ONE unified Executive Report consumed by the Dashboard.
 *
 * ▸ No business logic — only orchestration.
 * ▸ No engine imports — only ChronosReport consumption.
 * ▸ Pure function: accepts plain data, returns plain data.
 * ▸ No React, no context, no side-effects.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low' | 'normal';

export interface ExecutivePriority {
  rank: number;
  title: string;
  reason: string;
  urgency: UrgencyLevel;
  engine: string;
  actionable: boolean;
}

export interface ExecutiveAlert {
  id: string;
  type:
    | 'emergency'
    | 'blocker'
    | 'conflict'
    | 'capacity'
    | 'reality_gap'
    | 'rescue'
    | 'firefighter';
  title: string;
  body: string;
  urgency: UrgencyLevel;
  engine: string;
}

export interface ExecutiveRecommendation {
  id: string;
  title: string;
  body: string;
  source: string;
  urgency: UrgencyLevel;
}

export interface ExecutiveAction {
  id: string;
  label: string;
  type: string;
  urgency: UrgencyLevel;
  origin: string;
}

export interface ExecutiveReport {
  /** One-line situational summary for the user. */
  summary: string;
  /** Overall urgency of the current state. */
  urgency: UrgencyLevel;
  /** Ordered list of what the user should focus on first. */
  priorities: ExecutivePriority[];
  /** Active alerts requiring attention. */
  alerts: ExecutiveAlert[];
  /** Consolidated recommendations from all engines. */
  recommendations: ExecutiveRecommendation[];
  /** Concrete next actions the user can take immediately. */
  actions: ExecutiveAction[];
  /** Human-readable explanation of the executive's reasoning. */
  explanation: string;
  /** Which engines contributed to this report. */
  enginesUsed: string[];
  /** 0–100 confidence in the overall assessment. */
  confidence: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function urgencyScore(level: UrgencyLevel): number {
  const scores: Record<UrgencyLevel, number> = {
    critical: 100,
    high: 75,
    medium: 50,
    low: 25,
    normal: 0,
  };
  return scores[level] ?? 0;
}

function highestUrgency(levels: UrgencyLevel[]): UrgencyLevel {
  if (!levels.length) return 'normal';
  return levels.reduce((best, cur) =>
    urgencyScore(cur) > urgencyScore(best) ? cur : best,
  );
}

function slugId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

// ─── Significance detection ───────────────────────────────────────────────────

interface SignificanceFlags {
  isEmergency: boolean;
  hasBlockers: boolean;
  hasConflicts: boolean;
  isOverCapacity: boolean;
  hasHighRealityGap: boolean;
  rescueActivated: boolean;
  firefighterActive: boolean;
  hasCriticalBlockers: boolean;
}

function detectSignificance(report: any): SignificanceFlags {
  const ff = report.firefighterReport;
  const rescue = report.rescueReport;
  const blocker = report.blockerReport;
  const capacity = report.capacityReport;
  const reality = report.realityReport;
  const conflict = report.conflictReport;

  return {
    isEmergency:
      ff?.isActive === true ||
      ff?.emergencyScore?.level === 'critical' ||
      ff?.severity?.level === 'critical',
    hasBlockers: (blocker?.totalBlockedCount ?? 0) > 0,
    hasCriticalBlockers:
      (blocker?.criticalBlockers?.totalCritical ?? 0) > 0 ||
      blocker?.overallSeverity === 'critical',
    hasConflicts: (conflict?.totalConflicts ?? 0) > 0,
    isOverCapacity:
      (capacity?.score ?? 0) < 50 || capacity?.status === 'Overloaded',
    hasHighRealityGap:
      reality?.severity === 'High' || reality?.severity === 'Critical',
    rescueActivated: rescue?.activated === true,
    firefighterActive: ff?.isActive === true,
  };
}

// ─── Urgency computation ──────────────────────────────────────────────────────

function computeOverallUrgency(flags: SignificanceFlags): UrgencyLevel {
  if (flags.isEmergency || flags.hasCriticalBlockers) return 'critical';
  if (flags.rescueActivated || flags.firefighterActive) return 'high';
  if (flags.hasHighRealityGap || flags.isOverCapacity) return 'medium';
  if (flags.hasConflicts || flags.hasBlockers) return 'low';
  return 'normal';
}

// ─── Priority generation ──────────────────────────────────────────────────────

function buildPriorities(report: any, flags: SignificanceFlags): ExecutivePriority[] {
  const priorities: ExecutivePriority[] = [];
  let rank = 1;

  // Firefighter — highest priority
  if (flags.firefighterActive) {
    priorities.push({
      rank: rank++,
      title: '🔥 Emergency Mode Active',
      reason: report.firefighterReport?.triggerReason ?? 'Firefighter mode triggered.',
      urgency: 'critical',
      engine: 'Firefighter',
      actionable: true,
    });
  }

  // Rescue — second tier
  if (flags.rescueActivated) {
    const rr = report.rescueReport;
    priorities.push({
      rank: rank++,
      title: `🚨 Rescue Mode: ${rr?.severity ?? 'High'} Severity`,
      reason: rr?.summary ?? 'Schedule overload detected — rescue actions recommended.',
      urgency: rr?.severity === 'Critical' ? 'critical' : 'high',
      engine: 'Rescue',
      actionable: true,
    });
  }

  // Critical blockers
  if (flags.hasCriticalBlockers) {
    priorities.push({
      rank: rank++,
      title: `⛔ ${report.blockerReport.criticalBlockers.totalCritical} Critical Blockers`,
      reason: report.blockerReport.summary ?? 'Critical tasks are blocked and cannot proceed.',
      urgency: 'critical',
      engine: 'Blocker Breaker',
      actionable: true,
    });
  }

  // High reality gap
  if (flags.hasHighRealityGap) {
    const rr = report.realityReport;
    priorities.push({
      rank: rank++,
      title: `⚠ Reality Gap: ${rr?.severity ?? 'High'}`,
      reason: rr?.summary ?? 'Committed workload exceeds realistic capacity.',
      urgency: rr?.severity === 'High' ? 'high' : 'medium',
      engine: 'Reality Gap',
      actionable: true,
    });
  }

  // Capacity overload
  if (flags.isOverCapacity) {
    const cr = report.capacityReport;
    priorities.push({
      rank: rank++,
      title: `◎ Capacity Alert: ${cr?.status ?? 'Overloaded'}`,
      reason: cr?.recommendation ?? 'Today\'s schedule exceeds safe capacity limits.',
      urgency: 'medium',
      engine: 'Capacity',
      actionable: false,
    });
  }

  // Conflicts
  if (flags.hasConflicts) {
    const cfr = report.conflictReport;
    priorities.push({
      rank: rank++,
      title: `⚡ ${cfr?.totalConflicts} Scheduling Conflict${cfr?.totalConflicts > 1 ? 's' : ''}`,
      reason: cfr?.summary ?? 'Overlapping commitments require resolution.',
      urgency: cfr?.highSeverity ? 'high' : cfr?.mediumSeverity ? 'medium' : 'low',
      engine: 'Conflict',
      actionable: true,
    });
  }

  // Non-critical blockers
  if (flags.hasBlockers && !flags.hasCriticalBlockers) {
    priorities.push({
      rank: rank++,
      title: `⛔ ${report.blockerReport.totalBlockedCount} Blocked Tasks`,
      reason: report.blockerReport.summary ?? 'Some tasks are waiting on dependencies.',
      urgency: 'low',
      engine: 'Blocker Breaker',
      actionable: true,
    });
  }

  // Planner actions — always surface top action
  const plannerActions = report.plannerReport?.actions ?? [];
  if (plannerActions.length > 0 && rank <= 5) {
    const top = plannerActions[0];
    priorities.push({
      rank: rank++,
      title: `✦ Planner: ${top.title}`,
      reason: top.explanation ?? 'Recommended by the intelligent planner.',
      urgency: 'normal',
      engine: 'Planner',
      actionable: true,
    });
  }

  return priorities.slice(0, 7);
}

// ─── Alert generation ─────────────────────────────────────────────────────────

function buildAlerts(report: any, flags: SignificanceFlags): ExecutiveAlert[] {
  const alerts: ExecutiveAlert[] = [];
  let idx = 0;

  if (flags.firefighterActive) {
    const ff = report.firefighterReport;
    alerts.push({
      id: slugId('alert-ff', idx++),
      type: 'firefighter',
      title: '🔥 Firefighter Emergency',
      body: ff?.triggerReason ?? 'Emergency threshold exceeded.',
      urgency: 'critical',
      engine: 'Firefighter',
    });
  }

  if (flags.rescueActivated) {
    const rr = report.rescueReport;
    alerts.push({
      id: slugId('alert-rescue', idx++),
      type: 'rescue',
      title: '🚨 Rescue Mode Activated',
      body: rr?.summary ?? 'Schedule needs emergency triage.',
      urgency: rr?.severity === 'Critical' ? 'critical' : 'high',
      engine: 'Rescue',
    });
  }

  if (flags.hasCriticalBlockers) {
    alerts.push({
      id: slugId('alert-blocker', idx++),
      type: 'blocker',
      title: '⛔ Critical Blockers Detected',
      body: report.blockerReport?.summary ?? 'Critical tasks are blocked.',
      urgency: 'critical',
      engine: 'Blocker Breaker',
    });
  }

  if (flags.hasHighRealityGap) {
    const rr = report.realityReport;
    alerts.push({
      id: slugId('alert-reality', idx++),
      type: 'reality_gap',
      title: `⚠ Reality Gap — ${rr?.severity}`,
      body: rr?.summary ?? 'Workload exceeds capacity.',
      urgency: rr?.severity === 'High' ? 'high' : 'medium',
      engine: 'Reality Gap',
    });
  }

  if (flags.isOverCapacity) {
    alerts.push({
      id: slugId('alert-capacity', idx++),
      type: 'capacity',
      title: '◎ Capacity Overload',
      body: report.capacityReport?.recommendation ?? 'Reduce today\'s load.',
      urgency: 'medium',
      engine: 'Capacity',
    });
  }

  if (flags.hasConflicts) {
    const cfr = report.conflictReport;
    const topConflict = cfr?.conflicts?.[0];
    alerts.push({
      id: slugId('alert-conflict', idx++),
      type: 'conflict',
      title: `⚡ ${cfr?.totalConflicts} Conflict${cfr?.totalConflicts > 1 ? 's' : ''} Detected`,
      body: topConflict?.description ?? cfr?.summary ?? 'Scheduling conflicts require attention.',
      urgency: cfr?.highSeverity ? 'high' : 'medium',
      engine: 'Conflict',
    });
  }

  return alerts;
}

// ─── Recommendation consolidation ────────────────────────────────────────────

function buildRecommendations(report: any, flags: SignificanceFlags): ExecutiveRecommendation[] {
  const recs: ExecutiveRecommendation[] = [];
  let idx = 0;

  // Firefighter recovery
  if (flags.firefighterActive) {
    const ff = report.firefighterReport;
    const keep = ff?.recovery?.keepList ?? [];
    const defer = ff?.recovery?.deferList ?? [];
    if (keep.length > 0) {
      recs.push({
        id: slugId('rec-ff-keep', idx++),
        title: `Keep ${keep.length} commitment${keep.length > 1 ? 's' : ''} today`,
        body: `Firefighter recommends protecting: ${keep.slice(0, 3).map((t: any) => t.title || t.name).filter(Boolean).join(', ')}.`,
        source: 'Firefighter',
        urgency: 'critical',
      });
    }
    if (defer.length > 0) {
      recs.push({
        id: slugId('rec-ff-defer', idx++),
        title: `Defer ${defer.length} commitment${defer.length > 1 ? 's' : ''}`,
        body: `Emergency plan: defer ${defer.slice(0, 3).map((t: any) => t.title || t.name).filter(Boolean).join(', ')}.`,
        source: 'Firefighter',
        urgency: 'critical',
      });
    }
  }

  // Rescue actions
  if (flags.rescueActivated) {
    const rr = report.rescueReport;
    const actions = rr?.actions ?? [];
    actions.slice(0, 3).forEach((action: any) => {
      recs.push({
        id: slugId('rec-rescue', idx++),
        title: action.title ?? 'Rescue action',
        body: action.explanation ?? '',
        source: 'Rescue',
        urgency: rr?.severity === 'Critical' ? 'critical' : 'high',
      });
    });
  }

  // Blocker suggestions
  if (flags.hasBlockers) {
    const blockedTasks = report.blockerReport?.blockedTasks ?? [];
    blockedTasks.slice(0, 2).forEach((task: any) => {
      const suggestion = task._blocker?.suggestion ?? task._blocker?.description;
      if (suggestion) {
        recs.push({
          id: slugId('rec-blocker', idx++),
          title: `Unblock: ${task.title || task.name}`,
          body: suggestion,
          source: 'Blocker Breaker',
          urgency: 'medium',
        });
      }
    });
  }

  // Planner recommendations
  const plannerActions = report.plannerReport?.actions ?? [];
  plannerActions.slice(0, 3).forEach((action: any) => {
    recs.push({
      id: slugId('rec-planner', idx++),
      title: action.title,
      body: action.explanation ?? '',
      source: 'Planner',
      urgency: 'normal',
    });
  });

  // Capacity recommendation
  if (report.capacityReport?.recommendation) {
    recs.push({
      id: slugId('rec-capacity', idx++),
      title: 'Capacity Guidance',
      body: report.capacityReport.recommendation,
      source: 'Capacity',
      urgency: flags.isOverCapacity ? 'medium' : 'normal',
    });
  }

  return recs.slice(0, 10);
}

// ─── Action generation ────────────────────────────────────────────────────────

function buildActions(report: any, flags: SignificanceFlags): ExecutiveAction[] {
  const actions: ExecutiveAction[] = [];
  let idx = 0;

  if (flags.firefighterActive) {
    actions.push({
      id: slugId('act-ff', idx++),
      label: 'Open Firefighter Recovery Plan',
      type: 'navigate',
      urgency: 'critical',
      origin: 'Firefighter',
    });
  }

  if (flags.rescueActivated) {
    actions.push({
      id: slugId('act-rescue', idx++),
      label: 'View Rescue Actions',
      type: 'navigate',
      urgency: 'high',
      origin: 'Rescue',
    });
  }

  if (flags.hasBlockers) {
    actions.push({
      id: slugId('act-blocker', idx++),
      label: 'Review Blocked Tasks',
      type: 'navigate',
      urgency: flags.hasCriticalBlockers ? 'critical' : 'medium',
      origin: 'Blocker Breaker',
    });
  }

  if (flags.hasConflicts) {
    actions.push({
      id: slugId('act-conflict', idx++),
      label: 'Resolve Scheduling Conflicts',
      type: 'navigate',
      urgency: 'medium',
      origin: 'Conflict',
    });
  }

  // Always offer planning
  actions.push({
    id: slugId('act-plan', idx++),
    label: 'Generate Today\'s Plan',
    type: 'action',
    urgency: 'normal',
    origin: 'Planner',
  });

  return actions;
}

// ─── Summary generation ───────────────────────────────────────────────────────

function buildSummary(report: any, flags: SignificanceFlags, urgency: UrgencyLevel): string {
  const todayCount = report.meta?.todayCommitmentCount ?? 0;
  const totalCount = report.meta?.totalCommitments ?? 0;

  if (todayCount === 0) {
    return 'No commitments today — a good opportunity to plan, rest, or get ahead.';
  }

  const parts: string[] = [];

  if (flags.firefighterActive) {
    parts.push(`Emergency mode active with ${todayCount} commitments`);
  } else if (flags.rescueActivated) {
    parts.push(`Rescue mode: ${report.rescueReport?.severity} overload on ${todayCount} commitments`);
  } else {
    const capScore = Math.round(report.capacityReport?.score ?? 0);
    parts.push(`${todayCount} commitments today at ${capScore}% capacity`);
  }

  if (flags.hasCriticalBlockers) {
    parts.push(`${report.blockerReport.criticalBlockers.totalCritical} critical blockers need immediate attention`);
  } else if (flags.hasBlockers) {
    parts.push(`${report.blockerReport.totalBlockedCount} tasks are blocked`);
  }

  if (flags.hasConflicts) {
    parts.push(`${report.conflictReport.totalConflicts} scheduling conflicts detected`);
  }

  if (flags.hasHighRealityGap) {
    parts.push(`reality gap is ${report.realityReport.severity}`);
  }

  const completionPct = report.completionStats?.pct ?? 0;
  if (completionPct > 0) {
    parts.push(`${completionPct}% completion rate`);
  }

  return parts.length > 0 ? parts.join(' · ') + '.' : `Managing ${totalCount} commitments with ${todayCount} scheduled today.`;
}

// ─── Explanation generation ───────────────────────────────────────────────────

function buildExplanation(
  flags: SignificanceFlags,
  priorities: ExecutivePriority[],
  enginesUsed: string[],
  urgency: UrgencyLevel,
): string {
  const lines: string[] = [];

  lines.push(`The Executive AI assessed ${enginesUsed.length} intelligence engine${enginesUsed.length > 1 ? 's' : ''}: ${enginesUsed.join(', ')}.`);

  if (urgency === 'critical') {
    lines.push('A critical situation was detected. Immediate action is required.');
  } else if (urgency === 'high') {
    lines.push('Elevated urgency detected. Review priority recommendations promptly.');
  } else if (urgency === 'medium') {
    lines.push('Moderate issues detected. Attention recommended before they escalate.');
  } else {
    lines.push('No critical issues detected. Schedule is within manageable parameters.');
  }

  if (priorities.length > 0) {
    lines.push(`Top priority: ${priorities[0].title} — ${priorities[0].reason}`);
  }

  if (flags.firefighterActive) {
    lines.push('Firefighter engine activated: emergency compression and delegation plan generated.');
  }

  if (flags.rescueActivated) {
    lines.push('Rescue engine activated: triage actions generated to protect key commitments.');
  }

  if (flags.hasCriticalBlockers) {
    lines.push('Blocker Breaker detected critical dependencies blocking forward progress.');
  }

  return lines.join(' ');
}

// ─── Confidence scoring ───────────────────────────────────────────────────────

function computeConfidence(report: any, enginesUsed: string[]): number {
  const totalCount = report.meta?.totalCommitments ?? 0;
  let confidence = 50;

  // More data → more confident
  if (totalCount >= 10) confidence += 20;
  else if (totalCount >= 5) confidence += 10;

  // More engines used → more confident
  confidence += Math.min(enginesUsed.length * 4, 20);

  // Firefighter and rescue are deterministic → high confidence
  if (report.firefighterReport?.isActive) confidence += 5;
  if (report.rescueReport?.activated) confidence += 5;

  return Math.min(confidence, 99);
}

// ─── Engines used detection ───────────────────────────────────────────────────

function detectEnginesUsed(report: any): string[] {
  const engines: string[] = [];

  if (report.capacityReport) engines.push('Capacity');
  if (report.realityReport) engines.push('Reality Gap');
  if (report.conflictReport) engines.push('Conflict');
  if (report.plannerReport) engines.push('Planner');
  if (report.rescueReport) engines.push('Rescue');
  if (report.blockerReport) engines.push('Blocker Breaker');
  if (report.firefighterReport) engines.push('Firefighter');

  return engines;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate the Executive Report from a fully-assembled ChronosReport.
 *
 * @param chronosReport - Output of generateChronosReport()
 * @returns ExecutiveReport
 */
export function generateExecutiveReport(chronosReport: any): ExecutiveReport {
  if (!chronosReport) {
    return {
      summary: 'No data available.',
      urgency: 'normal',
      priorities: [],
      alerts: [],
      recommendations: [],
      actions: [],
      explanation: 'No Chronos report provided to the Executive AI.',
      enginesUsed: [],
      confidence: 0,
    };
  }

  const flags = detectSignificance(chronosReport);
  const urgency = computeOverallUrgency(flags);
  const enginesUsed = detectEnginesUsed(chronosReport);
  const priorities = buildPriorities(chronosReport, flags);
  const alerts = buildAlerts(chronosReport, flags);
  const recommendations = buildRecommendations(chronosReport, flags);
  const actions = buildActions(chronosReport, flags);
  const summary = buildSummary(chronosReport, flags, urgency);
  const explanation = buildExplanation(flags, priorities, enginesUsed, urgency);
  const confidence = computeConfidence(chronosReport, enginesUsed);

  return {
    summary,
    urgency,
    priorities,
    alerts,
    recommendations,
    actions,
    explanation,
    enginesUsed,
    confidence,
  };
}

/**
 * Empty/fallback executive report used before the pipeline runs.
 */
export const EMPTY_EXECUTIVE_REPORT: ExecutiveReport = {
  summary: 'Initialising Executive Intelligence…',
  urgency: 'normal',
  priorities: [],
  alerts: [],
  recommendations: [],
  actions: [],
  explanation: '',
  enginesUsed: [],
  confidence: 0,
};
