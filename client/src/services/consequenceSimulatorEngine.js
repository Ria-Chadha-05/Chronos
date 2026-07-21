/**
 * consequenceSimulatorEngine.js
 *
 * Deadline Consequence Simulator — Chronos.
 *
 * Answers, before the user commits to an action: "What happens if I do this?"
 *
 * This module is a COMPLETELY INDEPENDENT SUBSYSTEM.
 *  - No React.
 *  - No imports from Dashboard, App, Layout, CommitmentContext, or any of the
 *    existing engines (Planner / Capacity / Reality Gap / Conflict / Rescue).
 *  - Pure functions only — same input always produces the same output.
 *
 * It maintains its OWN lightweight, self-contained model of capacity,
 * reality-gap and conflict so it can run standalone in a demo or be wired
 * into the real engines later by swapping the internal estimator functions
 * for calls into capacity/, reality/, conflicts/, rescue/, planner/.
 *
 * Public API (all pure):
 *   simulateScenario()
 *   compareSchedules()
 *   estimateCapacityImpact()
 *   estimateRealityGapChange()
 *   detectNewConflicts()
 *   detectResolvedConflicts()
 *   estimateRecoveryCost()
 *   predictRescueActivation()
 *   generateTradeoffs()
 *   generateRecommendation()
 *   generateSimulationReport()
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Supported scenario types the simulator can evaluate. */
export const SCENARIO_TYPES = {
  ADD_COMMITMENT: 'ADD_COMMITMENT',
  DELETE_COMMITMENT: 'DELETE_COMMITMENT',
  MOVE_COMMITMENT: 'MOVE_COMMITMENT',
  EXTEND_DURATION: 'EXTEND_DURATION',
  SHORTEN_DURATION: 'SHORTEN_DURATION',
  ACCEPT_MEETING: 'ACCEPT_MEETING',
  REJECT_MEETING: 'REJECT_MEETING',
  DELAY_TASK: 'DELAY_TASK',
  COMPLETE_TASK_EARLY: 'COMPLETE_TASK_EARLY',
  CANCEL_TASK: 'CANCEL_TASK',
};

/** Assumed total daily available hours before any commitments (waking hours). */
const DEFAULT_DAILY_AVAILABLE_MINUTES = 16 * 60;

/** Minimum healthy daily recovery/buffer time in minutes. */
const HEALTHY_RECOVERY_MINUTES = 90;

/** Cognitive-weight lookup used for capacity / fatigue estimation. */
const TYPE_WEIGHTS = {
  exam: 10,
  interview: 9,
  presentation: 8,
  demo: 8,
  hackathon: 8,
  flight: 7,
  meeting: 6,
  study: 5,
  assignment: 5,
  class: 4,
  doctor: 4,
  gym: 3,
  meal: 1,
  default: 4,
};

/** Importance lookup used for trade-off and priority-conflict reasoning. */
const IMPORTANCE_WEIGHTS = {
  exam: 10,
  interview: 9,
  flight: 9,
  presentation: 8,
  demo: 8,
  hackathon: 8,
  doctor: 7,
  meeting: 6,
  assignment: 5,
  study: 5,
  class: 4,
  gym: 3,
  meal: 1,
  default: 4,
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers — date/time parsing & duration math
// (Deliberately self-contained; does not import ConflictDetector/CapacityEngine.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a commitment's start Date from any of the shapes used across Chronos.
 * @param {object} commitment
 * @returns {Date|null}
 */
function parseStart(commitment) {
  return resolveDateTime(commitment.startDateTime, commitment.start, commitment.date, commitment.startTime);
}

/**
 * Parses a commitment's end Date from any of the shapes used across Chronos.
 * @param {object} commitment
 * @returns {Date|null}
 */
function parseEnd(commitment) {
  return resolveDateTime(commitment.endDateTime, commitment.end, commitment.date, commitment.endTime);
}

function resolveDateTime(primaryIso, structured, date, time) {
  if (primaryIso) {
    const d = new Date(primaryIso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (typeof structured === 'string') {
    const d = new Date(structured);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (structured && typeof structured === 'object') {
    if (structured.dateTime) {
      const d = new Date(structured.dateTime);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (structured.date) {
      const d = new Date(`${structured.date}T00:00:00`);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  if (date && time) {
    const d = new Date(`${date}T${time}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Returns the effective duration of a commitment in minutes, preferring
 * explicit effective duration / ongoing-project effort over raw calendar span.
 * @param {object} commitment
 * @returns {number}
 */
function getEffectiveDurationMinutes(commitment) {
  if (typeof commitment.effectiveDurationMinutes === 'number') {
    return commitment.effectiveDurationMinutes;
  }
  if (commitment.commitmentType === 'ONGOING_PROJECT' && commitment.ongoingProject) {
    const hours = commitment.ongoingProject.effortHoursPerDay ?? 2;
    return hours * 60;
  }
  if (typeof commitment.durationMinutes === 'number') return commitment.durationMinutes;

  const start = parseStart(commitment);
  const end = parseEnd(commitment);
  if (start && end && end > start) {
    return Math.round((end.getTime() - start.getTime()) / 60000);
  }
  return 60; // conservative fallback
}

/**
 * Normalizes a free-text type/title into one of the known cognitive-weight keys.
 * @param {object} commitment
 * @returns {string}
 */
function classifyKey(commitment) {
  const value = `${commitment.type || ''} ${commitment.title || ''}`.toLowerCase();
  for (const key of Object.keys(TYPE_WEIGHTS)) {
    if (key !== 'default' && value.includes(key)) return key;
  }
  return 'default';
}

function getCognitiveWeight(commitment) {
  if (typeof commitment.cognitiveWeight === 'number') return commitment.cognitiveWeight;
  return TYPE_WEIGHTS[classifyKey(commitment)] ?? TYPE_WEIGHTS.default;
}

function getImportance(commitment) {
  if (typeof commitment.importance === 'number') return commitment.importance;
  return IMPORTANCE_WEIGHTS[classifyKey(commitment)] ?? IMPORTANCE_WEIGHTS.default;
}

function isLifeAnchor(commitment) {
  return commitment.commitmentType === 'LIFE_ANCHOR';
}

function isCancelled(commitment) {
  return Boolean(commitment.cancelled);
}

function activeCommitments(commitments) {
  return (commitments || []).filter((c) => !isCancelled(c));
}

function cloneCommitment(commitment) {
  return { ...commitment, ongoingProject: commitment.ongoingProject ? { ...commitment.ongoingProject } : commitment.ongoingProject };
}

function getId(commitment, index) {
  return commitment.id || `${commitment.title || 'commitment'}-${index}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers — lightweight capacity / conflict estimators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a simplified capacity snapshot for one schedule (array of commitments).
 * This is intentionally independent of the real Capacity Engine.
 * @param {object[]} commitments
 * @returns {{
 *   availableMinutes:number, scheduledMinutes:number, freeMinutes:number,
 *   deepWorkMinutes:number, overloadMinutes:number, recoveryMinutes:number,
 *   plannerScore:number, mentalLoad:number
 * }}
 */
function computeCapacitySnapshot(commitments) {
  const active = activeCommitments(commitments);

  let scheduledMinutes = 0;
  let deepWorkMinutes = 0;
  let mentalLoad = 0;

  active.forEach((c) => {
    const duration = Math.max(0, getEffectiveDurationMinutes(c));
    scheduledMinutes += duration;
    const weight = getCognitiveWeight(c);
    mentalLoad += weight * (duration / 60);
    if (weight >= 6) deepWorkMinutes += duration;
  });

  const availableMinutes = DEFAULT_DAILY_AVAILABLE_MINUTES;
  const freeMinutes = Math.max(0, availableMinutes - scheduledMinutes);
  const overloadMinutes = Math.max(0, scheduledMinutes - availableMinutes);
  const recoveryDeficit = Math.max(0, HEALTHY_RECOVERY_MINUTES - freeMinutes);

  // Planner score: 100 = fully healthy, penalized by overload + mental load + recovery deficit.
  const overloadPenalty = Math.min(60, (overloadMinutes / 60) * 12);
  const loadPenalty = Math.min(25, mentalLoad / 6);
  const recoveryPenalty = Math.min(15, recoveryDeficit / 10);
  const plannerScore = Math.max(0, Math.round(100 - overloadPenalty - loadPenalty - recoveryPenalty));

  return {
    availableMinutes,
    scheduledMinutes: Math.round(scheduledMinutes),
    freeMinutes: Math.round(freeMinutes),
    deepWorkMinutes: Math.round(deepWorkMinutes),
    overloadMinutes: Math.round(overloadMinutes),
    recoveryMinutes: Math.round(Math.max(0, freeMinutes)),
    plannerScore,
    mentalLoad: Math.round(mentalLoad),
  };
}

/**
 * Maps a planner score + overload into a 0-100 "reality gap" score, where
 * higher = the planned schedule is further from what's realistically achievable.
 * @param {ReturnType<typeof computeCapacitySnapshot>} capacity
 * @returns {{score:number, severity:'Low'|'Medium'|'High'}}
 */
function computeRealityGapSnapshot(capacity) {
  const overloadFactor = Math.min(70, (capacity.overloadMinutes / 60) * 15);
  const loadFactor = Math.min(20, capacity.mentalLoad / 8);
  const recoveryFactor = capacity.recoveryMinutes < HEALTHY_RECOVERY_MINUTES ? 10 : 0;
  const score = Math.min(100, Math.round(overloadFactor + loadFactor + recoveryFactor));

  let severity = 'Low';
  if (score >= 55) severity = 'High';
  else if (score >= 25) severity = 'Medium';

  return { score, severity };
}

/**
 * Detects simplified conflicts within a single schedule: time overlaps,
 * back-to-back recovery starvation, and priority pile-ups.
 * @param {object[]} commitments
 * @returns {{id:string, type:string, severity:string, title:string, description:string, relatedIds:string[]}[]}
 */
function detectScheduleConflicts(commitments) {
  const active = activeCommitments(commitments);
  const timed = active
    .map((c, i) => ({ id: getId(c, i), title: c.title || 'Untitled', start: parseStart(c), end: parseEnd(c), raw: c }))
    .filter((c) => c.start && c.end && c.end > c.start)
    .sort((a, b) => a.start - b.start);

  const conflicts = [];

  // Time overlaps
  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      if (timed[j].start >= timed[i].end) break;
      conflicts.push({
        id: `time:${timed[i].id}:${timed[j].id}`,
        type: 'TIME_CONFLICT',
        severity: 'High',
        title: 'Time Conflict',
        description: `${timed[i].title} overlaps with ${timed[j].title}.`,
        relatedIds: [timed[i].id, timed[j].id],
      });
    }
  }

  // Back-to-back / recovery conflicts (gap <= 15 min for 3+ in a row)
  let chain = timed.length ? 1 : 0;
  for (let i = 1; i < timed.length; i += 1) {
    const gapMinutes = (timed[i].start - timed[i - 1].end) / 60000;
    chain = gapMinutes >= 0 && gapMinutes <= 15 ? chain + 1 : 1;
    if (chain === 3) {
      conflicts.push({
        id: `recovery:${timed[i - 2].id}:${timed[i].id}`,
        type: 'RECOVERY_CONFLICT',
        severity: 'Medium',
        title: 'Recovery Conflict',
        description: 'Three or more commitments are scheduled back-to-back with no breathing room.',
        relatedIds: [timed[i - 2].id, timed[i - 1].id, timed[i].id],
      });
    }
  }

  // Priority pile-up (3+ high-importance items active)
  const highImportance = active.filter((c) => getImportance(c) >= 8);
  if (highImportance.length >= 3) {
    conflicts.push({
      id: `priority:${highImportance.map((c, i) => getId(c, i)).join(':')}`,
      type: 'PRIORITY_CONFLICT',
      severity: 'High',
      title: 'Priority Conflict',
      description: 'Multiple high-importance commitments are competing for the same limited time.',
      relatedIds: highImportance.map((c, i) => getId(c, i)),
    });
  }

  // Context-switch conflict (many distinct types crammed together)
  const distinctTypes = new Set(active.map((c) => classifyKey(c)));
  if (distinctTypes.size >= 5 && active.length >= 6) {
    conflicts.push({
      id: 'context:switch-load',
      type: 'CONTEXT_CONFLICT',
      severity: 'Medium',
      title: 'Context-Switch Conflict',
      description: 'High variety of commitment types increases mental context-switching cost.',
      relatedIds: active.map((c, i) => getId(c, i)),
    });
  }

  // Protected-anchor violations: anything overlapping a LIFE_ANCHOR (sleep,
  // meals, gym, etc.) that is itself not also a LIFE_ANCHOR.
  const anchors = timed.filter((t) => isLifeAnchor(t.raw));
  const nonAnchors = timed.filter((t) => !isLifeAnchor(t.raw));
  anchors.forEach((anchor) => {
    nonAnchors.forEach((other) => {
      if (other.start < anchor.end && other.end > anchor.start) {
        conflicts.push({
          id: `anchor:${anchor.id}:${other.id}`,
          type: 'PROTECTED_ANCHOR_VIOLATION',
          severity: 'High',
          title: 'Protected-Anchor Violation',
          description: `${other.title} overlaps with the protected ${anchor.title} block.`,
          relatedIds: [anchor.id, other.id],
        });
      }
    });
  });

  return conflicts;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — applies a scenario to produce the "proposed" schedule
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies a scenario action to a base schedule and returns the resulting
 * "proposed" array of commitments. Does not mutate the input.
 * @param {object[]} currentCommitments
 * @param {object} scenario
 * @returns {object[]}
 */
function applyScenario(currentCommitments, scenario) {
  const base = activeCommitments(currentCommitments).map(cloneCommitment);
  const { type, targetId, commitment, changes } = scenario;

  switch (type) {
    case SCENARIO_TYPES.ADD_COMMITMENT:
    case SCENARIO_TYPES.ACCEPT_MEETING:
      return [...base, { ...commitment }];

    case SCENARIO_TYPES.REJECT_MEETING:
    case SCENARIO_TYPES.DELETE_COMMITMENT:
    case SCENARIO_TYPES.CANCEL_TASK:
      return base.filter((c, i) => getId(c, i) !== targetId);

    case SCENARIO_TYPES.MOVE_COMMITMENT:
      return base.map((c, i) =>
        getId(c, i) === targetId ? { ...c, ...changes } : c
      );

    case SCENARIO_TYPES.EXTEND_DURATION:
    case SCENARIO_TYPES.SHORTEN_DURATION:
      return base.map((c, i) => {
        if (getId(c, i) !== targetId) return c;
        const delta = changes?.deltaMinutes ?? 0;
        const currentDuration = getEffectiveDurationMinutes(c);
        return { ...c, effectiveDurationMinutes: Math.max(0, currentDuration + delta) };
      });

    case SCENARIO_TYPES.DELAY_TASK:
      return base.map((c, i) =>
        getId(c, i) === targetId ? { ...c, date: changes?.newDate ?? c.date, startTime: changes?.newStartTime ?? c.startTime, endTime: changes?.newEndTime ?? c.endTime } : c
      );

    case SCENARIO_TYPES.COMPLETE_TASK_EARLY:
      return base.filter((c, i) => getId(c, i) !== targetId);

    default:
      return base;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compares two schedules (current vs. proposed) across the headline metrics
 * the rest of Chronos cares about.
 *
 * @param {object[]} currentCommitments - Schedule before the change.
 * @param {object[]} proposedCommitments - Schedule after the hypothetical change.
 * @returns {{
 *   current: object, proposed: object, difference: object
 * }} Before / after / difference snapshot.
 */
export function compareSchedules(currentCommitments, proposedCommitments) {
  const current = computeCapacitySnapshot(currentCommitments);
  const proposed = computeCapacitySnapshot(proposedCommitments);

  const difference = {
    availableMinutes: proposed.availableMinutes - current.availableMinutes,
    scheduledMinutes: proposed.scheduledMinutes - current.scheduledMinutes,
    freeMinutes: proposed.freeMinutes - current.freeMinutes,
    deepWorkMinutes: proposed.deepWorkMinutes - current.deepWorkMinutes,
    overloadMinutes: proposed.overloadMinutes - current.overloadMinutes,
    recoveryMinutes: proposed.recoveryMinutes - current.recoveryMinutes,
    plannerScore: proposed.plannerScore - current.plannerScore,
  };

  return { current, proposed, difference };
}

/**
 * Estimates the capacity-specific impact of a proposed change.
 *
 * @param {object[]} currentCommitments
 * @param {object[]} proposedCommitments
 * @returns {{
 *   usableHoursLost: number, reserveRemainingMinutes: number,
 *   overtimeRequiredMinutes: number, fatigueIncrease: number
 * }}
 */
export function estimateCapacityImpact(currentCommitments, proposedCommitments) {
  const current = computeCapacitySnapshot(currentCommitments);
  const proposed = computeCapacitySnapshot(proposedCommitments);

  const usableHoursLost = Math.max(0, (current.freeMinutes - proposed.freeMinutes) / 60);
  const reserveRemainingMinutes = proposed.freeMinutes;
  const overtimeRequiredMinutes = Math.max(0, proposed.overloadMinutes);
  const fatigueIncrease = Math.max(0, proposed.mentalLoad - current.mentalLoad);

  return {
    usableHoursLost: Math.round(usableHoursLost * 10) / 10,
    reserveRemainingMinutes,
    overtimeRequiredMinutes,
    fatigueIncrease: Math.round(fatigueIncrease),
  };
}

/**
 * Estimates how the "reality gap" (planned vs. realistically achievable)
 * changes between the current and proposed schedule.
 *
 * @param {object[]} currentCommitments
 * @param {object[]} proposedCommitments
 * @returns {{
 *   currentGap:number, futureGap:number, difference:number,
 *   direction:'increase'|'decrease'|'unchanged', severity:'Low'|'Medium'|'High'
 * }}
 */
export function estimateRealityGapChange(currentCommitments, proposedCommitments) {
  const currentCapacity = computeCapacitySnapshot(currentCommitments);
  const proposedCapacity = computeCapacitySnapshot(proposedCommitments);
  const currentGapInfo = computeRealityGapSnapshot(currentCapacity);
  const futureGapInfo = computeRealityGapSnapshot(proposedCapacity);

  const difference = futureGapInfo.score - currentGapInfo.score;
  const direction = difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'unchanged';

  return {
    currentGap: currentGapInfo.score,
    futureGap: futureGapInfo.score,
    difference,
    direction,
    severity: futureGapInfo.severity,
  };
}

/**
 * Detects conflicts present in the proposed schedule that do NOT exist
 * in the current schedule.
 *
 * @param {object[]} currentCommitments
 * @param {object[]} proposedCommitments
 * @returns {object[]} New conflicts introduced by the change.
 */
export function detectNewConflicts(currentCommitments, proposedCommitments) {
  const currentIds = new Set(detectScheduleConflicts(currentCommitments).map((c) => c.id));
  return detectScheduleConflicts(proposedCommitments).filter((c) => !currentIds.has(c.id));
}

/**
 * Detects conflicts present in the current schedule that are RESOLVED
 * (no longer present) in the proposed schedule.
 *
 * @param {object[]} currentCommitments
 * @param {object[]} proposedCommitments
 * @returns {object[]} Conflicts resolved by the change.
 */
export function detectResolvedConflicts(currentCommitments, proposedCommitments) {
  const proposedIds = new Set(detectScheduleConflicts(proposedCommitments).map((c) => c.id));
  return detectScheduleConflicts(currentCommitments).filter((c) => !proposedIds.has(c.id));
}

/**
 * Estimates the cost, in recovery days, of absorbing the proposed change.
 *
 * @param {object[]} currentCommitments
 * @param {object[]} proposedCommitments
 * @returns {{ recoveryDays:number, reason:string }}
 */
export function estimateRecoveryCost(currentCommitments, proposedCommitments) {
  const current = computeCapacitySnapshot(currentCommitments);
  const proposed = computeCapacitySnapshot(proposedCommitments);

  const overloadDelta = Math.max(0, proposed.overloadMinutes - current.overloadMinutes);
  const loadDelta = Math.max(0, proposed.mentalLoad - current.mentalLoad);

  // Roughly: every 90 overload-minutes ~ half a recovery day; heavy mental
  // load on top compounds it.
  let recoveryDays = (overloadDelta / 90) * 0.5 + (loadDelta / 40) * 0.5;
  recoveryDays = Math.round(recoveryDays * 10) / 10;

  let reason = 'No meaningful recovery cost expected.';
  if (recoveryDays > 0 && recoveryDays <= 0.5) reason = 'Minor fatigue — a short break should be enough.';
  else if (recoveryDays > 0.5 && recoveryDays <= 1.5) reason = 'Noticeable fatigue — plan a lighter day afterward.';
  else if (recoveryDays > 1.5) reason = 'Significant fatigue — expect to need multiple lighter days to recover.';

  return { recoveryDays, reason };
}

/**
 * Predicts whether Rescue Mode would activate under the proposed schedule,
 * and how severe the intervention would need to be.
 *
 * @param {object[]} proposedCommitments
 * @returns {{
 *   required:boolean, confidence:number, estimatedRecoveryDays:number,
 *   workCompressionNeeded:boolean, delegationLikelihood:'Low'|'Medium'|'High'
 * }}
 */
export function predictRescueActivation(proposedCommitments) {
  const capacity = computeCapacitySnapshot(proposedCommitments);
  const gap = computeRealityGapSnapshot(capacity);
  const conflicts = detectScheduleConflicts(proposedCommitments);
  const highSeverityConflicts = conflicts.filter((c) => c.severity === 'High').length;

  const required = capacity.plannerScore < 45 || gap.severity === 'High' || highSeverityConflicts >= 2;

  // Confidence: how sure we are, scaled by how far past the threshold we are.
  const scoreDeficit = Math.max(0, 45 - capacity.plannerScore);
  const confidence = required
    ? Math.min(0.97, 0.55 + scoreDeficit / 100 + highSeverityConflicts * 0.08)
    : Math.max(0.1, 0.5 - (45 - capacity.plannerScore) / 200);

  const estimatedRecoveryDays = Math.round(((capacity.overloadMinutes / 90) * 0.5 + (gap.score / 100)) * 10) / 10;
  const workCompressionNeeded = capacity.overloadMinutes > 0;
  const delegationLikelihood = highSeverityConflicts >= 2 || capacity.overloadMinutes > 180
    ? 'High'
    : capacity.overloadMinutes > 60
      ? 'Medium'
      : 'Low';

  return {
    required,
    confidence: Math.round(confidence * 100) / 100,
    estimatedRecoveryDays,
    workCompressionNeeded,
    delegationLikelihood,
  };
}

/**
 * Builds a structured trade-off analysis: what is gained vs. lost by making
 * the proposed change, expressed in terms of time taken from other
 * commitments (e.g. "Lose 2 hours DSA, Gym, 1 hour sleep / Gain: Interview").
 *
 * @param {object[]} currentCommitments
 * @param {object[]} proposedCommitments
 * @param {object} scenario
 * @returns {{ gains:string[], losses:string[], netAssessment:'Worth it'|'Risky'|'Not worth it' }}
 */
export function generateTradeoffs(currentCommitments, proposedCommitments, scenario) {
  const currentIds = new Map(activeCommitments(currentCommitments).map((c, i) => [getId(c, i), c]));
  const proposedIds = new Map(activeCommitments(proposedCommitments).map((c, i) => [getId(c, i), c]));

  const gains = [];
  const losses = [];

  // Anything newly present is a gain.
  for (const [id, c] of proposedIds) {
    if (!currentIds.has(id)) {
      gains.push(c.title || 'New commitment');
    }
  }
  // Anything removed is a loss.
  for (const [id, c] of currentIds) {
    if (!proposedIds.has(id)) {
      const hours = Math.round((getEffectiveDurationMinutes(c) / 60) * 10) / 10;
      losses.push(hours >= 1 ? `${hours}h ${c.title || 'commitment'}` : c.title || 'commitment');
    }
  }

  const capacityImpact = estimateCapacityImpact(currentCommitments, proposedCommitments);
  if (capacityImpact.usableHoursLost > 0) {
    losses.push(`${capacityImpact.usableHoursLost}h of free/recovery time`);
  }

  const gapChange = estimateRealityGapChange(currentCommitments, proposedCommitments);
  const newConflicts = detectNewConflicts(currentCommitments, proposedCommitments);

  let netAssessment = 'Worth it';
  if (gapChange.direction === 'increase' && gapChange.severity === 'High') netAssessment = 'Not worth it';
  else if (newConflicts.length > 0 || (gapChange.direction === 'increase' && gapChange.severity === 'Medium')) netAssessment = 'Risky';

  // Specific scenario context (e.g. accept/reject meeting) can override framing
  // but never the underlying math above.
  void scenario;

  return { gains, losses, netAssessment };
}

/**
 * Generates a human-readable recommendation for the scenario, with reasoning.
 *
 * @param {object[]} currentCommitments
 * @param {object[]} proposedCommitments
 * @param {object} scenario
 * @returns {{
 *   action: 'Accept'|'Reject'|'Reschedule'|'Delay another task'|'Split work'|'Compress work'|'Delegate'|'Proceed'|'Avoid',
 *   reason: string, confidence: number
 * }}
 */
export function generateRecommendation(currentCommitments, proposedCommitments, scenario) {
  const gapChange = estimateRealityGapChange(currentCommitments, proposedCommitments);
  const newConflicts = detectNewConflicts(currentCommitments, proposedCommitments);
  const resolvedConflicts = detectResolvedConflicts(currentCommitments, proposedCommitments);
  const rescue = predictRescueActivation(proposedCommitments);
  const capacityImpact = estimateCapacityImpact(currentCommitments, proposedCommitments);

  const isRemovalType = [
    SCENARIO_TYPES.DELETE_COMMITMENT,
    SCENARIO_TYPES.REJECT_MEETING,
    SCENARIO_TYPES.CANCEL_TASK,
    SCENARIO_TYPES.COMPLETE_TASK_EARLY,
  ].includes(scenario?.type);

  // Removing/cancelling something that resolves conflicts and doesn't add load.
  if (isRemovalType) {
    if (resolvedConflicts.length > 0 || gapChange.direction === 'decrease') {
      return {
        action: 'Accept',
        reason: `This frees up ${capacityImpact.usableHoursLost <= 0 ? 'time and ' : ''}resolves ${resolvedConflicts.length} conflict${resolvedConflicts.length === 1 ? '' : 's'}, reducing schedule pressure.`,
        confidence: 0.82,
      };
    }
    return {
      action: 'Reschedule',
      reason: 'Removing this does not meaningfully reduce pressure elsewhere — consider rescheduling instead of cancelling outright.',
      confidence: 0.55,
    };
  }

  // Rescue would trigger — strong signal against accepting as-is.
  if (rescue.required && rescue.confidence > 0.7) {
    if (newConflicts.some((c) => c.severity === 'High')) {
      return {
        action: 'Reject',
        reason: `This introduces ${newConflicts.length} new conflict${newConflicts.length === 1 ? '' : 's'} and would likely trigger Rescue Mode (confidence ${Math.round(rescue.confidence * 100)}%). The cost outweighs the benefit as currently scoped.`,
        confidence: rescue.confidence,
      };
    }
    if (rescue.workCompressionNeeded) {
      return {
        action: 'Compress work',
        reason: `Capacity would go into overtime (${capacityImpact.overtimeRequiredMinutes} min). Compressing lower-priority work could absorb this without rejecting the opportunity outright.`,
        confidence: rescue.confidence,
      };
    }
    return {
      action: 'Delay another task',
      reason: 'Accepting this would overload the schedule. Delaying a lower-priority task elsewhere creates the room needed.',
      confidence: rescue.confidence,
    };
  }

  // Moderate impact — manageable but worth reshaping.
  if (gapChange.direction === 'increase' && gapChange.severity === 'Medium') {
    return {
      action: 'Reschedule',
      reason: `The reality gap would rise from ${gapChange.currentGap} to ${gapChange.futureGap}. Shifting the timing could keep the benefit without the strain.`,
      confidence: 0.6,
    };
  }

  if (capacityImpact.fatigueIncrease > 15 && capacityImpact.usableHoursLost >= 2) {
    return {
      action: 'Split work',
      reason: 'The added cognitive load is high relative to capacity. Splitting the work across more days would reduce single-day strain.',
      confidence: 0.58,
    };
  }

  // Default: the change is safe.
  return {
    action: 'Accept',
    reason: 'Capacity, reality gap, and conflict risk all remain within healthy ranges for this change.',
    confidence: 0.75,
  };
}

/**
 * Runs the full simulation pipeline for a single scenario and assembles the
 * complete consequence report used by the UI layer.
 *
 * @param {object[]} currentCommitments - The user's existing schedule.
 * @param {object} scenario - { type, targetId?, commitment?, changes? }
 * @returns {object} generateSimulationReport() output.
 */
export function simulateScenario(currentCommitments, scenario) {
  const proposedCommitments = applyScenario(currentCommitments, scenario);
  return generateSimulationReport(currentCommitments, proposedCommitments, scenario);
}

/**
 * Assembles the final, structured Consequence Simulation Report consumed by
 * the consequence/ components.
 *
 * @param {object[]} currentCommitments
 * @param {object[]} proposedCommitments
 * @param {object} scenario
 * @returns {{
 *   scenario: object,
 *   comparison: ReturnType<typeof compareSchedules>,
 *   capacityImpact: ReturnType<typeof estimateCapacityImpact>,
 *   realityGapChange: ReturnType<typeof estimateRealityGapChange>,
 *   newConflicts: object[],
 *   resolvedConflicts: object[],
 *   recoveryCost: ReturnType<typeof estimateRecoveryCost>,
 *   rescuePrediction: ReturnType<typeof predictRescueActivation>,
 *   tradeoffs: ReturnType<typeof generateTradeoffs>,
 *   recommendation: ReturnType<typeof generateRecommendation>,
 *   generatedAt: string
 * }}
 */
export function generateSimulationReport(currentCommitments, proposedCommitments, scenario) {
  const comparison = compareSchedules(currentCommitments, proposedCommitments);
  const capacityImpact = estimateCapacityImpact(currentCommitments, proposedCommitments);
  const realityGapChange = estimateRealityGapChange(currentCommitments, proposedCommitments);
  const newConflicts = detectNewConflicts(currentCommitments, proposedCommitments);
  const resolvedConflicts = detectResolvedConflicts(currentCommitments, proposedCommitments);
  const recoveryCost = estimateRecoveryCost(currentCommitments, proposedCommitments);
  const rescuePrediction = predictRescueActivation(proposedCommitments);
  const tradeoffs = generateTradeoffs(currentCommitments, proposedCommitments, scenario);
  const recommendation = generateRecommendation(currentCommitments, proposedCommitments, scenario);

  return {
    scenario,
    comparison,
    capacityImpact,
    realityGapChange,
    newConflicts,
    resolvedConflicts,
    recoveryCost,
    rescuePrediction,
    tradeoffs,
    recommendation,
    generatedAt: new Date().toISOString(),
  };
}
