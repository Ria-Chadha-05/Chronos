/**
 * index.ts
 *
 * Public API for the Review → Reflect → Learn subsystem.
 *
 * This is the ONLY file that external modules should import from.
 * All internal engines are encapsulated here.
 *
 * Usage:
 *
 *   import { runReviewPipeline, EMPTY_REVIEW_REFLECTION_REPORT } from './intelligence/review';
 *
 *   const report = runReviewPipeline({
 *     input: reviewInput,
 *     history: pastPeriodSummaries,
 *   });
 *
 * The pipeline:
 *   ReviewEngineInput → ReviewReport → ReflectionReport → LearningReport → ReviewReflectionReport
 */

// ─── Re-export types ──────────────────────────────────────────────────────────

export type {
  // Core inputs
  ReviewEngineInput,
  ReviewableCommitment,
  CommitmentOutcome,
  WorkCategory,
  ReviewPeriod,
  DaySegment,

  // Sub-reports
  ReviewReport,
  ReflectionReport,
  LearningReport,

  // Unified output
  ReviewReflectionReport,

  // Component types
  CommitmentBreakdown,
  TimeBreakdown,
  WorkloadComparison,
  ReflectionInsight,
  InsightCategory,
  BehavioralPattern,
  PatternType,
  PatternTrend,
  CoachingRecommendation,
  RecommendationPriority,
  RecommendationSource,

  // History
  PeriodSummary,
} from './types';

// ─── Re-export engines ────────────────────────────────────────────────────────

export { generateReviewReport } from './ReviewEngine';
export { generateReflectionReport } from './ReflectionEngine';
export { generateLearningReport, extractPeriodSummary } from './LearningEngine';
export { assembleReviewReflectionReport } from './report';

// ─── Pipeline orchestrator ────────────────────────────────────────────────────

import { generateReviewReport } from './ReviewEngine';
import { generateReflectionReport } from './ReflectionEngine';
import { generateLearningReport } from './LearningEngine';
import { assembleReviewReflectionReport } from './report';
import type { ReviewEngineInput, ReviewReflectionReport, PeriodSummary } from './types';

export interface ReviewPipelineOptions {
  /** The current period's data. */
  input: ReviewEngineInput;
  /**
   * Historical period summaries, oldest first.
   * Can be empty for the very first review.
   */
  history?: PeriodSummary[];
}

/**
 * runReviewPipeline
 *
 * Execute the complete Review → Reflect → Learn pipeline in a single call.
 *
 * This is the primary entry point for all consumers:
 *  - Executive Dashboard
 *  - Executive Conversation
 *  - Future mobile review cards
 *
 * @param options - Input data and optional history.
 * @returns ReviewReflectionReport — unified, read-only analysis artifact.
 */
export function runReviewPipeline(options: ReviewPipelineOptions): ReviewReflectionReport {
  const { input, history = [] } = options;

  // Stage 1: What happened?
  const reviewReport = generateReviewReport(input);

  // Stage 2: Why did it happen?
  const reflectionReport = generateReflectionReport(reviewReport, input);

  // Stage 3: What patterns exist?
  const learningReport = generateLearningReport(history);

  // Stage 4: Unified report + coaching recommendations
  return assembleReviewReflectionReport(reviewReport, reflectionReport, learningReport);
}

// ─── Empty/fallback report ────────────────────────────────────────────────────

/**
 * Empty ReviewReflectionReport for use before the pipeline runs
 * (e.g. initial dashboard state, loading states).
 */
export const EMPTY_REVIEW_REFLECTION_REPORT: ReviewReflectionReport = {
  id: 'rrr-empty',
  generatedAt: new Date().toISOString(),
  period: 'day',
  periodStart: '',
  periodEnd: '',
  review: {
    id: 'review-empty',
    generatedAt: new Date().toISOString(),
    period: 'day',
    periodStart: '',
    periodEnd: '',
    commitments: {
      planned: 0,
      completed: 0,
      missed: 0,
      deferred: 0,
      cancelled: 0,
      inProgress: 0,
      completionRate: 0,
      deferralRate: 0,
    },
    time: {
      plannedMinutes: 0,
      actualMinutes: 0,
      timeEfficiency: 0,
      meetingMinutes: 0,
      deepWorkMinutes: 0,
      breakMinutes: 0,
      projectMinutes: 0,
      otherMinutes: 0,
      focusSessionCount: 0,
    },
    workload: {
      estimatedLoad: 0,
      actualLoad: 0,
      estimationDelta: 0,
      estimationAccuracy: 'accurate',
    },
    capacityScore: 0,
    realityGapSeverity: 'Low',
    conflictCount: 0,
    rescueActivated: false,
    summary: 'No review data available.',
  },
  reflection: {
    id: 'reflection-empty',
    generatedAt: new Date().toISOString(),
    period: 'day',
    periodStart: '',
    periodEnd: '',
    positives: [],
    issues: [],
    observations: [],
    narrative: 'No reflection data available.',
  },
  learning: {
    id: 'learning-empty',
    generatedAt: new Date().toISOString(),
    periodsAnalyzed: 0,
    periodsSummary: 'No history available.',
    patterns: [],
    improvements: [],
    persistentChallenges: [],
    profileSummary: 'Complete your first review to begin building a behavioral profile.',
  },
  recommendations: [],
  conversationContext: 'No review data has been generated yet.',
};

// ─── Conversation query helpers ───────────────────────────────────────────────

/**
 * Extract a concise answer to common conversation queries from a report.
 * Used by the Executive Conversation to answer natural language questions
 * about the user's review data.
 */
export const ReviewConversationQueries = {
  /** "Review my day / week" */
  getSummary(report: ReviewReflectionReport): string {
    return report.review.summary;
  },

  /** "What went well?" */
  getPositives(report: ReviewReflectionReport): string {
    if (report.reflection.positives.length === 0) return 'No standout positives identified for this period.';
    return report.reflection.positives
      .map(p => `• ${p.title}: ${p.body}`)
      .join('\n');
  },

  /** "What went wrong?" */
  getIssues(report: ReviewReflectionReport): string {
    if (report.reflection.issues.length === 0) return 'No major issues detected this period.';
    return report.reflection.issues
      .map(i => `• ${i.title}: ${i.body}`)
      .join('\n');
  },

  /** "What patterns do you notice?" */
  getPatterns(report: ReviewReflectionReport): string {
    if (report.learning.patterns.length === 0) {
      return `Not enough history to identify patterns yet (${report.learning.periodsAnalyzed} period${report.learning.periodsAnalyzed === 1 ? '' : 's'} analyzed). Keep reviewing to build your behavioral profile.`;
    }
    return report.learning.patterns
      .map(p => `• ${p.title} (${p.occurrenceCount}× observed, ${p.trend}): ${p.description}`)
      .join('\n');
  },

  /** "What should I improve?" */
  getRecommendations(report: ReviewReflectionReport): string {
    if (report.recommendations.length === 0) return 'No specific recommendations at this time.';
    return report.recommendations
      .filter(r => r.actionable)
      .slice(0, 5)
      .map(r => `• [${r.priority}] ${r.title}: ${r.body}`)
      .join('\n');
  },

  /** "How have I changed over time?" */
  getProgressOverTime(report: ReviewReflectionReport): string {
    const { improvements, persistentChallenges, periodsAnalyzed } = report.learning;
    if (periodsAnalyzed < 2) {
      return 'Need at least 2 review periods to assess change over time.';
    }
    const lines: string[] = [report.learning.profileSummary];
    if (improvements.length > 0) {
      lines.push('\nImproving:');
      improvements.forEach(i => lines.push(`  + ${i}`));
    }
    if (persistentChallenges.length > 0) {
      lines.push('\nPersistent challenges:');
      persistentChallenges.forEach(c => lines.push(`  - ${c}`));
    }
    return lines.join('\n');
  },

  /** "Reflect on today" — narrative form */
  getNarrative(report: ReviewReflectionReport): string {
    return report.reflection.narrative;
  },
};
