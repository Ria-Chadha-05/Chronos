/**
 * DurationAnalyzer.ts
 *
 * Analyzes committed vs free time in a day.
 *
 * Key change: ALL_DAY_EVENT blocks the full day.
 * ONGOING_PROJECT contributes only effortHoursPerDay.
 * LIFE_ANCHOR is tracked separately so Planner/Rescue can preserve it.
 */

import { DAY_MINUTES, NormalizedCapacityEvent } from './capacityUtils';

export interface DurationAnalysis {
  totalCommittedMinutes: number;
  totalFreeMinutes: number;
  totalEventCount: number;
  /** Minutes committed by LIFE_ANCHOR events (protected, informational). */
  anchorMinutes: number;
  /** Minutes committed by ONGOING_PROJECT effort (not calendar span). */
  projectMinutes: number;
  /** True when any ALL_DAY_EVENT is present — marks day as effectively full. */
  hasFullDayBlock: boolean;
}

export function analyzeDuration(events: NormalizedCapacityEvent[]): DurationAnalysis {
  let totalCommittedMinutes = 0;
  let anchorMinutes = 0;
  let projectMinutes = 0;
  let hasFullDayBlock = false;

  for (const event of events) {
    // Each event.durationMinutes has already been resolved by normalizeCommitment()
    // using the correct logic per commitmentType. We just sum here.
    totalCommittedMinutes += event.durationMinutes;

    if (event.isLifeAnchor) {
      anchorMinutes += event.durationMinutes;
    }

    if (event.isOngoingProject) {
      projectMinutes += event.durationMinutes;
    }

    if (event.allDay && event.commitmentType === 'ALL_DAY_EVENT') {
      hasFullDayBlock = true;
    }
  }

  // When there's a full-day block, treat remaining capacity as near-zero
  const effectiveCommittedMinutes = hasFullDayBlock
    ? DAY_MINUTES
    : totalCommittedMinutes;

  return {
    totalCommittedMinutes: effectiveCommittedMinutes,
    totalFreeMinutes: Math.max(0, DAY_MINUTES - effectiveCommittedMinutes),
    totalEventCount: events.length,
    anchorMinutes,
    projectMinutes,
    hasFullDayBlock,
  };
}
