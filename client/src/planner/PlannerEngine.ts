/**
 * PlannerEngine.ts
 *
 * Generates the PlannerReport from all input signals.
 *
 * Pipeline (in evaluation order):
 *   Capacity  → capacityReport        (overload detection, recovery scoring)
 *   Reality   → realityGapReport      (achievability assessment)
 *   Conflicts → conflictReport        (overlap resolution)
 *   Blockers  → blockerReport         (blocked task exclusion)
 *   Rescue    → rescueSignal          (pre-activation protection/deferral)
 *   Firefighter → firefighterSignal   (emergency keep/defer classification)
 *   Consequence → consequenceSignal   (downstream-impact protection)
 *
 * Each signal is pre-computed in chronosReport.js before this function runs.
 * This function is a pure consumer — it never calls any engine directly.
 */

import type { PlannerInput, PlannerReport } from './PlannerTypes';
import type { BlockerReport } from '../blocker';
import { enrichCommitments } from './PlannerUtils';
import { getBlockedTaskIds } from '../blocker';
import {
  ruleProtectFixed,
  ruleKeepImportant,
  ruleMoveConflicted,
  rulePostponeFlexible,
  ruleRecoveryBreak,
  ruleFocusBlock,
  ruleScheduleProjectWork,
  ruleBlockedTasks,
  ruleRescueMode,
  ruleFirefighterMode,
  ruleConsequenceProtection,
} from './PlannerRules';

// ─── Score calculation ────────────────────────────────────────────────────────
//
// Start at 100.
//   – Each high-severity conflict   → –15
//   – Each medium-severity conflict → –8
//   – Each low-severity conflict    → –3
//   – Capacity score weight         → ×0.4
//   – Reality severity penalty      → High: –20 / Medium: –10 / Low: –0
//   – Recovery penalty              → if recoveryScore < 50: –10

function computePlannerScore(
  capacityReport: PlannerInput['capacityReport'],
  realityGapReport: PlannerInput['realityGapReport'],
  conflictReport: PlannerInput['conflictReport'],
  blockerReport?: PlannerInput['blockerReport'],
): number {
  let score = 100;

  score -= conflictReport.highSeverity * 15;
  score -= conflictReport.mediumSeverity * 8;
  score -= conflictReport.lowSeverity * 3;

  if (realityGapReport.severity === 'High') score -= 20;
  else if (realityGapReport.severity === 'Medium') score -= 10;

  score = score * 0.7 + capacityReport.score * 0.3;

  if (capacityReport.recoveryScore < 50) score -= 10;

  if (blockerReport?.totalBlockedCount) {
    score -= Math.min(15, blockerReport.totalBlockedCount * 3);
    if (blockerReport.overallSeverity === 'critical') score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── Summary text ─────────────────────────────────────────────────────────────

function buildSummary(
  score: number,
  conflictReport: PlannerInput['conflictReport'],
  realityGapReport: PlannerInput['realityGapReport'],
  fixedCount: number,
  postponeCount: number,
): string {
  if (score >= 90) return 'Excellent plan. Your schedule is well-structured and achievable.';
  if (score >= 80) {
    return postponeCount
      ? `Good day ahead. ${postponeCount} flexible item${postponeCount > 1 ? 's' : ''} moved to protect your core commitments.`
      : 'Good day ahead with no major issues detected.';
  }
  if (score >= 60) {
    const parts: string[] = [];
    if (conflictReport.totalConflicts) parts.push(`${conflictReport.totalConflicts} conflict${conflictReport.totalConflicts > 1 ? 's' : ''} need attention`);
    if (realityGapReport.severity !== 'Low') parts.push(`reality gap is ${realityGapReport.severity.toLowerCase()}`);
    return `Schedule needs adjustment — ${parts.join(' and ')}.`;
  }
  if (score >= 40) {
    return `High overload detected. ${fixedCount} fixed commitment${fixedCount !== 1 ? 's' : ''} protected. Recommend postponing all optional tasks.`;
  }
  return 'Critical load. Today is a survival mode day. Protect only the non-negotiable and rest everything.';
}

/** Scope blocker report to commitments scheduled today (planner operates on today's plan). */
function filterBlockerReportForToday(
  report: BlockerReport | undefined,
  todayCommitmentIds: Set<string>,
): BlockerReport | undefined {
  if (!report?.totalBlockedCount) return report;

  const blockedTasks = report.blockedTasks.filter(
    t => t.id && todayCommitmentIds.has(t.id),
  );
  if (blockedTasks.length === 0) return undefined;

  const blockedIdSet = new Set(blockedTasks.map(t => t.id as string));
  return {
    ...report,
    blockedTasks,
    suggestions: (report.suggestions ?? []).filter(s => blockedIdSet.has(s.taskId)),
    totalBlockedCount: blockedTasks.length,
  };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function generatePlannerReport(input: PlannerInput): PlannerReport {
  console.info('[Planner] Planner started');
  console.info('[Planner] Reading Capacity Report', { score: input.capacityReport.score, status: input.capacityReport.status });
  console.info('[Planner] Reading Reality Report', { severity: input.realityGapReport.severity });
  console.info('[Planner] Reading Conflict Report', { totalConflicts: input.conflictReport.totalConflicts });
  if (input.blockerReport?.totalBlockedCount) {
    console.info('[Planner] Reading Blocker Report', {
      totalBlocked: input.blockerReport.totalBlockedCount,
      severity: input.blockerReport.overallSeverity,
    });
  }
  if (input.rescueSignal?.willActivate) {
    console.info('[Planner] Rescue pre-signal active', {
      protected: input.rescueSignal.protectedIds.size,
      deferCandidates: input.rescueSignal.deferCandidateIds.size,
    });
  }
  if (input.firefighterSignal?.isActive) {
    console.info('[Planner] Firefighter pre-signal active', {
      keep: input.firefighterSignal.keepIds.size,
      defer: input.firefighterSignal.deferIds.size,
    });
  }
  if (input.consequenceSignal) {
    console.info('[Planner] Consequence pre-signal', {
      highConsequence: input.consequenceSignal.highConsequenceIds.size,
      lowConsequence:  input.consequenceSignal.lowConsequenceIds.size,
    });
  }
  console.info('[Planner] Generating recommendations');

  // Step 1 – Enrich commitments with category + parsed times
  const enriched = enrichCommitments(input.commitments);
  const todayIds = new Set(enriched.map(c => c.id).filter((id): id is string => Boolean(id)));
  const todayBlockerReport = filterBlockerReportForToday(input.blockerReport, todayIds);

  // Blocked tasks must never be scheduled as actionable work
  const blockedIds = getBlockedTaskIds(todayBlockerReport);
  const schedulable = blockedIds.size
    ? enriched.filter(c => !c.id || !blockedIds.has(c.id))
    : enriched;

  // Step 2 – Apply rules in priority order
  //
  // Priority tier 1 (highest): emergency + consequence signals
  //   These override normal scheduling — they come first so subsequent
  //   rules can see which commitments are already committed.
  //
  // Priority tier 2: structural rules (Fixed, Important, Conflicts)
  //
  // Priority tier 3: capacity management (Postpone, Break, FocusBlock)
  //
  // Priority tier 4: project scheduling (ongoing work)

  const actions = [
    // ── Tier 1: Emergency / consequence signals ──────────────────────────────
    // Blocked-task actions first (WAIT, SEND_REMINDER) — these exclude tasks
    // from all subsequent scheduling consideration
    ...ruleBlockedTasks(todayBlockerReport),

    // Firefighter emergency: protect keep-list, pre-defer defer-list
    ...(input.firefighterSignal
      ? ruleFirefighterMode(enriched, input.firefighterSignal)
      : []),

    // Rescue pre-signal: protect essentials, pre-postpone low-priority
    ...(input.rescueSignal
      ? ruleRescueMode(schedulable, input.rescueSignal)
      : []),

    // Consequence: protect high-consequence, surface safe moves
    ...(input.consequenceSignal
      ? ruleConsequenceProtection(schedulable, input.consequenceSignal, input.conflictReport)
      : []),

    // ── Tier 2: Structural rules ─────────────────────────────────────────────
    // PROTECT Fixed and Life Anchors — unconditional, runs on full enriched set
    ...ruleProtectFixed(enriched),

    // Keep Important when no high conflicts (schedulable only)
    ...ruleKeepImportant(schedulable, input.conflictReport),

    // Move time-conflicted items (schedulable only)
    ...ruleMoveConflicted(schedulable, input.conflictReport),

    // ── Tier 3: Capacity management ──────────────────────────────────────────
    // Postpone Flexible when overloaded (schedulable only)
    ...rulePostponeFlexible(schedulable, input.capacityReport, input.realityGapReport),

    // Insert recovery break if recovery score is low
    ...ruleRecoveryBreak(input.capacityReport),

    // ── Tier 4: Opportunity surfacing ────────────────────────────────────────
    // Schedule multi-day project work sessions for today (schedulable only)
    ...ruleScheduleProjectWork(schedulable, input.capacityReport),

    // Surface largest free block as a focus opportunity (schedulable only)
    ...ruleFocusBlock(schedulable),
  ];

  // Step 3 – Score
  const score = computePlannerScore(
    input.capacityReport,
    input.realityGapReport,
    input.conflictReport,
    input.blockerReport && todayBlockerReport?.totalBlockedCount ? todayBlockerReport : undefined,
  );

  // Step 4 – Summary
  const fixedCount = enriched.filter(c => c.category === 'Fixed' || c.commitmentType === 'LIFE_ANCHOR').length;
  const postponeCount = actions.filter(a => a.type === 'POSTPONE').length;
  const summary = buildSummary(score, input.conflictReport, input.realityGapReport, fixedCount, postponeCount);

  const report: PlannerReport = { score, summary, actions };

  console.info('[Planner] Planner Report generated', {
    score,
    actionCount: actions.length,
    actionTypes: [...new Set(actions.map(a => a.type))],
    signalsApplied: [
      input.rescueSignal?.willActivate       && 'rescue',
      input.firefighterSignal?.isActive      && 'firefighter',
      input.consequenceSignal                && 'consequence',
    ].filter(Boolean),
  });

  return report;
}
