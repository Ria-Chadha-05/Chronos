/**
 * PlannerRules.ts
 *
 * Rule functions that generate PlannerActions from enriched commitments.
 *
 * Changes from original:
 *   - ruleProtectFixed: now also protects LIFE_ANCHOR commitments unconditionally
 *   - ruleMoveConflicted: never moves LIFE_ANCHOR
 *   - rulePostponeFlexible: never postpones LIFE_ANCHOR
 *   - ruleScheduleProjectWork (NEW): schedules ONGOING_PROJECT work sessions
 *     into available free blocks for the day
 */

import type { PlannerAction } from './PlannerTypes';
import type { CategorizedCommitment } from './PlannerTypes';
import type { ConflictReport } from '../conflicts';
import type { CapacityReport } from '../capacity';
import type { RealityGapReport } from '../reality';
import type { BlockerReport } from '../blocker';
import type { RescueSignal, FirefighterSignal, ConsequenceSignal } from './PlannerTypes';
import { nextId, formatTime, largestFreeBlockMinutes } from './PlannerUtils';

// ─── Rule: Protect Fixed + Life Anchors ──────────────────────────────────────

/**
 * Locks in all Fixed-category commitments and all LIFE_ANCHOR commitments.
 * Planner never suggests moving these.
 */
export function ruleProtectFixed(
  commitments: CategorizedCommitment[],
): PlannerAction[] {
  const actions: PlannerAction[] = [];

  for (const c of commitments) {
    const isFixed = c.category === 'Fixed';
    const isAnchor = c.commitmentType === 'LIFE_ANCHOR';

    if (!isFixed && !isAnchor) continue;

    const reason = isAnchor
      ? 'Protected life anchor — never rescheduled.'
      : 'Fixed commitment — cannot be moved or postponed.';

    actions.push({
      id: nextId(),
      type: 'PROTECT',
      commitmentId: c.id,
      title: c.title || 'Protected commitment',
      explanation: reason,
    });
  }

  return actions;
}

// ─── Rule: Keep Important ─────────────────────────────────────────────────────

export function ruleKeepImportant(
  commitments: CategorizedCommitment[],
  conflictReport: ConflictReport,
): PlannerAction[] {
  if (conflictReport.highSeverity > 0) return [];

  return commitments
    .filter(c => c.category === 'Important' && c.commitmentType !== 'LIFE_ANCHOR')
    .map(c => ({
      id: nextId(),
      type: 'KEEP' as const,
      commitmentId: c.id,
      title: c.title || 'Important commitment',
      explanation: 'Important commitment — keep as planned.',
    }));
}

// ─── Rule: Move Conflicted ────────────────────────────────────────────────────

export function ruleMoveConflicted(
  commitments: CategorizedCommitment[],
  conflictReport: ConflictReport,
): PlannerAction[] {
  if (conflictReport.totalConflicts === 0) return [];

  const conflictedIds = new Set<string>(
    (conflictReport.conflicts ?? []).flatMap((conflict: { commitmentIds?: string[] }) =>
      conflict.commitmentIds ?? [],
    ),
  );

  return commitments
    .filter(c => {
      if (!c.id || !conflictedIds.has(c.id)) return false;
      // Never move Fixed or LIFE_ANCHOR
      if (c.category === 'Fixed') return false;
      if (c.commitmentType === 'LIFE_ANCHOR') return false;
      return true;
    })
    .map(c => ({
      id: nextId(),
      type: 'MOVE' as const,
      commitmentId: c.id,
      title: c.title || 'Conflicted commitment',
      explanation: 'Time conflict detected. Consider moving this to another slot.',
      suggestedTime: c.startDate
        ? formatTime(new Date(c.startDate.getTime() + 60 * 60_000))
        : undefined,
    }));
}

// ─── Rule: Postpone Flexible ──────────────────────────────────────────────────

export function rulePostponeFlexible(
  commitments: CategorizedCommitment[],
  capacityReport: CapacityReport,
  realityGapReport: RealityGapReport,
): PlannerAction[] {
  const overloaded = capacityReport.score < 50 || realityGapReport.severity === 'High';
  if (!overloaded) return [];

  return commitments
    .filter(c => {
      if (c.category !== 'Flexible') return false;
      // Never postpone LIFE_ANCHOR even if categorized as Flexible
      if (c.commitmentType === 'LIFE_ANCHOR') return false;
      return true;
    })
    .map(c => ({
      id: nextId(),
      type: 'POSTPONE' as const,
      commitmentId: c.id,
      title: c.title || 'Flexible commitment',
      explanation: 'Day is overloaded. Move this to tomorrow or a lower-pressure day.',
    }));
}

// ─── Rule: Recovery Break ─────────────────────────────────────────────────────

export function ruleRecoveryBreak(capacityReport: CapacityReport): PlannerAction[] {
  if (capacityReport.recoveryScore >= 50) return [];

  return [
    {
      id: nextId(),
      type: 'BREAK',
      title: '15-minute recovery break',
      explanation: 'Low recovery score detected. Insert a short break to reduce cognitive fatigue.',
      suggestedTime: '14:00',
    },
  ];
}

// ─── Rule: Focus Block ────────────────────────────────────────────────────────

export function ruleFocusBlock(commitments: CategorizedCommitment[]): PlannerAction[] {
  const largest = largestFreeBlockMinutes(commitments);
  if (largest < 90) return [];

  return [
    {
      id: nextId(),
      type: 'FOCUS_BLOCK',
      title: 'Deep work block available',
      explanation: `There is a free block of ~${Math.round(largest / 60 * 10) / 10}h available today. Reserve it for deep focus work.`,
    },
  ];
}

// ─── Rule: Schedule Project Work (NEW) ───────────────────────────────────────

/**
 * For each ONGOING_PROJECT commitment today, generates a KEEP action
 * that surfaces the planned effort window to the user.
 *
 * The Planner does not schedule absolute time slots (that's the Calendar's job),
 * but it recommends when to work on each project based on:
 *   - The project's preferredWorkWindow
 *   - Available free blocks in the day
 *   - Effort hours per day
 */
export function ruleScheduleProjectWork(
  commitments: CategorizedCommitment[],
  capacityReport: CapacityReport,
): PlannerAction[] {
  const projects = commitments.filter(
    c => c.commitmentType === 'ONGOING_PROJECT' && c.ongoingProject,
  );

  if (projects.length === 0) return [];

  // If capacity is critically low, don't force project work
  if (capacityReport.score < 20) {
    return projects.map(c => ({
      id: nextId(),
      type: 'POSTPONE' as const,
      commitmentId: c.id,
      title: c.title || 'Project work',
      explanation: `Capacity too low today. Skip ${c.ongoingProject?.effortHoursPerDay ?? 2}h of project work on "${c.title}" — reschedule to a lighter day.`,
    }));
  }

  return projects.map(c => {
    const effort = c.ongoingProject?.effortHoursPerDay ?? 2;
    const window = c.ongoingProject?.preferredWorkWindow ?? 'any';
    const windowLabel = window === 'any' ? 'your best available block' : `the ${window}`;
    const suggestedTime = window === 'morning' ? '09:00'
      : window === 'afternoon' ? '13:00'
      : window === 'evening' ? '18:00'
      : '10:00';

    return {
      id: nextId(),
      type: 'KEEP' as const,
      commitmentId: c.id,
      title: `Work on: ${c.title}`,
      explanation: `Schedule ${effort}h of focused work on "${c.title}" during ${windowLabel}. This is a multi-day project — only ${effort}h is needed today.`,
      suggestedTime,
    };
  });
}

// ─── Blocker action mapping (Blocker Breaker → Planner vocabulary) ────────────

const BLOCKER_TO_PLANNER: Record<string, PlannerAction['type']> = {
  send_reminder: 'SEND_REMINDER',
  escalate: 'SEND_REMINDER',
  wait: 'WAIT',
  start_parallel: 'PARALLEL_WORK',
  split_task: 'SWITCH_TASK',
  ask_teammate: 'SWITCH_TASK',
  prepare_prerequisites: 'SWITCH_TASK',
  find_alternative: 'SWITCH_TASK',
};

function mapBlockerAction(blockerAction: string): PlannerAction['type'] | null {
  return BLOCKER_TO_PLANNER[blockerAction] ?? null;
}

// ─── Rule: Blocked Tasks (consumes blockerReport only) ───────────────────────

/**
 * Generates WAIT / SEND_REMINDER / SWITCH_TASK / PARALLEL_WORK actions for
 * blocked tasks. Blocked tasks must never appear as KEEP/MOVE/POSTPONE work.
 * Returns empty array when no blockers are present — existing behavior unchanged.
 */
export function ruleBlockedTasks(blockerReport?: BlockerReport): PlannerAction[] {
  if (!blockerReport?.totalBlockedCount) return [];

  const actions: PlannerAction[] = [];
  const suggestionByTaskId = new Map(
    (blockerReport.suggestions ?? []).map(s => [s.taskId, s]),
  );

  for (const task of blockerReport.blockedTasks) {
    const taskId = task.id;
    const title = task.title || task.name || 'Blocked task';
    const blocker = task._blocker;
    const waitingDesc = blocker?.description || 'External dependency unresolved';

    actions.push({
      id: nextId(),
      type: 'WAIT',
      commitmentId: taskId,
      title,
      explanation: `Blocked — ${waitingDesc}. Do not schedule as actionable work today.`,
    });

    const suggestion = taskId ? suggestionByTaskId.get(taskId) : undefined;
    const primary = suggestion?.primarySuggestion;
    if (primary) {
      const plannerType = mapBlockerAction(primary.action);
      if (plannerType && plannerType !== 'WAIT') {
        actions.push({
          id: nextId(),
          type: plannerType,
          commitmentId: taskId,
          title: primary.label,
          explanation: primary.reasoning,
        });
      }
    }
  }

  return actions;
}

// ─── Rule: Rescue-aware Planning ─────────────────────────────────────────────
//
// When the rescue pre-signal fires, the Planner becomes rescue-mode before
// the RescueEngine runs. It pre-protects commitments the Rescue Engine would
// protect and pre-postpones candidates Rescue would defer — so the plan
// produced never needs rescue to immediately undo it.
//
// This does NOT duplicate RescueEngine logic. It consumes the pre-computed
// RescueSignal (a pure data projection of the same inputs) and translates
// it into Planner actions using Planner vocabulary (PROTECT / POSTPONE).

export function ruleRescueMode(
  commitments: CategorizedCommitment[],
  rescueSignal: RescueSignal,
): PlannerAction[] {
  if (!rescueSignal.willActivate) return [];

  const actions: PlannerAction[] = [];

  for (const c of commitments) {
    if (!c.id) continue;

    if (rescueSignal.protectedIds.has(c.id)) {
      // Only add if not already a Fixed/LIFE_ANCHOR (ruleProtectFixed covers those)
      if (c.category !== 'Fixed' && c.commitmentType !== 'LIFE_ANCHOR') {
        actions.push({
          id: nextId(),
          type: 'PROTECT',
          commitmentId: c.id,
          title: c.title || 'Protected commitment',
          explanation: 'Rescue Mode pre-signal: this commitment is classified as non-negotiable and protected before plan generation.',
        });
      }
    } else if (rescueSignal.deferCandidateIds.has(c.id)) {
      // Only defer Flexible items — Fixed/Important/LIFE_ANCHOR are not candidates
      if (c.category === 'Flexible' && c.commitmentType !== 'LIFE_ANCHOR') {
        actions.push({
          id: nextId(),
          type: 'POSTPONE',
          commitmentId: c.id,
          title: c.title || 'Deferrable commitment',
          explanation: 'Rescue Mode pre-signal: schedule is overloaded. This is a low-priority item — move to tomorrow to protect essential work.',
        });
      }
    }
  }

  return actions;
}

// ─── Rule: Firefighter-aware Planning ────────────────────────────────────────
//
// When the firefighter pre-signal is active (emergency or warning threshold),
// the Planner immediately protects the firefighter's keep-list and marks
// the defer-list as postponeable — before the plan is finalized.
//
// Crucially: this only affects commitments NOT already handled by
// ruleProtectFixed (Fixed/LIFE_ANCHOR). The firefighter signal adds
// emergency-context protection to items that would otherwise be left as
// flexible or important.

export function ruleFirefighterMode(
  commitments: CategorizedCommitment[],
  firefighterSignal: FirefighterSignal,
): PlannerAction[] {
  if (!firefighterSignal.isActive) return [];

  const actions: PlannerAction[] = [];

  for (const c of commitments) {
    if (!c.id) continue;

    if (firefighterSignal.keepIds.has(c.id)) {
      // Promote to PROTECT — firefighter classified this as critical
      // Skip if already Fixed (ruleProtectFixed handles those)
      if (c.category !== 'Fixed' && c.commitmentType !== 'LIFE_ANCHOR') {
        actions.push({
          id: nextId(),
          type: 'PROTECT',
          commitmentId: c.id,
          title: c.title || 'Critical commitment',
          explanation: 'Firefighter Mode: emergency analysis classifies this as critical — protected automatically during active emergency.',
        });
      }
    } else if (firefighterSignal.deferIds.has(c.id)) {
      // Mark as POSTPONE — firefighter classified this as deferrable under emergency
      if (c.commitmentType !== 'LIFE_ANCHOR') {
        actions.push({
          id: nextId(),
          type: 'POSTPONE',
          commitmentId: c.id,
          title: c.title || 'Deferrable commitment',
          explanation: 'Firefighter Mode: emergency analysis recommends deferring this to free up capacity for critical work.',
        });
      }
    }
  }

  return actions;
}

// ─── Rule: Consequence-aware Planning ────────────────────────────────────────
//
// High-consequence commitments (those that, if missed, would cascade into
// rescue/conflict scenarios) receive PROTECT actions regardless of their
// flexibility category.
//
// Low-consequence commitments become explicit MOVE candidates — they are
// the safest items to reschedule when capacity is tight.
//
// The consequence signal is derived from the ConsequenceSimulator which
// runs a passive analysis before the Planner. No new logic here — the
// Planner only reads IDs and translates them into Planner vocabulary.

export function ruleConsequenceProtection(
  commitments: CategorizedCommitment[],
  consequenceSignal: ConsequenceSignal,
  conflictReport: ConflictReport,
): PlannerAction[] {
  // Only meaningful when there are actual consequence distinctions
  if (
    consequenceSignal.highConsequenceIds.size === 0 &&
    consequenceSignal.lowConsequenceIds.size === 0
  ) return [];

  const actions: PlannerAction[] = [];

  for (const c of commitments) {
    if (!c.id) continue;

    if (consequenceSignal.highConsequenceIds.has(c.id)) {
      // High consequence → protect even if normally Flexible/Important
      // Skip Fixed/LIFE_ANCHOR (already protected by ruleProtectFixed)
      if (c.category !== 'Fixed' && c.commitmentType !== 'LIFE_ANCHOR') {
        actions.push({
          id: nextId(),
          type: 'PROTECT',
          commitmentId: c.id,
          title: c.title || 'High-consequence commitment',
          explanation: 'Consequence analysis: missing or delaying this would cascade into schedule conflicts and capacity overload. Protected automatically.',
        });
      }
    } else if (consequenceSignal.lowConsequenceIds.has(c.id)) {
      // Low consequence → safe to move, but only suggest it under pressure
      const underPressure = conflictReport.totalConflicts > 0 || conflictReport.highSeverity > 0;
      if (underPressure && c.category !== 'Fixed' && c.commitmentType !== 'LIFE_ANCHOR') {
        actions.push({
          id: nextId(),
          type: 'MOVE',
          commitmentId: c.id,
          title: c.title || 'Low-consequence commitment',
          explanation: 'Consequence analysis: this has low downstream impact — safe to reschedule to create room for higher-priority work.',
          suggestedTime: c.startDate
            ? formatTime(new Date(c.startDate.getTime() + 24 * 60 * 60_000))
            : undefined,
        });
      }
    }
  }

  return actions;
}
