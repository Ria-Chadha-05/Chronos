import { NormalizedCapacityEvent, round } from './capacityUtils';

export const DEFAULT_MENTAL_LOAD_WEIGHTS: Record<string, number> = {
  exam: 10,
  interview: 9,
  coding: 6,
  meeting: 7,
  lecture: 5,
  class: 5,
  study: 6,
  gym: 3,
  travel: 3,
  meal: 1,
  break: 0,
  sleep: 0,
  default: 4,
};

export interface MentalLoadAnalysis {
  mentalLoad: number;
}

export function estimateMentalLoad(
  events: NormalizedCapacityEvent[],
  weights: Record<string, number> = DEFAULT_MENTAL_LOAD_WEIGHTS,
): MentalLoadAnalysis {
  const mentalLoad = events.reduce((total, event) => {
    const weight = weights[event.type] ?? weights.default;
    const hours = event.durationMinutes / 60;
    return total + hours * weight;
  }, 0);

  return {
    mentalLoad: round(mentalLoad),
  };
}
