/**
 * ReflectionEngine.ts
 *
 * Second stage of the Review → Reflect → Learn pipeline.
 *
 * Purpose: Explain WHY things happened.
 * Produces human-readable insights about what drove the outcomes in ReviewReport.
 *
 * Design constraints:
 *  - Read-only: consumes ReviewReport and ReviewEngineInput only.
 *  - Deterministic: all insights are derived from hard data thresholds.
 *  - No mutation of upstream state.
 *  - No external dependencies.
 */

import type {
  ReviewEngineInput,
  ReviewReport,
  ReflectionReport,
  ReflectionInsight,
  InsightCategory,
} from './types';

// ─── Threshold constants ──────────────────────────────────────────────────────

const THRESHOLDS = {
  // Time composition
  meetingLoadWarning:    0.40, // Meetings > 40% of actual time → warning
  meetingLoadCritical:   0.60, // Meetings > 60% → critical
  deepWorkLow:           0.20, // Deep work < 20% of actual time → concern
  deepWorkGood:          0.40, // Deep work > 40% → positive
  breakAbsence:          0.05, // Breaks < 5% of actual time → concern

  // Completion rates
  completionExcellent:   85,   // ≥ 85% completion → very good
  completionGood:        70,   // ≥ 70% → good
  completionWarning:     50,   // < 50% → warning
  completionCritical:    30,   // < 30% → critical

  // Deferral rates
  deferralWarning:       30,   // > 30% deferral rate → warning
  deferralCritical:      50,   // > 50% → critical

  // Estimation accuracy
  estimationWarningDelta: 20,  // Actual vs planned delta > 20% → warning

  // Capacity
  capacityOverloaded:    40,   // Capacity score < 40 → overloaded
  capacityHealthy:       70,   // Capacity score > 70 → healthy

  // Meetings
  meetingHoursWarning:   4,    // > 4h meetings in a day → concern
  meetingHoursCritical:  6,    // > 6h → critical

  // Reality gap
  deepWorkMinMinutes:    60,   // Less than 1 hour deep work → concern

  // Context switching
  switchCountWarning:    6,    // > 6 switches → concern
} as const;

// ─── Insight builders ─────────────────────────────────────────────────────────

let _insightIdCounter = 0;
function insightId(category: InsightCategory): string {
  return `reflect-${category}-${++_insightIdCounter}-${Date.now()}`;
}

function makeInsight(
  category: InsightCategory,
  title: string,
  body: string,
  severity: ReflectionInsight['severity'],
  dataPoint?: string,
): ReflectionInsight {
  return { id: insightId(category), category, title, body, severity, dataPoint };
}

// ─── Individual insight detectors ────────────────────────────────────────────

function detectCompletionInsights(
  review: ReviewReport,
  positives: ReflectionInsight[],
  issues: ReflectionInsight[],
  observations: ReflectionInsight[],
): void {
  const { completionRate, completed, missed, deferred, planned } = review.commitments;

  if (completionRate >= THRESHOLDS.completionExcellent) {
    positives.push(makeInsight(
      'completion',
      'Excellent completion rate',
      `You completed ${completed} of ${planned} commitments — a ${completionRate}% completion rate. This reflects strong execution and realistic planning.`,
      'positive',
      `${completionRate}% completion`,
    ));
  } else if (completionRate >= THRESHOLDS.completionGood) {
    positives.push(makeInsight(
      'completion',
      'Good completion rate',
      `${completionRate}% of commitments completed. Most of your planned work got done.`,
      'positive',
      `${completionRate}% completion`,
    ));
  } else if (completionRate < THRESHOLDS.completionCritical) {
    issues.push(makeInsight(
      'completion',
      'Very low completion rate',
      `Only ${completionRate}% of planned commitments were completed (${completed} of ${planned}). This may indicate planning was too ambitious, unexpected disruptions occurred, or commitments need to be sized more realistically.`,
      'critical',
      `${completionRate}% completion — ${missed} missed, ${deferred} deferred`,
    ));
  } else if (completionRate < THRESHOLDS.completionWarning) {
    issues.push(makeInsight(
      'completion',
      'Below average completion rate',
      `${completionRate}% completion rate with ${missed} missed and ${deferred} deferred commitments. Review whether the planned load was realistic.`,
      'warning',
      `${completionRate}% completion`,
    ));
  }
}

function detectMeetingInsights(
  review: ReviewReport,
  positives: ReflectionInsight[],
  issues: ReflectionInsight[],
  observations: ReflectionInsight[],
): void {
  const { meetingMinutes, actualMinutes, deepWorkMinutes } = review.time;

  if (actualMinutes === 0) return;

  const meetingRatio   = meetingMinutes / actualMinutes;
  const meetingHours   = Math.round(meetingMinutes / 60 * 10) / 10;
  const deepWorkHours  = Math.round(deepWorkMinutes / 60 * 10) / 10;

  if (meetingRatio >= THRESHOLDS.meetingLoadCritical) {
    issues.push(makeInsight(
      'meetings',
      'Meetings dominated the schedule',
      `Meetings consumed ${Math.round(meetingRatio * 100)}% of your working time (${meetingHours}h). This severely limits time for deep, focused work. Consider auditing recurring meetings or batching them to protect focus blocks.`,
      'critical',
      `${meetingHours}h meetings vs ${deepWorkHours}h deep work`,
    ));
  } else if (meetingRatio >= THRESHOLDS.meetingLoadWarning) {
    issues.push(makeInsight(
      'meetings',
      'High meeting load reduced focus time',
      `${Math.round(meetingRatio * 100)}% of your time was in meetings (${meetingHours}h). Deep work suffered as a result. Try to consolidate meetings or create meeting-free blocks.`,
      'warning',
      `${meetingHours}h meetings`,
    ));
  } else if (meetingHours > 0) {
    observations.push(makeInsight(
      'meetings',
      'Meeting load was manageable',
      `${meetingHours}h spent in meetings — within a reasonable range relative to total work time.`,
      'neutral',
      `${meetingHours}h (${Math.round(meetingRatio * 100)}% of work time)`,
    ));
  }
}

function detectFocusInsights(
  review: ReviewReport,
  positives: ReflectionInsight[],
  issues: ReflectionInsight[],
  observations: ReflectionInsight[],
): void {
  const { deepWorkMinutes, projectMinutes, actualMinutes, focusSessionCount } = review.time;
  const totalFocusMinutes = deepWorkMinutes + projectMinutes;
  const focusRatio = actualMinutes > 0 ? totalFocusMinutes / actualMinutes : 0;
  const focusHours = Math.round(totalFocusMinutes / 60 * 10) / 10;

  if (focusRatio >= THRESHOLDS.deepWorkGood) {
    positives.push(makeInsight(
      'focus',
      'Strong deep work ratio',
      `${Math.round(focusRatio * 100)}% of your time went to focused, high-value work (${focusHours}h across ${focusSessionCount} session${focusSessionCount !== 1 ? 's' : ''}). This is excellent for sustained output.`,
      'positive',
      `${focusHours}h focus across ${focusSessionCount} sessions`,
    ));
  } else if (focusRatio < THRESHOLDS.deepWorkLow && actualMinutes > 120) {
    issues.push(makeInsight(
      'focus',
      'Deep work time was critically low',
      `Only ${Math.round(focusRatio * 100)}% of working time was focused, uninterrupted work (${focusHours}h). Most of your mental energy went elsewhere. Protecting even one 90-minute focus block per day can significantly increase output.`,
      'warning',
      `${focusHours}h deep work (${Math.round(focusRatio * 100)}% of work time)`,
    ));
  }

  // Context interruption signal from capacity engine
  const switchCount = (review as any)._switchCount;
  if (typeof switchCount === 'number' && switchCount >= THRESHOLDS.switchCountWarning) {
    issues.push(makeInsight(
      'focus',
      'Frequent context switching detected',
      `High context switching reduces cognitive performance by 20–40%. Consider batching similar tasks and reducing mid-task interruptions.`,
      'warning',
      `${switchCount} context switches`,
    ));
  }
}

function detectEstimationInsights(
  review: ReviewReport,
  positives: ReflectionInsight[],
  issues: ReflectionInsight[],
  observations: ReflectionInsight[],
): void {
  const { estimationAccuracy, estimationDelta, estimatedLoad, actualLoad } = review.workload;

  if (estimationAccuracy === 'accurate') {
    positives.push(makeInsight(
      'estimation',
      'Workload was accurately estimated',
      `Planned and actual workload were within 10% of each other (estimated ${estimatedLoad}%, actual ${actualLoad}%). Good calibration.`,
      'positive',
      `Estimated ${estimatedLoad}% vs Actual ${actualLoad}%`,
    ));
  } else if (estimationAccuracy === 'underestimated') {
    issues.push(makeInsight(
      'estimation',
      'Workload was underestimated',
      `Actual work demand exceeded the plan by ${Math.abs(estimationDelta)}% (estimated ${estimatedLoad}%, actual ${actualLoad}%). Tasks likely took longer than expected. Consider adding buffer time when planning.`,
      'warning',
      `Underestimated by ${Math.abs(estimationDelta)}%`,
    ));
  } else {
    observations.push(makeInsight(
      'estimation',
      'Workload was overestimated',
      `Planned for more than was actually needed (estimated ${estimatedLoad}%, actual ${actualLoad}%). This can be positive (buffer time) or may indicate over-scheduling. You had more capacity than used.`,
      'neutral',
      `Overestimated by ${Math.abs(estimationDelta)}%`,
    ));
  }
}

function detectPostponementInsights(
  review: ReviewReport,
  positives: ReflectionInsight[],
  issues: ReflectionInsight[],
  observations: ReflectionInsight[],
): void {
  const { deferralRate, deferred, planned } = review.commitments;

  if (deferralRate >= THRESHOLDS.deferralCritical) {
    issues.push(makeInsight(
      'postponement',
      'High deferral rate — planning may be too optimistic',
      `${deferralRate}% of commitments were deferred (${deferred} of ${planned}). Recurring deferral is a signal that capacity is consistently overestimated. Consider reducing planned commitments or sizing tasks more conservatively.`,
      'critical',
      `${deferralRate}% deferral rate`,
    ));
  } else if (deferralRate >= THRESHOLDS.deferralWarning) {
    issues.push(makeInsight(
      'postponement',
      'Notable deferral rate',
      `${deferralRate}% of commitments were pushed to a later period. Some deferral is healthy, but recurring high rates suggest planning calibration may be needed.`,
      'warning',
      `${deferralRate}% deferral`,
    ));
  }
}

function detectRecoveryInsights(
  review: ReviewReport,
  positives: ReflectionInsight[],
  issues: ReflectionInsight[],
  observations: ReflectionInsight[],
): void {
  const { breakMinutes, actualMinutes } = review.time;

  if (actualMinutes < 60) return; // Not enough data

  const breakRatio = breakMinutes / actualMinutes;
  const breakHours = Math.round(breakMinutes / 60 * 10) / 10;

  if (breakRatio < THRESHOLDS.breakAbsence && actualMinutes > 240) {
    issues.push(makeInsight(
      'recovery',
      'Insufficient recovery time',
      `Less than 5% of working time was spent on recovery or breaks (${breakHours}h). Sustained work without recovery reduces cognitive performance and increases error rates. Schedule deliberate breaks.`,
      'warning',
      `${breakHours}h breaks (${Math.round(breakRatio * 100)}% of time)`,
    ));
  } else if (breakRatio > 0.15 && breakMinutes > 60) {
    positives.push(makeInsight(
      'recovery',
      'Good recovery habits',
      `${breakHours}h of recovery time observed. Deliberate breaks support sustained performance.`,
      'positive',
      `${breakHours}h recovery`,
    ));
  }
}

function detectOverloadInsights(
  review: ReviewReport,
  positives: ReflectionInsight[],
  issues: ReflectionInsight[],
  observations: ReflectionInsight[],
): void {
  if (review.rescueActivated) {
    issues.push(makeInsight(
      'overload',
      'Rescue mode was triggered',
      `The schedule reached an overload level requiring rescue triage. This indicates planning significantly exceeded realistic capacity. Building buffer time and monitoring capacity score before committing can prevent this.`,
      'critical',
      'Rescue engine activated',
    ));
  }

  if (review.capacityScore < THRESHOLDS.capacityOverloaded) {
    issues.push(makeInsight(
      'overload',
      'Capacity was critically low',
      `Capacity score was ${Math.round(review.capacityScore)}%, well below healthy levels. High cognitive load and insufficient recovery likely reduced effectiveness.`,
      'warning',
      `Capacity: ${Math.round(review.capacityScore)}%`,
    ));
  } else if (review.capacityScore >= THRESHOLDS.capacityHealthy) {
    positives.push(makeInsight(
      'overload',
      'Healthy capacity maintained',
      `Capacity score was ${Math.round(review.capacityScore)}% — in the healthy range. The schedule was appropriately loaded.`,
      'positive',
      `Capacity: ${Math.round(review.capacityScore)}%`,
    ));
  }

  if (review.conflictCount > 0) {
    issues.push(makeInsight(
      'overload',
      `${review.conflictCount} scheduling conflict${review.conflictCount > 1 ? 's' : ''} occurred`,
      `Overlapping commitments create cognitive load and force reactive decisions. Review scheduling process to build in buffer between commitments.`,
      review.conflictCount >= 3 ? 'critical' : 'warning',
      `${review.conflictCount} conflicts`,
    ));
  }
}

// ─── Narrative generator ──────────────────────────────────────────────────────

function buildNarrative(
  positives: ReflectionInsight[],
  issues: ReflectionInsight[],
  observations: ReflectionInsight[],
  review: ReviewReport,
): string {
  const lines: string[] = [];
  const { completionRate } = review.commitments;
  const focusHours = Math.round((review.time.deepWorkMinutes + review.time.projectMinutes) / 60 * 10) / 10;
  const meetingHours = Math.round(review.time.meetingMinutes / 60 * 10) / 10;

  // Open with completion
  if (completionRate >= THRESHOLDS.completionGood) {
    lines.push(`This was a productive ${review.period} — ${completionRate}% of planned commitments were completed.`);
  } else {
    lines.push(`Completion was below target at ${completionRate}% for the ${review.period}.`);
  }

  // Focus vs meetings
  if (meetingHours > focusHours && meetingHours > 2) {
    lines.push(`Meetings (${meetingHours}h) outweighed focused work (${focusHours}h), which likely compressed execution time.`);
  } else if (focusHours >= 3) {
    lines.push(`${focusHours}h of focused work was achieved — a meaningful contribution to high-value output.`);
  }

  // Top issue
  const criticalIssue = issues.find(i => i.severity === 'critical');
  const warningIssue  = issues.find(i => i.severity === 'warning');
  if (criticalIssue) {
    lines.push(`The most important pattern to address: ${criticalIssue.title.toLowerCase()}.`);
  } else if (warningIssue) {
    lines.push(`Key area for improvement: ${warningIssue.title.toLowerCase()}.`);
  }

  // Top positive
  const topPositive = positives[0];
  if (topPositive) {
    lines.push(`Notable strength: ${topPositive.title.toLowerCase()}.`);
  }

  return lines.join(' ');
}

// ─── ID generation ────────────────────────────────────────────────────────────

function generateId(prefix: string, periodStart: string): string {
  return `${prefix}-${periodStart.replace(/[^0-9]/g, '').slice(0, 8)}-${Date.now()}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a ReflectionReport from a completed ReviewReport.
 *
 * Pure function. No side effects.
 */
export function generateReflectionReport(
  reviewReport: ReviewReport,
  input: ReviewEngineInput,
): ReflectionReport {
  const positives:    ReflectionInsight[] = [];
  const issues:       ReflectionInsight[] = [];
  const observations: ReflectionInsight[] = [];

  // Reset counter per report generation
  _insightIdCounter = 0;

  detectCompletionInsights(reviewReport, positives, issues, observations);
  detectMeetingInsights(reviewReport, positives, issues, observations);
  detectFocusInsights(reviewReport, positives, issues, observations);
  detectEstimationInsights(reviewReport, positives, issues, observations);
  detectPostponementInsights(reviewReport, positives, issues, observations);
  detectRecoveryInsights(reviewReport, positives, issues, observations);
  detectOverloadInsights(reviewReport, positives, issues, observations);

  const narrative = buildNarrative(positives, issues, observations, reviewReport);

  return {
    id: generateId('reflection', reviewReport.periodStart),
    generatedAt: new Date().toISOString(),
    period: reviewReport.period,
    periodStart: reviewReport.periodStart,
    periodEnd: reviewReport.periodEnd,
    positives,
    issues,
    observations,
    narrative,
  };
}
