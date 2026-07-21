/**
 * LearningEngine.ts
 *
 * Third stage of the Review → Reflect → Learn pipeline.
 *
 * Purpose: Detect RECURRING BEHAVIORAL PATTERNS across multiple review periods.
 * Produces long-term observations that a single review period cannot reveal.
 *
 * Design constraints:
 *  - Read-only: consumes PeriodSummary history only.
 *  - Deterministic: all patterns are derived from data, not AI.
 *  - Requires at least 2 periods to generate meaningful patterns.
 *  - No side effects. Pure function.
 *
 * When fewer than 2 periods are available, the engine returns a minimal report
 * noting that more history is needed for pattern detection.
 */

import type {
  LearningReport,
  BehavioralPattern,
  PatternType,
  PatternTrend,
  PeriodSummary,
} from './types';

// ─── Minimum history requirement ──────────────────────────────────────────────

const MIN_PERIODS_FOR_PATTERNS = 2;
const MIN_PERIODS_FOR_TRENDS   = 3;

// ─── Pattern detection thresholds ────────────────────────────────────────────

const LEARNING_THRESHOLDS = {
  meetingLoadHeavy:        0.40,  // > 40% meeting ratio in majority of periods
  deepWorkLow:             0.20,  // < 20% deep work in majority of periods
  completionLow:           60,    // < 60% completion in majority of periods
  deferralHigh:            30,    // > 30% deferral in majority of periods
  rescueRecurring:         2,     // Rescue activated ≥ 2 times → recurring overload
  underestimationRecurring: 2,    // Underestimated ≥ 2 times → pattern
  overestimationRecurring: 2,     // Overestimated ≥ 2 times → pattern
  capacityLow:             50,    // Capacity score < 50 in majority of periods
  improvementThreshold:    10,    // 10% improvement in a metric = improving
  worseningThreshold:      -10,   // 10% decline = worsening
} as const;

// ─── ID generation ────────────────────────────────────────────────────────────

let _patternIdCounter = 0;
function patternId(type: PatternType): string {
  return `pattern-${type}-${++_patternIdCounter}-${Date.now()}`;
}

// ─── Trend detection helper ───────────────────────────────────────────────────

/**
 * Detect whether a numeric metric is improving, stable, or worsening
 * by comparing the first half of history vs the second half.
 */
function detectTrend(
  values: number[],
  higherIsBetter: boolean,
): PatternTrend {
  if (values.length < MIN_PERIODS_FOR_TRENDS) return 'stable';

  const mid   = Math.floor(values.length / 2);
  const early = values.slice(0, mid);
  const late  = values.slice(mid);

  const avgEarly = early.reduce((a, b) => a + b, 0) / early.length;
  const avgLate  = late.reduce((a, b) => a + b, 0) / late.length;
  const delta    = avgLate - avgEarly;

  const improving = higherIsBetter ? delta > LEARNING_THRESHOLDS.improvementThreshold : delta < LEARNING_THRESHOLDS.worseningThreshold;
  const worsening = higherIsBetter ? delta < LEARNING_THRESHOLDS.worseningThreshold : delta > LEARNING_THRESHOLDS.improvementThreshold;

  if (improving) return 'improving';
  if (worsening) return 'worsening';
  return 'stable';
}

/**
 * Count how many periods satisfy a predicate.
 */
function countSatisfying(periods: PeriodSummary[], predicate: (p: PeriodSummary) => boolean): number {
  return periods.filter(predicate).length;
}

/**
 * True if a majority of periods (> 50%) satisfy the predicate.
 */
function majorityOf(periods: PeriodSummary[], predicate: (p: PeriodSummary) => boolean): boolean {
  return countSatisfying(periods, predicate) > periods.length / 2;
}

// ─── Individual pattern detectors ────────────────────────────────────────────

function detectMeetingBurdenPattern(
  periods: PeriodSummary[],
  patterns: BehavioralPattern[],
): void {
  const heavyMeetingPeriods = countSatisfying(periods, p => {
    const total = p.meetingMinutes + p.deepWorkMinutes;
    return total > 0 && p.meetingMinutes / total >= LEARNING_THRESHOLDS.meetingLoadHeavy;
  });

  if (heavyMeetingPeriods < MIN_PERIODS_FOR_PATTERNS) return;

  const meetingMins = periods.map(p => p.meetingMinutes);
  const trend = detectTrend(meetingMins, false); // Lower is better
  const avgMeetingHours = Math.round(meetingMins.reduce((a, b) => a + b, 0) / meetingMins.length / 60 * 10) / 10;

  patterns.push({
    id: patternId('meeting_load'),
    type: 'meeting_load',
    title: 'Recurring heavy meeting load',
    description: `Meetings consumed a significant portion of working time in ${heavyMeetingPeriods} of ${periods.length} observed periods, averaging ${avgMeetingHours}h per period. This is a structural constraint on deep work availability.`,
    occurrenceCount: heavyMeetingPeriods,
    trend,
    evidence: [
      `Meeting-heavy periods: ${heavyMeetingPeriods}/${periods.length}`,
      `Average meeting time: ${avgMeetingHours}h per period`,
      trend === 'worsening' ? 'Meeting load is increasing over time' : trend === 'improving' ? 'Meeting load is gradually decreasing' : 'Meeting load is stable',
    ],
    impact: 'Reduces available time for focused, high-value work. May cause deferred tasks to accumulate.',
    confidence: Math.min(0.95, 0.5 + heavyMeetingPeriods * 0.1),
  });
}

function detectLowFocusPattern(
  periods: PeriodSummary[],
  patterns: BehavioralPattern[],
): void {
  const lowFocusPeriods = countSatisfying(periods, p => {
    const total = p.meetingMinutes + p.deepWorkMinutes;
    return total > 0 && p.deepWorkMinutes / total < LEARNING_THRESHOLDS.deepWorkLow;
  });

  if (lowFocusPeriods < MIN_PERIODS_FOR_PATTERNS) return;

  const deepWorkMins = periods.map(p => p.deepWorkMinutes);
  const trend = detectTrend(deepWorkMins, true); // Higher is better

  patterns.push({
    id: patternId('focus'),
    type: 'focus',
    title: 'Consistently low deep work time',
    description: `Deep, focused work has been below 20% of working time in ${lowFocusPeriods} of ${periods.length} periods. High-value output requires sustained attention blocks.`,
    occurrenceCount: lowFocusPeriods,
    trend,
    evidence: [
      `Low-focus periods: ${lowFocusPeriods}/${periods.length}`,
      trend === 'worsening' ? 'Focus time is declining' : trend === 'improving' ? 'Focus time is gradually improving' : 'Focus time remains consistently low',
    ],
    impact: 'Limits throughput on complex, high-impact work. May cause strategic tasks to repeatedly defer.',
    confidence: Math.min(0.95, 0.5 + lowFocusPeriods * 0.1),
  });
}

function detectCompletionPattern(
  periods: PeriodSummary[],
  patterns: BehavioralPattern[],
): void {
  const lowCompletionPeriods = countSatisfying(
    periods,
    p => p.completionRate < LEARNING_THRESHOLDS.completionLow,
  );

  if (lowCompletionPeriods < MIN_PERIODS_FOR_PATTERNS) return;

  const completionRates = periods.map(p => p.completionRate);
  const trend = detectTrend(completionRates, true); // Higher is better
  const avgCompletion = Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length);

  patterns.push({
    id: patternId('scheduling'),
    type: 'scheduling',
    title: 'Recurring low completion rate',
    description: `Commitment completion has been below ${LEARNING_THRESHOLDS.completionLow}% in ${lowCompletionPeriods} of ${periods.length} periods (average ${avgCompletion}%). Plans may be consistently over-ambitious.`,
    occurrenceCount: lowCompletionPeriods,
    trend,
    evidence: [
      `Low-completion periods: ${lowCompletionPeriods}/${periods.length}`,
      `Average completion rate: ${avgCompletion}%`,
    ],
    impact: 'Creates a backlog of incomplete work, increases stress, and erodes planning confidence.',
    confidence: Math.min(0.95, 0.5 + lowCompletionPeriods * 0.1),
  });
}

function detectDeferralPattern(
  periods: PeriodSummary[],
  patterns: BehavioralPattern[],
): void {
  const highDeferralPeriods = countSatisfying(
    periods,
    p => p.deferralRate >= LEARNING_THRESHOLDS.deferralHigh,
  );

  if (highDeferralPeriods < MIN_PERIODS_FOR_PATTERNS) return;

  const deferralRates = periods.map(p => p.deferralRate);
  const trend = detectTrend(deferralRates, false); // Lower is better
  const avgDeferral = Math.round(deferralRates.reduce((a, b) => a + b, 0) / deferralRates.length);

  patterns.push({
    id: patternId('postponement'),
    type: 'postponement',
    title: 'Repeated high deferral rate',
    description: `More than ${LEARNING_THRESHOLDS.deferralHigh}% of commitments are pushed forward in ${highDeferralPeriods} of ${periods.length} periods (average ${avgDeferral}% deferral). This is a consistent signal of over-planning.`,
    occurrenceCount: highDeferralPeriods,
    trend,
    evidence: [
      `High-deferral periods: ${highDeferralPeriods}/${periods.length}`,
      `Average deferral rate: ${avgDeferral}%`,
    ],
    impact: 'Repeated deferral accumulates debt and reduces trust in the planning system.',
    confidence: Math.min(0.95, 0.5 + highDeferralPeriods * 0.1),
  });
}

function detectRecurringOverloadPattern(
  periods: PeriodSummary[],
  patterns: BehavioralPattern[],
): void {
  const rescuePeriods = countSatisfying(periods, p => p.rescueActivated);

  if (rescuePeriods < LEARNING_THRESHOLDS.rescueRecurring) return;

  const capacityScores = periods.map(p => p.capacityScore);
  const trend = detectTrend(capacityScores, true); // Higher is better

  patterns.push({
    id: patternId('overload'),
    type: 'overload',
    title: 'Recurring schedule overload',
    description: `Rescue mode was triggered in ${rescuePeriods} of ${periods.length} periods, indicating recurring overload. Capacity limits are being regularly exceeded.`,
    occurrenceCount: rescuePeriods,
    trend,
    evidence: [
      `Rescue activations: ${rescuePeriods}/${periods.length} periods`,
      `Low capacity periods: ${countSatisfying(periods, p => p.capacityScore < 50)}`,
    ],
    impact: 'Chronic overload leads to burnout, degraded decision quality, and emergency-mode thinking.',
    confidence: Math.min(0.95, 0.4 + rescuePeriods * 0.15),
  });
}

function detectEstimationPattern(
  periods: PeriodSummary[],
  patterns: BehavioralPattern[],
): void {
  const underestimatedPeriods = countSatisfying(
    periods,
    p => p.estimationAccuracy === 'underestimated',
  );
  const overestimatedPeriods = countSatisfying(
    periods,
    p => p.estimationAccuracy === 'overestimated',
  );

  if (underestimatedPeriods >= LEARNING_THRESHOLDS.underestimationRecurring) {
    patterns.push({
      id: patternId('estimation'),
      type: 'estimation',
      title: 'Consistent underestimation of workload',
      description: `Actual work consistently exceeded planned capacity in ${underestimatedPeriods} of ${periods.length} periods. Tasks tend to take longer than expected.`,
      occurrenceCount: underestimatedPeriods,
      trend: 'stable',
      evidence: [
        `Underestimated periods: ${underestimatedPeriods}/${periods.length}`,
        'Actual workload exceeded estimated in majority of periods',
      ],
      impact: 'Leads to missed commitments, deferred tasks, and repeated rescue mode activation.',
      confidence: Math.min(0.90, 0.4 + underestimatedPeriods * 0.12),
    });
  }

  if (overestimatedPeriods >= LEARNING_THRESHOLDS.overestimationRecurring) {
    patterns.push({
      id: patternId('estimation'),
      type: 'estimation',
      title: 'Consistently conservative planning',
      description: `Planned workload was regularly higher than actual output in ${overestimatedPeriods} of ${periods.length} periods. More ambitious scheduling may be feasible.`,
      occurrenceCount: overestimatedPeriods,
      trend: 'stable',
      evidence: [
        `Overestimated periods: ${overestimatedPeriods}/${periods.length}`,
      ],
      impact: 'May indicate unused capacity and untapped throughput.',
      confidence: Math.min(0.85, 0.4 + overestimatedPeriods * 0.12),
    });
  }
}

// ─── Improvement and challenge detection ──────────────────────────────────────

function detectImprovements(periods: PeriodSummary[]): string[] {
  if (periods.length < MIN_PERIODS_FOR_TRENDS) return [];

  const improvements: string[] = [];
  const completionRates = periods.map(p => p.completionRate);
  const capacityScores  = periods.map(p => p.capacityScore);
  const deepWorkMins    = periods.map(p => p.deepWorkMinutes);

  if (detectTrend(completionRates, true) === 'improving') {
    const recent  = completionRates.slice(-2);
    const earlier = completionRates.slice(0, 2);
    const gain    = Math.round(recent.reduce((a,b)=>a+b,0)/recent.length - earlier.reduce((a,b)=>a+b,0)/earlier.length);
    improvements.push(`Completion rate has improved by ~${gain}% over recent periods.`);
  }

  if (detectTrend(capacityScores, true) === 'improving') {
    improvements.push('Capacity management is improving — schedule load is becoming more sustainable.');
  }

  if (detectTrend(deepWorkMins, true) === 'improving') {
    improvements.push('Deep work time is trending upward — focus is improving.');
  }

  return improvements;
}

function detectPersistentChallenges(periods: PeriodSummary[]): string[] {
  if (periods.length < MIN_PERIODS_FOR_TRENDS) return [];

  const challenges: string[] = [];
  const completionRates = periods.map(p => p.completionRate);
  const deferralRates   = periods.map(p => p.deferralRate);
  const capacityScores  = periods.map(p => p.capacityScore);

  if (detectTrend(completionRates, true) === 'worsening') {
    challenges.push('Completion rates are declining — execution is becoming harder over time.');
  }

  if (detectTrend(deferralRates, false) === 'worsening') {
    challenges.push('Deferral rates are increasing — more work is being pushed forward each period.');
  }

  if (detectTrend(capacityScores, true) === 'worsening') {
    challenges.push('Capacity scores are declining — schedule density is increasing unsustainably.');
  }

  const consistentlyLowFocus = majorityOf(
    periods,
    p => p.deepWorkMinutes < 60,
  );
  if (consistentlyLowFocus) {
    challenges.push('Deep work time remains persistently low across periods — structural constraints may exist.');
  }

  return challenges;
}

// ─── Profile summary ──────────────────────────────────────────────────────────

function buildProfileSummary(
  patterns: BehavioralPattern[],
  improvements: string[],
  challenges: string[],
  periods: PeriodSummary[],
): string {
  if (periods.length < MIN_PERIODS_FOR_PATTERNS) {
    return `Not enough history yet to build a behavioral profile — check back after ${MIN_PERIODS_FOR_PATTERNS - periods.length} more review period${MIN_PERIODS_FOR_PATTERNS - periods.length === 1 ? '' : 's'}.`;
  }

  const avgCompletion = Math.round(periods.map(p => p.completionRate).reduce((a, b) => a + b, 0) / periods.length);
  const rescueCount   = countSatisfying(periods, p => p.rescueActivated);

  const parts: string[] = [];

  if (avgCompletion >= 75) {
    parts.push(`High-executing professional (avg ${avgCompletion}% completion)`);
  } else if (avgCompletion >= 50) {
    parts.push(`Moderate executor with room to improve planning accuracy (avg ${avgCompletion}% completion)`);
  } else {
    parts.push(`Ambitious planner who consistently overcommits (avg ${avgCompletion}% completion)`);
  }

  if (patterns.some(p => p.type === 'meeting_load')) {
    parts.push('frequently operating in high-meeting environments');
  }

  if (patterns.some(p => p.type === 'estimation')) {
    parts.push('tending to underestimate task duration');
  }

  if (rescueCount > 0) {
    parts.push(`with ${rescueCount} recurring overload event${rescueCount > 1 ? 's' : ''}`);
  }

  if (improvements.length > 0) {
    parts.push('showing positive improvement trends');
  }

  return parts.join(', ') + '.';
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a LearningReport from a history of PeriodSummaries.
 *
 * @param history  - Array of past period summaries, oldest first.
 * @returns LearningReport
 *
 * Pure function. No side effects.
 */
export function generateLearningReport(history: PeriodSummary[]): LearningReport {
  // Reset counter for reproducibility
  _patternIdCounter = 0;

  const periodsAnalyzed = history.length;

  if (periodsAnalyzed === 0) {
    return {
      id: `learning-empty-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      periodsAnalyzed: 0,
      periodsSummary: 'No history available.',
      patterns: [],
      improvements: [],
      persistentChallenges: [],
      profileSummary: 'No review history available yet. Complete your first review to begin building a behavioral profile.',
    };
  }

  const patterns:   BehavioralPattern[] = [];
  const improvements: string[] = detectImprovements(history);
  const challenges:   string[] = detectPersistentChallenges(history);

  if (periodsAnalyzed >= MIN_PERIODS_FOR_PATTERNS) {
    detectMeetingBurdenPattern(history, patterns);
    detectLowFocusPattern(history, patterns);
    detectCompletionPattern(history, patterns);
    detectDeferralPattern(history, patterns);
    detectRecurringOverloadPattern(history, patterns);
    detectEstimationPattern(history, patterns);
  }

  // Sort patterns by confidence, highest first
  patterns.sort((a, b) => b.confidence - a.confidence);

  const profileSummary = buildProfileSummary(patterns, improvements, challenges, history);

  const oldest = history[0];
  const newest = history[history.length - 1];
  const periodsSummary = periodsAnalyzed === 1
    ? `1 period analyzed (${oldest.periodStart} → ${oldest.periodEnd}).`
    : `${periodsAnalyzed} periods analyzed from ${oldest.periodStart} to ${newest.periodEnd}.`;

  return {
    id: `learning-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    periodsAnalyzed,
    periodsSummary,
    patterns,
    improvements,
    persistentChallenges: challenges,
    profileSummary,
  };
}

/**
 * Extract a lightweight PeriodSummary from a ReviewReport.
 * Used to build the history array passed to generateLearningReport().
 */
export function extractPeriodSummary(
  review: import('./types').ReviewReport,
): PeriodSummary {
  return {
    periodStart:         review.periodStart,
    periodEnd:           review.periodEnd,
    period:              review.period,
    completionRate:      review.commitments.completionRate,
    deferralRate:        review.commitments.deferralRate,
    meetingMinutes:      review.time.meetingMinutes,
    deepWorkMinutes:     review.time.deepWorkMinutes,
    capacityScore:       review.capacityScore,
    realityGapSeverity:  review.realityGapSeverity,
    rescueActivated:     review.rescueActivated,
    estimationAccuracy:  review.workload.estimationAccuracy,
  };
}
