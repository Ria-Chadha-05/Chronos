/**
 * chronosReport.js
 *
 * Unified Chronos Report Pipeline
 *
 * Assembles all engine outputs — Capacity, Reality Gap, Conflicts, Planner,
 * Rescue, Blocker Breaker, Deadline Consequence Simulator, and Firefighter —
 * into a single structured report object consumed by the Dashboard and any
 * downstream screen.
 *
 * ▸ Pure function: accepts plain data, returns plain data.
 * ▸ No React, no context, no side-effects.
 * ▸ Engine independence preserved — each engine is called once, results are
 *   passed downstream in the correct order.
 * ▸ No duplicated calculations: each sub-report is computed exactly once.
 * ▸ Safe to call with empty / partial input — every sub-report has a fallback.
 *
 * @module chronosReport
 */

import { calculateCapacityReport }   from '../capacity/index.ts';
import { calculateRealityGapReport } from '../reality/index.ts';
import { analyzeConflicts }          from '../conflicts/index.ts';
import { generatePlannerReport }     from '../planner/index.ts';
import { generateRescueReport }      from '../rescue/index.ts';
import { generateBlockerReport }     from '../services/blockerBreakerEngine.js';
import { generateFirefighterReport } from '../services/firefighterEngine.js';
import { simulateScenario }          from '../services/consequenceSimulatorEngine.js';
import { runReviewPipeline }         from '../intelligence/review/index.ts';
import {
  generateFullExplanation,
  explainPlannerActions,
} from './explanationEngine.js';
import { generateDailyReflection }   from './reflectionEngine.js';
import { calculateAllStreaks }        from './streakEngine.js';
import {
  calculateCompletionRate,
  calculateAverageFocusTime,
  calculateProductivityScore,
  calculateWeeklyHours,
  calculateSourceDistribution,
  calculateRealityGapTrend,
} from './statisticsEngine.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDateKey(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseCommitmentDateTime(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value.dateTime) {
    const parsed = new Date(value.dateTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value.date) {
    const parsed = new Date(`${value.date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function parseLocalDateAndTime(date, time) {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCommitmentStart(commitment) {
  return (
    parseCommitmentDateTime(commitment.startDateTime) ||
    parseCommitmentDateTime(commitment.start) ||
    parseLocalDateAndTime(commitment.date, commitment.startTime) ||
    parseCommitmentDateTime(commitment.date)
  );
}

function getCommitmentEnd(commitment) {
  return (
    parseCommitmentDateTime(commitment.endDateTime) ||
    parseCommitmentDateTime(commitment.end) ||
    parseLocalDateAndTime(commitment.date, commitment.endTime)
  );
}

export function isCommitmentOnDate(commitment, dateKey) {
  if (commitment.date === dateKey) return true;
  const start = getCommitmentStart(commitment);
  const end   = getCommitmentEnd(commitment);
  if (!start && !end) return false;
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayStart = new Date(year, month - 1, day);
  const dayEnd   = new Date(year, month - 1, day + 1);
  if (start && end) return start < dayEnd && end > dayStart;
  return toLocalDateKey(start || end) === dateKey;
}

// ─── Weekly Summary helper (shared between pipeline and Dashboard) ─────────────

export function buildWeeklySummaryDays(tasks, today) {
  const todayDate = new Date(today + 'T00:00:00');
  const dow       = todayDate.getDay();
  const monday    = new Date(todayDate);
  monday.setDate(todayDate.getDate() - (dow === 0 ? 6 : dow - 1));

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return Array.from({ length: 7 }, (_, i) => {
    const d   = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key      = toLocalDateKey(d);
    const dayTasks = tasks.filter(t => isCommitmentOnDate(t, key));
    const cr       = calculateCompletionRate(dayTasks);
    const fh       = calculateAverageFocusTime(dayTasks);
    return {
      date:          key,
      label:         DAY_LABELS[i],
      completionPct: cr.pct,
      hours:         Math.round(
        (dayTasks.reduce((s, t) => s + (t.effectiveDurationMinutes || t.durationMinutes || 0), 0) / 60) * 10,
      ) / 10,
      tasks:   dayTasks.length,
      isToday: key === today,
    };
  });
}

// ─── Consequence simulation helper ────────────────────────────────────────────

/**
 * Run a single scenario through the Deadline Consequence Simulator.
 * Returns null when input is invalid.
 *
 * @param {object[]} currentCommitments
 * @param {object}   scenario  — must have { type, commitment? }
 * @returns {object|null}
 */
export function runConsequenceSimulation(currentCommitments, scenario) {
  if (!scenario || !Array.isArray(currentCommitments)) return null;
  try {
    return simulateScenario(currentCommitments, scenario);
  } catch (err) {
    console.warn('[chronosReport] consequenceSimulator error:', err);
    return null;
  }
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

/**
 * Generate the complete Chronos Report for a given day.
 *
 * @param {object} params
 * @param {object[]} params.tasks            — all tasks/commitments in the system
 * @param {string}   params.today            — YYYY-MM-DD reference date
 * @param {string}   [params.energyLevel]    — 'low' | 'normal' | 'high'
 * @param {string}   [params.senderName]     — for Firefighter email drafts
 * @param {boolean}  [params.isDemoMode]     — skip engines that don't add demo value
 * @param {object}   [params.demoState]      — demo overrides (insights, reflection, etc.)
 * @returns {ChronosReport}
 */
export function generateChronosReport({
  tasks        = [],
  today        = new Date().toISOString().slice(0, 10),
  energyLevel  = 'normal',
  senderName   = '',
  isDemoMode   = false,
  demoState    = null,
} = {}) {

  // ── 1. Filter today's commitments (needed by most engines) ─────────────────
  const todayCommitments = tasks.filter(t => isCommitmentOnDate(t, today));

  // ── 2. Capacity (no upstream deps) ─────────────────────────────────────────
  const capacityReport = calculateCapacityReport(todayCommitments, { energyLevel });

  // ── 3. Reality Gap (depends on capacity) ───────────────────────────────────
  const realityReport = calculateRealityGapReport(todayCommitments, capacityReport);

  // ── 4. Conflicts (depends on capacity + reality) ────────────────────────────
  const conflictReport = analyzeConflicts({
    commitments:       todayCommitments,
    capacityReport,
    realityGapReport:  realityReport,
  });

  // ── 5. Blocker Breaker (independent — all tasks, not just today) ────────────
  const blockerReport = generateBlockerReport(tasks, { referenceDate: today });

  // ── 6. Planner (depends on 2-5) ─────────────────────────────────────────────
  const plannerReport = generatePlannerReport({
    commitments:      todayCommitments,
    capacityReport,
    realityGapReport: realityReport,
    conflictReport,
    blockerReport,
  });

  // ── 7. Rescue (depends on 2-6) ──────────────────────────────────────────────
  const rescueReport = generateRescueReport({
    commitments:      todayCommitments,
    capacityReport,
    realityGapReport: realityReport,
    conflictReport,
    plannerReport,
    blockerReport,
  });

  // ── 8. Review → Reflect → Learn (consumes steps 2–7, never re-runs them) ────
  let reviewReport = null;
  try {
    console.info('[Review] Review pipeline started');

    // Derive period window from today
    const periodStart = today;
    const periodEnd   = today;

    // history (PeriodSummary[]) — requires external persistence to populate.
    // Passed in as an empty array until a storage layer is added.
    // The LearningEngine handles this gracefully: returns a minimal report
    // noting that more history is needed for pattern detection.
    const reviewHistory = [];

    reviewReport = runReviewPipeline({
      input: {
        commitments:      todayCommitments,   // ReviewableCommitment[] — outcome fields optional
        capacityReport,                        // step 2
        realityGapReport: realityReport,       // step 3 (aliased in chronosReport as realityReport)
        conflictReport,                        // step 4
        plannerReport,                         // step 6
        rescueReport,                          // step 7
        period:      'day',
        periodStart,
        periodEnd,
      },
      history: reviewHistory,
    });

    console.info('[Review] Review report generated', {
      completionRate: reviewReport.review?.commitments?.completionRate,
      summary:        reviewReport.review?.summary,
    });
    console.info('[Review] Reflection insights generated', {
      positives:    reviewReport.reflection?.positives?.length    ?? 0,
      issues:       reviewReport.reflection?.issues?.length       ?? 0,
      observations: reviewReport.reflection?.observations?.length ?? 0,
    });
    console.info('[Review] Learning patterns detected', {
      patterns:         reviewReport.learning?.patterns?.length ?? 0,
      periodsAnalyzed:  reviewReport.learning?.periodsAnalyzed  ?? 0,
    });
  } catch (err) {
    console.warn('[Review] Review pipeline error — report will be null', err);
    reviewReport = null;
  }

  // ── 9. Firefighter (independent — runs on todayCommitments) ─────────────────
  let firefighterReport = null;
  try {
    firefighterReport = generateFirefighterReport(todayCommitments, {
      workdayMinutes: 480,
      senderName,
    });
  } catch (err) {
    console.warn('[chronosReport] firefighterEngine error:', err);
    firefighterReport = {
      isActive:     false,
      triggerReason: 'Engine error — see console.',
      meta:         { commitmentCount: todayCommitments.length, workdayMinutes: 480 },
      emergencyScore: { score: 0, level: 'normal' },
      severity:     { level: 'normal', label: 'Normal' },
      recovery:     { keepList: [], deferList: [], compressionList: [] },
      emailDrafts:  [],
    };
  }

  // ── 9. Statistics ────────────────────────────────────────────────────────────
  const completionStats    = calculateCompletionRate(todayCommitments);
  const focusStats         = calculateAverageFocusTime(tasks, plannerReport.actions);
  const weeklyHoursStats   = calculateWeeklyHours(tasks, { weeks: 4 });
  const sourceDistribution = calculateSourceDistribution(tasks);
  const productivityResult = calculateProductivityScore({
    completionRate:    completionStats.rate,
    focusMinutes:      focusStats.totalFocusMinutes,
    totalMinutes:      capacityReport.totalCommittedMinutes || 480,
    utilizationPct:    capacityReport.score || 50,
    realityGapSeverity: realityReport.severity || 'Low',
  });
  const streaks = calculateAllStreaks({ commitments: tasks });

  // ── 10. Weekly summary days (used by charts + summary card) ─────────────────
  const weeklySummaryDays = buildWeeklySummaryDays(tasks, today);

  // ── 11. Chart data ───────────────────────────────────────────────────────────
  const weeklyCompletionData = weeklySummaryDays.map(d => ({
    label: d.label,
    pct:   d.completionPct,
    date:  d.date,
  }));
  const sourceChartData = sourceDistribution.distribution.map(d => ({
    source: d.source,
    count:  d.count,
    pct:    d.pct,
  }));
  const focusChartData   = weeklySummaryDays.map(d => ({ label: d.label, hours: d.hours }));
  const realityGapHistory = calculateRealityGapTrend([
    { date: today, severity: realityReport.severity || 'Low' },
  ]);
  const capacityUsageProps = {
    utilizationPct:    Math.round(capacityReport.score ?? 0),
    scheduledMinutes:  capacityReport.totalCommittedMinutes ?? 0,
    availableMinutes:  480,
    status:            capacityReport.status ?? 'Healthy',
  };

  // ── 12. Explanation Engine ────────────────────────────────────────────────────
  const fullExplanation = generateFullExplanation({
    capacity:       capacityReport,
    realityGap:     realityReport,
    conflicts:      conflictReport.conflicts,
    plannerActions: plannerReport.actions,
    blockerReport,
    completionStats: {
      completionRate: completionStats.rate,
      completed:      completionStats.completedCount,
      total:          completionStats.totalCount,
    },
  });
  const plannerExplanations = explainPlannerActions({ plannerActions: plannerReport.actions });

  // ── 13. Insights (merge demo + live) ─────────────────────────────────────────
  const blockerInsights = (blockerReport?.insights ?? []).filter(Boolean);
  let insightsList;
  if (isDemoMode && demoState?.insights) {
    const demoLines = demoState.insights.map(i => {
      if (typeof i === 'string') return i;
      if (i.body) return i.title ? `${i.title}: ${i.body}` : i.body;
      return i.message || i.text || String(i);
    });
    const merged = [...demoLines];
    for (const line of blockerInsights.slice(0, 2)) {
      if (!merged.some(existing => existing.includes(line.slice(0, 30)))) {
        merged.push(line);
      }
    }
    insightsList = merged;
  } else {
    insightsList = (fullExplanation.insights ?? []).filter(Boolean);
  }

  // ── 14. Firefighter insights injection ───────────────────────────────────────
  if (firefighterReport?.isActive) {
    const ffInsight = `🚨 Firefighter Mode: ${firefighterReport.triggerReason}`;
    if (!insightsList.some(l => l.includes('Firefighter'))) {
      insightsList = [ffInsight, ...insightsList];
    }
  }

  // ── 15. Reflection ───────────────────────────────────────────────────────────
  let reflectionData = null;
  if (isDemoMode && demoState?.reflection) {
    const dr = demoState.reflection;
    reflectionData = {
      period:            'daily',
      summary:           dr.aiSummary || dr.summary || '',
      wins:              dr.wins || [],
      bottlenecks:       dr.improvements || dr.bottlenecks || [],
      recommendations:   dr.tomorrowSuggestions || dr.recommendations || [],
      productivityScore: dr.completionRate ?? 71,
      consistencyScore:  dr.completionRate ?? 71,
    };
  } else if (tasks.length) {
    try {
      reflectionData = generateDailyReflection({
        commitments:    tasks,
        plannerActions: plannerReport.actions,
        realityGapReport: realityReport,
        capacityReport,
      });
    } catch (err) {
      console.warn('[chronosReport] reflectionEngine error:', err);
    }
  }

  // ── Return unified report ────────────────────────────────────────────────────
  return {
    // ── Meta ──────────────────────────────────────────────────────────────────
    meta: {
      generatedAt:         new Date().toISOString(),
      today,
      energyLevel,
      isDemoMode,
      totalCommitments:    tasks.length,
      todayCommitmentCount: todayCommitments.length,
    },

    // ── Engine outputs ────────────────────────────────────────────────────────
    capacityReport,
    realityReport,
    conflictReport,
    blockerReport,
    plannerReport,
    rescueReport,
    firefighterReport,
    reviewReport,

    // ── Statistics ────────────────────────────────────────────────────────────
    completionStats,
    focusStats,
    weeklyHoursStats,
    sourceDistribution,
    productivityResult,
    streaks,

    // ── Timeline / Weekly ─────────────────────────────────────────────────────
    weeklySummaryDays,
    todayCommitments,

    // ── Chart data ────────────────────────────────────────────────────────────
    charts: {
      weeklyCompletion: weeklyCompletionData,
      source:           sourceChartData,
      focus:            focusChartData,
      realityGapHistory,
      capacityUsage:    capacityUsageProps,
    },

    // ── Intelligence ──────────────────────────────────────────────────────────
    fullExplanation,
    plannerExplanations,
    insightsList,
    reflectionData,
  };
}

/**
 * Empty/fallback report returned while the pipeline hasn't run yet.
 * Keeps destructuring safe in Dashboard before first render completes.
 */
export const EMPTY_CHRONOS_REPORT = generateChronosReport({ tasks: [] });
