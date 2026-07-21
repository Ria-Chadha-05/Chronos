/**
 * statisticsEngine.js
 *
 * Chronos Statistics Engine — Part 2
 *
 * Pure statistical functions over arrays of commitments and planner outputs.
 * All functions are side-effect-free and have no UI coupling.
 *
 * ▸ No imports from existing engines, contexts, or stores.
 * ▸ Every function accepts plain arrays/objects and returns plain data.
 * ▸ Safe to call with empty or partial input — always returns a valid shape.
 */

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Get midnight UTC date string (YYYY-MM-DD) for a Date or ISO string.
 * @param {Date|string} value
 * @returns {string}
 */
function toDateKey(value) {
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

/**
 * Extract the effective duration in minutes from a commitment object.
 * Prefers effectiveDurationMinutes, falls back to durationMinutes / duration.
 * @param {object} c
 * @returns {number}
 */
function getDuration(c) {
  return (
    c.effectiveDurationMinutes ??
    c.durationMinutes ??
    c.duration ??
    0
  );
}

/**
 * Safely parse a date value from a commitment's start field.
 * @param {object} c
 * @returns {Date|null}
 */
function getStartDate(c) {
  const raw = c.startDateTime ?? c.start?.dateTime ?? c.start?.date ?? c.start ?? c.date ?? null;
  if (!raw) return null;
  try {
    const d = new Date(typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Return the ISO week number (1–53) of a Date.
 * @param {Date} d
 * @returns {number}
 */
function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

/**
 * Average an array of numbers. Returns 0 for empty arrays.
 * @param {number[]} arr
 * @returns {number}
 */
function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ─── calculateCompletionRate ──────────────────────────────────────────────────

/**
 * Calculate the task/commitment completion rate.
 *
 * @param {object[]} commitments - Array of commitment objects.
 *   Each item may have: `completed` (bool), `status` (string), `done` (bool).
 * @returns {{
 *   rate: number,           // 0–1
 *   completedCount: number,
 *   totalCount: number,
 *   incompletedCount: number,
 *   pct: number             // 0–100, rounded
 * }}
 *
 * @example
 * calculateCompletionRate(commitments)
 * // → { rate: 0.75, completedCount: 9, totalCount: 12, pct: 75 }
 */
export function calculateCompletionRate(commitments = []) {
  const totalCount = commitments.length;
  if (totalCount === 0) return { rate: 0, completedCount: 0, totalCount: 0, incompletedCount: 0, pct: 0 };

  const completedCount = commitments.filter((c) =>
    c.completed === true || c.done === true || c.status === 'completed' || c.status === 'done'
  ).length;

  const rate = completedCount / totalCount;
  return {
    rate,
    completedCount,
    totalCount,
    incompletedCount: totalCount - completedCount,
    pct: Math.round(rate * 100),
  };
}

// ─── calculateAverageFocusTime ────────────────────────────────────────────────

/**
 * Calculate average focus time (deep work minutes) per day.
 *
 * Focus time is identified by commitments with:
 *   - type === 'focus' | 'deep_work' | 'study'
 *   - OR a FOCUS_BLOCK planner action
 *   - OR title contains 'focus', 'deep work', 'study', 'dsa', 'leetcode'
 *
 * @param {object[]} commitments - Array of commitment objects.
 * @param {object[]} [plannerActions=[]] - Array of PlannerAction objects.
 * @returns {{
 *   averageMinutesPerDay: number,
 *   averageHoursPerDay: number,
 *   totalFocusMinutes: number,
 *   focusSessionCount: number,
 *   daysCounted: number
 * }}
 *
 * @example
 * calculateAverageFocusTime(commitments)
 * // → { averageHoursPerDay: 2.5, totalFocusMinutes: 450, ... }
 */
export function calculateAverageFocusTime(commitments = [], plannerActions = []) {
  const FOCUS_TYPES = new Set(['focus', 'deep_work', 'study', 'focus_block']);
  const FOCUS_KEYWORDS = ['focus', 'deep work', 'study', 'dsa', 'leetcode', 'reading', 'research'];

  const focusBlockIds = new Set(
    plannerActions
      .filter((a) => a.type === 'FOCUS_BLOCK')
      .map((a) => a.commitmentId)
      .filter(Boolean)
  );

  const focusSessions = commitments.filter((c) => {
    if (focusBlockIds.has(c.id)) return true;
    const type = (c.type ?? c.commitmentType ?? '').toLowerCase();
    if (FOCUS_TYPES.has(type)) return true;
    const title = (c.title ?? '').toLowerCase();
    return FOCUS_KEYWORDS.some((kw) => title.includes(kw));
  });

  const byDay = {};
  for (const c of focusSessions) {
    const date = getStartDate(c);
    const key = date ? toDateKey(date) : 'unknown';
    byDay[key] = (byDay[key] ?? 0) + getDuration(c);
  }

  const dayKeys = Object.keys(byDay).filter((k) => k !== 'unknown');
  const daysCounted = dayKeys.length || 1;
  const totalFocusMinutes = Object.values(byDay).reduce((s, v) => s + v, 0);
  const averageMinutesPerDay = totalFocusMinutes / daysCounted;

  return {
    averageMinutesPerDay: Math.round(averageMinutesPerDay),
    averageHoursPerDay: Math.round((averageMinutesPerDay / 60) * 10) / 10,
    totalFocusMinutes,
    focusSessionCount: focusSessions.length,
    daysCounted,
  };
}

// ─── calculateWeeklyHours ─────────────────────────────────────────────────────

/**
 * Aggregate commitment hours by ISO week, optionally for a date range.
 *
 * @param {object[]} commitments - Array of commitment objects.
 * @param {object} [options={}]
 * @param {Date} [options.from] - Start of range (inclusive).
 * @param {Date} [options.to] - End of range (inclusive).
 * @param {number} [options.weeks=8] - Number of recent weeks to include if no range given.
 * @returns {{
 *   byWeek: Array<{ week: string, hours: number, minutes: number }>,
 *   totalHours: number,
 *   averageHoursPerWeek: number,
 *   peakWeek: string | null
 * }}
 *
 * @example
 * calculateWeeklyHours(commitments, { weeks: 4 })
 * // → { byWeek: [{week: '2025-W22', hours: 38.5}, ...], totalHours: 154, ... }
 */
export function calculateWeeklyHours(commitments = [], options = {}) {
  const { from, to, weeks = 8 } = options;
  const now = new Date();
  const rangeStart = from ?? new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
  const rangeEnd = to ?? now;

  const weekMap = {};

  for (const c of commitments) {
    const date = getStartDate(c);
    if (!date) continue;
    if (date < rangeStart || date > rangeEnd) continue;

    const weekNum = isoWeek(date);
    const key = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    weekMap[key] = (weekMap[key] ?? 0) + getDuration(c);
  }

  const byWeek = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, minutes]) => ({
      week,
      hours: Math.round((minutes / 60) * 10) / 10,
      minutes,
    }));

  const totalMinutes = byWeek.reduce((s, w) => s + w.minutes, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const averageHoursPerWeek = byWeek.length > 0
    ? Math.round((totalHours / byWeek.length) * 10) / 10
    : 0;

  const peakWeekEntry = byWeek.reduce(
    (max, w) => (!max || w.hours > max.hours ? w : max),
    null
  );

  return {
    byWeek,
    totalHours,
    averageHoursPerWeek,
    peakWeek: peakWeekEntry?.week ?? null,
  };
}

// ─── calculateSourceDistribution ─────────────────────────────────────────────

/**
 * Calculate the distribution of commitments by source (calendar, gmail, manual).
 *
 * @param {object[]} commitments - Array of commitment objects.
 *   Each may have a `source` field: 'calendar' | 'gmail' | 'manual' | 'task' | ...
 * @returns {{
 *   distribution: Array<{ source: string, count: number, pct: number, minutes: number }>,
 *   totalCount: number,
 *   dominantSource: string | null
 * }}
 *
 * @example
 * calculateSourceDistribution(commitments)
 * // → { distribution: [{source: 'calendar', count: 8, pct: 67, minutes: 480}, ...], ... }
 */
export function calculateSourceDistribution(commitments = []) {
  const counts = {};
  const minutes = {};

  for (const c of commitments) {
    const source = c.source ?? c.origin ?? 'manual';
    counts[source] = (counts[source] ?? 0) + 1;
    minutes[source] = (minutes[source] ?? 0) + getDuration(c);
  }

  const totalCount = commitments.length || 1;

  const distribution = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([source, count]) => ({
      source,
      count,
      pct: Math.round((count / totalCount) * 100),
      minutes: minutes[source] ?? 0,
    }));

  return {
    distribution,
    totalCount: commitments.length,
    dominantSource: distribution[0]?.source ?? null,
  };
}

// ─── calculateCommitmentTypeDistribution ─────────────────────────────────────

/**
 * Calculate the distribution of commitments by commitment type.
 *
 * @param {object[]} commitments - Array of ClassifiedCommitment objects.
 *   Each may have a `commitmentType` field from CommitmentTypes.ts.
 * @returns {{
 *   distribution: Array<{ type: string, count: number, pct: number, totalMinutes: number }>,
 *   totalCount: number
 * }}
 *
 * @example
 * calculateCommitmentTypeDistribution(commitments)
 * // → { distribution: [{type: 'TIMED_EVENT', count: 5, pct: 45, totalMinutes: 300}], ... }
 */
export function calculateCommitmentTypeDistribution(commitments = []) {
  const counts = {};
  const minutesByType = {};

  for (const c of commitments) {
    const type = c.commitmentType ?? (c.allDay ? 'ALL_DAY_EVENT' : 'TIMED_EVENT');
    counts[type] = (counts[type] ?? 0) + 1;
    minutesByType[type] = (minutesByType[type] ?? 0) + getDuration(c);
  }

  const totalCount = commitments.length || 1;

  const distribution = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({
      type,
      count,
      pct: Math.round((count / totalCount) * 100),
      totalMinutes: minutesByType[type] ?? 0,
    }));

  return {
    distribution,
    totalCount: commitments.length,
  };
}

// ─── calculateRealityGapTrend ─────────────────────────────────────────────────

/**
 * Calculate the reality gap trend over time from a series of historical reports.
 *
 * @param {Array<{ date: string|Date, severity: 'Low'|'Medium'|'High', score?: number }>} history
 *   Array of past reality gap snapshots, each with a date and severity.
 * @returns {{
 *   trend: Array<{ date: string, severityScore: number, severity: string }>,
 *   averageSeverityScore: number,
 *   direction: 'improving' | 'worsening' | 'stable',
 *   latestSeverity: string | null
 * }}
 *
 * @example
 * calculateRealityGapTrend(history)
 * // → { direction: 'improving', averageSeverityScore: 1.4, ... }
 */
export function calculateRealityGapTrend(history = []) {
  const SEVERITY_SCORE = { Low: 1, Medium: 2, High: 3 };

  const trend = history
    .map((entry) => {
      const date = entry.date instanceof Date ? toDateKey(entry.date) : (entry.date ?? '');
      const severity = entry.severity ?? 'Low';
      const severityScore = entry.score ?? SEVERITY_SCORE[severity] ?? 1;
      return { date, severityScore, severity };
    })
    .filter((e) => e.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (trend.length === 0) {
    return { trend: [], averageSeverityScore: 0, direction: 'stable', latestSeverity: null };
  }

  const scores = trend.map((e) => e.severityScore);
  const averageSeverityScore = Math.round(avg(scores) * 10) / 10;

  const latestSeverity = trend[trend.length - 1]?.severity ?? null;

  let direction = 'stable';
  if (trend.length >= 3) {
    const firstHalf = avg(scores.slice(0, Math.floor(scores.length / 2)));
    const secondHalf = avg(scores.slice(Math.ceil(scores.length / 2)));
    if (secondHalf < firstHalf - 0.2) direction = 'improving';
    else if (secondHalf > firstHalf + 0.2) direction = 'worsening';
  }

  return { trend, averageSeverityScore, direction, latestSeverity };
}

// ─── calculateProductivityScore ───────────────────────────────────────────────

/**
 * Calculate a composite productivity score (0–100) from multiple signals.
 *
 * Weights:
 *   - Completion rate: 35%
 *   - Focus time ratio: 25%
 *   - Capacity utilization (not overloaded): 20%
 *   - Reality gap severity: 20%
 *
 * @param {object} params
 * @param {number} [params.completionRate=0] - 0–1
 * @param {number} [params.focusMinutes=0] - Deep work minutes in the period
 * @param {number} [params.totalMinutes=480] - Total available minutes
 * @param {number} [params.utilizationPct=50] - Capacity utilization 0–100+
 * @param {'Low'|'Medium'|'High'} [params.realityGapSeverity='Low']
 * @returns {{
 *   score: number,       // 0–100
 *   grade: string,       // 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
 *   breakdown: {
 *     completionScore: number,
 *     focusScore: number,
 *     capacityScore: number,
 *     realityScore: number
 *   }
 * }}
 *
 * @example
 * calculateProductivityScore({ completionRate: 0.8, focusMinutes: 120, utilizationPct: 75 })
 * // → { score: 78, grade: 'B', breakdown: { ... } }
 */
export function calculateProductivityScore({
  completionRate = 0,
  focusMinutes = 0,
  totalMinutes = 480,
  utilizationPct = 50,
  realityGapSeverity = 'Low',
} = {}) {
  // Completion score (0–35)
  const completionScore = Math.round(Math.min(1, completionRate) * 35);

  // Focus score (0–25) — ideal is 25–50% of time in deep focus
  const focusRatio = totalMinutes > 0 ? focusMinutes / totalMinutes : 0;
  const focusScore = Math.round(Math.min(1, focusRatio / 0.35) * 25);

  // Capacity score (0–20) — best when 70–90% utilised, penalty for over/under
  let capacityScore = 0;
  if (utilizationPct >= 70 && utilizationPct <= 90) capacityScore = 20;
  else if (utilizationPct >= 50 && utilizationPct < 70) capacityScore = 14;
  else if (utilizationPct > 90 && utilizationPct <= 105) capacityScore = 12;
  else if (utilizationPct > 105) capacityScore = Math.max(0, 20 - Math.round((utilizationPct - 100) * 0.5));
  else capacityScore = Math.round((utilizationPct / 50) * 14);

  // Reality gap score (0–20)
  const realityScore = { Low: 20, Medium: 10, High: 0 }[realityGapSeverity] ?? 10;

  const score = Math.min(100, completionScore + focusScore + capacityScore + realityScore);

  const grade =
    score >= 90 ? 'S' :
    score >= 80 ? 'A' :
    score >= 70 ? 'B' :
    score >= 55 ? 'C' :
    score >= 40 ? 'D' : 'F';

  return {
    score,
    grade,
    breakdown: { completionScore, focusScore, capacityScore, realityScore },
  };
}
