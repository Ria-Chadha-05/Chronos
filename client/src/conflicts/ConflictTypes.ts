import type { CapacityCommitment, CapacityReport } from '../capacity';
import type { RealityGapReport } from '../reality';

export type ConflictType =
  | 'TIME_CONFLICT'
  | 'CAPACITY_CONFLICT'
  | 'RECOVERY_CONFLICT'
  | 'CONTEXT_CONFLICT'
  | 'PRIORITY_CONFLICT';

export type ConflictSeverity = 'Low' | 'Medium' | 'High';

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  relatedCommitmentIds: string[];
}

export interface ConflictReport {
  totalConflicts: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  conflicts: Conflict[];
  summary: string;
}

export interface ConflictCommitment extends CapacityCommitment {
  source?: string;
  priority?: string;
  urgency?: string;
  importance?: number | string;
  importanceScore?: number | string;
  cognitiveWeight?: number;
  cognitiveLoad?: number;
  mentalLoad?: number;
  weight?: number;
  energyLoad?: string;
  cancelled?: boolean;
}

export interface ConflictAnalysisInput {
  commitments: ConflictCommitment[];
  capacityReport: CapacityReport;
  realityGapReport: RealityGapReport;
}

export interface TimedConflictCommitment {
  id: string;
  title: string;
  type: string;
  start: Date;
  end: Date;
  commitment: ConflictCommitment;
}
