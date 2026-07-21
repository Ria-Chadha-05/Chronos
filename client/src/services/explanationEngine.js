/**
 * explanationEngine.js
 *
 * Chronos Explanation Engine — Part 1
 *
 * Converts raw planner/capacity/reality data into natural-language explanations
 * that Chronos surfaces to the user as contextual insights.
 *
 * ▸ Completely independent of all existing architecture.
 * ▸ Zero imports from existing engines, contexts, or stores.
 * ▸ Pure functions — same input always produces same output.
 * ▸ All functions return a structured object AND a human-readable `summary` string.
 */

// ─── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Round a number to one decimal place.
 * @param {number} n
 * @returns {number}
 */
const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Format minutes into a human-readable duration string.
 * @param {number} minutes
 * @returns {string} e.g. "2h 30m" or "45m"
 */
function formatDuration(minutes) {
  if (!minutes || minutes < 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Pluralise a word based on count.
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 * @returns {string}
 */
function plural(count, singular, plural_) {
  return count === 1 ? singular : (plural_ || `${singular}s`);
}

// ─── Capacity explanations ─────────────────────────────────────────────────────

/**
 * Generate a natural-language explanation of a capacity report.
 *
 * @param {object} params
 * @param {object} params.capacity - CapacityReport from the Capacity Engine.
 * @param {number} [params.recentAverageHours] - User's rolling average daily hours (last 7 days).
 * @returns {{
 *   summary: string,
 *   overloadWarning: string | null,
 *   utilizationLine: string,
 *   averageComparison: string | null,
 *   structured: {
 *     plannedHours: number,
 *     availableHours: number,
 *     utilizationPct: number,
 *     status: string,
 *     isOverloaded: boolean
 *   }
 * }}
 *
 * @example
 * explainCapacity({ capacity: report, recentAverageHours: 6.5 })
 * // → { summary: "You planned 11h today, but your recent average is 6.5h.", ... }
 */
export function explainCapacity({ capacity, recentAverageHours } = {}) {
  if (!capacity) {
    return {
      summary: 'No capacity data available.',
      overloadWarning: null,
      utilizationLine: '',
      averageComparison: null,
      structured: null,
    };
  }

  const plannedMinutes = capacity.totalScheduledMinutes ?? capacity.scheduledMinutes ?? 0;
  const availableMinutes = capacity.availableMinutes ?? capacity.totalAvailableMinutes ?? 480;
  const plannedHours = r1(plannedMinutes / 60);
  const availableHours = r1(availableMinutes / 60);
  const utilizationPct = availableMinutes > 0
    ? Math.round((plannedMinutes / availableMinutes) * 100)
    : 0;
  const status = capacity.status ?? 'Unknown';
  const isOverloaded = utilizationPct > 100 || status === 'Overloaded';

  const utilizationLine = `You have scheduled ${formatDuration(plannedMinutes)} out of ${formatDuration(availableMinutes)} available today (${utilizationPct}% utilization).`;

  const overloadWarning = isOverloaded
    ? `⚠️ You are ${formatDuration(plannedMinutes - availableMinutes)} over capacity. Chronos recommends moving lower-priority items to tomorrow.`
    : null;

  let averageComparison = null;
  if (recentAverageHours != null && recentAverageHours > 0) {
    const diff = r1(plannedHours - recentAverageHours);
    if (diff > 1) {
      averageComparison = `You planned ${plannedHours}h today, but your recent average is ${recentAverageHours}h — ${diff}h above your norm.`;
    } else if (diff < -1) {
      averageComparison = `Today is lighter than usual at ${plannedHours}h — your recent average is ${recentAverageHours}h.`;
    } else {
      averageComparison = `Today's plan (${plannedHours}h) is in line with your recent average of ${recentAverageHours}h.`;
    }
  }

  const summary = [
    utilizationLine,
    overloadWarning,
    averageComparison,
  ].filter(Boolean).join(' ');

  return {
    summary,
    overloadWarning,
    utilizationLine,
    averageComparison,
    structured: {
      plannedHours,
      availableHours,
      utilizationPct,
      status,
      isOverloaded,
    },
  };
}

// ─── Reality Gap explanations ──────────────────────────────────────────────────

/**
 * Generate a natural-language explanation of a reality gap report.
 *
 * @param {object} params
 * @param {object} params.realityGap - RealityGapReport from the Reality Gap Engine.
 * @returns {{
 *   summary: string,
 *   severityLine: string,
 *   issueLines: string[],
 *   recommendationLine: string,
 *   structured: {
 *     severity: string,
 *     issueCount: number,
 *     recommendation: string
 *   }
 * }}
 *
 * @example
 * explainRealityGap({ realityGap: report })
 * // → { summary: "Your reality gap is High. You have 3 active issues...", ... }
 */
export function explainRealityGap({ realityGap } = {}) {
  if (!realityGap) {
    return {
      summary: 'No reality gap data available.',
      severityLine: '',
      issueLines: [],
      recommendationLine: '',
      structured: null,
    };
  }

  const severity = realityGap.severity ?? 'Unknown';
  const issues = realityGap.issues ?? [];
  const recommendation = realityGap.recommendation ?? '';

  const severityEmoji = { Low: '🟢', Medium: '🟡', High: '🔴' }[severity] ?? '⚪';
  const severityLine = `${severityEmoji} Your reality gap is ${severity}.`;

  const issueLines = issues.map((issue, i) => `${i + 1}. ${issue}`);

  const recommendationLine = recommendation
    ? `Chronos recommends: ${recommendation}`
    : '';

  const issueSummary = issues.length > 0
    ? ` You have ${issues.length} active ${plural(issues.length, 'issue')}.`
    : ' No major issues detected.';

  const summary = [severityLine + issueSummary, recommendationLine]
    .filter(Boolean)
    .join(' ');

  return {
    summary,
    severityLine,
    issueLines,
    recommendationLine,
    structured: {
      severity,
      issueCount: issues.length,
      recommendation,
    },
  };
}

// ─── Conflict explanations ─────────────────────────────────────────────────────

/**
 * Generate a natural-language explanation of scheduling conflicts.
 *
 * @param {object} params
 * @param {object} params.conflicts - ConflictReport from the Conflict Detection Engine.
 * @returns {{
 *   summary: string,
 *   countLine: string,
 *   conflictLines: string[],
 *   structured: {
 *     conflictCount: number,
 *     conflictTitles: string[],
 *     hasConflicts: boolean
 *   }
 * }}
 *
 * @example
 * explainConflicts({ conflicts: report })
 * // → { summary: "You currently have three deadline conflicts.", ... }
 */
export function explainConflicts({ conflicts } = {}) {
  if (!conflicts) {
    return {
      summary: 'No conflict data available.',
      countLine: '',
      conflictLines: [],
      structured: null,
    };
  }

  const items = conflicts.conflicts ?? conflicts.items ?? [];
  const count = items.length;
  const hasConflicts = count > 0;

  const countWords = ['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
  const countWord = count < countWords.length ? countWords[count] : String(count);

  const countLine = hasConflicts
    ? `You currently have ${countWord} deadline ${plural(count, 'conflict')}.`
    : 'No scheduling conflicts detected.';

  const conflictLines = items.map((c) => {
    const title = c.title ?? c.commitmentTitle ?? 'Unnamed commitment';
    const type = c.type ?? c.conflictType ?? 'OVERLAP';
    if (type === 'DEADLINE') return `⚡ "${title}" has a deadline conflict.`;
    if (type === 'OVERLAP') return `🔀 "${title}" overlaps with another commitment.`;
    if (type === 'CAPACITY') return `📦 "${title}" exceeds available capacity.`;
    return `⚠️ "${title}" has a scheduling issue.`;
  });

  const summary = hasConflicts
    ? `${countLine} ${conflictLines.slice(0, 2).join(' ')}${count > 2 ? ` +${count - 2} more.` : ''}`
    : countLine;

  return {
    summary,
    countLine,
    conflictLines,
    structured: {
      conflictCount: count,
      conflictTitles: items.map((c) => c.title ?? c.commitmentTitle ?? 'Unknown'),
      hasConflicts,
    },
  };
}

// ─── Planner action explanations ───────────────────────────────────────────────

/**
 * Generate natural-language explanations for individual planner actions.
 *
 * @param {object} params
 * @param {Array<object>} params.plannerActions - Array of PlannerAction objects.
 * @returns {{
 *   summary: string,
 *   actionLines: string[],
 *   protectedItems: string[],
 *   movedItems: string[],
 *   structured: {
 *     totalActions: number,
 *     byType: Record<string, number>
 *   }
 * }}
 *
 * @example
 * explainPlannerActions({ plannerActions: actions })
 * // → { summary: "Chronos made 4 scheduling decisions today.", actionLines: [...], ... }
 */
export function explainPlannerActions({ plannerActions } = {}) {
  if (!plannerActions || plannerActions.length === 0) {
    return {
      summary: 'No planner actions to explain.',
      actionLines: [],
      protectedItems: [],
      movedItems: [],
      structured: { totalActions: 0, byType: {} },
    };
  }

  const byType = plannerActions.reduce((acc, action) => {
    const t = action.type ?? 'UNKNOWN';
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const actionLines = plannerActions.map((action) => {
    const title = action.title ?? action.commitmentId ?? 'a commitment';
    const explanation = action.explanation ?? '';
    const suggestedTime = action.suggestedTime ? ` at ${action.suggestedTime}` : '';

    switch (action.type) {
      case 'MOVE':
        return `🔄 Chronos moved "${title}" to tomorrow${suggestedTime} to avoid burnout.`;
      case 'POSTPONE':
        return `⏩ "${title}" was postponed — ${explanation || 'schedule is at capacity'}.`;
      case 'PROTECT':
        return `🛡️ "${title}" was preserved${explanation ? ` because ${explanation.toLowerCase()}` : ''}.`;
      case 'KEEP':
        return `✅ "${title}" stays in place${suggestedTime}.`;
      case 'BREAK':
        return `🧩 "${title}" was split into smaller blocks to improve focus.`;
      case 'FOCUS_BLOCK':
        return `🎯 A focus block was created for "${title}"${suggestedTime}.`;
      case 'WAIT':
        return `⏳ "${title}" is blocked — wait for the dependency to resolve before scheduling.`;
      case 'SEND_REMINDER':
        return `📧 Send a reminder for "${title}" — ${explanation || 'follow up on the blocker'}.`;
      case 'SWITCH_TASK':
        return `🔀 Switch approach for "${title}" — ${explanation || 'work on unblocked portions or alternatives'}.`;
      case 'PARALLEL_WORK':
        return `⚡ Make parallel progress while "${title}" is blocked — ${explanation || 'start independent work'}.`;
      default:
        return `ℹ️ Action taken on "${title}": ${explanation || 'no details available'}.`;
    }
  });

  const protectedItems = plannerActions
    .filter((a) => a.type === 'PROTECT')
    .map((a) => a.title ?? 'Unknown');

  const movedItems = plannerActions
    .filter((a) => a.type === 'MOVE' || a.type === 'POSTPONE')
    .map((a) => a.title ?? 'Unknown');

  const total = plannerActions.length;
  const summary = `Chronos made ${total} scheduling ${plural(total, 'decision')} today. ` +
    (movedItems.length > 0 ? `${movedItems.length} item${movedItems.length > 1 ? 's were' : ' was'} moved or postponed. ` : '') +
    (protectedItems.length > 0 ? `${protectedItems.length} Life ${plural(protectedItems.length, 'Anchor')} protected.` : '');

  return {
    summary,
    actionLines,
    protectedItems,
    movedItems,
    structured: {
      totalActions: total,
      byType,
    },
  };
}

// ─── Completion stats explanations ────────────────────────────────────────────

/**
 * Generate a natural-language explanation of task completion statistics.
 *
 * @param {object} params
 * @param {number} params.completionRate - 0–1 fraction of tasks completed.
 * @param {number} params.completed - Count of completed tasks.
 * @param {number} params.total - Total tasks planned.
 * @param {number} [params.previousRate] - Previous period's completion rate (0–1) for comparison.
 * @returns {{
 *   summary: string,
 *   rateLine: string,
 *   trendLine: string | null,
 *   structured: {
 *     completionPct: number,
 *     completed: number,
 *     total: number,
 *     trendDirection: 'up' | 'down' | 'flat' | null
 *   }
 * }}
 *
 * @example
 * explainCompletionStats({ completionRate: 0.75, completed: 9, total: 12 })
 * // → { summary: "You completed 9 of 12 tasks today (75%).", ... }
 */
export function explainCompletionStats({ completionRate, completed, total, previousRate } = {}) {
  if (total == null || total === 0) {
    return {
      summary: 'No tasks were planned.',
      rateLine: '',
      trendLine: null,
      structured: { completionPct: 0, completed: 0, total: 0, trendDirection: null },
    };
  }

  const completionPct = Math.round((completionRate ?? (completed / total)) * 100);
  const rateLine = `You completed ${completed} of ${total} ${plural(total, 'task')} (${completionPct}%).`;

  let trendLine = null;
  let trendDirection = null;

  if (previousRate != null) {
    const diff = (completionRate ?? completed / total) - previousRate;
    if (diff > 0.05) {
      trendLine = `📈 That's up ${Math.round(diff * 100)}% from your previous session.`;
      trendDirection = 'up';
    } else if (diff < -0.05) {
      trendLine = `📉 That's down ${Math.round(Math.abs(diff) * 100)}% from your previous session.`;
      trendDirection = 'down';
    } else {
      trendLine = 'Consistent with your previous session.';
      trendDirection = 'flat';
    }
  }

  let emoji = '😐';
  if (completionPct >= 90) emoji = '🏆';
  else if (completionPct >= 70) emoji = '✅';
  else if (completionPct >= 50) emoji = '💪';
  else if (completionPct < 30) emoji = '⚠️';

  const summary = `${emoji} ${rateLine}${trendLine ? ` ${trendLine}` : ''}`;

  return {
    summary,
    rateLine,
    trendLine,
    structured: {
      completionPct,
      completed,
      total,
      trendDirection,
    },
  };
}

// ─── Life Anchor explanations ─────────────────────────────────────────────────

/**
 * Explain why a Life Anchor commitment was preserved by the planner.
 *
 * @param {object} params
 * @param {string} params.title - The title of the Life Anchor commitment.
 * @param {string} [params.tier] - 'sacred' | 'protected' | 'flexible'
 * @returns {{ summary: string, structured: { title: string, tier: string } }}
 *
 * @example
 * explainLifeAnchorProtected({ title: 'Evening Workout', tier: 'sacred' })
 * // → { summary: "Your evening workout was preserved because it is marked as a Life Anchor.", ... }
 */
export function explainLifeAnchorProtected({ title, tier } = {}) {
  if (!title) {
    return { summary: 'A Life Anchor was preserved.', structured: { title: '', tier: '' } };
  }

  const tierDesc = tier === 'sacred'
    ? 'marked as Sacred — it cannot be moved under any circumstances'
    : tier === 'protected'
    ? 'marked as a Protected Life Anchor'
    : 'marked as a Life Anchor';

  const summary = `🛡️ Your ${title.toLowerCase()} was preserved because it is ${tierDesc}.`;

  return {
    summary,
    structured: { title, tier: tier ?? 'protected' },
  };
}

// ─── Blocker explanations ─────────────────────────────────────────────────────

/**
 * Generate natural-language explanations for blocked tasks from a Blocker Report.
 *
 * @param {object} params
 * @param {object} [params.blockerReport] - Output of generateBlockerReport().
 * @returns {{
 *   summary: string,
 *   insightLines: string[],
 *   taskLines: string[],
 *   structured: { blockedCount: number, severity: string } | null
 * }}
 */
export function explainBlockers({ blockerReport } = {}) {
  if (!blockerReport?.totalBlockedCount) {
    return {
      summary: 'No blocked tasks detected.',
      insightLines: [],
      taskLines: [],
      structured: null,
    };
  }

  const taskLines = (blockerReport.blockedTasks ?? []).slice(0, 3).map((task) => {
    const title = task.title || task.name || 'Unnamed task';
    const blocker = task._blocker || {};
    const reason = blocker.description || task.waitingFor || 'external dependency';
    const waiting = blocker.waitingDays != null
      ? ` (waiting ${blocker.waitingDays} day${blocker.waitingDays !== 1 ? 's' : ''})`
      : '';
    return `⛔ "${title}" is blocked: ${reason}${waiting}.`;
  });

  const insightLines = [
    ...(blockerReport.insights ?? []).slice(0, 2),
    ...taskLines,
  ].filter(Boolean);

  const summary = blockerReport.summary
    || `${blockerReport.totalBlockedCount} blocked task${blockerReport.totalBlockedCount !== 1 ? 's' : ''} detected.`;

  return {
    summary,
    insightLines,
    taskLines,
    structured: {
      blockedCount: blockerReport.totalBlockedCount,
      severity: blockerReport.overallSeverity ?? 'none',
    },
  };
}

// ─── Full planner report explanation ─────────────────────────────────────────

/**
 * Generate a comprehensive explanation combining all planner outputs into
 * a single structured insight object. This is the primary entry point for
 * the AI Insights panel.
 *
 * @param {object} params
 * @param {object} [params.capacity] - CapacityReport
 * @param {object} [params.realityGap] - RealityGapReport
 * @param {object} [params.conflicts] - ConflictReport
 * @param {Array<object>} [params.plannerActions] - Array of PlannerAction
 * @param {object} [params.completionStats] - { completionRate, completed, total, previousRate }
 * @param {number} [params.recentAverageHours] - Rolling 7-day average daily hours
 * @param {object} [params.blockerReport] - BlockerReport from Blocker Breaker
 * @returns {{
 *   summary: string,
 *   capacity: object,
 *   realityGap: object,
 *   conflicts: object,
 *   plannerActions: object,
 *   completion: object,
 *   insights: string[],
 *   score: number
 * }}
 *
 * @example
 * generateFullExplanation({ capacity, realityGap, conflicts, plannerActions })
 * // → { summary: "...", insights: [...], score: 72, ... }
 */
export function generateFullExplanation({
  capacity,
  realityGap,
  conflicts,
  plannerActions,
  completionStats,
  recentAverageHours,
  blockerReport,
} = {}) {
  const capacityExpl = explainCapacity({ capacity, recentAverageHours });
  const realityExpl = explainRealityGap({ realityGap });
  const conflictExpl = explainConflicts({ conflicts });
  const plannerExpl = explainPlannerActions({ plannerActions });
  const blockerExpl = explainBlockers({ blockerReport });
  const completionExpl = completionStats
    ? explainCompletionStats(completionStats)
    : null;

  // Collect the most relevant insight lines for display
  const insights = [
    capacityExpl.averageComparison,
    capacityExpl.overloadWarning,
    realityExpl.recommendationLine,
    conflictExpl.countLine,
    ...blockerExpl.insightLines.slice(0, 2),
    ...plannerExpl.actionLines.slice(0, 3),
    completionExpl?.rateLine,
  ].filter(Boolean);

  // Derive an overall day score (0–100)
  const utilizationPct = capacityExpl.structured?.utilizationPct ?? 50;
  const conflictPenalty = (conflictExpl.structured?.conflictCount ?? 0) * 10;
  const severityPenalty = { Low: 0, Medium: 10, High: 25 }[realityExpl.structured?.severity] ?? 0;
  const blockerPenalty = blockerExpl.structured
    ? Math.min(15, blockerExpl.structured.blockedCount * 3)
    : 0;
  const completionBonus = completionExpl ? (completionExpl.structured.completionPct / 100) * 20 : 0;
  const utilizationScore = utilizationPct <= 100 ? 60 : Math.max(0, 60 - (utilizationPct - 100));
  const score = Math.round(
    Math.min(100, Math.max(0, utilizationScore + completionBonus - conflictPenalty - severityPenalty - blockerPenalty))
  );

  const summaryParts = [
    capacityExpl.utilizationLine,
    realityExpl.severityLine,
    conflictExpl.countLine,
    blockerExpl.structured ? blockerExpl.summary : null,
  ];
  const summary = summaryParts.filter(Boolean).join(' ');

  return {
    summary,
    capacity: capacityExpl,
    realityGap: realityExpl,
    conflicts: conflictExpl,
    plannerActions: plannerExpl,
    blockers: blockerExpl,
    completion: completionExpl,
    insights,
    score,
  };
}
