/**
 * types.ts
 *
 * Type definitions for the Review → Reflect → Learn subsystem.
 *
 * This subsystem is read-only. It consumes existing reports and commitments
 * to produce behavioral insights. It NEVER modifies commitments, plans,
 * or any upstream engine output.
 *
 * Architecture note: types here are fully independent. No existing engine
 * interface is extended or modified.
 */

import type { CapacityCommitment, CapacityReport } from '../../capacity';
import type { RealityGapReport } from '../../reality';
import type { ConflictReport } from '../../conflicts';
import type { PlannerReport } from '../../planner';
import type { RescueReport } from '../../rescue';

// ─── Completion status ────────────────────────────────────────────────────────

/**
 * How a commitment resolved at end-of-period.
 * Extended from ManualTaskStatus with review-specific states.
 */
export type CommitmentOutcome =
  | 'completed'    // Done within the period
  | 'missed'       // Was planned, not done, not deferred
  | 'deferred'     // Intentionally pushed to a future period
  | 'cancelled'    // Removed entirely
  | 'in_progress'  // Started but not finished (carries over)
  | 'planned';     // Planned but period not yet over (shouldn't appear in closed reviews)

// ─── Time-of-day buckets ──────────────────────────────────────────────────────

export type DaySegment = 'morning' | 'afternoon' | 'evening' | 'night';

// ─── Review period ────────────────────────────────────────────────────────────

export type ReviewPeriod = 'day' | 'week' | 'month';

// ─── Enriched commitment for review ──────────────────────────────────────────

/**
 * A commitment augmented with review-specific fields.
 * The base commitment is read directly from the existing pipeline.
 */
export interface ReviewableCommitment extends CapacityCommitment {
  /** How this commitment resolved. Defaults to 'planned' if not annotated. */
  outcome?: CommitmentOutcome;

  /**
   * Actual time spent in minutes.
   * If absent, effectiveDurationMinutes or durationMinutes is used as the estimate.
   */
  actualMinutes?: number;

  /**
   * Whether this commitment was interrupted mid-execution.
   * Used by the Reflection Engine to detect focus disruptions.
   */
  wasInterrupted?: boolean;

  /**
   * Tag for categorization: 'deep_work' | 'meeting' | 'admin' | 'break' | 'personal' etc.
   * Inferred from commitment type and title heuristics when absent.
   */
  workCategory?: WorkCategory;
}

// ─── Work categories ──────────────────────────────────────────────────────────

export type WorkCategory =
  | 'deep_work'    // Focus-intensive, uninterrupted creative or analytical work
  | 'meeting'      // Synchronous communication
  | 'admin'        // Email, scheduling, coordination
  | 'break'        // Recovery, meals, rest
  | 'personal'     // Non-work commitments
  | 'project'      // Ongoing multi-day project session
  | 'other';       // Unclassified

// ─── Review Engine input ──────────────────────────────────────────────────────

export interface ReviewEngineInput {
  /** The commitments for the review period, annotated with outcomes where available. */
  commitments: ReviewableCommitment[];
  /** Pre-computed capacity report for the period. */
  capacityReport: CapacityReport;
  /** Reality gap report for the period. */
  realityGapReport: RealityGapReport;
  /** Conflict report for the period. */
  conflictReport: ConflictReport;
  /** Planner report for the period. */
  plannerReport: PlannerReport;
  /** Rescue report for the period (may be inactive). */
  rescueReport: RescueReport;
  /** The review period granularity. */
  period: ReviewPeriod;
  /** ISO date string for the start of the review window. */
  periodStart: string;
  /** ISO date string for the end of the review window. */
  periodEnd: string;
}

// ─── Review Report ────────────────────────────────────────────────────────────

export interface CommitmentBreakdown {
  planned: number;
  completed: number;
  missed: number;
  deferred: number;
  cancelled: number;
  inProgress: number;
  completionRate: number;   // 0–100 percentage
  deferralRate: number;     // 0–100 percentage
}

export interface TimeBreakdown {
  /** Minutes planned across all commitments. */
  plannedMinutes: number;
  /** Minutes actually used (actual or estimated). */
  actualMinutes: number;
  /** Efficiency: actualMinutes / plannedMinutes (0–1). */
  timeEfficiency: number;
  /** Minutes in meetings (TIMED_EVENT with meeting category). */
  meetingMinutes: number;
  /** Minutes in deep work / focus blocks. */
  deepWorkMinutes: number;
  /** Minutes in recovery / breaks. */
  breakMinutes: number;
  /** Minutes on project sessions (ONGOING_PROJECT). */
  projectMinutes: number;
  /** Minutes on admin and personal tasks. */
  otherMinutes: number;
  /** Distinct time slots that contained real work. */
  focusSessionCount: number;
}

export interface WorkloadComparison {
  /** Estimated workload from the capacity engine (0–100). */
  estimatedLoad: number;
  /** Actual load derived from completed work (0–100). */
  actualLoad: number;
  /** Positive = underestimated; negative = overestimated. */
  estimationDelta: number;
  /** Human label for the delta. */
  estimationAccuracy: 'accurate' | 'underestimated' | 'overestimated';
}

export interface ReviewReport {
  /** Unique report ID. */
  id: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
  /** Period covered. */
  period: ReviewPeriod;
  periodStart: string;
  periodEnd: string;

  /** Commitment outcome breakdown. */
  commitments: CommitmentBreakdown;
  /** Time usage breakdown. */
  time: TimeBreakdown;
  /** Planned vs actual workload comparison. */
  workload: WorkloadComparison;

  /** Capacity score at time of plan (from CapacityReport). */
  capacityScore: number;
  /** Reality gap severity. */
  realityGapSeverity: string;
  /** Number of conflicts detected. */
  conflictCount: number;
  /** Whether rescue mode was activated. */
  rescueActivated: boolean;

  /** Top-level summary sentence. */
  summary: string;
}

// ─── Reflection Report ────────────────────────────────────────────────────────

export type InsightCategory =
  | 'time_usage'
  | 'focus'
  | 'meetings'
  | 'estimation'
  | 'completion'
  | 'recovery'
  | 'overload'
  | 'postponement'
  | 'interruption';

export interface ReflectionInsight {
  id: string;
  category: InsightCategory;
  title: string;
  body: string;
  /** Severity from the user's perspective. */
  severity: 'positive' | 'neutral' | 'warning' | 'critical';
  /** Supporting data point surfaced in the insight (optional). */
  dataPoint?: string;
}

export interface ReflectionReport {
  id: string;
  generatedAt: string;
  period: ReviewPeriod;
  periodStart: string;
  periodEnd: string;

  /** What went well this period. */
  positives: ReflectionInsight[];
  /** What went wrong or needs attention. */
  issues: ReflectionInsight[];
  /** Neutral observations (neither good nor bad). */
  observations: ReflectionInsight[];

  /** Human-readable narrative paragraph. */
  narrative: string;
}

// ─── Learning Report ─────────────────────────────────────────────────────────

export type PatternType =
  | 'scheduling'        // Patterns in when things get done
  | 'estimation'        // Patterns in how work is estimated
  | 'focus'             // Patterns in focus quality
  | 'postponement'      // Recurring deferrals
  | 'overload'          // Recurring overload signals
  | 'category'          // Category-specific trends
  | 'recovery'          // Recovery and break patterns
  | 'meeting_load';     // Meeting burden patterns

export type PatternTrend = 'improving' | 'stable' | 'worsening' | 'new';

export interface BehavioralPattern {
  id: string;
  type: PatternType;
  title: string;
  description: string;
  /** How many review periods this pattern has been observed. */
  occurrenceCount: number;
  trend: PatternTrend;
  /** Concrete evidence for this pattern (from data). */
  evidence: string[];
  /** What this pattern costs the user, if negative. */
  impact?: string;
  /** Confidence that this is a genuine pattern vs noise (0–1). */
  confidence: number;
}

export interface LearningReport {
  id: string;
  generatedAt: string;
  /** How many past periods were analyzed to build this report. */
  periodsAnalyzed: number;
  /** The review history that was used (summaries only). */
  periodsSummary: string;

  /** Confirmed recurring patterns. */
  patterns: BehavioralPattern[];

  /** Areas where genuine improvement is visible. */
  improvements: string[];
  /** Persistent challenges that haven't changed. */
  persistentChallenges: string[];

  /** One-sentence executive summary of the user's behavioral profile. */
  profileSummary: string;
}

// ─── Coaching Recommendation ─────────────────────────────────────────────────

export type RecommendationSource =
  | 'review'
  | 'reflection'
  | 'learning'
  | 'cross_engine';

export type RecommendationPriority = 'immediate' | 'this_week' | 'long_term';

export interface CoachingRecommendation {
  id: string;
  title: string;
  body: string;
  rationale: string;
  priority: RecommendationPriority;
  source: RecommendationSource;
  /** Whether this can be acted on directly vs requires reflection. */
  actionable: boolean;
}

// ─── Unified Report ───────────────────────────────────────────────────────────

/**
 * ReviewReflectionReport
 *
 * The unified output of the entire Review → Reflect → Learn pipeline.
 * This is the only artifact this subsystem exposes to the Dashboard
 * and Executive Conversation.
 *
 * All fields are read-only derivatives. Nothing here mutates upstream state.
 */
export interface ReviewReflectionReport {
  /** Unique report ID (combination of period + timestamp). */
  id: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
  /** Which period this covers. */
  period: ReviewPeriod;
  periodStart: string;
  periodEnd: string;

  /** What happened — metrics and outcomes. */
  review: ReviewReport;

  /** Why it happened — human-readable insights. */
  reflection: ReflectionReport;

  /**
   * What patterns exist — long-term behavioral observations.
   * May be minimal on first run (not enough history).
   */
  learning: LearningReport;

  /** Executive coaching recommendations derived from all three layers. */
  recommendations: CoachingRecommendation[];

  /**
   * Conversation context — a pre-formatted text block the Executive Conversation
   * can inject into its prompt to answer review questions accurately.
   */
  conversationContext: string;
}

// ─── Historical context ───────────────────────────────────────────────────────

/**
 * A lightweight summary of a past review period, used by LearningEngine
 * to detect patterns without storing full reports.
 */
export interface PeriodSummary {
  periodStart: string;
  periodEnd: string;
  period: ReviewPeriod;
  completionRate: number;
  deferralRate: number;
  meetingMinutes: number;
  deepWorkMinutes: number;
  capacityScore: number;
  realityGapSeverity: string;
  rescueActivated: boolean;
  estimationAccuracy: 'accurate' | 'underestimated' | 'overestimated';
}
