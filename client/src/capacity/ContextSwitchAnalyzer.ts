import { NormalizedCapacityEvent, sortChronologically } from './capacityUtils';

const SWITCH_PENALTY_POINTS = 4;

export interface ContextSwitchAnalysis {
  switchCount: number;
  switchPenalty: number;
}

export function analyzeContextSwitches(events: NormalizedCapacityEvent[]): ContextSwitchAnalysis {
  const chronologicalEvents = sortChronologically(events);
  let switchCount = 0;

  for (let index = 1; index < chronologicalEvents.length; index += 1) {
    const previous = chronologicalEvents[index - 1];
    const current = chronologicalEvents[index];

    if (previous.type !== current.type) {
      switchCount += 1;
    }
  }

  return {
    switchCount,
    switchPenalty: switchCount * SWITCH_PENALTY_POINTS,
  };
}
