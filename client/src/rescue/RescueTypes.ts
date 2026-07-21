/**
 * RescueTypes.ts
 *
 * Type definitions for the Rescue subsystem.
 *
 * Change: TriagedCommitment now includes commitmentType and ongoingProject
 * so RescueRules can distinguish LIFE_ANCHOR and ONGOING_PROJECT.
 */

import type { CapacityCommitment, CapacityReport } from '../capacity';
import type { RealityGapReport } from '../reality';
import type { ConflictReport } from '../conflicts';
import type { PlannerReport } from '../planner';
import type { BlockerReport } from '../blocker';
import type { CommitmentType, OngoingProjectFields } from '../CommitmentTypes';

// ─── Commitment triage tiers ──────────────────────────────────────────────────

export type RescueTier =
  | 'NeverMove'     // Exam, Interview, Flight, Doctor, Life Anchor, All-Day Event
  | 'MoveIfNeeded'  // Assignment, Coding, Study, Project Work session, Meeting
  | 'MoveFirst';    // Gym, Reading, Shopping, Cleaning, Personal

// ─── Action types ─────────────────────────────────────────────────────────────

export type RescueActionType =
  | 'PROTECT'
  | 'MOVE'
  | 'POSTPONE'
  | 'REMOVE'
  | 'INSERT_BREAK'
  | 'KEEP';

// ─── Per-action shape ─────────────────────────────────────────────────────────

export interface RescueAction {
  id: string;
  type: RescueActionType;
  commitmentId?: string;
  title: string;
  explanation: string;
  suggestedTime?: string;
}

// ─── Final report ─────────────────────────────────────────────────────────────

export type RescueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface RescueReport {
  activated: boolean;
  severity: RescueSeverity;
  estimatedStressReduction: number;
  commitmentsProtected: number;
  commitmentsMoved: number;
  commitmentsPostponed: number;
  summary: string;
  actions: RescueAction[];
}

// ─── Engine input ─────────────────────────────────────────────────────────────

export interface RescueInput {
  commitments: CapacityCommitment[];
  capacityReport: CapacityReport;
  realityGapReport: RealityGapReport;
  conflictReport: ConflictReport;
  plannerReport: PlannerReport;
  /** Pre-computed Blocker Breaker report — Rescue consumes this only, never invokes the engine. */
  blockerReport?: BlockerReport;
}

// ─── Internal enriched commitment ────────────────────────────────────────────

export interface TriagedCommitment extends CapacityCommitment {
  tier: RescueTier;
  startDate: Date | null;
  endDate: Date | null;
  /** Resolved commitment type — defaults to TIMED_EVENT for legacy events. */
  commitmentType: CommitmentType;
  /** Effort fields for ONGOING_PROJECT type. */
  ongoingProject?: OngoingProjectFields | null;
}
