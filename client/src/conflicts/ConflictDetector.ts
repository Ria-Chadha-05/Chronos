import { DEFAULT_MENTAL_LOAD_WEIGHTS } from '../capacity/LoadEstimator';
import { normalizeType } from '../capacity/capacityUtils';
import type { CapacityReport } from '../capacity';
import type {
  Conflict,
  ConflictCommitment,
  TimedConflictCommitment,
} from './ConflictTypes';

const HEAVY_COMMITMENT_THRESHOLD = 7;
const BACK_TO_BACK_GAP_MINUTES = 15;
const BACK_TO_BACK_CHAIN_LENGTH = 3;
const VERY_LOW_RECOVERY_SCORE = 3;
const CONTEXT_SWITCH_THRESHOLD = 6;
const HIGH_IMPORTANCE_THRESHOLD = 8;
const PRIORITY_CONFLICT_THRESHOLD = 3;

const IMPORTANCE_WEIGHTS: Record<string, number> = {
  exam: 10,
  interview: 9,
  presentation: 8,
  demo: 8,
  hackathon: 8,
  meeting: 6,
  study: 5,
  gym: 3,
  meal: 1,
  default: 4,
};

function parseDateTime(value: ConflictCommitment['start']): Date | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value.dateTime) {
    const parsed = new Date(value.dateTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value.date) {
    const parsed = new Date(`${value.date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function parseLocalDateAndTime(date: string | undefined, time: string | undefined): Date | null {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCommitmentId(commitment: ConflictCommitment, index: number): string {
  return commitment.id || `${commitment.source || 'commitment'}:${index}`;
}

function getCommitmentTitle(commitment: ConflictCommitment): string {
  return commitment.title || 'Untitled commitment';
}

function getCommitmentType(commitment: ConflictCommitment): string {
  return normalizeType(commitment.type || commitment.title || 'default');
}

function getImportanceKey(commitment: ConflictCommitment): string {
  const value = `${commitment.type || ''} ${commitment.title || ''}`.toLowerCase();

  if (value.includes('exam')) return 'exam';
  if (value.includes('interview')) return 'interview';
  if (value.includes('presentation')) return 'presentation';
  if (value.includes('demo')) return 'demo';
  if (value.includes('hackathon')) return 'hackathon';
  if (value.includes('meeting')) return 'meeting';
  if (value.includes('study')) return 'study';
  if (value.includes('gym') || value.includes('workout')) return 'gym';
  if (value.includes('meal') || value.includes('lunch') || value.includes('dinner')) return 'meal';

  return getCommitmentType(commitment);
}

function getStart(commitment: ConflictCommitment): Date | null {
  return (
    parseDateTime(commitment.startDateTime || null) ||
    parseDateTime(commitment.start || null) ||
    parseLocalDateAndTime(commitment.date, commitment.startTime)
  );
}

function getEnd(commitment: ConflictCommitment): Date | null {
  return (
    parseDateTime(commitment.endDateTime || null) ||
    parseDateTime(commitment.end || null) ||
    parseLocalDateAndTime(commitment.date, commitment.endTime)
  );
}

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function normalizeForId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'conflict';
}

function createConflictId(type: Conflict['type'], ids: string[]): string {
  return `${type.toLowerCase()}:${ids.map(normalizeForId).sort().join(':')}`;
}

function getExplicitWeight(commitment: ConflictCommitment): number | null {
  const explicitWeight = Number(
    commitment.cognitiveWeight ??
    commitment.cognitiveLoad ??
    commitment.mentalLoad ??
    commitment.weight,
  );

  return Number.isFinite(explicitWeight) ? explicitWeight : null;
}

function getEnergyLoadWeight(commitment: ConflictCommitment): number | null {
  const energyLoad = String(commitment.energyLoad || '').toLowerCase();

  if (['deep', 'deep focus', 'heavy', 'high'].includes(energyLoad)) return 8;
  if (['medium', 'moderate'].includes(energyLoad)) return 5;
  if (['light', 'low'].includes(energyLoad)) return 2;

  return null;
}

export function getCognitiveWeight(commitment: ConflictCommitment): number {
  const explicitWeight = getExplicitWeight(commitment);
  if (explicitWeight !== null) return explicitWeight;

  const energyWeight = getEnergyLoadWeight(commitment);
  if (energyWeight !== null) return energyWeight;

  const type = getCommitmentType(commitment);
  return DEFAULT_MENTAL_LOAD_WEIGHTS[type] ?? DEFAULT_MENTAL_LOAD_WEIGHTS.default;
}

function getExplicitImportance(commitment: ConflictCommitment): number | null {
  const explicitImportance = Number(commitment.importance ?? commitment.importanceScore);
  if (Number.isFinite(explicitImportance)) return explicitImportance;

  const priority = String(commitment.priority || commitment.urgency || '').toLowerCase();
  if (['critical', 'highest'].includes(priority)) return 10;
  if (['high', 'urgent'].includes(priority)) return 8;
  if (['medium', 'normal'].includes(priority)) return 5;
  if (['low'].includes(priority)) return 2;

  return null;
}

export function estimateImportance(commitment: ConflictCommitment): number {
  const explicitImportance = getExplicitImportance(commitment);
  if (explicitImportance !== null) return explicitImportance;

  const importanceKey = getImportanceKey(commitment);
  return IMPORTANCE_WEIGHTS[importanceKey] ?? IMPORTANCE_WEIGHTS.default;
}

export function getTimedCommitments(commitments: ConflictCommitment[]): TimedConflictCommitment[] {
  return commitments
    .map((commitment, index) => {
      const start = getStart(commitment);
      const end = getEnd(commitment);

      if (!start || !end || end <= start || commitment.cancelled) return null;

      return {
        id: getCommitmentId(commitment, index),
        title: getCommitmentTitle(commitment),
        type: getCommitmentType(commitment),
        start,
        end,
        commitment,
      };
    })
    .filter((commitment): commitment is TimedConflictCommitment => Boolean(commitment))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function detectTimeConflicts(commitments: ConflictCommitment[]): Conflict[] {
  const timedCommitments = getTimedCommitments(commitments);
  const conflicts: Conflict[] = [];

  for (let leftIndex = 0; leftIndex < timedCommitments.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < timedCommitments.length; rightIndex += 1) {
      const current = timedCommitments[leftIndex];
      const next = timedCommitments[rightIndex];

      if (next.start >= current.end) break;

      const relatedCommitmentIds = [current.id, next.id];
      conflicts.push({
        id: createConflictId('TIME_CONFLICT', relatedCommitmentIds),
        type: 'TIME_CONFLICT',
        severity: 'High',
        title: 'Time Conflict',
        description: `${current.title} overlaps with ${next.title}.`,
        relatedCommitmentIds,
      });
    }
  }

  return conflicts;
}

export function detectCapacityConflict(
  commitments: ConflictCommitment[],
  capacityReport: CapacityReport,
): Conflict[] {
  const heavyCommitments = commitments.filter(
    commitment => !commitment.cancelled && getCognitiveWeight(commitment) >= HEAVY_COMMITMENT_THRESHOLD,
  );

  if (capacityReport.score >= 40 || !heavyCommitments.length) return [];

  const relatedCommitmentIds = heavyCommitments.map((commitment, index) => getCommitmentId(commitment, index));

  return [{
    id: createConflictId('CAPACITY_CONFLICT', relatedCommitmentIds),
    type: 'CAPACITY_CONFLICT',
    severity: 'High',
    title: 'Capacity Conflict',
    description: 'High cognitive workload remains while capacity is low.',
    relatedCommitmentIds,
  }];
}

function hasBackToBackChain(timedCommitments: TimedConflictCommitment[]): boolean {
  let chainLength = timedCommitments.length ? 1 : 0;

  for (let index = 1; index < timedCommitments.length; index += 1) {
    const previous = timedCommitments[index - 1];
    const current = timedCommitments[index];
    const gapMinutes = minutesBetween(previous.end, current.start);

    if (gapMinutes >= 0 && gapMinutes <= BACK_TO_BACK_GAP_MINUTES) {
      chainLength += 1;
    } else {
      chainLength = 1;
    }

    if (chainLength >= BACK_TO_BACK_CHAIN_LENGTH) return true;
  }

  return false;
}

export function detectRecoveryConflict(
  commitments: ConflictCommitment[],
  capacityReport: CapacityReport,
): Conflict[] {
  const timedCommitments = getTimedCommitments(commitments);
  const backToBack = hasBackToBackChain(timedCommitments);
  const lowRecovery = timedCommitments.length > 1 && capacityReport.recoveryScore < VERY_LOW_RECOVERY_SCORE;

  if (!backToBack && !lowRecovery) return [];

  const relatedCommitmentIds = timedCommitments.map(commitment => commitment.id);

  return [{
    id: createConflictId('RECOVERY_CONFLICT', relatedCommitmentIds),
    type: 'RECOVERY_CONFLICT',
    severity: 'Medium',
    title: 'Recovery Conflict',
    description: backToBack
      ? 'Three or more commitments are scheduled back-to-back.'
      : 'Recovery score is very low between commitments.',
    relatedCommitmentIds,
  }];
}

export function detectContextConflict(
  commitments: ConflictCommitment[],
  capacityReport: CapacityReport,
): Conflict[] {
  if (capacityReport.switchCount <= CONTEXT_SWITCH_THRESHOLD) return [];

  const relatedCommitmentIds = commitments.map((commitment, index) => getCommitmentId(commitment, index));

  return [{
    id: createConflictId('CONTEXT_CONFLICT', relatedCommitmentIds),
    type: 'CONTEXT_CONFLICT',
    severity: 'Medium',
    title: 'Context Conflict',
    description: 'Frequent context switching may reduce productivity.',
    relatedCommitmentIds,
  }];
}

export function detectPriorityConflict(commitments: ConflictCommitment[]): Conflict[] {
  const highPriorityCommitments = commitments.filter(
    commitment => !commitment.cancelled && estimateImportance(commitment) >= HIGH_IMPORTANCE_THRESHOLD,
  );

  if (highPriorityCommitments.length < PRIORITY_CONFLICT_THRESHOLD) return [];

  const relatedCommitmentIds = highPriorityCommitments.map((commitment, index) => getCommitmentId(commitment, index));

  return [{
    id: createConflictId('PRIORITY_CONFLICT', relatedCommitmentIds),
    type: 'PRIORITY_CONFLICT',
    severity: 'High',
    title: 'Priority Conflict',
    description: 'Multiple high-priority commitments are competing today.',
    relatedCommitmentIds,
  }];
}
