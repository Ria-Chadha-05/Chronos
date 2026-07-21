/**
 * PlannerTypes.ts
 *
 * Type definitions for the Planner subsystem.
 *
 * Change: CategorizedCommitment now includes commitmentType and ongoingProject
 * so PlannerRules can distinguish LIFE_ANCHOR and ONGOING_PROJECT from
 * regular Fixed/Flexible commitments.
 */

import type { CapacityCommitment, CapacityReport } from '../capacity';
import type { RealityGapReport } from '../reality';
import type { ConflictReport } from '../conflicts';
import type { BlockerReport } from '../blocker';
import type { CommitmentType, OngoingProjectFields } from '../CommitmentTypes';

// ─── Commitment categories ────────────────────────────────────────────────────

export type CommitmentCategory = 'Fixed' | 'Important' | 'Flexible';

// ─── Action types ─────────────────────────────────────────────────────────────

export type PlannerActionType =
  | 'KEEP'
  | 'MOVE'
  | 'POSTPONE'
  | 'PROTECT'
  | 'BREAK'
  | 'FOCUS_BLOCK'
  | 'WAIT'
  | 'SEND_REMINDER'
  | 'SWITCH_TASK'
  | 'PARALLEL_WORK';

// ─── Output shapes ────────────────────────────────────────────────────────────

export interface PlannerAction {
  id: string;
  type: PlannerActionType;
  commitmentId?: string;
  title: string;
  explanation: string;
  suggestedTime?: string;
}

export interface PlannerReport {
  score: number;       // 0–100
  summary: string;
  actions: PlannerAction[];
}

// ─── Input shape ──────────────────────────────────────────────────────────────

/**
 * Rescue pre-signal — derived from the same inputs as shouldActivate()
 * but computed before the Planner runs, so the Planner can adapt its
 * rule set before producing a plan that would then trigger rescue anyway.
 *
 * This is NOT the RescueReport. It is a lightweight boolean signal
 * with the IDs the Planner should protect.
 */
export interface RescueSignal {
  /** True when rescue would activate given current inputs. */
  willActivate: boolean;
  /** Commitment IDs that should be protected (NeverMove tier logic). */
  protectedIds: Set<string>;
  /** Commitment IDs that are candidates for postponement. */
  deferCandidateIds: Set<string>;
}

/**
 * Firefighter pre-signal — derived from detectEmergency() + generateRecoveryPlan()
 * which are pure functions that only need commitments.
 * Tells the Planner whether an emergency is active and which tasks to keep/defer.
 */
export interface FirefighterSignal {
  /** True when the day is at or above emergency/warning threshold. */
  isActive: boolean;
  /** IDs of commitments the firefighter engine classifies as CRITICAL (keep). */
  keepIds: Set<string>;
  /** IDs of commitments the firefighter engine classifies as deferrable. */
  deferIds: Set<string>;
}

/**
 * Consequence pre-signal — derived from a passive simulation that tests
 * each high-importance commitment against a worst-case pressure scenario.
 * Commitments that score as high-consequence receive stronger protection.
 *
 * This runs at most once per Planner invocation and reuses the existing
 * simulateScenario() function without introducing any new logic.
 */
export interface ConsequenceSignal {
  /** IDs of commitments identified as high-consequence (must protect). */
  highConsequenceIds: Set<string>;
  /** IDs of commitments identified as safely moveable (low consequence). */
  lowConsequenceIds: Set<string>;
}

export interface PlannerInput {
  commitments: CapacityCommitment[];
  capacityReport: CapacityReport;
  realityGapReport: RealityGapReport;
  conflictReport: ConflictReport;
  /** Pre-computed Blocker Breaker report — Planner consumes this only, never invokes the engine. */
  blockerReport?: BlockerReport;
  /**
   * Rescue pre-signal — lightweight activation flag + protected/deferred IDs.
   * When present, the Planner switches to rescue-aware mode before rescue
   * actually runs, preventing the plan from producing a schedule that would
   * immediately require rescue to undo.
   */
  rescueSignal?: RescueSignal;
  /**
   * Firefighter pre-signal — emergency detection + keep/defer lists.
   * Derived from detectEmergency() + generateRecoveryPlan() which are
   * pure functions available pre-Planner.
   */
  firefighterSignal?: FirefighterSignal;
  /**
   * Consequence pre-signal — high/low consequence commitment IDs.
   * Derived from a passive simulation run before the Planner.
   */
  consequenceSignal?: ConsequenceSignal;
}

// ─── Internal enriched commitment ────────────────────────────────────────────

export interface CategorizedCommitment extends CapacityCommitment {
  category: CommitmentCategory;
  startDate: Date | null;
  endDate: Date | null;
  /** Resolved from CapacityCommitment.commitmentType. */
  commitmentType: CommitmentType;
  /** Effort fields for ONGOING_PROJECT — null for other types. */
  ongoingProject?: OngoingProjectFields | null;
}
