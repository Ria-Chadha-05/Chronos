/**
 * intelligenceReport.js
 *
 * Intelligence Report Generator
 *
 * Downstream of ChronosReport and ExecutiveReport.
 * Produces the DailyBrief and ActionFeed consumed by the Dashboard.
 *
 * ▸ No engine imports — only report consumers.
 * ▸ Pure function: in → out.
 * ▸ No React, no context, no side-effects.
 */

// ─── Daily Brief ──────────────────────────────────────────────────────────────

function buildDailyBrief(chronosReport, executiveReport) {
  const today         = chronosReport?.meta?.today ?? new Date().toISOString().slice(0, 10);
  const todayCount    = chronosReport?.meta?.todayCommitmentCount ?? 0;
  const urgency       = executiveReport?.urgency ?? 'normal';
  const priorities    = executiveReport?.priorities ?? [];
  const topPriority   = priorities[0];
  const capScore      = Math.round(chronosReport?.capacityReport?.score ?? 0);
  const conflictCount = chronosReport?.conflictReport?.totalConflicts ?? 0;
  const ffActive      = chronosReport?.firefighterReport?.isActive ?? false;
  const rescueActive  = chronosReport?.rescueReport?.activated ?? false;

  // Today's mission
  let mission;
  if (todayCount === 0) {
    mission = 'No commitments today. A clean slate — plan ahead or rest.';
  } else if (ffActive) {
    mission = `Emergency day — ${todayCount} commitments, firefighter mode active.`;
  } else if (rescueActive) {
    mission = `Overloaded day — rescue plan active for ${todayCount} commitments.`;
  } else {
    const capWord = capScore >= 80 ? 'full' : capScore >= 60 ? 'moderate' : 'light';
    mission = `${todayCount} commitment${todayCount !== 1 ? 's' : ''} at ${capWord} capacity (${capScore}%).`;
  }

  // Biggest risk
  let biggestRisk;
  if (ffActive) {
    biggestRisk = chronosReport.firefighterReport?.triggerReason ?? 'Emergency overload.';
  } else if (rescueActive) {
    biggestRisk = chronosReport.rescueReport?.summary ?? 'Schedule overload detected.';
  } else if ((chronosReport?.blockerReport?.criticalBlockers?.totalCritical ?? 0) > 0) {
    biggestRisk = `${chronosReport.blockerReport.criticalBlockers.totalCritical} critical task${chronosReport.blockerReport.criticalBlockers.totalCritical > 1 ? 's' : ''} blocked.`;
  } else if (conflictCount > 0) {
    biggestRisk = `${conflictCount} scheduling conflict${conflictCount > 1 ? 's' : ''} need resolution.`;
  } else if (['High', 'Critical'].includes(chronosReport?.realityReport?.severity)) {
    biggestRisk = chronosReport.realityReport.summary ?? 'Reality gap is high.';
  } else {
    biggestRisk = 'No critical risks detected.';
  }

  // Recommended action
  const recommendedAction = topPriority?.title ?? executiveReport?.recommendations?.[0]?.title ?? 'Review your schedule.';

  // Current urgency label
  const urgencyLabels = {
    critical: '🔴 Critical — act now',
    high:     '🟠 High — review soon',
    medium:   '🟡 Medium — monitor',
    low:      '🔵 Low — on track',
    normal:   '🟢 Normal — clear',
  };
  const currentUrgency = urgencyLabels[urgency] ?? urgencyLabels.normal;

  // Suggested next step
  let nextStep;
  const topAction = executiveReport?.actions?.[0];
  if (topAction) {
    nextStep = topAction.label;
  } else if (priorities.length > 0) {
    nextStep = priorities[0].reason;
  } else {
    nextStep = 'Generate today\'s plan to get started.';
  }

  return {
    date:              today,
    mission,
    biggestRisk,
    recommendedAction,
    currentUrgency,
    urgencyLevel:      urgency,
    nextStep,
    confidence:        executiveReport?.confidence ?? 0,
    enginesUsed:       executiveReport?.enginesUsed ?? [],
  };
}

// ─── Action Feed ──────────────────────────────────────────────────────────────

function buildActionFeed(chronosReport, executiveReport, commitmentsDiff) {
  const items = [];
  let idx = 0;

  const makeItem = (type, title, body, urgency, source, meta = {}) => ({
    id:        `feed-${idx++}-${Date.now()}`,
    type,      // 'alert' | 'recommendation' | 'change' | 'insight'
    title,
    body,
    urgency,
    source,
    meta,
    timestamp: new Date().toISOString(),
  });

  // New commitment additions (from diff)
  const { added = [], removed = [], changed = [] } = commitmentsDiff ?? {};
  added.slice(0, 3).forEach(c => {
    items.push(makeItem(
      'change',
      `New: ${c.title || c.name || 'Commitment'}`,
      `Source: ${c.source ?? 'manual'} · Type: ${c.commitmentType ?? 'task'}`,
      'low',
      c.source ?? 'manual',
      { commitmentId: c.id },
    ));
  });

  if (removed.length > 0) {
    items.push(makeItem(
      'change',
      `${removed.length} commitment${removed.length > 1 ? 's' : ''} removed`,
      removed.slice(0, 3).map(c => c.title || c.name).filter(Boolean).join(', '),
      'low',
      'system',
    ));
  }

  // Executive alerts → feed items
  (executiveReport?.alerts ?? []).forEach(alert => {
    items.push(makeItem(
      'alert',
      alert.title,
      alert.body,
      alert.urgency,
      alert.engine,
      { alertId: alert.id },
    ));
  });

  // Top recommendations
  (executiveReport?.recommendations ?? []).slice(0, 4).forEach(rec => {
    items.push(makeItem(
      'recommendation',
      rec.title,
      rec.body,
      rec.urgency,
      rec.source,
      { recId: rec.id },
    ));
  });

  // Planner actions as insights
  const plannerActions = chronosReport?.plannerReport?.actions ?? [];
  plannerActions.slice(0, 3).forEach(action => {
    items.push(makeItem(
      'insight',
      `✦ ${action.title}`,
      action.explanation ?? '',
      'normal',
      'Planner',
      { actionId: action.id, actionType: action.type },
    ));
  });

  // Sort: urgency desc, then timestamp desc
  const urgencyRank = { critical: 4, high: 3, medium: 2, low: 1, normal: 0 };
  items.sort((a, b) => {
    const diff = (urgencyRank[b.urgency] ?? 0) - (urgencyRank[a.urgency] ?? 0);
    return diff !== 0 ? diff : b.timestamp.localeCompare(a.timestamp);
  });

  return items.slice(0, 20);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate the Intelligence Report from downstream reports.
 *
 * @param {object} params
 * @param {object} params.chronosReport      - Output of generateChronosReport()
 * @param {object} params.executiveReport    - Output of generateExecutiveReport()
 * @param {object} [params.commitmentsDiff]  - { added, removed, changed }
 * @returns {IntelligenceReport}
 */
export function generateIntelligenceReport({ chronosReport, executiveReport, commitmentsDiff } = {}) {
  return {
    dailyBrief: buildDailyBrief(chronosReport, executiveReport),
    actionFeed: buildActionFeed(chronosReport, executiveReport, commitmentsDiff),
    meta: {
      generatedAt:    new Date().toISOString(),
      hasChronosData: !!chronosReport,
      hasExecData:    !!executiveReport,
    },
  };
}

export const EMPTY_INTELLIGENCE_REPORT = {
  dailyBrief: {
    date:              new Date().toISOString().slice(0, 10),
    mission:           'Initialising Chronos Agent…',
    biggestRisk:       '—',
    recommendedAction: '—',
    currentUrgency:    '🟢 Normal',
    urgencyLevel:      'normal',
    nextStep:          'Loading your commitments…',
    confidence:        0,
    enginesUsed:       [],
  },
  actionFeed: [],
  meta: { generatedAt: new Date().toISOString(), hasChronosData: false, hasExecData: false },
};
