import { CapacityStatus, clamp, EnergyLevel, ENERGY_MODIFIERS, round } from './capacityUtils';

export interface CapacityCalculationInput {
  mentalLoad: number;
  switchPenalty: number;
  recoveryScore: number;
  energyLevel?: EnergyLevel;
}

export interface CapacityCalculation {
  score: number;
  status: CapacityStatus;
  energyModifier: number;
  recommendation: string;
}

export function getCapacityStatus(score: number): CapacityStatus {
  if (score >= 90) return 'Peak';
  if (score >= 70) return 'Healthy';
  if (score >= 50) return 'Busy';
  if (score >= 30) return 'High Load';
  return 'Overloaded';
}

export function getRecommendation(score: number): string {
  if (score > 80) return 'Great day for deep work.';
  if (score > 60) return 'Good balance. Schedule important work early.';
  if (score > 40) return 'Limit additional commitments.';
  if (score > 20) return 'Avoid heavy cognitive work.';
  return 'Reschedule non-essential commitments.';
}

export function calculateCapacity(input: CapacityCalculationInput): CapacityCalculation {
  const energyModifier = ENERGY_MODIFIERS[input.energyLevel || 'normal'];
  const rawScore = (
    100 -
    input.mentalLoad -
    input.switchPenalty +
    input.recoveryScore
  ) * energyModifier;
  const score = round(clamp(rawScore, 0, 100));

  return {
    score,
    status: getCapacityStatus(score),
    energyModifier,
    recommendation: getRecommendation(score),
  };
}
