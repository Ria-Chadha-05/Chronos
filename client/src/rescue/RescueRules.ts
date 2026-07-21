/**
 * RescueRules.ts
 *
 * Rescue rule functions.
 *
 * Change: All rules now check commitmentType === 'LIFE_ANCHOR' and
 * refuse to move or postpone protected routines. ONGOING_PROJECT work
 * sessions are moved (not the calendar span itself).
 */

import type { RescueAction } from './RescueTypes';
import type { TriagedCommitment } from './RescueTypes';
import type { CapacityReport } from '../capacity';
import type { ConflictReport } from '../conflicts';
import type { BlockerReport } from '../blocker';
import { nextRescueId, formatTime } from './RescueUtils';

// ─── Rule: Protect Never-Move ──────────────────────────────────────────────────

/**
 * Generates PROTECT actions for NeverMove-tier commitments AND all LIFE_ANCHOR
 * commitments. Nothing else in Rescue touches these.
 */
export function ruleProtectNeverMove(commitments: TriagedCommitment[]): RescueAction[] {
  return commitments
    .filter(c => c.tier === 'NeverMove' || c.commitmentType === 'LIFE_ANCHOR')
    .map(c => ({
      id: nextRescueId(),
      type: 'PROTECT' as const,
      commitmentId: c.id,
      title: c.title || 'Protected commitment',
      explanation:
        c.commitmentType === 'LIFE_ANCHOR'
          ? 'Life anchor — protected routine, never rescheduled.'
          : 'High-priority fixed commitment — cannot be moved.',
    }));
}

// ─── Rule: Postpone MoveFirst ──────────────────────────────────────────────────

export function rulePostponeMoveFirst(commitments: TriagedCommitment[]): RescueAction[] {
  return commitments
    .filter(c => {
      if (c.tier !== 'MoveFirst') return false;
      // Never move LIFE_ANCHOR even if tier somehow says MoveFirst
      if (c.commitmentType === 'LIFE_ANCHOR') return false;
      return true;
    })
    .map(c => ({
      id: nextRescueId(),
      type: 'POSTPONE' as const,
      commitmentId: c.id,
      title: c.title || 'Optional commitment',
      explanation: 'Low-priority — moved to reduce today\'s pressure.',
    }));
}

// ─── Rule: Move Conflicted Tasks ───────────────────────────────────────────────

export function ruleMoveConflictedTasks(
  commitments: TriagedCommitment[],
  conflictReport: ConflictReport,
): RescueAction[] {
  if (conflictReport.totalConflicts === 0) return [];

  const conflictedIds = new Set<string>(
    (conflictReport.conflicts ?? []).flatMap((c: { commitmentIds?: string[] }) =>
      c.commitmentIds ?? [],
    ),
  );

  return commitments
    .filter(c => {
      if (!c.id || !conflictedIds.has(c.id)) return false;
      // Never move Fixed-tier or Life Anchors
      if (c.tier === 'NeverMove') return false;
      if (c.commitmentType === 'LIFE_ANCHOR') return false;
      return true;
    })
    .map(c => {
      // For ONGOING_PROJECT: move the work session, not the project itself
      const isProject = c.commitmentType === 'ONGOING_PROJECT';
      const explanation = isProject
        ? `Work session for "${c.title}" conflicts with another commitment. Move the ${c.ongoingProject?.effortHoursPerDay ?? 2}h work session to tomorrow.`
        : 'Time conflict — move to the next available slot.';

      return {
        id: nextRescueId(),
        type: c.tier === 'MoveIfNeeded' ? 'MOVE' as const : 'POSTPONE' as const,
        commitmentId: c.id,
        title: isProject ? `Work session: ${c.title}` : (c.title || 'Conflicted commitment'),
        explanation,
        suggestedTime: c.startDate
          ? formatTime(new Date(c.startDate.getTime() + 90 * 60_000))
          : undefined,
      };
    });
}

// ─── Rule: Remove Excess Flexible ─────────────────────────────────────────────

export function ruleRemoveExcessFlexible(commitments: TriagedCommitment[]): RescueAction[] {
  const moveFirst = commitments.filter(c => {
    if (c.tier !== 'MoveFirst') return false;
    if (c.commitmentType === 'LIFE_ANCHOR') return false;
    return true;
  });

  // Only remove after MoveFirst are already postponed — here we handle any
  // remaining extras in a critical overload scenario
  return moveFirst.slice(2).map(c => ({
    id: nextRescueId(),
    type: 'REMOVE' as const,
    commitmentId: c.id,
    title: c.title || 'Flexible task',
    explanation: 'Removed to protect capacity during overload.',
  }));
}

// ─── Rule: Insert Recovery Break ──────────────────────────────────────────────

export function ruleInsertRecoveryBreak(capacityReport: CapacityReport): RescueAction[] {
  if (capacityReport.recoveryMinutes >= 30) return [];

  return [
    {
      id: nextRescueId(),
      type: 'INSERT_BREAK' as const,
      title: '20-minute recovery break',
      explanation: 'Critical recovery deficit. Force a break to prevent burnout.',
      suggestedTime: '15:00',
    },
  ];
}

// ─── Rule: Postpone Blocked Work (consumes blockerReport only) ───────────────

/**
 * When rescue activates, removes blocked tasks from today's active schedule
 * to free capacity for actionable work. No-op when no blockers present.
 */
export function rulePostponeBlockedWork(
  commitments: TriagedCommitment[],
  blockerReport?: BlockerReport,
): RescueAction[] {
  if (!blockerReport?.totalBlockedCount) return [];

  const blockedIds = new Set(
    blockerReport.blockedTasks.map(t => t.id).filter((id): id is string => Boolean(id)),
  );

  return commitments
    .filter(c => c.id && blockedIds.has(c.id))
    .map(c => {
      const blockedInfo = blockerReport.blockedTasks.find(t => t.id === c.id);
      const reason = blockedInfo?._blocker?.description || 'External dependency unresolved';
      return {
        id: nextRescueId(),
        type: 'POSTPONE' as const,
        commitmentId: c.id,
        title: c.title || 'Blocked task',
        explanation: `Blocked — ${reason}. Removed from today's schedule to free capacity.`,
      };
    });
}
