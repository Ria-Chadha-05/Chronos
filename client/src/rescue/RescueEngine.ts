import type { RescueInput, RescueReport } from './RescueTypes';
import type { BlockerReport } from '../blocker';
import { getBlockedTaskIds } from '../blocker';
import {
  triageAll,
  shouldActivate,
  computeRescueSeverity,
  estimateStressReduction,
} from './RescueUtils';
import {
  ruleProtectNeverMove,
  rulePostponeMoveFirst,
  ruleMoveConflictedTasks,
  ruleRemoveExcessFlexible,
  ruleInsertRecoveryBreak,
  rulePostponeBlockedWork,
} from './RescueRules';

const INACTIVE_REPORT: RescueReport = {
  activated: false,
  severity: 'Low',
  estimatedStressReduction: 0,
  commitmentsProtected: 0,
  commitmentsMoved: 0,
  commitmentsPostponed: 0,
  summary: 'No rescue required today. Everything looks manageable.',
  actions: [],
};

// ─── Build the human-readable summary ────────────────────────────────────────

function buildSummary(
  severity: RescueReport['severity'],
  protected_: number,
  moved: number,
  postponed: number,
  stressReduction: number,
): string {
  const parts: string[] = [];

  if (protected_) parts.push(`${protected_} commitment${protected_ !== 1 ? 's' : ''} locked in`);
  if (moved)      parts.push(`${moved} moved to tomorrow`);
  if (postponed)  parts.push(`${postponed} postponed`);

  const head =
    severity === 'Critical' ? 'Critical overload — emergency changes applied.' :
    severity === 'High'     ? 'High overload — significant adjustments needed.' :
    severity === 'Medium'   ? 'Schedule under pressure — key conflicts resolved.' :
                              'Minor rescue applied — small adjustments made.';

  const tail = parts.length
    ? `${parts.join(', ')}. Estimated stress reduction: ${stressReduction}%.`
    : `Estimated stress reduction: ${stressReduction}%.`;

  return `${head} ${tail}`;
}

function filterBlockerReportForCommitments(
  report: BlockerReport | undefined,
  commitmentIds: Set<string>,
): BlockerReport | undefined {
  if (!report?.totalBlockedCount) return report;

  const blockedTasks = report.blockedTasks.filter(
    t => t.id && commitmentIds.has(t.id),
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

export function generateRescueReport(input: RescueInput): RescueReport {
  console.info('[Rescue] Evaluating rescue conditions');
  console.info('[Rescue] Reading Capacity Report', {
    score: input.capacityReport.score,
    status: input.capacityReport.status,
    recoveryMinutes: input.capacityReport.recoveryMinutes,
  });
  console.info('[Rescue] Reading Reality Report', {
    severity: input.realityGapReport.severity,
  });
  console.info('[Rescue] Reading Conflict Report', {
    totalConflicts: input.conflictReport.totalConflicts,
    highSeverity: input.conflictReport.highSeverity,
  });
  console.info('[Rescue] Reading Planner Report', {
    score: input.plannerReport.score,
  });
  if (input.blockerReport?.totalBlockedCount) {
    console.info('[Rescue] Reading Blocker Report', {
      totalBlocked: input.blockerReport.totalBlockedCount,
      severity: input.blockerReport.overallSeverity,
    });
  }

  // ── Gate: only proceed if rescue conditions are met ──────────────────────
  const activated = shouldActivate(
    input.capacityReport,
    input.realityGapReport,
    input.conflictReport,
    input.plannerReport,
    input.blockerReport,
  );

  if (!activated) {
    console.info('[Rescue] No rescue required. All metrics within safe range.');
    return INACTIVE_REPORT;
  }

  console.info('[Rescue] Rescue activated');
  console.info('[Rescue] Generating rescue actions');

  // ── Triage commitments ────────────────────────────────────────────────────
  const triaged = triageAll(input.commitments);
  const commitmentIds = new Set(triaged.map(c => c.id).filter((id): id is string => Boolean(id)));
  const scopedBlockerReport = filterBlockerReportForCommitments(input.blockerReport, commitmentIds);

  // Blocked tasks should not be moved/rescheduled as actionable work
  const blockedIds = getBlockedTaskIds(scopedBlockerReport);
  const actionable = blockedIds.size
    ? triaged.filter(c => !c.id || !blockedIds.has(c.id))
    : triaged;

  // ── Run rules in priority order ───────────────────────────────────────────
  const protectActions   = ruleProtectNeverMove(triaged);
  const blockedActions   = rulePostponeBlockedWork(triaged, scopedBlockerReport);
  const postponeActions  = rulePostponeMoveFirst(actionable);
  const moveActions      = ruleMoveConflictedTasks(actionable, input.conflictReport);
  const removeActions    = ruleRemoveExcessFlexible(actionable);
  const breakActions     = ruleInsertRecoveryBreak(input.capacityReport);

  const actions = [
    ...protectActions,
    ...blockedActions,
    ...moveActions,
    ...postponeActions,
    ...removeActions,
    ...breakActions,
  ];

  // ── Compute metrics ───────────────────────────────────────────────────────
  const severity = computeRescueSeverity(
    input.capacityReport,
    input.realityGapReport,
    input.conflictReport,
    input.plannerReport,
  );

  const commitmentsProtected  = protectActions.length;
  const commitmentsMoved      = moveActions.filter(a => a.type === 'MOVE').length;
  const commitmentsPostponed  = postponeActions.length + removeActions.length + blockedActions.length;
  const breaksInserted        = breakActions.length;

  const moveFirstCount        = triaged.filter(c => c.tier === 'MoveFirst').length;

  const estimatedStressReduction = estimateStressReduction(
    moveFirstCount,
    commitmentsMoved,
    breaksInserted,
    severity,
  );

  const summary = buildSummary(
    severity,
    commitmentsProtected,
    commitmentsMoved,
    commitmentsPostponed,
    estimatedStressReduction,
  );

  const report: RescueReport = {
    activated: true,
    severity,
    estimatedStressReduction,
    commitmentsProtected,
    commitmentsMoved,
    commitmentsPostponed,
    summary,
    actions,
  };

  console.info('[Rescue] Rescue Report generated', {
    severity,
    estimatedStressReduction,
    actionCount: actions.length,
    commitmentsProtected,
    commitmentsMoved,
    commitmentsPostponed,
  });

  return report;
}
