import { calculateCapacity } from './CapacityCalculator';
import { analyzeContextSwitches } from './ContextSwitchAnalyzer';
import { analyzeDuration } from './DurationAnalyzer';
import { estimateMentalLoad } from './LoadEstimator';
import { analyzeRecovery } from './RecoveryAnalyzer';
import {
  CapacityCommitment,
  CapacityStatus,
  EnergyLevel,
  normalizeCommitments,
} from './capacityUtils';

export interface CapacityEngineOptions {
  energyLevel?: EnergyLevel;
}

export interface CapacityReport {
  score: number;
  status: CapacityStatus;
  totalCommittedMinutes: number;
  totalFreeMinutes: number;
  totalEventCount: number;
  mentalLoad: number;
  switchCount: number;
  switchPenalty: number;
  recoveryMinutes: number;
  recoveryScore: number;
  gapCount: number;
  energyModifier: number;
  recommendation: string;
}

export function calculateCapacityReport(
  commitments: CapacityCommitment[],
  options: CapacityEngineOptions = {},
): CapacityReport {
  const events = normalizeCommitments(commitments);
  const duration = analyzeDuration(events);
  const load = estimateMentalLoad(events);
  const switches = analyzeContextSwitches(events);
  const recovery = analyzeRecovery(events);
  const capacity = calculateCapacity({
    mentalLoad: load.mentalLoad,
    switchPenalty: switches.switchPenalty,
    recoveryScore: recovery.recoveryScore,
    energyLevel: options.energyLevel || 'normal',
  });

  return {
    score: capacity.score,
    status: capacity.status,
    totalCommittedMinutes: duration.totalCommittedMinutes,
    totalFreeMinutes: duration.totalFreeMinutes,
    totalEventCount: duration.totalEventCount,
    mentalLoad: load.mentalLoad,
    switchCount: switches.switchCount,
    switchPenalty: switches.switchPenalty,
    recoveryMinutes: recovery.recoveryMinutes,
    recoveryScore: recovery.recoveryScore,
    gapCount: recovery.gapCount,
    energyModifier: capacity.energyModifier,
    recommendation: capacity.recommendation,
  };
}
