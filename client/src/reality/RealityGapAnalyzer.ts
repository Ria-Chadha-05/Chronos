/**
 * RealityGapAnalyzer.ts
 *
 * Analyzes whether today's plan is achievable given capacity.
 *
 * Change: getCognitiveWeight() now accounts for commitment type.
 * ONGOING_PROJECT commitments contribute effort-based weight, not calendar-span weight.
 * LIFE_ANCHOR commitments are excluded from gap analysis (they're not "work").
 * ALL_DAY_EVENT marks the whole day blocked — immediate high-severity gap.
 */

import { DEFAULT_MENTAL_LOAD_WEIGHTS } from '../capacity/LoadEstimator';
import { normalizeCommitment, normalizeType } from '../capacity/capacityUtils';
import type {
  RealityGapAnalysisInput,
  RealityGapCommitment,
  RealityGapIssueAnalysis,
} from './RealityGapTypes';

const OVERLOAD_CAPACITY_THRESHOLD = 40;
const HIGH_FOCUS_WEIGHT_THRESHOLD = 7;
const HIGH_FOCUS_COMMITMENT_THRESHOLD = 3;
const FRAGMENTED_SWITCH_THRESHOLD = 6;
const MIN_RECOVERY_SCORE = 3;

function getExplicitCognitiveWeight(commitment: RealityGapCommitment): number | null {
  const explicitWeight = Number(
    commitment.cognitiveWeight ??
    commitment.cognitiveLoad ??
    commitment.mentalLoad ??
    commitment.weight,
  );

  return Number.isFinite(explicitWeight) ? explicitWeight : null;
}

function getEnergyLoadWeight(commitment: RealityGapCommitment): number | null {
  const energyLoad = String(commitment.energyLoad || '').toLowerCase();

  if (['deep', 'deep focus', 'heavy', 'high'].includes(energyLoad)) return 8;
  if (['medium', 'moderate'].includes(energyLoad)) return 5;
  if (['light', 'low'].includes(energyLoad)) return 2;

  return null;
}

export function getCognitiveWeight(commitment: RealityGapCommitment): number {
  // LIFE_ANCHOR → weight 0 (never contributes to gap)
  if (commitment.commitmentType === 'LIFE_ANCHOR') return 0;

  const explicitWeight = getExplicitCognitiveWeight(commitment);
  if (explicitWeight !== null) return explicitWeight;

  const energyWeight = getEnergyLoadWeight(commitment);
  if (energyWeight !== null) return energyWeight;

  // For ONGOING_PROJECT: weight is based on effort hours, not calendar span
  if (commitment.commitmentType === 'ONGOING_PROJECT') {
    const effortHours = commitment.ongoingProject?.effortHoursPerDay ?? 2;
    // Projects are cognitively demanding — scale weight by effort
    return Math.min(10, effortHours * 1.5);
  }

  const normalized = normalizeCommitment(commitment);
  const titleType = normalizeType(commitment.title || '');

  return (
    DEFAULT_MENTAL_LOAD_WEIGHTS[normalized.type] ??
    DEFAULT_MENTAL_LOAD_WEIGHTS[titleType] ??
    DEFAULT_MENTAL_LOAD_WEIGHTS.default
  );
}

export function analyzeRealityGapIssues({
  commitments,
  capacityReport,
}: RealityGapAnalysisInput): RealityGapIssueAnalysis {
  const issues: string[] = [];

  // Exclude LIFE_ANCHOR from gap analysis — they are non-negotiable baselines
  const workCommitments = commitments.filter(
    c => c.commitmentType !== 'LIFE_ANCHOR',
  );

  // ALL_DAY_EVENT: immediate flag — no room for planning
  const hasFullDayBlock = workCommitments.some(
    c => c.commitmentType === 'ALL_DAY_EVENT',
  );

  if (hasFullDayBlock) {
    issues.push('Full-day block detected. Productive work windows are unavailable today.');
  }

  const heavyCommitmentCount = workCommitments.filter(
    c => getCognitiveWeight(c) >= HIGH_FOCUS_WEIGHT_THRESHOLD,
  ).length;

  const requiredFocus = capacityReport.mentalLoad + capacityReport.switchPenalty;
  const availableCapacity = capacityReport.score + capacityReport.recoveryScore;

  if (capacityReport.score < OVERLOAD_CAPACITY_THRESHOLD) {
    issues.push('High overload risk');
  }

  if (heavyCommitmentCount >= HIGH_FOCUS_COMMITMENT_THRESHOLD) {
    issues.push('Multiple high-focus commitments today.');
  }

  if (capacityReport.switchCount > FRAGMENTED_SWITCH_THRESHOLD) {
    issues.push('Frequent context switching may reduce productivity.');
  }

  if (workCommitments.length > 1 && capacityReport.recoveryScore < MIN_RECOVERY_SCORE) {
    issues.push('Very little recovery time between commitments.');
  }

  if (requiredFocus > availableCapacity) {
    issues.push("Today's plan is unlikely to be completed without rescheduling.");
  }

  // Project overload check: sum effort hours for all ONGOING_PROJECTS
  const totalProjectHours = workCommitments
    .filter(c => c.commitmentType === 'ONGOING_PROJECT')
    .reduce((sum, c) => sum + (c.ongoingProject?.effortHoursPerDay ?? 2), 0);

  if (totalProjectHours > 6) {
    issues.push(`${totalProjectHours}h of project work scheduled today across multiple projects — consider spreading across the week.`);
  }

  return {
    issues,
    requiredFocus,
    availableCapacity,
    heavyCommitmentCount,
  };
}
