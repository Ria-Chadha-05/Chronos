/**
 * reflectionEngine.js
 *
 * Chronos Reflection Engine — Part 3
 *
 * Generates structured daily, weekly, and monthly reflection objects from
 * commitment and planner data. All output is deterministic and side-effect-free.
 *
 * ▸ No imports from existing engines, contexts, or stores.
 * ▸ All functions return a consistent ReflectionReport shape.
 */

import {
  calculateCompletionRate,
  calculateAverageFocusTime,
  calculateProductivityScore,
  calculateWeeklyHours,
  calculateRealityGapTrend,
} from './statisticsEngine.js';

// ─── Shared types (JSDoc only) ─────────────────────────────────────────────────

/**
 * @typedef {object} ReflectionReport
 * @property {string[]} wins - Positive achievements for the period.
 * @property {string[]} bottlenecks - Friction points or recurring issues.
 * @property {string[]} recommendations - Actionable suggestions for improvement.
 * @property {number} productivityScore - 0–100 composite score.
 * @property {number} consistencyScore - 0–100 consistency measure.
 * @property {string} period - 'daily' | 'weekly' | 'monthly'
 * @property {string} summary - One-paragraph human-readable reflection.
 * @property {object} stats - Raw statistics used to generate the reflection.
 */

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Get display name for a date range.
 * @param {Date} from
 * @param {Date} to
 * @returns {string}
 */
function formatRange(from, to) {
  const opts = { month: 'short', day: 'numeric' };
  return `${from.toLocaleDateString('en-US', opts)} – ${to.toLocaleDateString('en-US', opts)}`;
}

/**
 * Clamp a score to 0–100 integer.
 * @param {number} n
 * @returns {number}
 */
function clamp(n) {
  return Math.round(Math.min(100, Math.max(0, n)));
}

/**
 * Calculate a consistency score from a series of daily completion rates.
 * Consistency = 100 − (standard deviation of rates × 100)
 * @param {number[]} dailyRates - Array of 0–1 completion rates.
 * @returns {number} 0–100
 */
function calcConsistencyScore(dailyRates) {
  if (!dailyRates || dailyRates.length < 2) return 50;
  const mean = dailyRates.reduce((s, v) => s + v, 0) / dailyRates.length;
  const variance = dailyRates.reduce((s, v) => s + (v - mean) ** 2, 0) / dailyRates.length;
  const stdDev = Math.sqrt(variance);
  return clamp(100 - stdDev * 100);
}

/**
 * Identify commitments that were frequently postponed or missed.
 * @param {object[]} commitments
 * @returns {string[]} Titles of problematic commitments.
 */
function findBottleneckCommitments(commitments) {
  return commitments
    .filter((c) =>
      c.status === 'postponed' ||
      c.status === 'missed' ||
      c.rescheduled === true ||
      c.postponed === true
    )
    .map((c) => c.title ?? 'Unnamed task')
    .slice(0, 3);
}

// ─── generateDailyReflection ──────────────────────────────────────────────────

/**
 * Generate a daily reflection report.
 *
 * @param {object} params
 * @param {object[]} params.commitments - All commitments for the day.
 * @param {object[]} [params.plannerActions=[]] - Planner actions taken today.
 * @param {object} [params.capacityReport] - CapacityReport for today.
 * @param {object} [params.realityGapReport] - RealityGapReport for today.
 * @param {Date} [params.date=new Date()] - The date being reflected on.
 * @returns {ReflectionReport}
 *
 * @example
 * generateDailyReflection({ commitments, plannerActions, capacityReport })
 * // → { wins: ['Completed 8/10 tasks'], bottlenecks: [...], productivityScore: 72, ... }
 */
export function generateDailyReflection({
  commitments = [],
  plannerActions = [],
  capacityReport = null,
  realityGapReport = null,
  date = new Date(),
} = {}) {
  const completion = calculateCompletionRate(commitments);
  const focusTime = calculateAverageFocusTime(commitments, plannerActions);
  const severity = realityGapReport?.severity ?? 'Low';
  const utilizationPct = capacityReport
    ? Math.round(
        ((capacityReport.totalScheduledMinutes ?? capacityReport.scheduledMinutes ?? 0) /
          (capacityReport.availableMinutes ?? 480)) * 100
      )
    : 50;

  const productivityResult = calculateProductivityScore({
    completionRate: completion.rate,
    focusMinutes: focusTime.totalFocusMinutes,
    totalMinutes: capacityReport?.availableMinutes ?? 480,
    utilizationPct,
    realityGapSeverity: severity,
  });

  // ── Wins ──────────────────────────────────────────────────────────────────
  const wins = [];

  if (completion.pct >= 90) wins.push(`Outstanding completion — ${completion.completedCount}/${completion.totalCount} tasks done (${completion.pct}%).`);
  else if (completion.pct >= 70) wins.push(`Good completion rate — ${completion.completedCount} of ${completion.totalCount} tasks finished.`);

  if (focusTime.averageHoursPerDay >= 2) wins.push(`Logged ${focusTime.averageHoursPerDay}h of deep focus work.`);

  const protectedAnchors = plannerActions.filter((a) => a.type === 'PROTECT');
  if (protectedAnchors.length > 0) wins.push(`${protectedAnchors.length} Life Anchor${protectedAnchors.length > 1 ? 's' : ''} kept intact.`);

  if (severity === 'Low') wins.push('Reality gap is low — plans were grounded and achievable.');

  if (utilizationPct >= 70 && utilizationPct <= 90) wins.push(`Healthy capacity utilization at ${utilizationPct}%.`);

  // ── Bottlenecks ───────────────────────────────────────────────────────────
  const bottlenecks = [];

  if (completion.pct < 50) bottlenecks.push(`Only ${completion.pct}% of tasks completed — review what caused the shortfall.`);

  const missedItems = findBottleneckCommitments(commitments);
  if (missedItems.length > 0) bottlenecks.push(`Items not completed: ${missedItems.join(', ')}.`);

  if (utilizationPct > 100) bottlenecks.push(`Over-scheduled by ${utilizationPct - 100}% — capacity was exceeded.`);

  if (severity === 'High') bottlenecks.push('Reality gap was high — commitments exceeded realistic capacity.');
  else if (severity === 'Medium') bottlenecks.push('Reality gap was moderate — some commitments may have been optimistic.');

  if (focusTime.averageHoursPerDay < 1 && commitments.length > 3) bottlenecks.push('Low focus time today — consider protecting a deep work block tomorrow.');

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations = [];

  if (completion.pct < 70) recommendations.push('Plan fewer tasks tomorrow and prioritise the top 3 most important.');

  if (focusTime.averageHoursPerDay < 1.5) recommendations.push('Schedule a 90-minute focus block early in the day before meetings begin.');

  if (utilizationPct > 100) recommendations.push('Move lower-priority tasks to later in the week to reduce overload.');

  if (severity !== 'Low') recommendations.push('Review your commitment list for tasks that can be delegated or deferred.');

  if (plannerActions.filter((a) => a.type === 'MOVE' || a.type === 'POSTPONE').length > 3) {
    recommendations.push('Multiple items were moved — consider whether your planning estimates are realistic.');
  }

  if (wins.length === 0) wins.push('Showed up and made progress today.');
  if (recommendations.length === 0) recommendations.push('Keep the momentum going — your plan is working well.');

  // ── Consistency (single day = neutral baseline) ────────────────────────────
  const consistencyScore = clamp(50 + (completion.rate - 0.5) * 60);

  // ── Summary ───────────────────────────────────────────────────────────────
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const summary = `On ${dateStr}, you completed ${completion.pct}% of planned work with a productivity score of ${productivityResult.score}/100 (Grade ${productivityResult.grade}). ` +
    (wins.length > 0 ? `Highlights: ${wins[0]} ` : '') +
    (bottlenecks.length > 0 ? `Area to watch: ${bottlenecks[0]}` : '');

  return {
    wins,
    bottlenecks,
    recommendations,
    productivityScore: productivityResult.score,
    consistencyScore,
    period: 'daily',
    summary,
    stats: {
      completion,
      focusTime,
      utilizationPct,
      severity,
      productivityBreakdown: productivityResult.breakdown,
    },
  };
}

// ─── generateWeeklyReflection ─────────────────────────────────────────────────

/**
 * Generate a weekly reflection report.
 *
 * @param {object} params
 * @param {object[]} params.commitments - All commitments for the week.
 * @param {object[]} [params.plannerActions=[]] - All planner actions for the week.
 * @param {Array<{date:string, severity:string}>} [params.realityGapHistory=[]] - Daily RG snapshots.
 * @param {Array<{date:string, rate:number}>} [params.dailyCompletionHistory=[]] - Daily completion rates.
 * @param {Date} [params.weekStart] - Monday of the week being reflected on.
 * @returns {ReflectionReport}
 *
 * @example
 * generateWeeklyReflection({ commitments, dailyCompletionHistory })
 * // → { wins: [...], bottlenecks: [...], productivityScore: 68, consistencyScore: 80, ... }
 */
export function generateWeeklyReflection({
  commitments = [],
  plannerActions = [],
  realityGapHistory = [],
  dailyCompletionHistory = [],
  weekStart = null,
} = {}) {
  const now = new Date();
  const monday = weekStart ?? new Date(now.getTime() - (now.getDay() || 7) * 86400000 * 1 + 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);

  const completion = calculateCompletionRate(commitments);
  const focusTime = calculateAverageFocusTime(commitments, plannerActions);
  const weeklyHours = calculateWeeklyHours(commitments, { from: monday, to: sunday });
  const gapTrend = calculateRealityGapTrend(realityGapHistory);

  const dailyRates = dailyCompletionHistory.map((d) => d.rate ?? 0);
  const consistencyScore = calcConsistencyScore(dailyRates);

  // Best and worst days
  const sortedDays = [...dailyCompletionHistory].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  const bestDay = sortedDays[0];
  const worstDay = sortedDays[sortedDays.length - 1];

  const avgCompletionRate = dailyRates.length > 0
    ? dailyRates.reduce((s, r) => s + r, 0) / dailyRates.length
    : completion.rate;

  const productivityResult = calculateProductivityScore({
    completionRate: avgCompletionRate,
    focusMinutes: focusTime.totalFocusMinutes / 5,
    totalMinutes: 480,
    utilizationPct: 75,
    realityGapSeverity: gapTrend.latestSeverity ?? 'Low',
  });

  // ── Wins ──────────────────────────────────────────────────────────────────
  const wins = [];

  if (completion.pct >= 80) wins.push(`Strong week — ${completion.completedCount}/${completion.totalCount} commitments completed (${completion.pct}%).`);
  else if (completion.pct >= 60) wins.push(`Decent week — ${completion.pct}% completion rate.`);

  if (weeklyHours.totalHours >= 35) wins.push(`Logged ${weeklyHours.totalHours}h of productive time this week.`);

  if (focusTime.averageHoursPerDay >= 1.5) wins.push(`Averaged ${focusTime.averageHoursPerDay}h of deep work per day.`);

  if (consistencyScore >= 75) wins.push(`High consistency score of ${consistencyScore}/100 — your day-to-day output was stable.`);

  if (gapTrend.direction === 'improving') wins.push('Reality gap is trending in the right direction this week.');

  if (bestDay) wins.push(`Best day: ${new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })} with ${Math.round((bestDay.rate ?? 0) * 100)}% completion.`);

  // ── Bottlenecks ───────────────────────────────────────────────────────────
  const bottlenecks = [];

  if (completion.pct < 50) bottlenecks.push(`Below-average week — ${completion.pct}% completion suggests over-planning or external disruptions.`);

  if (consistencyScore < 50) bottlenecks.push('High variance in daily output — some days were productive, others fell short.');

  if (focusTime.averageHoursPerDay < 1) bottlenecks.push('Insufficient deep work time this week — most time was reactive/shallow work.');

  if (gapTrend.direction === 'worsening') bottlenecks.push('Reality gap worsened during the week — your plans exceeded your realistic capacity.');

  if (worstDay && (worstDay.rate ?? 0) < 0.3) {
    bottlenecks.push(`${new Date(worstDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })} was a difficult day — worth understanding what happened.`);
  }

  const postponedCount = plannerActions.filter((a) => a.type === 'POSTPONE' || a.type === 'MOVE').length;
  if (postponedCount > 5) bottlenecks.push(`${postponedCount} items were moved or postponed — daily planning may need adjustment.`);

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations = [];

  if (completion.pct < 70) recommendations.push('Reduce weekly task load by 20% and focus on completing fewer, higher-impact items.');

  if (focusTime.averageHoursPerDay < 1.5) recommendations.push('Block 2h of deep work in your calendar before 11am each day next week.');

  if (consistencyScore < 60) recommendations.push('Identify what caused your worst days and add protective buffers around those patterns.');

  if (gapTrend.direction === 'worsening') recommendations.push('Run a Reality Check before planning next week — your estimates may be optimistic.');

  recommendations.push(`Aim for ${Math.min(completion.pct + 10, 90)}% completion next week — a reachable stretch goal.`);

  if (wins.length === 0) wins.push('Completed another week — every day of effort compounds.');
  if (bottlenecks.length === 0) bottlenecks.push('No major issues this week. Keep the system running.');

  const rangeStr = formatRange(monday, sunday);
  const summary = `Week of ${rangeStr}: ${completion.completedCount}/${completion.totalCount} commitments completed. ` +
    `Productivity score: ${productivityResult.score}/100 (${productivityResult.grade}). ` +
    `Consistency: ${consistencyScore}/100. ` +
    (wins.length > 0 ? `Top win: ${wins[0]} ` : '') +
    (recommendations.length > 0 ? `Next week: ${recommendations[0]}` : '');

  return {
    wins,
    bottlenecks,
    recommendations,
    productivityScore: productivityResult.score,
    consistencyScore,
    period: 'weekly',
    summary,
    stats: {
      completion,
      focusTime,
      weeklyHours,
      gapTrend,
      consistencyScore,
      postponedCount,
    },
  };
}

// ─── generateMonthlyReflection ────────────────────────────────────────────────

/**
 * Generate a monthly reflection report.
 *
 * @param {object} params
 * @param {object[]} params.commitments - All commitments for the month.
 * @param {object[]} [params.plannerActions=[]] - All planner actions for the month.
 * @param {Array<{date:string,severity:string}>} [params.realityGapHistory=[]] - Daily RG snapshots.
 * @param {Array<{date:string,rate:number}>} [params.dailyCompletionHistory=[]] - Daily completion rates.
 * @param {Array<{week:string,hours:number}>} [params.weeklyHourHistory=[]] - Weekly hours.
 * @param {Date} [params.monthStart] - First day of the month.
 * @returns {ReflectionReport}
 *
 * @example
 * generateMonthlyReflection({ commitments, dailyCompletionHistory, realityGapHistory })
 * // → { wins: [...], productivityScore: 74, consistencyScore: 71, period: 'monthly', ... }
 */
export function generateMonthlyReflection({
  commitments = [],
  plannerActions = [],
  realityGapHistory = [],
  dailyCompletionHistory = [],
  weeklyHourHistory = [],
  monthStart = null,
} = {}) {
  const now = new Date();
  const start = monthStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const monthName = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const completion = calculateCompletionRate(commitments);
  const focusTime = calculateAverageFocusTime(commitments, plannerActions);
  const weeklyHours = calculateWeeklyHours(commitments, { from: start, to: end });
  const gapTrend = calculateRealityGapTrend(realityGapHistory);

  const dailyRates = dailyCompletionHistory.map((d) => d.rate ?? 0);
  const consistencyScore = calcConsistencyScore(dailyRates);

  const totalHours = weeklyHourHistory.length > 0
    ? weeklyHourHistory.reduce((s, w) => s + (w.hours ?? 0), 0)
    : weeklyHours.totalHours;

  const avgCompletionRate = dailyRates.length > 0
    ? dailyRates.reduce((s, r) => s + r, 0) / dailyRates.length
    : completion.rate;

  const productivityResult = calculateProductivityScore({
    completionRate: avgCompletionRate,
    focusMinutes: focusTime.averageMinutesPerDay,
    totalMinutes: 480,
    utilizationPct: 75,
    realityGapSeverity: gapTrend.latestSeverity ?? 'Low',
  });

  // ── Wins ──────────────────────────────────────────────────────────────────
  const wins = [];

  if (completion.completedCount > 0) wins.push(`Completed ${completion.completedCount} commitments in ${monthName} (${completion.pct}%).`);

  if (totalHours >= 120) wins.push(`Logged ${totalHours}h of productive time across the month.`);

  if (focusTime.averageHoursPerDay >= 1.5) wins.push(`Averaged ${focusTime.averageHoursPerDay}h/day of deep work.`);

  if (consistencyScore >= 70) wins.push(`Strong month-long consistency at ${consistencyScore}/100.`);

  if (gapTrend.direction === 'improving') wins.push('Reality gap improved over the course of the month.');

  const peakWeek = weeklyHours.peakWeek;
  if (peakWeek) {
    const peakEntry = weeklyHours.byWeek.find((w) => w.week === peakWeek);
    if (peakEntry) wins.push(`Peak week was ${peakWeek} with ${peakEntry.hours}h scheduled.`);
  }

  // ── Bottlenecks ───────────────────────────────────────────────────────────
  const bottlenecks = [];

  if (completion.pct < 55) bottlenecks.push(`Completion rate of ${completion.pct}% suggests persistent over-commitment or planning issues.`);

  if (consistencyScore < 50) bottlenecks.push('High month-to-month variance — output was unpredictable across weeks.');

  if (focusTime.averageHoursPerDay < 1) bottlenecks.push('Chronically low deep work hours — structural changes may be needed to protect focus time.');

  if (gapTrend.direction === 'worsening') bottlenecks.push('Reality gap worsened over the month — system recalibration recommended.');

  const postponedCount = plannerActions.filter((a) => a.type === 'POSTPONE' || a.type === 'MOVE').length;
  if (postponedCount > 20) bottlenecks.push(`${postponedCount} total deferrals this month — many commitments were not completed when planned.`);

  // ── Recommendations ───────────────────────────────────────────────────────
  const recommendations = [];

  if (completion.pct < 65) recommendations.push(`Next month, cap your weekly task list at ${Math.ceil(completion.totalCount / 4 * 0.7)} items per week — quality over quantity.`);

  if (focusTime.averageHoursPerDay < 2) recommendations.push('Redesign your schedule to protect at least 2h of morning deep work 5 days per week.');

  if (consistencyScore < 60) recommendations.push('Introduce a weekly review ritual every Sunday to anchor your planning rhythm.');

  if (gapTrend.direction !== 'improving') recommendations.push('Run a monthly Reality Audit — identify which commitment types are consistently overrun.');

  recommendations.push(`Set a productivity score target of ${Math.min(productivityResult.score + 8, 90)}/100 for next month.`);

  if (wins.length === 0) wins.push(`You operated for a full month — that's the foundation everything else builds on.`);

  const summary = `${monthName} recap: ${completion.completedCount} commitments completed (${completion.pct}%). ` +
    `Productivity: ${productivityResult.score}/100 | Consistency: ${consistencyScore}/100 | Focus: ${focusTime.averageHoursPerDay}h/day. ` +
    (gapTrend.direction !== 'stable' ? `Reality gap trending ${gapTrend.direction}. ` : '') +
    (recommendations.length > 0 ? `Key focus for next month: ${recommendations[0]}` : '');

  return {
    wins,
    bottlenecks,
    recommendations,
    productivityScore: productivityResult.score,
    consistencyScore,
    period: 'monthly',
    summary,
    stats: {
      completion,
      focusTime,
      weeklyHours,
      gapTrend,
      consistencyScore,
      totalHours,
      postponedCount,
    },
  };
}
