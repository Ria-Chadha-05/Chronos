/**
 * firefighterEngine.js
 *
 * Chronos Firefighter Engine — Emergency Recovery Service
 *
 * Pure functions that analyse a commitment load, detect emergencies, and
 * produce structured recovery data.  No React, no context, no side-effects.
 *
 * ▸ Every function accepts plain objects/arrays and returns plain data.
 * ▸ Safe to call with empty or partial input — always returns a valid shape.
 * ▸ No imports from CommitmentContext, Dashboard, Demo Mode, or any UI layer.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Working hours available in a standard day (minutes). */
const WORKDAY_MINUTES = 480;

/** Hard cap: day is "impossible" once committed past this ratio. */
const EMERGENCY_THRESHOLD_RATIO = 1.25;

/** Soft warning: overload begins above this ratio. */
const WARNING_THRESHOLD_RATIO = 0.9;

/** Priority tiers used across the engine. */
export const PRIORITY_TIERS = {
  CRITICAL:  'critical',
  IMPORTANT: 'important',
  OPTIONAL:  'optional',
  DROPPABLE: 'droppable',
};

/** Email draft template types. */
export const EMAIL_TYPES = {
  EXTENSION_REQUEST:    'extension_request',
  ASSIGNMENT_EXTENSION: 'assignment_extension',
  MEETING_RESCHEDULE:   'meeting_reschedule',
  INTERVIEW_RESCHEDULE: 'interview_reschedule',
  PROJECT_DELAY:        'project_delay',
  PROFESSOR_EMAIL:      'professor_email',
  MANAGER_EMAIL:        'manager_email',
  TEAMMATE_MESSAGE:     'teammate_message',
};

/** Delegation strategy types. */
export const DELEGATION_TYPES = {
  DELEGATE:      'delegate',
  PAIR_WORK:     'pair_work',
  ASK_TEAMMATE:  'ask_teammate',
  POSTPONE:      'postpone',
  REDUCE_SCOPE:  'reduce_scope',
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Extracts the effective duration in minutes from a commitment object.
 * @param {object} commitment
 * @returns {number}
 */
function getDuration(commitment) {
  return (
    commitment.effectiveDurationMinutes ??
    commitment.durationMinutes ??
    commitment.duration ??
    0
  );
}

/**
 * Safely parse a date from a commitment's date/startDateTime field.
 * @param {object} commitment
 * @returns {Date|null}
 */
function getCommitmentDate(commitment) {
  const raw =
    commitment.startDateTime ??
    commitment.start?.dateTime ??
    commitment.start?.date ??
    commitment.date ??
    null;
  if (!raw) return null;
  try {
    const d = new Date(
      typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? `${raw}T00:00:00`
        : raw
    );
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Returns today's YYYY-MM-DD date string.
 * @returns {string}
 */
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Filters commitments to only those belonging to today.
 * @param {object[]} commitments
 * @returns {object[]}
 */
function filterToday(commitments) {
  const today = todayKey();
  return (commitments ?? []).filter(c => {
    const d = getCommitmentDate(c);
    if (!d) return false;
    return d.toISOString().slice(0, 10) === today;
  });
}

/**
 * Calculates total committed minutes from an array of commitments.
 * @param {object[]} commitments
 * @returns {number}
 */
function totalMinutes(commitments) {
  return commitments.reduce((sum, c) => sum + getDuration(c), 0);
}

/**
 * Normalises priority/urgency strings into a comparable tier.
 * @param {object} commitment
 * @returns {string}
 */
function normalisePriority(commitment) {
  const p = (commitment.priority ?? commitment.urgency ?? '').toLowerCase();
  if (['critical', 'urgent', 'high'].includes(p)) return PRIORITY_TIERS.CRITICAL;
  if (['important', 'medium'].includes(p))          return PRIORITY_TIERS.IMPORTANT;
  if (['low', 'optional'].includes(p))              return PRIORITY_TIERS.OPTIONAL;
  // Commitments that are soft/unconfirmed/flexible default to droppable
  const flexibility = (commitment.flexibility ?? '').toLowerCase();
  if (['flexible', 'soft'].includes(flexibility))   return PRIORITY_TIERS.DROPPABLE;
  return PRIORITY_TIERS.IMPORTANT;
}

// ─── Core engine functions ────────────────────────────────────────────────────

/**
 * Detects whether the user's current day constitutes an emergency.
 *
 * An emergency is triggered when committed minutes exceed
 * EMERGENCY_THRESHOLD_RATIO × WORKDAY_MINUTES.
 *
 * @param {object[]} commitments  - Full commitment array from the store.
 * @param {object}   [options]
 * @param {number}   [options.workdayMinutes=480] - Override available capacity.
 * @returns {{ isEmergency: boolean, isWarning: boolean, ratio: number,
 *             totalCommittedMinutes: number, availableMinutes: number,
 *             todayCommitments: object[] }}
 */
export function detectEmergency(commitments, { workdayMinutes = WORKDAY_MINUTES } = {}) {
  const today = filterToday(commitments);
  const committed = totalMinutes(today);
  const ratio = committed / workdayMinutes;

  return {
    isEmergency: ratio >= EMERGENCY_THRESHOLD_RATIO,
    isWarning:   ratio >= WARNING_THRESHOLD_RATIO && ratio < EMERGENCY_THRESHOLD_RATIO,
    ratio:       Math.round(ratio * 100) / 100,
    totalCommittedMinutes: committed,
    availableMinutes: Math.max(0, workdayMinutes - committed),
    todayCommitments: today,
  };
}

/**
 * Calculates a severity score (0–100) for the current overload state.
 *
 * Factors: schedule ratio, number of conflicting fixed events,
 * proportion of critical tasks, and presence of hard deadlines.
 *
 * @param {object[]} commitments
 * @param {object}   [options]
 * @param {number}   [options.workdayMinutes=480]
 * @returns {{ score: number, level: 'low'|'moderate'|'high'|'critical',
 *             factors: object }}
 */
export function calculateSeverity(commitments, { workdayMinutes = WORKDAY_MINUTES } = {}) {
  const { ratio, todayCommitments } = detectEmergency(commitments, { workdayMinutes });

  const fixedCount    = todayCommitments.filter(c =>
    (c.flexibility ?? '').toLowerCase() === 'fixed' ||
    (c.commitmentType ?? '') === 'TIMED_EVENT'
  ).length;

  const criticalCount = todayCommitments.filter(c =>
    normalisePriority(c) === PRIORITY_TIERS.CRITICAL
  ).length;

  const hasHardDeadline = todayCommitments.some(c =>
    (c.type ?? '').toLowerCase().includes('deadline') ||
    (c.commitmentType ?? '') === 'DEADLINE'
  );

  // Weighted score
  const ratioScore    = Math.min(ratio * 60, 60);                      // max 60
  const fixedScore    = Math.min(fixedCount * 5, 20);                  // max 20
  const criticalScore = Math.min(criticalCount * 4, 12);               // max 12
  const deadlineScore = hasHardDeadline ? 8 : 0;                       // max 8

  const score = Math.min(
    Math.round(ratioScore + fixedScore + criticalScore + deadlineScore),
    100
  );

  let level;
  if (score < 25)      level = 'low';
  else if (score < 50) level = 'moderate';
  else if (score < 75) level = 'high';
  else                 level = 'critical';

  return {
    score,
    level,
    factors: {
      scheduleRatio: ratio,
      fixedEventCount: fixedCount,
      criticalTaskCount: criticalCount,
      hasHardDeadline,
    },
  };
}

/**
 * Ranks today's commitments into priority tiers: critical, important,
 * optional, droppable.
 *
 * Uses commitment.priority, commitment.urgency, commitment.flexibility,
 * and commitment.commitmentType to determine tier.
 *
 * @param {object[]} commitments
 * @returns {object[]} Commitments sorted by tier with a `rescueTier` field added.
 */
export function rankTasksForReschedule(commitments) {
  const today = filterToday(commitments);

  const TIER_ORDER = {
    [PRIORITY_TIERS.CRITICAL]:  0,
    [PRIORITY_TIERS.IMPORTANT]: 1,
    [PRIORITY_TIERS.OPTIONAL]:  2,
    [PRIORITY_TIERS.DROPPABLE]: 3,
  };

  return today
    .map(c => ({ ...c, rescueTier: normalisePriority(c) }))
    .sort((a, b) => TIER_ORDER[a.rescueTier] - TIER_ORDER[b.rescueTier]);
}

/**
 * Produces minimum-viable completion suggestions for tasks that are too long
 * to fit in the remaining day.
 *
 * @param {object[]} commitments
 * @param {object}   [options]
 * @param {number}   [options.availableMinutes] - Override remaining capacity.
 * @returns {Array<{ commitment: object, original: string, compressed: string,
 *                   compressedMinutes: number, timeSavedMinutes: number }>}
 */
export function suggestCompression(commitments, options = {}) {
  const { availableMinutes: avail } = detectEmergency(commitments);
  const available = options.availableMinutes ?? avail;

  const ranked = rankTasksForReschedule(commitments);

  return ranked
    .filter(c => getDuration(c) > 30 && c.rescueTier !== PRIORITY_TIERS.DROPPABLE)
    .map(c => {
      const original    = c.title ?? c.name ?? 'Task';
      const duration    = getDuration(c);
      const halfDur     = Math.round(duration * 0.4);

      // Build a human-readable compressed version
      const compressed  = buildCompressedDescription(original, c);

      return {
        commitment:          c,
        original,
        compressed,
        compressedMinutes:   Math.max(halfDur, 20),
        timeSavedMinutes:    duration - Math.max(halfDur, 20),
        feasible:            Math.max(halfDur, 20) <= available,
      };
    });
}

/**
 * Generates a minimum-viable description for a compressed task.
 * @param {string} title
 * @param {object} commitment
 * @returns {string}
 */
function buildCompressedDescription(title, commitment) {
  const type = (commitment.commitmentType ?? commitment.type ?? '').toLowerCase();

  if (type.includes('report') || title.toLowerCase().includes('report')) {
    return `Complete executive summary only — skip appendices and full data sections.`;
  }
  if (type.includes('meeting') || title.toLowerCase().includes('meeting')) {
    return `Attend first 20 minutes for critical decisions; send written update for remainder.`;
  }
  if (type.includes('review') || title.toLowerCase().includes('review')) {
    return `Review top-priority items only; flag remainder for async review tomorrow.`;
  }
  if (type.includes('study') || title.toLowerCase().includes('study')) {
    return `Cover key concepts and examples only — skip practice problems for now.`;
  }
  if (type.includes('email') || title.toLowerCase().includes('email')) {
    return `Reply to critical threads only; batch the rest into tomorrow morning.`;
  }
  if (title.toLowerCase().includes('presentation') || title.toLowerCase().includes('slides')) {
    return `Prepare core narrative slides only — cut polish pass and leave speaker notes minimal.`;
  }
  return `Focus on the single most important deliverable; defer all secondary work.`;
}

/**
 * Suggests delegation strategies for tasks that could be offloaded.
 *
 * @param {object[]} commitments
 * @returns {Array<{ commitment: object, strategy: string, reasoning: string,
 *                   suggestedAction: string, priority: string }>}
 */
export function suggestDelegation(commitments) {
  const today = filterToday(commitments);

  return today
    .filter(c => isDelegatable(c))
    .map(c => {
      const strategy = chooseDelegationStrategy(c);
      return {
        commitment:      c,
        strategy:        strategy.type,
        reasoning:       strategy.reasoning,
        suggestedAction: strategy.action,
        priority:        normalisePriority(c),
      };
    });
}

/**
 * Determines whether a commitment is potentially delegatable.
 * @param {object} commitment
 * @returns {boolean}
 */
function isDelegatable(commitment) {
  const type      = (commitment.commitmentType ?? commitment.type ?? '').toLowerCase();
  const title     = (commitment.title ?? commitment.name ?? '').toLowerCase();
  const prio      = normalisePriority(commitment);
  const flex      = (commitment.flexibility ?? '').toLowerCase();

  // Never delegate hard-fixed critical events
  if (prio === PRIORITY_TIERS.CRITICAL && flex === 'fixed') return false;

  // Never delegate personal / private events
  if (commitment.visibility === 'private') return false;

  // Delegate-friendly types
  if (
    type.includes('review') ||
    type.includes('email') ||
    title.includes('review') ||
    title.includes('draft') ||
    title.includes('research') ||
    title.includes('compile') ||
    title.includes('summarise') ||
    title.includes('summarize') ||
    flex === 'flexible'
  ) return true;

  return false;
}

/**
 * Picks the best delegation strategy for a commitment.
 * @param {object} commitment
 * @returns {{ type: string, reasoning: string, action: string }}
 */
function chooseDelegationStrategy(commitment) {
  const title = (commitment.title ?? commitment.name ?? '').toLowerCase();
  const type  = (commitment.commitmentType ?? commitment.type ?? '').toLowerCase();
  const prio  = normalisePriority(commitment);

  if (prio === PRIORITY_TIERS.DROPPABLE) {
    return {
      type:      DELEGATION_TYPES.POSTPONE,
      reasoning: 'This task has low priority and flexible timing — safely deferred without impact.',
      action:    'Move to tomorrow\'s schedule and notify any stakeholders if needed.',
    };
  }

  if (type.includes('review') || title.includes('review')) {
    return {
      type:      DELEGATION_TYPES.ASK_TEAMMATE,
      reasoning: 'Review tasks are typically distributable without loss of output quality.',
      action:    'Ask a teammate to complete the initial review pass and share notes with you.',
    };
  }

  if (title.includes('research') || title.includes('compile')) {
    return {
      type:      DELEGATION_TYPES.DELEGATE,
      reasoning: 'Research and compilation work can be split or fully delegated with a clear brief.',
      action:    'Write a 3-sentence brief and assign to a teammate or junior collaborator.',
    };
  }

  if (getDuration(commitment) > 90) {
    return {
      type:      DELEGATION_TYPES.PAIR_WORK,
      reasoning: 'This long task benefits from parallel effort to hit today\'s deadline.',
      action:    'Pair with a teammate — split deliverables and merge results before deadline.',
    };
  }

  return {
    type:      DELEGATION_TYPES.REDUCE_SCOPE,
    reasoning: 'Reducing scope is the fastest way to make this commitment fit today\'s capacity.',
    action:    'Negotiate a reduced deliverable with the stakeholder — partial is better than missed.',
  };
}

/**
 * Estimates how many working days are required to clear the current backlog.
 *
 * @param {object[]} commitments
 * @param {object}   [options]
 * @param {number}   [options.workdayMinutes=480]
 * @returns {{ estimatedRecoveryDays: number, totalOverflowMinutes: number,
 *             note: string }}
 */
export function estimateRecoveryTime(commitments, { workdayMinutes = WORKDAY_MINUTES } = {}) {
  const { totalCommittedMinutes } = detectEmergency(commitments, { workdayMinutes });
  const overflow = Math.max(0, totalCommittedMinutes - workdayMinutes);
  const days     = Math.ceil(overflow / workdayMinutes);

  return {
    estimatedRecoveryDays: days,
    totalOverflowMinutes:  overflow,
    note: days === 0
      ? 'Day is manageable — no overflow detected.'
      : days === 1
        ? 'One additional working day required to clear today\'s overflow.'
        : `Approximately ${days} working days to fully absorb today\'s overload.`,
  };
}

/**
 * Generates a structured emergency score object summarising the day's state.
 *
 * @param {object[]} commitments
 * @param {object}   [options]
 * @param {number}   [options.workdayMinutes=480]
 * @returns {{ severity: number, level: string, overloadMinutes: number,
 *             confidence: number, estimatedRecoveryDays: number,
 *             recommendedAction: string }}
 */
export function generateEmergencyScore(commitments, { workdayMinutes = WORKDAY_MINUTES } = {}) {
  const { isEmergency, isWarning, ratio, totalCommittedMinutes } =
    detectEmergency(commitments, { workdayMinutes });
  const { score, level } = calculateSeverity(commitments, { workdayMinutes });
  const { estimatedRecoveryDays } = estimateRecoveryTime(commitments, { workdayMinutes });

  const overloadMinutes = Math.max(0, totalCommittedMinutes - workdayMinutes);

  // Confidence: how sure we are the data is representative (penalise very small sets)
  const count      = filterToday(commitments).length;
  const confidence = count === 0 ? 0 : Math.min(100, 60 + count * 5);

  let recommendedAction;
  if (!isEmergency && !isWarning) {
    recommendedAction = 'Day is on track — no recovery actions needed.';
  } else if (isWarning) {
    recommendedAction = 'Defer 1–2 optional tasks to create a comfortable buffer.';
  } else if (score < 60) {
    recommendedAction = 'Compress 2–3 tasks and defer lowest-priority items.';
  } else if (score < 80) {
    recommendedAction = 'Delegate or drop optional tasks; compress the rest to MVP deliverables.';
  } else {
    recommendedAction =
      'Declare Firefighter Mode: drop non-critical tasks, send extension emails, compress everything else.';
  }

  return {
    severity:             score,
    level,
    overloadMinutes,
    scheduleRatio:        ratio,
    confidence,
    estimatedRecoveryDays,
    recommendedAction,
    isEmergency,
    isWarning,
  };
}

/**
 * Generates a complete recovery plan for an overloaded day.
 *
 * Combines ranked tasks, compression suggestions, and delegation options
 * into a single structured plan object.
 *
 * @param {object[]} commitments
 * @param {object}   [options]
 * @param {number}   [options.workdayMinutes=480]
 * @returns {{ emergencyScore: object, rankedTasks: object[],
 *             compressions: object[], delegations: object[],
 *             keepList: object[], deferList: object[], dropList: object[] }}
 */
export function generateRecoveryPlan(commitments, { workdayMinutes = WORKDAY_MINUTES } = {}) {
  const emergencyScore = generateEmergencyScore(commitments, { workdayMinutes });
  const rankedTasks    = rankTasksForReschedule(commitments);
  const compressions   = suggestCompression(commitments, { workdayMinutes });
  const delegations    = suggestDelegation(commitments);

  const keepList  = rankedTasks.filter(t => t.rescueTier === PRIORITY_TIERS.CRITICAL);
  const deferList = rankedTasks.filter(t =>
    t.rescueTier === PRIORITY_TIERS.OPTIONAL || t.rescueTier === PRIORITY_TIERS.IMPORTANT
  );
  const dropList  = rankedTasks.filter(t => t.rescueTier === PRIORITY_TIERS.DROPPABLE);

  return {
    emergencyScore,
    rankedTasks,
    compressions,
    delegations,
    keepList,
    deferList,
    dropList,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates a professional email draft for a given scenario.
 *
 * Does NOT send the email — returns draft text only.
 *
 * @param {string}  emailType    - One of EMAIL_TYPES values.
 * @param {object}  context      - Contextual data to personalise the draft.
 * @param {string}  [context.taskTitle]      - Name of the task/deliverable.
 * @param {string}  [context.recipientRole]  - e.g. 'professor', 'manager'.
 * @param {string}  [context.recipientName]  - Recipient's name.
 * @param {string}  [context.senderName]     - Sender's name.
 * @param {string}  [context.originalDate]   - Original due / meeting date.
 * @param {string}  [context.proposedDate]   - Proposed new date.
 * @param {string}  [context.reason]         - Reason for delay/reschedule.
 * @returns {{ subject: string, body: string, tone: string, type: string }}
 */
export function generateEmailDraft(emailType, context = {}) {
  const {
    taskTitle      = 'the deliverable',
    recipientRole  = 'recipient',
    recipientName  = '',
    senderName     = '',
    originalDate   = '',
    proposedDate   = '',
    reason         = 'an unexpected scheduling conflict',
  } = context;

  const salutation = recipientName ? `Dear ${recipientName},` : `Dear ${recipientRole},`;
  const closing    = senderName   ? `Best regards,\n${senderName}` : 'Best regards,';

  const templates = {
    [EMAIL_TYPES.EXTENSION_REQUEST]: {
      subject: `Extension Request — ${taskTitle}`,
      tone:    'professional',
      body:
`${salutation}

I am writing to respectfully request an extension for ${taskTitle}${originalDate ? `, originally due ${originalDate}` : ''}.

Due to ${reason}, I am unable to meet the current deadline while maintaining the standard of work this requires. I want to be transparent rather than submit something incomplete.

${proposedDate ? `I am confident I can deliver by ${proposedDate} and would welcome your thoughts on this timeline.` : 'Please let me know if an extension is possible and what timeline works best.'}

I apologise for any inconvenience and appreciate your understanding.

${closing}`,
    },

    [EMAIL_TYPES.ASSIGNMENT_EXTENSION]: {
      subject: `Assignment Extension Request — ${taskTitle}`,
      tone:    'respectful-academic',
      body:
`${salutation}

I hope this message finds you well. I am writing to request a short extension on ${taskTitle}${originalDate ? ` (due ${originalDate})` : ''}.

I have encountered ${reason}, which has significantly impacted my ability to complete the assignment to the level I know is expected. I would rather request additional time than submit work that does not reflect my full effort.

${proposedDate ? `I am requesting an extension until ${proposedDate}.` : 'I would be grateful for any additional time you are able to provide.'} I am happy to discuss further if helpful.

Thank you sincerely for your consideration.

${closing}`,
    },

    [EMAIL_TYPES.MEETING_RESCHEDULE]: {
      subject: `Reschedule Request — Meeting${originalDate ? ` on ${originalDate}` : ''}`,
      tone:    'professional',
      body:
`${salutation}

I wanted to reach out about our upcoming meeting${originalDate ? ` on ${originalDate}` : ''}.

Due to ${reason}, I am not able to attend at the scheduled time. I apologise for the short notice and any disruption this causes.

${proposedDate ? `I would like to propose rescheduling to ${proposedDate} — please let me know if that works for you, or feel free to suggest an alternative.` : 'Could we find a mutually convenient time to reschedule? I am happy to work around your availability.'}

${closing}`,
    },

    [EMAIL_TYPES.INTERVIEW_RESCHEDULE]: {
      subject: `Interview Reschedule Request${originalDate ? ` — ${originalDate}` : ''}`,
      tone:    'professional-formal',
      body:
`${salutation}

Thank you for the opportunity to interview for this role. I am very much looking forward to speaking with the team.

I am writing to ask whether it would be possible to reschedule our interview, currently set for ${originalDate || 'the arranged time'}. I have encountered ${reason} that prevents me from attending as planned.

${proposedDate ? `I am available from ${proposedDate} and would welcome the chance to coordinate a new time.` : 'I remain very interested and am happy to work around your scheduling requirements.'}

I sincerely apologise for any inconvenience and appreciate your understanding.

${closing}`,
    },

    [EMAIL_TYPES.PROJECT_DELAY]: {
      subject: `Project Update — Revised Timeline for ${taskTitle}`,
      tone:    'professional',
      body:
`${salutation}

I wanted to provide a proactive update on ${taskTitle}.

We have encountered ${reason}, which will impact our original delivery date${originalDate ? ` of ${originalDate}` : ''}. I wanted to communicate this early rather than at the last moment.

${proposedDate ? `Our revised target date is ${proposedDate}.` : 'I am currently assessing the impact and will share a revised timeline shortly.'} We are actively mitigating the delay and will keep you updated on progress.

Please let me know if you would like to discuss this further.

${closing}`,
    },

    [EMAIL_TYPES.PROFESSOR_EMAIL]: {
      subject: `Regarding ${taskTitle}`,
      tone:    'respectful-academic',
      body:
`${salutation}

I hope you are well. I am writing regarding ${taskTitle}${originalDate ? ` due on ${originalDate}` : ''}.

I have experienced ${reason} that has affected my ability to complete the work on schedule. I take this course seriously and did not want to submit incomplete work without first reaching out.

${proposedDate ? `I would like to request an extension until ${proposedDate}, if possible.` : 'I would greatly appreciate any guidance you can offer on how to proceed.'}

Thank you for your time and understanding.

${closing}`,
    },

    [EMAIL_TYPES.MANAGER_EMAIL]: {
      subject: `Update on ${taskTitle}`,
      tone:    'professional-direct',
      body:
`${salutation}

I want to flag an issue with ${taskTitle} proactively.

Due to ${reason}, delivery by ${originalDate || 'the original date'} is no longer feasible. ${proposedDate ? `I am targeting ${proposedDate} as the revised completion date.` : 'I am assessing the impact and will share a revised timeline by end of day.'}

I am already taking the following steps to minimise impact: focusing exclusively on the critical path, deferring non-blockers, and keeping stakeholders aligned.

Please let me know if you would like to discuss priorities or adjust scope.

${closing}`,
    },

    [EMAIL_TYPES.TEAMMATE_MESSAGE]: {
      subject: `Heads up — ${taskTitle}`,
      tone:    'casual-professional',
      body:
`Hi${recipientName ? ` ${recipientName}` : ''},

Quick heads up — I'm running into ${reason} today and ${taskTitle} is taking longer than expected.

${proposedDate ? `I'm aiming to have my part done by ${proposedDate}.` : 'Can we quickly sync on adjusted deadlines?'} Let me know if anything on your end is blocked by this and we can figure out the best path forward together.

Thanks for the understanding 🙏

${senderName || 'Me'}`,
    },
  };

  const template = templates[emailType] ?? templates[EMAIL_TYPES.EXTENSION_REQUEST];

  return {
    ...template,
    type: emailType,
    context,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates a full Firefighter Report combining all engine outputs.
 *
 * This is the top-level function for consumers who want everything in one call.
 *
 * @param {object[]} commitments  - Full commitment array.
 * @param {object}   [options]
 * @param {number}   [options.workdayMinutes=480]
 * @param {string}   [options.senderName]  - Used in email draft personalisation.
 * @returns {{ meta: object, emergencyScore: object, recovery: object,
 *             emailDrafts: object[], isActive: boolean }}
 */
export function generateFirefighterReport(commitments, options = {}) {
  const { workdayMinutes = WORKDAY_MINUTES, senderName = '' } = options;

  const emergencyState = detectEmergency(commitments, { workdayMinutes });
  const emergencyScore = generateEmergencyScore(commitments, { workdayMinutes });
  const recovery       = generateRecoveryPlan(commitments, { workdayMinutes });
  const severity       = calculateSeverity(commitments, { workdayMinutes });

  // Pre-generate email drafts for likely scenarios based on commitment types
  const emailDrafts = buildContextualEmailDrafts(recovery.deferList, senderName);

  return {
    meta: {
      generatedAt:   new Date().toISOString(),
      commitmentCount: emergencyState.todayCommitments.length,
      workdayMinutes,
    },
    emergencyScore,
    severity,
    recovery,
    emailDrafts,
    isActive: emergencyState.isEmergency || emergencyState.isWarning,
    triggerReason: emergencyState.isEmergency
      ? `Schedule is ${Math.round(emergencyState.ratio * 100)}% overloaded — ${emergencyState.totalCommittedMinutes} minutes committed vs ${workdayMinutes} available.`
      : emergencyState.isWarning
        ? `Day is ${Math.round(emergencyState.ratio * 100)}% loaded — approaching capacity limits.`
        : 'Day is within normal capacity.',
  };
}

/**
 * Builds an array of pre-generated email drafts based on the defer list.
 * @param {object[]} deferList
 * @param {string}   senderName
 * @returns {object[]}
 */
function buildContextualEmailDrafts(deferList, senderName) {
  const drafts = [];

  deferList.slice(0, 3).forEach(commitment => {
    const title    = commitment.title ?? commitment.name ?? 'the task';
    const type     = (commitment.commitmentType ?? commitment.type ?? '').toLowerCase();
    const source   = (commitment.source ?? '').toLowerCase();

    let emailType = EMAIL_TYPES.EXTENSION_REQUEST;

    if (type.includes('meeting') || title.toLowerCase().includes('meeting')) {
      emailType = EMAIL_TYPES.MEETING_RESCHEDULE;
    } else if (type.includes('interview') || title.toLowerCase().includes('interview')) {
      emailType = EMAIL_TYPES.INTERVIEW_RESCHEDULE;
    } else if (source.includes('gmail') && type.includes('assignment')) {
      emailType = EMAIL_TYPES.ASSIGNMENT_EXTENSION;
    } else if (source.includes('gmail')) {
      emailType = EMAIL_TYPES.MANAGER_EMAIL;
    }

    drafts.push(
      generateEmailDraft(emailType, {
        taskTitle:  title,
        senderName,
        reason:     'an unexpected scheduling conflict today',
      })
    );
  });

  // Always include a generic extension request if no specific drafts were built
  if (drafts.length === 0) {
    drafts.push(
      generateEmailDraft(EMAIL_TYPES.EXTENSION_REQUEST, {
        senderName,
        reason: 'an unexpected scheduling conflict today',
      })
    );
  }

  return drafts;
}
