/**
 * demoGenerator.js
 *
 * Factory functions for Chronos Demo Mode.
 *
 * Every function returns a fresh deep-copy of the underlying demo data so
 * callers can mutate the result without affecting the canonical dataset in
 * demoData.js. Dates in returned objects are always relative to the current
 * moment, meaning the demo looks live regardless of when it runs.
 *
 * Usage
 * -----
 *   import { generateDemoCommitments, generateDemoStatistics } from './demoGenerator';
 *
 *   const commitments = generateDemoCommitments();
 *   const stats       = generateDemoStatistics();
 *
 * None of these functions make network requests. All data originates from
 * demoData.js and is deterministic for a given calendar day.
 */

import {
  DEMO_CALENDAR_EVENTS,
  DEMO_GMAIL_COMMITMENTS,
  DEMO_MANUAL_TASKS,
  DEMO_ONGOING_PROJECTS,
  ALL_DEMO_COMMITMENTS,
  DEMO_STATISTICS,
  DEMO_PLANNER_OUTPUT,
  DEMO_RESCUE_OUTPUT,
  DEMO_INSIGHTS,
  DEMO_REFLECTION,
} from './demoData.js';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns a deep clone of any JSON-serialisable value.
 * Keeps demoData.js objects immutable.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Adds realistic ±jitter to a number, staying within [min, max].
 *
 * @param {number} base   - The centre value.
 * @param {number} jitter - Maximum absolute deviation.
 * @param {number} [min]  - Floor (default 0).
 * @param {number} [max]  - Ceiling (default 100).
 * @returns {number}      - Integer within bounds.
 */
function withJitter(base, jitter, min = 0, max = 100) {
  const raw = base + (Math.random() * 2 - 1) * jitter;
  return Math.round(Math.min(max, Math.max(min, raw)));
}

// ─── Commitment generators ────────────────────────────────────────────────────

/**
 * Returns all demo commitments (calendar events + Gmail + manual tasks +
 * ongoing projects) as a single flat array, matching the shape produced by
 * CommitmentContext in live mode.
 *
 * Each call returns a fresh deep-copy — safe to mutate.
 *
 * @returns {import('./demoData').DemoCommitment[]}
 *
 * @example
 * const commitments = generateDemoCommitments();
 * // Inject into CommitmentContext or pass directly to CapacityEngine
 */
export function generateDemoCommitments() {
  return deepClone(ALL_DEMO_COMMITMENTS);
}

/**
 * Returns only calendar-sourced demo commitments.
 *
 * @returns {import('./demoData').DemoCommitment[]}
 */
export function generateDemoCalendarEvents() {
  return deepClone(DEMO_CALENDAR_EVENTS);
}

/**
 * Returns only Gmail-sourced demo commitments.
 *
 * @returns {import('./demoData').DemoCommitment[]}
 */
export function generateDemoGmailCommitments() {
  return deepClone(DEMO_GMAIL_COMMITMENTS);
}

/**
 * Returns only manually-created demo tasks.
 *
 * @returns {import('./demoData').DemoCommitment[]}
 */
export function generateDemoManualTasks() {
  return deepClone(DEMO_MANUAL_TASKS);
}

/**
 * Returns only ongoing project commitments.
 *
 * @returns {import('./demoData').DemoCommitment[]}
 */
export function generateDemoOngoingProjects() {
  return deepClone(DEMO_ONGOING_PROJECTS);
}

/**
 * Returns a filtered subset of demo commitments for a specific date.
 *
 * Matches commitments whose `date` field equals the given YYYY-MM-DD string,
 * or whose ongoing-project date range includes the given date. Useful for
 * populating the daily planner view in demo mode.
 *
 * @param {string} dateStr - YYYY-MM-DD string (default: today).
 * @returns {import('./demoData').DemoCommitment[]}
 *
 * @example
 * const today = new Date().toISOString().slice(0, 10);
 * const todayItems = generateDemoCommitmentsForDate(today);
 */
export function generateDemoCommitmentsForDate(dateStr) {
  const target = dateStr || new Date().toISOString().slice(0, 10);
  const all = generateDemoCommitments();

  return all.filter((c) => {
    if (c.date === target) return true;

    // Ongoing projects: include if target falls within their span
    if (c.commitmentType === 'ONGOING_PROJECT' && c.startDateTime && c.endDateTime) {
      const start = c.startDateTime.slice(0, 10);
      const end   = c.endDateTime.slice(0, 10);
      return target >= start && target <= end;
    }

    return false;
  });
}

// ─── Statistics generator ─────────────────────────────────────────────────────

/**
 * Returns realistic dashboard statistics for demo mode.
 *
 * A small random jitter is applied to numeric metrics on each call so that
 * repeated renders feel live rather than static. The jitter is bounded to
 * keep values plausible (e.g. capacityScore stays between 50–80).
 *
 * @param {{ stable?: boolean }} [options]
 *   - `stable`: if `true`, returns the canonical values without jitter.
 *     Use this in snapshot tests or when you need deterministic output.
 *
 * @returns {import('./demoData').DemoStatistics}
 *
 * @example
 * const stats = generateDemoStatistics();
 * // stats.capacityScore => ~62 (±5)
 *
 * const stableStats = generateDemoStatistics({ stable: true });
 * // stableStats.capacityScore => 62 exactly
 */
export function generateDemoStatistics({ stable = false } = {}) {
  if (stable) return deepClone(DEMO_STATISTICS);

  const base = deepClone(DEMO_STATISTICS);

  return {
    ...base,
    capacityScore:        withJitter(base.capacityScore, 5, 40, 90),
    realityGapScore:      withJitter(base.realityGapScore, 4, 20, 80),
    completionRate:       withJitter(base.completionRate, 3, 40, 95),
    focusHours:           Math.round((base.focusHours + (Math.random() - 0.5) * 0.5) * 10) / 10,
    deepWorkHours:        Math.round((base.deepWorkHours + (Math.random() - 0.5) * 0.4) * 10) / 10,
    productivityScore:    withJitter(base.productivityScore, 4, 40, 95),
    consistencyScore:     withJitter(base.consistencyScore, 3, 40, 95),
    currentStreak:        base.currentStreak, // never jitter streaks — they should feel real
    longestStreak:        base.longestStreak,
    conflictCount:        withJitter(base.conflictCount, 1, 0, 8),
  };
}

// ─── Planner generator ────────────────────────────────────────────────────────

/**
 * Returns a planner report for demo mode, matching the shape of PlannerReport
 * from PlannerTypes.ts.
 *
 * The report describes a realistic over-loaded day with a set of AI-generated
 * actions (PROTECT, MOVE, POSTPONE, BREAK) that demonstrate Chronos's planning
 * intelligence.
 *
 * @param {{ includeAll?: boolean }} [options]
 *   - `includeAll`: if `false` (default), returns a representative 4-action
 *     subset suitable for a preview card. If `true`, returns all 6 actions.
 *
 * @returns {import('./demoData').DemoPlannerOutput}
 *
 * @example
 * const plan = generateDemoPlanner();
 * // plan.score    => 72
 * // plan.actions  => [PROTECT gym, MOVE DSA, POSTPONE groceries, ...]
 *
 * const fullPlan = generateDemoPlanner({ includeAll: true });
 * // fullPlan.actions.length => 6
 */
export function generateDemoPlanner({ includeAll = true } = {}) {
  const plan = deepClone(DEMO_PLANNER_OUTPUT);

  if (!includeAll) {
    plan.actions = plan.actions.slice(0, 4);
  }

  return plan;
}

// ─── Insights generator ───────────────────────────────────────────────────────

/**
 * Returns an array of AI-generated insight objects for demo mode.
 *
 * Insights mirror what Chronos surfaces in the Dashboard and Reflect screen —
 * warnings about overload, positive reinforcement for anchors, conflict alerts,
 * and productivity tips.
 *
 * @param {{ limit?: number }} [options]
 *   - `limit`: maximum number of insights to return (default: all 7).
 *     Insights are ordered by severity (warning → info → success → tip) so
 *     truncating from the end always preserves the most important ones.
 *
 * @returns {import('./demoData').DemoInsight[]}
 *
 * @example
 * const insights = generateDemoInsights({ limit: 3 });
 * // Returns the 3 highest-priority insights
 */
export function generateDemoInsights({ limit } = {}) {
  const insights = deepClone(DEMO_INSIGHTS);
  return typeof limit === 'number' ? insights.slice(0, limit) : insights;
}

// ─── Rescue generator ─────────────────────────────────────────────────────────

/**
 * Returns a rescue report for demo mode, matching the shape of RescueReport
 * from RescueTypes.ts.
 *
 * The scenario: user missed their morning study block. Chronos activates a
 * Medium-severity rescue plan, protecting Life Anchors and moving two
 * flexible items to restore a viable day.
 *
 * @param {{ activated?: boolean }} [options]
 *   - `activated`: override the `activated` flag. Default `true`.
 *     Set to `false` to render the "no rescue needed" state in the UI.
 *
 * @returns {import('./demoData').DemoRescueOutput}
 *
 * @example
 * const rescue = generateDemoRescue();
 * // rescue.activated    => true
 * // rescue.severity     => 'Medium'
 * // rescue.recoveryScore => 88
 *
 * const inactiveRescue = generateDemoRescue({ activated: false });
 * // inactiveRescue.activated => false
 */
export function generateDemoRescue({ activated = true } = {}) {
  const rescue = deepClone(DEMO_RESCUE_OUTPUT);
  rescue.activated = activated;
  return rescue;
}

// ─── Reflection generator ────────────────────────────────────────────────────

/**
 * Returns an end-of-day reflection object for demo mode.
 *
 * Covers: completion rate, focus hours, AI narrative summary, wins,
 * improvement areas, and tomorrow's top suggestions. Mirrors the data shape
 * consumed by the Reflect screen.
 *
 * @param {{ date?: string }} [options]
 *   - `date`: override the reflection date (YYYY-MM-DD). Defaults to today.
 *
 * @returns {import('./demoData').DemoReflection}
 *
 * @example
 * const reflection = generateDemoReflection();
 * // reflection.wins    => ['Completed CS301 lecture...', ...]
 * // reflection.aiSummary => 'Overall a strong day...'
 */
export function generateDemoReflection({ date } = {}) {
  const reflection = deepClone(DEMO_REFLECTION);

  if (date) {
    reflection.date = date;
  }

  return reflection;
}

// ─── Composite "full demo state" generator ────────────────────────────────────

/**
 * Returns a single object containing all demo data required to hydrate the
 * full Chronos application in demo mode — commitments, statistics, planner,
 * insights, rescue, and reflection.
 *
 * This is the single entry point for wiring demo mode into the app context
 * with minimal boilerplate.
 *
 * @param {{ stable?: boolean }} [options]
 *   - `stable`: passed through to `generateDemoStatistics`. Default `false`.
 *
 * @returns {{
 *   commitments:  import('./demoData').DemoCommitment[],
 *   statistics:   import('./demoData').DemoStatistics,
 *   planner:      import('./demoData').DemoPlannerOutput,
 *   insights:     import('./demoData').DemoInsight[],
 *   rescue:       import('./demoData').DemoRescueOutput,
 *   reflection:   import('./demoData').DemoReflection,
 * }}
 *
 * @example
 * const demoState = generateFullDemoState();
 * // Hydrate CommitmentContext, Dashboard, Plan, Rescue, and Reflect in one shot
 */
export function generateFullDemoState({ stable = false } = {}) {
  return {
    commitments: generateDemoCommitments(),
    statistics:  generateDemoStatistics({ stable }),
    planner:     generateDemoPlanner({ includeAll: true }),
    insights:    generateDemoInsights(),
    rescue:      generateDemoRescue(),
    reflection:  generateDemoReflection(),
  };
}
