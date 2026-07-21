/**
 * RealityGapTypes.ts
 *
 * Type definitions for Reality Gap subsystem.
 *
 * Change: RealityGapCommitment now includes commitmentType and ongoingProject
 * so the analyzer can make type-aware cognitive weight calculations.
 */

import type { CapacityCommitment, CapacityReport } from '../capacity';
import type { CommitmentType, OngoingProjectFields } from '../CommitmentTypes';

export type RealityGapSeverity = 'Low' | 'Medium' | 'High';

export interface RealityGapReport {
  severity: RealityGapSeverity;
  issues: string[];
  summary: string;
  recommendation: string;
}

export interface RealityGapCommitment extends CapacityCommitment {
  cognitiveWeight?: number;
  cognitiveLoad?: number;
  mentalLoad?: number;
  weight?: number;
  priority?: string;
  energyLoad?: string;
  /** Classification type — used by analyzer to skip LIFE_ANCHOR, scale ONGOING_PROJECT. */
  commitmentType?: CommitmentType;
  /** Effort fields for ONGOING_PROJECT. */
  ongoingProject?: OngoingProjectFields | null;
}

export interface RealityGapAnalysisInput {
  commitments: RealityGapCommitment[];
  capacityReport: CapacityReport;
}

export interface RealityGapIssueAnalysis {
  issues: string[];
  requiredFocus: number;
  availableCapacity: number;
  heavyCommitmentCount: number;
}
