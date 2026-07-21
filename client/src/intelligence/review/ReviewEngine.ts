/**
 * ReviewEngine.ts
 *
 * First stage of the Review → Reflect → Learn pipeline.
 *
 * Purpose: Summarize WHAT happened.
 * Produces metrics: commitment outcomes, time breakdown, workload comparison.
 *
 * Design constraints:
 *  - Read-only: never modifies commitments or any upstream report.
 *  - No engine dependencies: only consumes already-computed reports.
 *  - No side effects. Pure function.
 */

import type {
  ReviewEngineInput,
  ReviewReport,
  ReviewableCommitment,
  CommitmentBreakdown,
  TimeBreakdown,
  WorkloadComparison,
  WorkCategory,
  CommitmentOutcome,
} from './types';

// ─── Commitment category inference ───────────────────────────────────────────

const MEETING_TITLE_PATTERNS = /\b(meeting|standup|sync|call|interview|review|1:1|one.on.one|demo|presentation|webinar)\b/i;
const BREAK_TITLE_PATTERNS   = /\b(lunch|break|rest|nap|gym|exercise|walk|coffee|meal|dinner|breakfast|meditation)\b/i;
const ADMIN_TITLE_PATTERNS   = /\b(email|slack|admin|scheduling|planning|organiz|review docs?|review notes?)\b/i;
const DEEP_WORK_PATTERNS     = /\b(write|writing|code|coding|design|research|analyze|build|implement|develop|draft|create)\b/i;

/**
 * Infer a work category from commitment metadata.
 * Applied when workCategory is not explicitly set on the commitment.
 */
function inferWorkCategory(commitment: ReviewableCommitment): WorkCategory {
  if (commitment.workCategory) return commitment.workCategory;

  const title = (commitment.title ?? '').toLowerCase();
  const type  = (commitment.type ?? '').toLowerCase();
  const ctype = commitment.commitmentType;

  // LIFE_ANCHOR → break
  if (ctype === 'LIFE_ANCHOR') return 'break';

  // ONGOING_PROJECT → project
  if (ctype === 'ONGOING_PROJECT') return 'project';

  // ALL_DAY_EVENT → personal or other
  if (ctype === 'ALL_DAY_EVENT') return 'personal';

  // TIMED_EVENT: heuristic-based classification
  if (MEETING_TITLE_PATTERNS.test(title) || type === 'meeting') return 'meeting';
  if (BREAK_TITLE_PATTERNS.test(title))   return 'break';
  if (ADMIN_TITLE_PATTERNS.test(title))   return 'admin';
  if (DEEP_WORK_PATTERNS.test(title))     return 'deep_work';

  return 'other';
}

// ─── Duration resolution ──────────────────────────────────────────────────────

/**
 * Resolve the best available duration for a commitment.
 * Priority: actualMinutes > effectiveDurationMinutes > durationMinutes > duration.
 */
function resolveActualMinutes(commitment: ReviewableCommitment): number {
  if (commitment.actualMinutes != null && commitment.actualMinutes > 0) {
    return commitment.actualMinutes;
  }
  if (commitment.effectiveDurationMinutes != null && commitment.effectiveDurationMinutes > 0) {
    return commitment.effectiveDurationMinutes;
  }
  if (commitment.durationMinutes != null && commitment.durationMinutes > 0) {
    return commitment.durationMinutes;
  }
  if (commitment.duration != null && commitment.duration > 0) {
    return commitment.duration;
  }
  return 0;
}

/**
 * Resolve the planned duration for a commitment (never uses actualMinutes).
 */
function resolvePlannedMinutes(commitment: ReviewableCommitment): number {
  if (commitment.effectiveDurationMinutes != null && commitment.effectiveDurationMinutes > 0) {
    return commitment.effectiveDurationMinutes;
  }
  if (commitment.durationMinutes != null && commitment.durationMinutes > 0) {
    return commitment.durationMinutes;
  }
  if (commitment.duration != null && commitment.duration > 0) {
    return commitment.duration;
  }
  return 0;
}

// ─── Commitment breakdown ─────────────────────────────────────────────────────

function buildCommitmentBreakdown(commitments: ReviewableCommitment[]): CommitmentBreakdown {
  let completed  = 0;
  let missed     = 0;
  let deferred   = 0;
  let cancelled  = 0;
  let inProgress = 0;
  let planned    = 0;

  for (const c of commitments) {
    const outcome: CommitmentOutcome = c.outcome ?? 'planned';
    switch (outcome) {
      case 'completed':   completed++;   break;
      case 'missed':      missed++;      break;
      case 'deferred':    deferred++;    break;
      case 'cancelled':   cancelled++;   break;
      case 'in_progress': inProgress++;  break;
      case 'planned':     planned++;     break;
    }
  }

  const total = commitments.length;
  const actionable = total - cancelled - planned; // Commitments that were actually due
  const completionRate = actionable > 0 ? Math.round((completed / actionable) * 100) : 0;
  const deferralRate   = actionable > 0 ? Math.round((deferred  / actionable) * 100) : 0;

  return {
    planned: total,
    completed,
    missed,
    deferred,
    cancelled,
    inProgress,
    completionRate,
    deferralRate,
  };
}

// ─── Time breakdown ───────────────────────────────────────────────────────────

function buildTimeBreakdown(commitments: ReviewableCommitment[]): TimeBreakdown {
  let plannedMinutes  = 0;
  let actualMinutes   = 0;
  let meetingMinutes  = 0;
  let deepWorkMinutes = 0;
  let breakMinutes    = 0;
  let projectMinutes  = 0;
  let otherMinutes    = 0;
  let focusSessions   = 0;

  for (const c of commitments) {
    // Skip cancelled commitments from time calculations
    if (c.outcome === 'cancelled') continue;

    const planned = resolvePlannedMinutes(c);
    const actual  = resolveActualMinutes(c);
    const cat     = inferWorkCategory(c);

    plannedMinutes += planned;

    // Actual time: only count completed/in_progress commitments
    if (c.outcome === 'completed' || c.outcome === 'in_progress') {
      actualMinutes += actual;
    } else if (c.outcome === 'missed') {
      // Missed = 0 actual time
    } else if (c.outcome === 'deferred') {
      // Deferred = 0 actual time for this period
    } else {
      // 'planned' (no outcome set) — use estimated duration as proxy
      actualMinutes += actual;
    }

    // Category bucketing
    switch (cat) {
      case 'meeting':   meetingMinutes  += actual; break;
      case 'deep_work': deepWorkMinutes += actual; focusSessions++; break;
      case 'break':     breakMinutes    += actual; break;
      case 'project':   projectMinutes  += actual; focusSessions++; break;
      case 'admin':
      case 'personal':
      case 'other':     otherMinutes    += actual; break;
    }
  }

  const timeEfficiency = plannedMinutes > 0
    ? Math.min(1, parseFloat((actualMinutes / plannedMinutes).toFixed(2)))
    : 0;

  return {
    plannedMinutes,
    actualMinutes,
    timeEfficiency,
    meetingMinutes,
    deepWorkMinutes,
    breakMinutes,
    projectMinutes,
    otherMinutes,
    focusSessionCount: focusSessions,
  };
}

// ─── Workload comparison ──────────────────────────────────────────────────────

function buildWorkloadComparison(
  time: TimeBreakdown,
  capacityScore: number,
): WorkloadComparison {
  // Estimated load is the inverse of the capacity score
  // (capacity 80 = estimated load 20, capacity 30 = estimated load 70)
  const estimatedLoad = Math.round(100 - capacityScore);

  // Actual load: ratio of actual minutes used to a nominal 8-hour workday (480 min)
  const workdayMinutes = 480;
  const actualLoad = Math.min(100, Math.round((time.actualMinutes / workdayMinutes) * 100));

  const delta = actualLoad - estimatedLoad; // positive = more work than expected

  let estimationAccuracy: WorkloadComparison['estimationAccuracy'];
  if (Math.abs(delta) <= 10) {
    estimationAccuracy = 'accurate';
  } else if (delta > 10) {
    estimationAccuracy = 'underestimated';
  } else {
    estimationAccuracy = 'overestimated';
  }

  return {
    estimatedLoad,
    actualLoad,
    estimationDelta: delta,
    estimationAccuracy,
  };
}

// ─── Summary generation ───────────────────────────────────────────────────────

function buildReviewSummary(
  breakdown: CommitmentBreakdown,
  time: TimeBreakdown,
  workload: WorkloadComparison,
  period: string,
): string {
  const parts: string[] = [];

  parts.push(
    `Completed ${breakdown.completed} of ${breakdown.planned} commitments (${breakdown.completionRate}% completion rate).`
  );

  if (breakdown.deferred > 0) {
    parts.push(`${breakdown.deferred} deferred.`);
  }
  if (breakdown.missed > 0) {
    parts.push(`${breakdown.missed} missed.`);
  }

  const focusHours = Math.round((time.deepWorkMinutes + time.projectMinutes) / 60 * 10) / 10;
  const meetingHours = Math.round(time.meetingMinutes / 60 * 10) / 10;

  parts.push(`${focusHours}h focus, ${meetingHours}h meetings.`);

  if (workload.estimationAccuracy !== 'accurate') {
    const direction = workload.estimationAccuracy === 'underestimated'
      ? 'more work than planned'
      : 'less work than planned';
    parts.push(`Actual workload was ${direction} (Δ${Math.abs(workload.estimationDelta)}%).`);
  }

  return parts.join(' ');
}

// ─── ID generation ────────────────────────────────────────────────────────────

function generateId(prefix: string, periodStart: string): string {
  return `${prefix}-${periodStart.replace(/[^0-9]/g, '').slice(0, 8)}-${Date.now()}`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a ReviewReport from a ReviewEngineInput.
 *
 * Pure function. No side effects. Safe to call multiple times.
 */
export function generateReviewReport(input: ReviewEngineInput): ReviewReport {
  const {
    commitments,
    capacityReport,
    realityGapReport,
    conflictReport,
    rescueReport,
    period,
    periodStart,
    periodEnd,
  } = input;

  const breakdown = buildCommitmentBreakdown(commitments);
  const time      = buildTimeBreakdown(commitments);
  const workload  = buildWorkloadComparison(time, capacityReport.score);
  const summary   = buildReviewSummary(breakdown, time, workload, period);

  return {
    id: generateId('review', periodStart),
    generatedAt: new Date().toISOString(),
    period,
    periodStart,
    periodEnd,
    commitments: breakdown,
    time,
    workload,
    capacityScore:       capacityReport.score,
    realityGapSeverity:  realityGapReport.severity,
    conflictCount:       conflictReport.totalConflicts,
    rescueActivated:     rescueReport.activated,
    summary,
  };
}

// ─── Category helper (exported for use by ReflectionEngine) ──────────────────

export { inferWorkCategory, resolveActualMinutes, resolvePlannedMinutes };
