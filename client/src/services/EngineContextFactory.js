/**
 * EngineContextFactory.js
 *
 * Executive Conversation Layer — engine context factory.
 *
 * Produces small, purpose-built context objects for each conversation intent.
 * Each factory function extracts only the fields Gemini actually needs for
 * that specific intent — nothing more.
 *
 * Goals:
 *   - Smaller prompts / lower token usage
 *   - No raw ChronosReport sections passed to Gemini
 *   - Single point of change if ChronosReport schema evolves
 *   - Zero business logic — pure data projection
 *
 * ARCHITECTURE INVARIANT:
 *   This module is READ-ONLY against all engine outputs.
 *   It never calls, duplicates, or re-runs any Chronos engine.
 *   It only reshapes already-computed reports for prompt consumption.
 */

// ─── Primitive field extractors ───────────────────────────────────────────────
// These are the only places in the conversation layer that know about
// ChronosReport's internal schema. If the schema changes, update here only.

function extractMeta(report) {
  if (!report?.meta) return null;
  return {
    today:      report.meta.today,
    totalToday: report.meta.todayCommitmentCount ?? 0,
    totalAll:   report.meta.totalCommitments ?? 0,
  };
}

function extractCapacity(report) {
  if (!report?.capacityReport) return null;
  const c = report.capacityReport;
  return {
    score:          c.score,
    status:         c.status,
    mentalLoad:     c.mentalLoad,
    switchCount:    c.switchCount,
    recommendation: c.recommendation,
    peakWindow:     c.peakWindow,
    scheduledMins:  c.totalScheduledMinutes,
  };
}

function extractRealityGap(report) {
  if (!report?.realityReport) return null;
  const r = report.realityReport;
  return {
    severity:       r.severity,
    summary:        r.summary,
    recommendation: r.recommendation,
    gapMinutes:     r.gapMinutes,
  };
}

function extractConflicts(report, limit = 4) {
  if (!report?.conflictReport) return null;
  const c = report.conflictReport;
  return {
    total:        c.totalConflicts ?? 0,
    highSeverity: c.highSeverity ?? false,
    summary:      c.summary,
    top: (c.conflicts || []).slice(0, limit).map(x => ({
      title:       x.title,
      severity:    x.severity,
      description: x.description,
    })),
  };
}

function extractPlanner(report, limit = 5) {
  if (!report?.plannerReport) return null;
  const p = report.plannerReport;
  return {
    score:   p.score,
    summary: p.summary,
    actions: (p.actions || []).slice(0, limit).map(a => ({
      type:          a.type,
      title:         a.title,
      explanation:   a.explanation,
      suggestedTime: a.suggestedTime,
    })),
  };
}

function extractRescue(report) {
  if (!report?.rescueReport) return null;
  const r = report.rescueReport;
  return {
    activated:    r.activated ?? false,
    severity:     r.severity,
    summary:      r.summary,
    postponed:    r.commitmentsPostponed,
    stressRelief: r.estimatedStressReduction,
  };
}

function extractBlockers(report, limit = 3) {
  if (!report?.blockerReport) return null;
  const b = report.blockerReport;
  return {
    totalBlocked: b.totalBlockedCount ?? 0,
    critical:     b.criticalBlockers?.totalCritical ?? 0,
    severity:     b.overallSeverity,
    summary:      b.summary,
    top: (b.blockedTasks || []).slice(0, limit).map(t => ({
      title:       t.title || t.name,
      description: t._blocker?.description,
      waitingDays: t._blocker?.waitingDays,
    })),
  };
}

function extractFirefighter(report) {
  if (!report?.firefighterReport) return null;
  const f = report.firefighterReport;
  return {
    isActive:      f.isActive ?? false,
    triggerReason: f.triggerReason,
    severity:      f.severity?.level,
  };
}

function extractReview(report) {
  if (!report?.reviewReport) return null;
  const rr = report.reviewReport;

  // Review layer — what happened
  const review = rr.review ? {
    summary:        rr.review.summary,
    completionRate: rr.review.commitments?.completionRate,
    deferralRate:   rr.review.commitments?.deferralRate,
    completed:      rr.review.commitments?.completed,
    missed:         rr.review.commitments?.missed,
    deferred:       rr.review.commitments?.deferred,
    focusHours:     Math.round(((rr.review.time?.deepWorkMinutes ?? 0) + (rr.review.time?.projectMinutes ?? 0)) / 60 * 10) / 10,
    meetingHours:   Math.round((rr.review.time?.meetingMinutes ?? 0) / 60 * 10) / 10,
    capacityScore:  Math.round(rr.review.capacityScore ?? 0),
    estimationAccuracy: rr.review.workload?.estimationAccuracy,
  } : null;

  // Reflection layer — why it happened (top items only for prompt efficiency)
  const reflection = rr.reflection ? {
    narrative:    rr.reflection.narrative,
    topPositive:  rr.reflection.positives?.[0]  ? { title: rr.reflection.positives[0].title,  body: rr.reflection.positives[0].body  } : null,
    topIssue:     rr.reflection.issues?.[0]     ? { title: rr.reflection.issues[0].title,     body: rr.reflection.issues[0].body     } : null,
    issueCount:   rr.reflection.issues?.length   ?? 0,
    positiveCount: rr.reflection.positives?.length ?? 0,
  } : null;

  // Learning layer — behavioral patterns
  const learning = rr.learning ? {
    profileSummary:       rr.learning.profileSummary,
    periodsAnalyzed:      rr.learning.periodsAnalyzed,
    topPattern:           rr.learning.patterns?.[0] ? { title: rr.learning.patterns[0].title, trend: rr.learning.patterns[0].trend } : null,
    improvements:         rr.learning.improvements?.slice(0, 2)         ?? [],
    persistentChallenges: rr.learning.persistentChallenges?.slice(0, 2) ?? [],
  } : null;

  // Top coaching recommendations
  const recommendations = (rr.recommendations ?? []).slice(0, 3).map(r => ({
    priority: r.priority,
    title:    r.title,
    body:     r.body,
  }));

  return { review, reflection, learning, recommendations };
}

function extractExecutiveSummary(executiveReport, priorityLimit = 4) {
  if (!executiveReport) return null;
  return {
    summary:    executiveReport.summary,
    urgency:    executiveReport.urgency,
    confidence: executiveReport.confidence,
    priorities: (executiveReport.priorities || []).slice(0, priorityLimit).map(p => ({
      rank:    p.rank,
      title:   p.title,
      reason:  p.reason,
      urgency: p.urgency,
    })),
    alerts: (executiveReport.alerts || []).slice(0, 3).map(a => ({
      type:    a.type,
      title:   a.title,
      body:    a.body,
      urgency: a.urgency,
    })),
  };
}

// ─── Shared base context ──────────────────────────────────────────────────────
// All intents receive this baseline. It is deliberately minimal.

function buildBaseContext(chronosReport, taskCount) {
  return {
    meta:       extractMeta(chronosReport),
    capacity:   extractCapacity(chronosReport),
    realityGap: extractRealityGap(chronosReport),
    conflicts:  extractConflicts(chronosReport),
    taskCount:  taskCount ?? 0,
  };
}

// ─── Named factory functions ──────────────────────────────────────────────────

/**
 * Context for planning intent.
 * Includes planner actions and current plan feasibility snapshot.
 */
export function buildPlanningContext({ chronosReport, plan, taskCount }) {
  return {
    ...buildBaseContext(chronosReport, taskCount),
    planner: extractPlanner(chronosReport),
    existingPlan: plan ? {
      feasible:      plan.capacityAnalysis?.feasible,
      overloadMins:  plan.capacityAnalysis?.overloadMinutes,
      conflictCount: (plan.conflicts || []).length,
      scheduleCount: (plan.schedule || []).length,
      realityGap:    plan.realityGap,
    } : null,
  };
}

/**
 * Context for explain intent.
 * Emphasises planner reasoning, blockers, and executive alerts.
 */
export function buildExplainContext({ chronosReport, executiveReport, taskCount }) {
  return {
    ...buildBaseContext(chronosReport, taskCount),
    planner:          extractPlanner(chronosReport),
    blockers:         extractBlockers(chronosReport),
    executiveSummary: extractExecutiveSummary(executiveReport, 3),
  };
}

/**
 * Context for rescue intent.
 * Emphasises what broke and what the rescue engine decided.
 */
export function buildRescueContext({ chronosReport, rescue, taskCount }) {
  return {
    ...buildBaseContext(chronosReport, taskCount),
    rescue:  extractRescue(chronosReport),
    planner: extractPlanner(chronosReport, 4),
    rescuePlan: rescue ? {
      actionsCount: (rescue.rescueActions || []).length,
      summary:      rescue.rescueSummary,
      topActions:   (rescue.rescueActions || []).slice(0, 4).map(a => ({
        actionType: a.actionType,
        title:      a.targetTaskTitle,
        reason:     a.reason,
        impact:     a.impact,
      })),
    } : null,
  };
}

/**
 * Context for firefighter intent.
 * Surfaces emergency state, rescue status, and critical blockers.
 */
export function buildFirefighterContext({ chronosReport, taskCount }) {
  return {
    ...buildBaseContext(chronosReport, taskCount),
    firefighter: extractFirefighter(chronosReport),
    rescue:      extractRescue(chronosReport),
    blockers:    extractBlockers(chronosReport, 3),
  };
}

/**
 * Context for what-if / simulation intent.
 * Surfaces the simulation result alongside current capacity.
 */
export function buildSimulationContext({ chronosReport, simResult, taskCount }) {
  return {
    ...buildBaseContext(chronosReport, taskCount),
    planner: extractPlanner(chronosReport, 3),
    simulation: simResult ? {
      verdict:        simResult.verdict,
      canAccept:      simResult.canAccept,
      squeezed:       (simResult.whatGetsSqueezed || []).slice(0, 4),
      recommendation: simResult.recommendation,
      reason:         simResult.recommendationReason,
    } : null,
  };
}

/**
 * Context for reflection intent.
 * Surfaces completion stats, streaks, statistics, and the Review → Reflect → Learn report.
 */
export function buildReflectionContext({ chronosReport, taskCount }) {
  return {
    ...buildBaseContext(chronosReport, taskCount),
    rescue:     extractRescue(chronosReport),
    planner:    extractPlanner(chronosReport, 3),
    completion: chronosReport?.completionStats  ?? null,
    streaks:    chronosReport?.streakData        ?? null,
    statistics: chronosReport?.statistics        ?? null,
    reviewInsights: extractReview(chronosReport),
  };
}

/**
 * Context for productivity intent.
 * Surfaces blockers, firefighter status, and prioritised executive summary.
 */
export function buildProductivityContext({ chronosReport, executiveReport, taskCount }) {
  return {
    ...buildBaseContext(chronosReport, taskCount),
    planner:          extractPlanner(chronosReport, 4),
    blockers:         extractBlockers(chronosReport, 4),
    firefighter:      extractFirefighter(chronosReport),
    executiveSummary: extractExecutiveSummary(executiveReport, 5),
  };
}

/**
 * Context for general / fallback intent.
 * Broadest view — all engines, shallow depth.
 */
export function buildGeneralContext({ chronosReport, executiveReport, taskCount }) {
  return {
    ...buildBaseContext(chronosReport, taskCount),
    planner:          extractPlanner(chronosReport, 4),
    blockers:         extractBlockers(chronosReport, 3),
    rescue:           extractRescue(chronosReport),
    firefighter:      extractFirefighter(chronosReport),
    executiveSummary: extractExecutiveSummary(executiveReport, 4),
    reviewInsights:   extractReview(chronosReport),
  };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const FACTORY_MAP = {
  planning:    buildPlanningContext,
  explain:     buildExplainContext,
  rescue:      buildRescueContext,
  firefighter: buildFirefighterContext,
  whatif:      buildSimulationContext,
  reflection:  buildReflectionContext,
  productivity: buildProductivityContext,
  general:     buildGeneralContext,
};

/**
 * Main entry point — dispatches to the correct named factory.
 * Callers should prefer named factories for clarity, but this is
 * useful when intent is dynamic.
 *
 * @param {string} intent
 * @param {object} params  — { chronosReport, executiveReport, plan, rescue, simResult, taskCount }
 * @returns {object} engineContext ready to send to /api/converse
 */
export function buildEngineContext(intent, params) {
  const factory = FACTORY_MAP[intent] || buildGeneralContext;
  return factory(params);
}
