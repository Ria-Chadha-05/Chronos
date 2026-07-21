import { minutesBetween, NormalizedCapacityEvent, sortChronologically } from './capacityUtils';

const RECOVERY_SCORE = {
  none: 0,
  small: 3,
  medium: 8,
  large: 14,
};

export interface RecoveryAnalysis {
  recoveryScore: number;
  recoveryMinutes: number;
  gapCount: number;
}

function scoreGap(gapMinutes: number): number {
  if (gapMinutes < 15) return RECOVERY_SCORE.none;
  if (gapMinutes < 45) return RECOVERY_SCORE.small;
  if (gapMinutes < 90) return RECOVERY_SCORE.medium;
  return RECOVERY_SCORE.large;
}

export function analyzeRecovery(events: NormalizedCapacityEvent[]): RecoveryAnalysis {
  const timedEvents = sortChronologically(events)
    .filter(event => event.start && event.end && event.durationMinutes > 0);

  let recoveryScore = 0;
  let recoveryMinutes = 0;
  let gapCount = 0;

  for (let index = 1; index < timedEvents.length; index += 1) {
    const previous = timedEvents[index - 1];
    const current = timedEvents[index];
    const gapMinutes = minutesBetween(previous.end as Date, current.start as Date);

    if (gapMinutes <= 0) continue;

    gapCount += 1;
    recoveryMinutes += gapMinutes;
    recoveryScore += scoreGap(gapMinutes);
  }

  return {
    recoveryScore,
    recoveryMinutes,
    gapCount,
  };
}
