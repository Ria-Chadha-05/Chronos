/**
 * report.ts
 *
 * Assembles the unified ReviewReflectionReport from the three sub-reports
 * and generates executive coaching recommendations.
 *
 * This is the top-level orchestrator of the Review → Reflect → Learn pipeline.
 *
 * Design principles:
 *  - Combines all three report layers into one coherent artifact.
 *  - Recommendations are deterministic, derived from data.
 *  - Generates a conversationContext string for the Executive Conversation.
 *  - No mutation of inputs. Pure function.
 */

import type {
  ReviewReport,
  ReflectionReport,
  LearningReport,
  ReviewReflectionReport,
  CoachingRecommendation,
  RecommendationPriority,
  RecommendationSource,
} from './types';

// ─── Recommendation builder helpers ──────────────────────────────────────────

let _recIdCounter = 0;

function recId(source: RecommendationSource): string {
  return `rec-${source}-${++_recIdCounter}-${Date.now()}`;
}

function makeRec(
  title: string,
  body: string,
  rationale: string,
  priority: RecommendationPriority,
  source: RecommendationSource,
  actionable = true,
): CoachingRecommendation {
  return { id: recId(source), title, body, rationale, priority, source, actionable };
}

// ─── Recommendation derivation from Review ───────────────────────────────────

function deriveReviewRecommendations(review: ReviewReport): CoachingRecommendation[] {
  const recs: CoachingRecommendation[] = [];
  const { completionRate, deferralRate } = review.commitments;
  const { meetingMinutes, deepWorkMinutes, breakMinutes, actualMinutes } = review.time;
  const { estimationAccuracy } = review.workload;

  // Completion-based
  if (completionRate < 50) {
    recs.push(makeRec(
      'Reduce planned commitments by 20–30%',
      'Your completion rate suggests the plan consistently exceeds realistic execution capacity. Plan fewer commitments with intention rather than more with hope.',
      `Completion rate: ${completionRate}%`,
      'immediate',
      'review',
    ));
  }

  // Deferral-based
  if (deferralRate >= 30) {
    recs.push(makeRec(
      'Implement a deferral review ritual',
      'When deferring a commitment, explicitly ask: "Should this be removed, delegated, or scheduled differently?" Recurring deferral is often a sign something should be cut entirely.',
      `Deferral rate: ${deferralRate}%`,
      'this_week',
      'review',
    ));
  }

  // Meeting-based
  if (actualMinutes > 0 && meetingMinutes / actualMinutes >= 0.40) {
    recs.push(makeRec(
      'Protect focus blocks from meeting creep',
      'Block at least 2h of meeting-free time each morning. Batch meetings to specific windows (e.g. afternoons only) to protect your peak cognitive hours.',
      `Meetings: ${Math.round(meetingMinutes / 60 * 10) / 10}h (${Math.round(meetingMinutes / actualMinutes * 100)}% of time)`,
      'immediate',
      'review',
    ));
  }

  // Focus-based
  if (actualMinutes > 120 && deepWorkMinutes / actualMinutes < 0.20) {
    recs.push(makeRec(
      'Schedule deliberate deep work sessions',
      'Reserve at least 90 minutes per day — ideally in the morning — for uninterrupted, high-complexity work. Treat these as fixed commitments.',
      `Deep work: ${Math.round(deepWorkMinutes / 60 * 10) / 10}h (${Math.round(deepWorkMinutes / actualMinutes * 100)}% of time)`,
      'this_week',
      'review',
    ));
  }

  // Recovery
  if (actualMinutes > 240 && breakMinutes / actualMinutes < 0.05) {
    recs.push(makeRec(
      'Schedule recovery time as non-negotiable',
      'Add at least 15 minutes of deliberate recovery after every 90-minute work block. Skipping recovery accumulates cognitive debt that compounds across days.',
      'Break time below 5% of working hours',
      'immediate',
      'review',
    ));
  }

  // Estimation
  if (estimationAccuracy === 'underestimated') {
    recs.push(makeRec(
      'Apply a 1.3× buffer to all task estimates',
      'Chronically underestimated tasks should be padded with a 30% time buffer until your estimates improve. This prevents cascade failures when tasks run over.',
      'Actual workload consistently exceeded estimates',
      'this_week',
      'review',
    ));
  }

  return recs;
}

// ─── Recommendation derivation from Reflection ───────────────────────────────

function deriveReflectionRecommendations(reflection: ReflectionReport): CoachingRecommendation[] {
  const recs: CoachingRecommendation[] = [];

  // Surface critical and warning issues as actionable recommendations
  const criticalIssues = reflection.issues.filter(i => i.severity === 'critical');
  const warningIssues  = reflection.issues.filter(i => i.severity === 'warning');

  for (const issue of criticalIssues.slice(0, 2)) {
    recs.push(makeRec(
      `Address: ${issue.title}`,
      issue.body,
      issue.dataPoint ?? issue.category,
      'immediate',
      'reflection',
    ));
  }

  for (const issue of warningIssues.slice(0, 2)) {
    recs.push(makeRec(
      issue.title,
      issue.body,
      issue.dataPoint ?? issue.category,
      'this_week',
      'reflection',
    ));
  }

  return recs;
}

// ─── Recommendation derivation from Learning ─────────────────────────────────

function deriveLearningRecommendations(learning: LearningReport): CoachingRecommendation[] {
  const recs: CoachingRecommendation[] = [];

  for (const pattern of learning.patterns.slice(0, 3)) {
    // Only make recommendations for worsening or stable high-impact patterns
    if (pattern.trend === 'improving') continue;

    let title = '';
    let body  = '';

    switch (pattern.type) {
      case 'meeting_load':
        title = 'Audit and reduce recurring meetings';
        body  = 'Meeting burden is a structural pattern. Identify which recurring meetings add the least value and either remove, shorten, or make async. Aim to cut total meeting time by 20%.';
        break;
      case 'focus':
        title = 'Create a daily deep work commitment';
        body  = 'Low focus time is recurring. Treat one 90-minute deep work block each morning as a standing, unmovable commitment. Protect it from scheduling pressure.';
        break;
      case 'postponement':
        title = 'Regularly prune your commitment list';
        body  = 'High deferral is a recurring pattern. Each Sunday, review the week\'s plan and deliberately remove any commitment you\'ve deferred twice or more. If it keeps moving, it may not belong on the plan.';
        break;
      case 'overload':
        title = 'Set a hard weekly capacity limit';
        body  = 'Recurring overload suggests commitments are accepted beyond realistic capacity. Set a maximum of 80% planned capacity for each period to preserve buffer for unexpected work.';
        break;
      case 'estimation':
        title = 'Track and review your estimation accuracy monthly';
        body  = 'Consistent estimation bias requires calibration. After completing major tasks, note how long they actually took vs estimate. Use this data to improve future estimates.';
        break;
      case 'scheduling':
        title = 'Plan fewer, execute more';
        body  = 'Completion rates are consistently below target. Reduce planned commitment volume by 25% and observe whether execution improves. Less is more when quality of execution matters.';
        break;
      default:
        continue;
    }

    recs.push(makeRec(
      title,
      body,
      pattern.description,
      'long_term',
      'learning',
    ));
  }

  // Surface improvements as positive reinforcement
  for (const improvement of learning.improvements.slice(0, 1)) {
    recs.push(makeRec(
      'Continue what\'s working',
      improvement,
      'Positive trend detected in behavioral data.',
      'long_term',
      'learning',
      false,
    ));
  }

  return recs;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateRecommendations(recs: CoachingRecommendation[]): CoachingRecommendation[] {
  const seen = new Set<string>();
  return recs.filter(r => {
    const key = r.title.toLowerCase().replace(/\s+/g, '-').slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Conversation context builder ─────────────────────────────────────────────

/**
 * Build a concise text block for the Executive Conversation to use as context
 * when answering user questions about their review, reflection, or learning.
 */
function buildConversationContext(
  review: ReviewReport,
  reflection: ReflectionReport,
  learning: LearningReport,
  recommendations: CoachingRecommendation[],
): string {
  const lines: string[] = [];

  // Review summary
  lines.push('=== REVIEW SUMMARY ===');
  lines.push(review.summary);
  lines.push(`Period: ${review.period} (${review.periodStart} → ${review.periodEnd})`);
  lines.push(`Completion: ${review.commitments.completionRate}% | Deferral: ${review.commitments.deferralRate}%`);
  lines.push(`Focus time: ${Math.round(review.time.deepWorkMinutes / 60 * 10) / 10}h | Meeting time: ${Math.round(review.time.meetingMinutes / 60 * 10) / 10}h`);
  lines.push(`Capacity score: ${Math.round(review.capacityScore)}% | Reality gap: ${review.realityGapSeverity}`);
  lines.push(`Rescue activated: ${review.rescueActivated ? 'Yes' : 'No'}`);
  lines.push('');

  // Reflection
  lines.push('=== REFLECTION ===');
  lines.push(reflection.narrative);
  if (reflection.positives.length > 0) {
    lines.push('Positives:');
    reflection.positives.forEach(p => lines.push(`  + ${p.title}: ${p.body}`));
  }
  if (reflection.issues.length > 0) {
    lines.push('Issues:');
    reflection.issues.forEach(i => lines.push(`  - ${i.title}: ${i.body}`));
  }
  lines.push('');

  // Learning
  lines.push('=== LEARNING ===');
  lines.push(learning.profileSummary);
  if (learning.patterns.length > 0) {
    lines.push('Behavioral patterns:');
    learning.patterns.slice(0, 3).forEach(p => lines.push(`  • ${p.title} (${p.occurrenceCount} occurrences, trend: ${p.trend})`));
  }
  if (learning.improvements.length > 0) {
    lines.push('Improvements: ' + learning.improvements.join('; '));
  }
  if (learning.persistentChallenges.length > 0) {
    lines.push('Persistent challenges: ' + learning.persistentChallenges.join('; '));
  }
  lines.push('');

  // Recommendations
  lines.push('=== COACHING RECOMMENDATIONS ===');
  recommendations.slice(0, 5).forEach(r => {
    lines.push(`[${r.priority.toUpperCase()}] ${r.title}`);
    lines.push(`  ${r.body}`);
  });

  return lines.join('\n');
}

// ─── Main assembler ───────────────────────────────────────────────────────────

/**
 * Assemble the unified ReviewReflectionReport from all three sub-reports.
 *
 * @param review     - Output of ReviewEngine
 * @param reflection - Output of ReflectionEngine
 * @param learning   - Output of LearningEngine
 * @returns ReviewReflectionReport
 *
 * Pure function. No side effects.
 */
export function assembleReviewReflectionReport(
  review: ReviewReport,
  reflection: ReflectionReport,
  learning: LearningReport,
): ReviewReflectionReport {
  // Reset recommendation ID counter
  _recIdCounter = 0;

  const reviewRecs      = deriveReviewRecommendations(review);
  const reflectionRecs  = deriveReflectionRecommendations(reflection);
  const learningRecs    = deriveLearningRecommendations(learning);

  const allRecs = deduplicateRecommendations([
    ...reviewRecs,
    ...reflectionRecs,
    ...learningRecs,
  ]);

  // Sort: immediate first, then this_week, then long_term
  const priorityOrder: Record<RecommendationPriority, number> = {
    immediate:  0,
    this_week:  1,
    long_term:  2,
  };
  allRecs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const conversationContext = buildConversationContext(review, reflection, learning, allRecs);

  return {
    id: `rrr-${review.periodStart.replace(/[^0-9]/g, '').slice(0, 8)}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    period:       review.period,
    periodStart:  review.periodStart,
    periodEnd:    review.periodEnd,
    review,
    reflection,
    learning,
    recommendations: allRecs,
    conversationContext,
  };
}
