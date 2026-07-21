/**
 * streakEngine.js
 *
 * Chronos Streak Engine — Part 4
 *
 * Calculates current and longest streaks for planning, deep work, study,
 * workout, and task completion activities. All functions are pure and
 * operate on plain data arrays — no UI coupling, no context imports.
 *
 * ▸ Streak = consecutive calendar days with qualifying activity.
 * ▸ Today counts as active if qualifying data exists for today.
 * ▸ A streak is "broken" when a non-qualifying calendar day is skipped.
 */

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Normalise a date to midnight in local time (YYYY-MM-DD string).
 * @param {Date|string} value
 * @returns {string}
 */
function toDateKey(value) {
  try {
    const d = value instanceof Date ? value : new Date(
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? `${value}T00:00:00`
        : value
    );
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Get today's date key.
 * @returns {string}
 */
function today() {
  return toDateKey(new Date());
}

/**
 * Get yesterday's date key.
 * @returns {string}
 */
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

/**
 * Subtract N days from a date key and return new date key.
 * @param {string} dateKey - YYYY-MM-DD
 * @param {number} n
 * @returns {string}
 */
function subtractDays(dateKey, n) {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
}

/**
 * Given a sorted array of unique date key strings (ascending),
 * calculate current streak and longest streak.
 *
 * Current streak: consecutive days ending today or yesterday.
 * Longest streak: max consecutive day run in the entire history.
 *
 * @param {string[]} sortedDateKeys - Unique YYYY-MM-DD strings, ascending.
 * @returns {{ currentStreak: number, longestStreak: number, lastActiveDate: string|null }}
 */
function computeStreaks(sortedDateKeys) {
  if (!sortedDateKeys || sortedDateKeys.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null };
  }

  const keySet = new Set(sortedDateKeys);
  const lastActive = sortedDateKeys[sortedDateKeys.length - 1];

  // Current streak — walk backward from today
  let currentStreak = 0;
  const todayKey = today();
  const yesterdayKey = yesterday();

  // Only count current streak if last activity was today or yesterday
  if (lastActive === todayKey || lastActive === yesterdayKey) {
    let cursor = lastActive === todayKey ? todayKey : yesterdayKey;
    while (keySet.has(cursor)) {
      currentStreak++;
      cursor = subtractDays(cursor, 1);
    }
  }

  // Longest streak — single pass through sorted keys
  let longestStreak = 0;
  let runLength = 1;

  for (let i = 1; i < sortedDateKeys.length; i++) {
    const prev = sortedDateKeys[i - 1];
    const curr = sortedDateKeys[i];
    const expected = subtractDays(curr, 1);
    if (prev === expected) {
      runLength++;
    } else {
      longestStreak = Math.max(longestStreak, runLength);
      runLength = 1;
    }
  }
  longestStreak = Math.max(longestStreak, runLength);

  return { currentStreak, longestStreak, lastActiveDate: lastActive };
}

/**
 * Build a canonical streak result object.
 * @param {string} type - Streak type label.
 * @param {string[]} activeDateKeys - Unique sorted date keys.
 * @returns {StreakResult}
 */
function buildStreakResult(type, activeDateKeys) {
  const sorted = [...new Set(activeDateKeys)].filter(Boolean).sort();
  const { currentStreak, longestStreak, lastActiveDate } = computeStreaks(sorted);
  const todayActive = sorted.includes(today());
  const isActive = currentStreak > 0;

  return {
    type,
    currentStreak,
    longestStreak,
    lastActiveDate,
    isActive,
    todayActive,
    totalActiveDays: sorted.length,
    history: sorted,
  };
}

// ─── JSDoc typedef ────────────────────────────────────────────────────────────

/**
 * @typedef {object} StreakResult
 * @property {string} type - Streak type (e.g. 'planning', 'deepWork').
 * @property {number} currentStreak - Consecutive active days ending today/yesterday.
 * @property {number} longestStreak - Maximum consecutive run in full history.
 * @property {string|null} lastActiveDate - YYYY-MM-DD of most recent activity.
 * @property {boolean} isActive - Whether the streak is currently alive.
 * @property {boolean} todayActive - Whether today qualifies.
 * @property {number} totalActiveDays - Total unique active days.
 * @property {string[]} history - Sorted array of YYYY-MM-DD active date keys.
 */

// ─── calculatePlanningStreak ──────────────────────────────────────────────────

/**
 * Calculate the planning streak — days on which the user created a day plan.
 *
 * A planning session is identified by any commitment with source === 'planner'
 * or by entries in an explicit planningDates array.
 *
 * @param {object[]} commitments - Array of commitment objects.
 * @param {string[]} [planningDates=[]] - Explicit YYYY-MM-DD dates with plans.
 * @returns {StreakResult}
 *
 * @example
 * calculatePlanningStreak(commitments, ['2025-06-10', '2025-06-11'])
 * // → { type: 'planning', currentStreak: 7, longestStreak: 12, ... }
 */
export function calculatePlanningStreak(commitments = [], planningDates = []) {
  const fromCommitments = commitments
    .filter((c) => c.source === 'planner' || c.plannedByChronos === true || c.isPlanned === true)
    .map((c) => {
      const raw = c.startDateTime ?? c.start?.dateTime ?? c.start?.date ?? c.start ?? c.date ?? null;
      return raw ? toDateKey(new Date(raw)) : '';
    });

  const allDates = [...fromCommitments, ...planningDates];
  return buildStreakResult('planning', allDates);
}

// ─── calculateDeepWorkStreak ──────────────────────────────────────────────────

/**
 * Calculate the deep work streak — days with at least `minMinutes` of focus time.
 *
 * Deep work is identified by commitment type/title keywords or FOCUS_BLOCK actions.
 *
 * @param {object[]} commitments - Array of commitment objects.
 * @param {object} [options={}]
 * @param {number} [options.minMinutes=60] - Minimum focus minutes to qualify a day.
 * @param {object[]} [options.plannerActions=[]] - Planner actions (looks for FOCUS_BLOCK).
 * @returns {StreakResult}
 *
 * @example
 * calculateDeepWorkStreak(commitments, { minMinutes: 90 })
 * // → { type: 'deepWork', currentStreak: 4, longestStreak: 14, ... }
 */
export function calculateDeepWorkStreak(commitments = [], options = {}) {
  const { minMinutes = 60, plannerActions = [] } = options;

  const FOCUS_TYPES = new Set(['focus', 'deep_work', 'focus_block']);
  const FOCUS_KEYWORDS = ['focus', 'deep work', 'study block', 'dsa', 'leetcode', 'reading session'];

  const focusBlockIds = new Set(
    plannerActions.filter((a) => a.type === 'FOCUS_BLOCK').map((a) => a.commitmentId).filter(Boolean)
  );

  const focusCommitments = commitments.filter((c) => {
    if (focusBlockIds.has(c.id)) return true;
    const type = (c.type ?? c.commitmentType ?? '').toLowerCase();
    if (FOCUS_TYPES.has(type)) return true;
    const title = (c.title ?? '').toLowerCase();
    return FOCUS_KEYWORDS.some((kw) => title.includes(kw));
  });

  // Group by date and sum minutes
  const minutesByDate = {};
  for (const c of focusCommitments) {
    const raw = c.startDateTime ?? c.start?.dateTime ?? c.start?.date ?? c.start ?? c.date ?? null;
    if (!raw) continue;
    const key = toDateKey(new Date(raw));
    if (!key) continue;
    const duration = c.effectiveDurationMinutes ?? c.durationMinutes ?? c.duration ?? 0;
    minutesByDate[key] = (minutesByDate[key] ?? 0) + duration;
  }

  const qualifyingDates = Object.entries(minutesByDate)
    .filter(([, mins]) => mins >= minMinutes)
    .map(([date]) => date);

  return buildStreakResult('deepWork', qualifyingDates);
}

// ─── calculateStudyStreak ─────────────────────────────────────────────────────

/**
 * Calculate the study streak — days with at least one study commitment.
 *
 * Study commitments are identified by keywords: 'study', 'dsa', 'leetcode',
 * 'revision', 'lecture', 'tutorial', 'course', 'assignment', 'exam prep'.
 *
 * @param {object[]} commitments - Array of commitment objects.
 * @param {object} [options={}]
 * @param {number} [options.minMinutes=30] - Minimum study minutes to qualify.
 * @param {string[]} [options.extraKeywords=[]] - Additional keywords to match.
 * @returns {StreakResult}
 *
 * @example
 * calculateStudyStreak(commitments)
 * // → { type: 'study', currentStreak: 5, longestStreak: 21, ... }
 */
export function calculateStudyStreak(commitments = [], options = {}) {
  const { minMinutes = 30, extraKeywords = [] } = options;

  const STUDY_KEYWORDS = [
    'study', 'dsa', 'leetcode', 'revision', 'revise', 'lecture', 'tutorial',
    'course', 'assignment', 'exam prep', 'homework', 'practise', 'practice',
    'learn', 'reading', 'workshop', ...extraKeywords,
  ];
  const STUDY_TYPES = new Set(['study', 'academic', 'learning', 'homework']);

  const studyCommitments = commitments.filter((c) => {
    const type = (c.type ?? c.commitmentType ?? '').toLowerCase();
    if (STUDY_TYPES.has(type)) return true;
    const title = (c.title ?? '').toLowerCase();
    return STUDY_KEYWORDS.some((kw) => title.includes(kw));
  });

  const minutesByDate = {};
  for (const c of studyCommitments) {
    const raw = c.startDateTime ?? c.start?.dateTime ?? c.start?.date ?? c.start ?? c.date ?? null;
    if (!raw) continue;
    const key = toDateKey(new Date(raw));
    if (!key) continue;
    const duration = c.effectiveDurationMinutes ?? c.durationMinutes ?? c.duration ?? 0;
    minutesByDate[key] = (minutesByDate[key] ?? 0) + duration;
  }

  const qualifyingDates = Object.entries(minutesByDate)
    .filter(([, mins]) => mins >= minMinutes)
    .map(([date]) => date);

  return buildStreakResult('study', qualifyingDates);
}

// ─── calculateWorkoutStreak ───────────────────────────────────────────────────

/**
 * Calculate the workout/fitness streak — days with at least one workout activity.
 *
 * Workout commitments are identified by keywords: 'gym', 'workout', 'run',
 * 'exercise', 'yoga', 'swim', 'cycling', 'strength', 'cardio', 'fitness'.
 *
 * @param {object[]} commitments - Array of commitment objects.
 * @param {object} [options={}]
 * @param {number} [options.minMinutes=20] - Minimum workout minutes to qualify.
 * @param {string[]} [options.extraKeywords=[]] - Additional keywords to match.
 * @returns {StreakResult}
 *
 * @example
 * calculateWorkoutStreak(commitments)
 * // → { type: 'workout', currentStreak: 12, longestStreak: 30, ... }
 */
export function calculateWorkoutStreak(commitments = [], options = {}) {
  const { minMinutes = 20, extraKeywords = [] } = options;

  const WORKOUT_KEYWORDS = [
    'gym', 'workout', 'run', 'running', 'jog', 'exercise', 'yoga', 'swim',
    'cycling', 'bike', 'strength', 'cardio', 'fitness', 'walk', 'hike',
    'lift', 'crossfit', 'pilates', 'sport', 'basketball', 'cricket',
    'football', 'badminton', 'tennis', ...extraKeywords,
  ];
  const WORKOUT_TYPES = new Set(['workout', 'fitness', 'exercise', 'sport', 'health']);

  const workoutCommitments = commitments.filter((c) => {
    const type = (c.type ?? c.commitmentType ?? '').toLowerCase();
    if (WORKOUT_TYPES.has(type)) return true;
    const title = (c.title ?? '').toLowerCase();
    return WORKOUT_KEYWORDS.some((kw) => title.includes(kw));
  });

  const minutesByDate = {};
  for (const c of workoutCommitments) {
    const raw = c.startDateTime ?? c.start?.dateTime ?? c.start?.date ?? c.start ?? c.date ?? null;
    if (!raw) continue;
    const key = toDateKey(new Date(raw));
    if (!key) continue;
    const duration = c.effectiveDurationMinutes ?? c.durationMinutes ?? c.duration ?? 0;
    minutesByDate[key] = (minutesByDate[key] ?? 0) + duration;
  }

  const qualifyingDates = Object.entries(minutesByDate)
    .filter(([, mins]) => mins >= minMinutes)
    .map(([date]) => date);

  return buildStreakResult('workout', qualifyingDates);
}

// ─── calculateTaskCompletionStreak ────────────────────────────────────────────

/**
 * Calculate the task completion streak — consecutive days where the user
 * completed at least N tasks (default: 1).
 *
 * @param {object[]} commitments - Array of commitment objects with completion status.
 * @param {object} [options={}]
 * @param {number} [options.minCompletedPerDay=1] - Minimum completions to qualify a day.
 * @returns {StreakResult}
 *
 * @example
 * calculateTaskCompletionStreak(commitments, { minCompletedPerDay: 3 })
 * // → { type: 'taskCompletion', currentStreak: 8, longestStreak: 22, ... }
 */
export function calculateTaskCompletionStreak(commitments = [], options = {}) {
  const { minCompletedPerDay = 1 } = options;

  const completedCommitments = commitments.filter(
    (c) => c.completed === true || c.done === true || c.status === 'completed' || c.status === 'done'
  );

  const countByDate = {};
  for (const c of completedCommitments) {
    const raw = c.completedAt ?? c.startDateTime ?? c.start?.dateTime ?? c.start?.date ?? c.start ?? c.date ?? null;
    if (!raw) continue;
    const key = toDateKey(new Date(raw));
    if (!key) continue;
    countByDate[key] = (countByDate[key] ?? 0) + 1;
  }

  const qualifyingDates = Object.entries(countByDate)
    .filter(([, count]) => count >= minCompletedPerDay)
    .map(([date]) => date);

  return buildStreakResult('taskCompletion', qualifyingDates);
}

// ─── calculateAllStreaks ───────────────────────────────────────────────────────

/**
 * Calculate all supported streaks in a single call and return a consolidated
 * streak statistics object.
 *
 * @param {object} params
 * @param {object[]} params.commitments - Full commitment history.
 * @param {object[]} [params.plannerActions=[]] - Planner action history.
 * @param {string[]} [params.planningDates=[]] - Explicit planning session dates.
 * @param {object} [params.options={}] - Per-streak options overrides.
 * @param {number} [params.options.deepWorkMinMinutes=60]
 * @param {number} [params.options.studyMinMinutes=30]
 * @param {number} [params.options.workoutMinMinutes=20]
 * @param {number} [params.options.taskCompletionMin=1]
 * @returns {{
 *   planning: StreakResult,
 *   deepWork: StreakResult,
 *   study: StreakResult,
 *   workout: StreakResult,
 *   taskCompletion: StreakResult,
 *   longestOverall: { type: string, days: number },
 *   currentBest: { type: string, days: number },
 *   totalActiveStreak: number
 * }}
 *
 * @example
 * calculateAllStreaks({ commitments, plannerActions })
 * // → { planning: {...}, deepWork: {...}, longestOverall: { type: 'study', days: 21 }, ... }
 */
export function calculateAllStreaks({
  commitments = [],
  plannerActions = [],
  planningDates = [],
  options = {},
} = {}) {
  const {
    deepWorkMinMinutes = 60,
    studyMinMinutes = 30,
    workoutMinMinutes = 20,
    taskCompletionMin = 1,
  } = options;

  const planning = calculatePlanningStreak(commitments, planningDates);
  const deepWork = calculateDeepWorkStreak(commitments, { minMinutes: deepWorkMinMinutes, plannerActions });
  const study = calculateStudyStreak(commitments, { minMinutes: studyMinMinutes });
  const workout = calculateWorkoutStreak(commitments, { minMinutes: workoutMinMinutes });
  const taskCompletion = calculateTaskCompletionStreak(commitments, { minCompletedPerDay: taskCompletionMin });

  const all = [
    { type: 'planning', streak: planning },
    { type: 'deepWork', streak: deepWork },
    { type: 'study', streak: study },
    { type: 'workout', streak: workout },
    { type: 'taskCompletion', streak: taskCompletion },
  ];

  const longestOverall = all.reduce(
    (best, { type, streak }) =>
      streak.longestStreak > (best.days ?? 0) ? { type, days: streak.longestStreak } : best,
    { type: 'none', days: 0 }
  );

  const currentBest = all.reduce(
    (best, { type, streak }) =>
      streak.currentStreak > (best.days ?? 0) ? { type, days: streak.currentStreak } : best,
    { type: 'none', days: 0 }
  );

  // Count how many streak types are currently active
  const totalActiveStreak = all.filter(({ streak }) => streak.isActive).length;

  return {
    planning,
    deepWork,
    study,
    workout,
    taskCompletion,
    longestOverall,
    currentBest,
    totalActiveStreak,
  };
}
