/**
 * blockerBreakerEngine.js
 *
 * Chronos Blocker Breaker Engine
 *
 * Detects work that is blocked by external dependencies and generates
 * structured analysis, AI-grade suggestions, and professional reminder
 * drafts to help the user unblock their work.
 *
 * ▸ Completely independent of all existing architecture.
 * ▸ Zero imports from existing engines, contexts, or stores.
 * ▸ Pure functions — same input always produces same output.
 * ▸ No external libraries. Plain JavaScript only.
 * ▸ All functions return structured objects with a human-readable `summary`.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Dependency type identifiers */
export const DEPENDENCY_TYPES = {
  PERSON: 'person',
  DOCUMENT: 'document',
  APPROVAL: 'approval',
  PAYMENT: 'payment',
  MEETING: 'meeting',
  INTERVIEW: 'interview',
  REVIEW: 'review',
  API: 'api',
  TEAMMATE: 'teammate',
  DATASET: 'dataset',
  EQUIPMENT: 'equipment',
  DECISION: 'decision',
  FEEDBACK: 'feedback',
};

/** Urgency levels */
export const URGENCY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

/** Recommended actions */
export const ACTIONS = {
  SEND_REMINDER: 'send_reminder',
  ESCALATE: 'escalate',
  ASK_TEAMMATE: 'ask_teammate',
  SPLIT_TASK: 'split_task',
  START_PARALLEL: 'start_parallel',
  PREPARE_PREREQUISITES: 'prepare_prerequisites',
  WAIT: 'wait',
  CANCEL: 'cancel',
  REDUCE_SCOPE: 'reduce_scope',
  SCHEDULE_MEETING: 'schedule_meeting',
  FIND_ALTERNATIVE: 'find_alternative',
};

/** Known contact roles for reminder generation */
export const CONTACT_ROLES = {
  PROFESSOR: 'professor',
  MANAGER: 'manager',
  RECRUITER: 'recruiter',
  CLIENT: 'client',
  TEAMMATE: 'teammate',
  FRIEND: 'friend',
  ORGANIZER: 'organizer',
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Return today's date as a YYYY-MM-DD string.
 * @returns {string}
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Calculate the number of calendar days between two ISO date strings.
 * @param {string} from - Earlier date (ISO string or Date).
 * @param {string} to   - Later date (ISO string or Date). Defaults to today.
 * @returns {number} Positive number of days elapsed.
 */
function daysBetween(from, to = today()) {
  const a = new Date(from);
  const b = new Date(to);
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

/**
 * Derive urgency from days waiting and whether there is a hard deadline.
 * @param {number} waitingDays
 * @param {boolean} hasDeadline
 * @param {number}  daysUntilDeadline
 * @returns {string} URGENCY constant
 */
function deriveUrgency(waitingDays, hasDeadline, daysUntilDeadline) {
  if (hasDeadline && daysUntilDeadline <= 1) return URGENCY.CRITICAL;
  if (hasDeadline && daysUntilDeadline <= 3) return URGENCY.HIGH;
  if (waitingDays >= 7) return URGENCY.HIGH;
  if (waitingDays >= 3) return URGENCY.MEDIUM;
  return URGENCY.LOW;
}

/**
 * Map a free-text description to the most likely dependency type.
 * @param {string} description
 * @returns {string} DEPENDENCY_TYPES constant
 */
function inferDependencyType(description = '') {
  const d = String(description || '').toLowerCase();
  if (/professor|advisor|supervisor|lecturer/.test(d)) return DEPENDENCY_TYPES.APPROVAL;
  if (/recruiter|hr|hiring|offer|interview/.test(d)) return DEPENDENCY_TYPES.INTERVIEW;
  if (/review|code review|pr|pull request/.test(d)) return DEPENDENCY_TYPES.REVIEW;
  if (/teammate|colleague|partner|collaborator/.test(d)) return DEPENDENCY_TYPES.TEAMMATE;
  if (/payment|invoice|billing|finance/.test(d)) return DEPENDENCY_TYPES.PAYMENT;
  if (/document|doc|form|certificate|letter|report/.test(d)) return DEPENDENCY_TYPES.DOCUMENT;
  if (/approval|approve|sign.?off|authorize/.test(d)) return DEPENDENCY_TYPES.APPROVAL;
  if (/meeting|call|sync|standup/.test(d)) return DEPENDENCY_TYPES.MEETING;
  if (/api|service|endpoint|integration/.test(d)) return DEPENDENCY_TYPES.API;
  if (/feedback|response|reply|answer/.test(d)) return DEPENDENCY_TYPES.FEEDBACK;
  if (/dataset|data|access|credential/.test(d)) return DEPENDENCY_TYPES.DATASET;
  if (/decision|decide|choice/.test(d)) return DEPENDENCY_TYPES.DECISION;
  return DEPENDENCY_TYPES.PERSON;
}

/**
 * Infer the contact role from a blocker description or contact name.
 * @param {string} description
 * @returns {string} CONTACT_ROLES constant
 */
function inferContactRole(description = '') {
  const d = String(description || '').toLowerCase();
  if (/professor|advisor|supervisor|lecturer|faculty/.test(d)) return CONTACT_ROLES.PROFESSOR;
  if (/manager|boss|lead|director|vp/.test(d)) return CONTACT_ROLES.MANAGER;
  if (/recruiter|hr|hiring/.test(d)) return CONTACT_ROLES.RECRUITER;
  if (/client|customer|stakeholder/.test(d)) return CONTACT_ROLES.CLIENT;
  if (/teammate|colleague|dev|designer|partner/.test(d)) return CONTACT_ROLES.TEAMMATE;
  if (/organizer|coordinator|admin|event/.test(d)) return CONTACT_ROLES.ORGANIZER;
  return CONTACT_ROLES.FRIEND;
}

/**
 * Build a short human-readable label for a dependency type.
 * @param {string} type
 * @returns {string}
 */
function dependencyTypeLabel(type) {
  const map = {
    [DEPENDENCY_TYPES.PERSON]: 'person',
    [DEPENDENCY_TYPES.DOCUMENT]: 'document',
    [DEPENDENCY_TYPES.APPROVAL]: 'approval',
    [DEPENDENCY_TYPES.PAYMENT]: 'payment',
    [DEPENDENCY_TYPES.MEETING]: 'meeting',
    [DEPENDENCY_TYPES.INTERVIEW]: 'interview result',
    [DEPENDENCY_TYPES.REVIEW]: 'code review',
    [DEPENDENCY_TYPES.API]: 'external API',
    [DEPENDENCY_TYPES.TEAMMATE]: 'teammate response',
    [DEPENDENCY_TYPES.DATASET]: 'dataset / access',
    [DEPENDENCY_TYPES.EQUIPMENT]: 'equipment',
    [DEPENDENCY_TYPES.DECISION]: 'decision',
    [DEPENDENCY_TYPES.FEEDBACK]: 'feedback',
  };
  return map[type] || type;
}

// ─── 1. detectBlockedTasks ────────────────────────────────────────────────────

/**
 * Analyse a list of tasks and identify which ones are currently blocked.
 *
 * A task is considered blocked if:
 *  - Its `status` field is "blocked", "waiting", or "pending_external".
 *  - It has a non-empty `blockedBy` or `waitingFor` field.
 *  - Its `tags` array includes "blocked", "waiting", or "on-hold".
 *  - Its `blockerDescription` field is non-empty.
 *
 * @param {Array<object>} tasks - Array of task objects from the data layer.
 * @param {object}        [options]
 * @param {string}        [options.referenceDate] - ISO date string used as "today" (default: actual today).
 * @returns {{
 *   blockedTasks: Array<object>,
 *   totalBlocked: number,
 *   criticalCount: number,
 *   summary: string,
 *   detectedAt: string
 * }}
 *
 * @example
 * const result = detectBlockedTasks(myTasks);
 * // → { blockedTasks: [...], totalBlocked: 3, criticalCount: 1, summary: "...", detectedAt: "..." }
 */
export function detectBlockedTasks(tasks = [], { referenceDate } = {}) {
  const ref = referenceDate || today();

  const BLOCKED_STATUSES = new Set(['blocked', 'waiting', 'pending_external', 'on_hold']);
  const BLOCKED_TAGS     = new Set(['blocked', 'waiting', 'on-hold', 'pending', 'stuck']);

  const blockedTasks = tasks
    .filter((task) => {
      if (!task || typeof task !== 'object') return false;
      const status = (task.status || '').toLowerCase();
      const tags   = Array.isArray(task.tags) ? task.tags.map((t) => t.toLowerCase()) : [];
      return (
        BLOCKED_STATUSES.has(status) ||
        (task.blockedBy && String(task.blockedBy).trim() !== '') ||
        (task.waitingFor && String(task.waitingFor).trim()) ||
        tags.some((t) => BLOCKED_TAGS.has(t)) ||
        (task.blockerDescription && String(task.blockerDescription).trim() !== '')
      );
    })
    .map((task) => {
      const waitingSince = task.waitingSince || task.blockedSince || task.createdAt || ref;
      const waitingDays  = daysBetween(waitingSince, ref);
      const deadline     = task.deadline || task.dueDate || null;
      const daysUntilDeadline = deadline ? Math.max(0, daysBetween(ref, deadline)) : Infinity;
      const hasDeadline  = deadline !== null;
      const urgency      = deriveUrgency(waitingDays, hasDeadline, daysUntilDeadline);
      const description  = task.blockerDescription || task.waitingFor || task.blockedBy || '';
      const dependencyType = task.dependencyType || inferDependencyType(description);
      const contactRole  = task.contactRole || inferContactRole(description);

      return {
        ...task,
        _blocker: {
          waitingDays,
          urgency,
          dependencyType,
          contactRole,
          description,
          hasDeadline,
          daysUntilDeadline: hasDeadline ? daysUntilDeadline : null,
          deadline,
        },
      };
    })
    .sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return (urgencyOrder[a._blocker.urgency] || 3) - (urgencyOrder[b._blocker.urgency] || 3);
    });

  const criticalCount = blockedTasks.filter((t) => t._blocker.urgency === URGENCY.CRITICAL).length;
  const highCount     = blockedTasks.filter((t) => t._blocker.urgency === URGENCY.HIGH).length;

  let summary = `${blockedTasks.length} blocked task${blockedTasks.length !== 1 ? 's' : ''} detected.`;
  if (criticalCount > 0) summary += ` ${criticalCount} critical.`;
  if (highCount > 0)     summary += ` ${highCount} high priority.`;
  if (blockedTasks.length === 0) summary = 'No blocked tasks detected. All clear! ✅';

  return {
    blockedTasks,
    totalBlocked: blockedTasks.length,
    criticalCount,
    summary,
    detectedAt: new Date().toISOString(),
  };
}

// ─── 2. buildDependencyGraph ──────────────────────────────────────────────────

/**
 * Construct a directed dependency graph from a list of tasks.
 *
 * Each node in the graph represents a task. Each edge represents a dependency
 * relationship between tasks. The graph supports:
 *  - `blockedBy`   — this task cannot start until the dependency resolves.
 *  - `blocking`    — this task is preventing other tasks from starting.
 *  - `waitingFor`  — softer dependency; waiting on an external entity.
 *
 * @param {Array<object>} tasks - Array of task objects.
 * @returns {{
 *   nodes: Array<{id: string, title: string, status: string, urgency: string}>,
 *   edges: Array<{from: string, to: string, type: string, dependencyType: string}>,
 *   criticalPaths: Array<Array<string>>,
 *   blockedChains: Array<Array<string>>,
 *   summary: string
 * }}
 *
 * @example
 * const graph = buildDependencyGraph(tasks);
 * graph.edges.forEach(e => console.log(`${e.from} → ${e.to} (${e.type})`));
 */
export function buildDependencyGraph(tasks = []) {
  const taskMap = new Map(tasks.map((t) => [String(t.id), t]));

  // Build nodes
  const nodes = tasks.map((task) => ({
    id: String(task.id),
    title: task.title || task.name || `Task ${task.id}`,
    status: task.status || 'unknown',
    urgency: task._blocker?.urgency || 'low',
    dependencyType: task._blocker?.dependencyType || task.dependencyType || null,
    isBlocked: Boolean(task.blockedBy || task.waitingFor || task.blockerDescription),
    isBlocking: false, // filled below
    deadline: task.deadline || task.dueDate || null,
    expectedResolutionDate: task.expectedResolutionDate || null,
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build edges
  const edges = [];

  tasks.forEach((task) => {
    const fromId = String(task.id);

    // blockedBy: array of task IDs or external entity strings
    const blockedByList = Array.isArray(task.blockedBy)
      ? task.blockedBy
      : task.blockedBy
        ? [task.blockedBy]
        : [];

    blockedByList.forEach((dep) => {
      const depId = String(dep);
      const depType = taskMap.has(depId)
        ? DEPENDENCY_TYPES.PERSON
        : inferDependencyType(depId);

      edges.push({
        from: depId,
        to: fromId,
        type: 'blockedBy',
        dependencyType: task.dependencyType || depType,
        label: `blocks`,
        expectedResolutionDate: task.expectedResolutionDate || null,
      });

      // Mark the dependency node as blocking
      if (nodeMap.has(depId)) {
        nodeMap.get(depId).isBlocking = true;
      }
    });

    // waitingFor: typically external entities (people, approvals)
    const waitingForList = Array.isArray(task.waitingFor)
      ? task.waitingFor
      : task.waitingFor
        ? [task.waitingFor]
        : [];

    waitingForList.forEach((dep) => {
      const depId = String(dep);
      edges.push({
        from: depId,
        to: fromId,
        type: 'waitingFor',
        dependencyType: inferDependencyType(depId),
        label: 'waiting on',
        expectedResolutionDate: task.expectedResolutionDate || null,
      });
    });
  });

  // Detect blocked chains using DFS
  const adjacency = new Map();
  edges.forEach(({ from, to }) => {
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(to);
  });

  function dfsChain(startId) {
    const visited = new Set();
    const chain   = [];
    const stack   = [startId];
    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      chain.push(current);
      (adjacency.get(current) || []).forEach((next) => stack.push(next));
    }
    return chain;
  }

  // Find chain roots (nodes with no incoming edges)
  const hasIncoming = new Set(edges.map((e) => e.to));
  const roots = [...nodeMap.keys()].filter((id) => !hasIncoming.has(id));

  const blockedChains = roots
    .map((root) => dfsChain(root))
    .filter((chain) => chain.length > 1);

  // Critical paths: chains where the root node is a blocker for a chain with a deadline
  const criticalPaths = blockedChains.filter((chain) => {
    return chain.some((id) => {
      const node = nodeMap.get(id);
      return node?.deadline && new Date(node.deadline) - new Date() < 7 * 86400000;
    });
  });

  const summary = [
    `Dependency graph: ${nodes.length} nodes, ${edges.length} edges.`,
    blockedChains.length > 0
      ? `${blockedChains.length} blocked chain${blockedChains.length > 1 ? 's' : ''} detected.`
      : 'No blocked chains.',
    criticalPaths.length > 0
      ? `${criticalPaths.length} critical path${criticalPaths.length > 1 ? 's' : ''} at risk.`
      : '',
  ].filter(Boolean).join(' ');

  return {
    nodes: [...nodeMap.values()],
    edges,
    blockedChains,
    criticalPaths,
    summary,
  };
}

// ─── 3. calculateBlockSeverity ────────────────────────────────────────────────

/**
 * Calculate the severity of a single blocked task based on multiple signals.
 *
 * Severity score is 0–100. Signals include:
 *  - Days waiting (longer = more severe)
 *  - Days until deadline (shorter = more severe)
 *  - Number of downstream tasks blocked
 *  - Dependency type (approval > feedback > person)
 *  - Whether the blocker is on the critical path
 *
 * @param {object} task              - A task object (ideally enriched by detectBlockedTasks).
 * @param {object} [options]
 * @param {number} [options.downstreamCount=0]    - Number of tasks blocked by this one.
 * @param {boolean} [options.isOnCriticalPath=false] - Whether this task is on a critical path.
 * @returns {{
 *   score: number,
 *   severity: 'critical'|'high'|'medium'|'low',
 *   signals: Array<{label: string, contribution: number}>,
 *   summary: string
 * }}
 *
 * @example
 * const result = calculateBlockSeverity(task, { downstreamCount: 3 });
 * // → { score: 78, severity: 'high', signals: [...], summary: "..." }
 */
export function calculateBlockSeverity(task, { downstreamCount = 0, isOnCriticalPath = false } = {}) {
  const blocker = task._blocker || {};
  const signals = [];
  let score = 0;

  // Signal: days waiting
  const waitingDays = blocker.waitingDays || 0;
  const waitingScore = Math.min(30, waitingDays * 3);
  signals.push({ label: `Waiting ${waitingDays} day${waitingDays !== 1 ? 's' : ''}`, contribution: waitingScore });
  score += waitingScore;

  // Signal: days until deadline
  if (blocker.hasDeadline && blocker.daysUntilDeadline !== null) {
    const deadlineScore = blocker.daysUntilDeadline <= 1
      ? 35
      : blocker.daysUntilDeadline <= 3
        ? 25
        : blocker.daysUntilDeadline <= 7
          ? 15
          : 5;
    signals.push({ label: `${blocker.daysUntilDeadline}d until deadline`, contribution: deadlineScore });
    score += deadlineScore;
  }

  // Signal: downstream tasks
  if (downstreamCount > 0) {
    const downstreamScore = Math.min(20, downstreamCount * 5);
    signals.push({ label: `${downstreamCount} downstream task${downstreamCount !== 1 ? 's' : ''} affected`, contribution: downstreamScore });
    score += downstreamScore;
  }

  // Signal: critical path
  if (isOnCriticalPath) {
    signals.push({ label: 'On critical path', contribution: 15 });
    score += 15;
  }

  // Signal: dependency type weight
  const typeWeights = {
    [DEPENDENCY_TYPES.APPROVAL]: 8,
    [DEPENDENCY_TYPES.INTERVIEW]: 7,
    [DEPENDENCY_TYPES.PAYMENT]: 7,
    [DEPENDENCY_TYPES.REVIEW]: 5,
    [DEPENDENCY_TYPES.DOCUMENT]: 5,
    [DEPENDENCY_TYPES.DECISION]: 6,
    [DEPENDENCY_TYPES.FEEDBACK]: 4,
    [DEPENDENCY_TYPES.TEAMMATE]: 4,
    [DEPENDENCY_TYPES.MEETING]: 3,
    [DEPENDENCY_TYPES.API]: 3,
    [DEPENDENCY_TYPES.DATASET]: 4,
    [DEPENDENCY_TYPES.PERSON]: 3,
    [DEPENDENCY_TYPES.EQUIPMENT]: 2,
  };
  const depType = blocker.dependencyType || DEPENDENCY_TYPES.PERSON;
  const typeScore = typeWeights[depType] || 3;
  signals.push({ label: `Dependency type: ${dependencyTypeLabel(depType)}`, contribution: typeScore });
  score += typeScore;

  score = Math.min(100, Math.round(score));
  const severity = score >= 75 ? URGENCY.CRITICAL : score >= 50 ? URGENCY.HIGH : score >= 25 ? URGENCY.MEDIUM : URGENCY.LOW;

  const summary = `Severity: ${severity} (score ${score}/100). Top factor: ${signals[0]?.label || 'unknown'}.`;

  return { score, severity, signals, summary };
}

// ─── 4. identifyCriticalBlockers ─────────────────────────────────────────────

/**
 * From a set of blocked tasks, identify which blockers are most critical
 * and need immediate attention.
 *
 * A blocker is critical if:
 *  - Its severity score is >= 75, OR
 *  - Its deadline is within 24 hours, OR
 *  - It is blocking 3+ downstream tasks.
 *
 * @param {Array<object>} blockedTasks - Enriched blocked task objects.
 * @param {object} [graph]            - Dependency graph from buildDependencyGraph.
 * @returns {{
 *   criticalBlockers: Array<object>,
 *   urgentBlockers: Array<object>,
 *   totalCritical: number,
 *   topBlocker: object|null,
 *   summary: string
 * }}
 *
 * @example
 * const result = identifyCriticalBlockers(blockedTasks, graph);
 * // → { criticalBlockers: [...], topBlocker: {...}, summary: "..." }
 */
export function identifyCriticalBlockers(blockedTasks = [], graph = null) {
  // Build downstream count map from graph
  const downstreamCounts = new Map();
  if (graph && Array.isArray(graph.edges)) {
    graph.edges.forEach(({ from }) => {
      downstreamCounts.set(from, (downstreamCounts.get(from) || 0) + 1);
    });
  }

  // Critical path set
  const criticalPathIds = new Set(
    (graph?.criticalPaths || []).flat()
  );

  const enriched = blockedTasks.map((task) => {
    const downstream = downstreamCounts.get(String(task.id)) || 0;
    const onCriticalPath = criticalPathIds.has(String(task.id));
    const severityResult = calculateBlockSeverity(task, {
      downstreamCount: downstream,
      isOnCriticalPath: onCriticalPath,
    });
    return { ...task, _severity: severityResult, _downstreamCount: downstream };
  });

  enriched.sort((a, b) => b._severity.score - a._severity.score);

  const criticalBlockers = enriched.filter((t) => t._severity.severity === URGENCY.CRITICAL);
  const urgentBlockers   = enriched.filter((t) => t._severity.severity === URGENCY.HIGH);
  const topBlocker       = enriched[0] || null;

  const summary = criticalBlockers.length > 0
    ? `🚨 ${criticalBlockers.length} critical blocker${criticalBlockers.length !== 1 ? 's' : ''} need immediate action. Top: "${topBlocker?.title || 'Unknown'}".`
    : urgentBlockers.length > 0
      ? `⚠️ ${urgentBlockers.length} high-priority blocker${urgentBlockers.length !== 1 ? 's' : ''} need attention soon.`
      : 'No critical blockers detected. Monitor existing blockers.';

  return { criticalBlockers, urgentBlockers, totalCritical: criticalBlockers.length, topBlocker, summary };
}

// ─── 5. estimateDelayImpact ───────────────────────────────────────────────────

/**
 * Estimate the downstream impact of a blocked task remaining unresolved.
 *
 * Calculates how many other tasks are at risk, how many deadlines are
 * jeopardised, and provides a realistic impact score.
 *
 * @param {object} blockedTask     - A single blocked task (enriched).
 * @param {Array<object>} allTasks - All tasks in the system.
 * @param {object} [graph]         - Dependency graph for downstream traversal.
 * @returns {{
 *   downstreamTaskIds: Array<string>,
 *   downstreamCount: number,
 *   deadlinesAtRisk: Array<{taskId: string, title: string, deadline: string, daysUntil: number}>,
 *   addedRealityGap: number,
 *   capacityImpact: number,
 *   plannerImpact: string,
 *   totalDelayDays: number,
 *   impactScore: number,
 *   summary: string
 * }}
 *
 * @example
 * const impact = estimateDelayImpact(blockedTask, allTasks, graph);
 * // → { downstreamCount: 4, deadlinesAtRisk: [...], impactScore: 65, summary: "..." }
 */
export function estimateDelayImpact(blockedTask, allTasks = [], graph = null) {
  const taskId = String(blockedTask.id);

  // Traverse downstream from this task using the graph
  const adjacency = new Map();
  if (graph && Array.isArray(graph.edges)) {
    graph.edges.forEach(({ from, to }) => {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from).push(to);
    });
  }

  const visited = new Set();
  const queue   = [taskId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    (adjacency.get(current) || []).forEach((next) => queue.push(next));
  }
  visited.delete(taskId); // don't count self

  const downstreamTaskIds = [...visited];
  const taskMap = new Map(allTasks.map((t) => [String(t.id), t]));

  // Deadlines at risk
  const ref = today();
  const deadlinesAtRisk = downstreamTaskIds
    .map((id) => taskMap.get(id))
    .filter((t) => t && (t.deadline || t.dueDate))
    .map((t) => {
      const deadline = t.deadline || t.dueDate;
      return {
        taskId: String(t.id),
        title: t.title || t.name || `Task ${t.id}`,
        deadline,
        daysUntil: Math.max(0, daysBetween(ref, deadline)),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Estimate waiting days already accumulated
  const waitingDays = blockedTask._blocker?.waitingDays || 0;

  // Added reality gap: each blocked task that has a deadline and is at risk
  const addedRealityGap = Math.min(100, deadlinesAtRisk.length * 8 + waitingDays * 2);

  // Capacity impact: hours of work that cannot progress (rough estimate)
  const avgTaskHours = 2;
  const capacityImpact = (downstreamTaskIds.length + 1) * avgTaskHours;

  // Planner impact description
  let plannerImpact = 'Minimal — no scheduled tasks blocked.';
  if (downstreamTaskIds.length >= 5) {
    plannerImpact = 'Severe — 5+ tasks cannot be scheduled until resolved.';
  } else if (downstreamTaskIds.length >= 2) {
    plannerImpact = `Moderate — ${downstreamTaskIds.length} follow-on tasks are stalled.`;
  } else if (downstreamTaskIds.length === 1) {
    plannerImpact = '1 follow-on task is waiting on this blocker.';
  }

  // Total delay estimate: waiting days + expected additional days
  const expectedResolutionDays = blockedTask.expectedResolutionDate
    ? daysBetween(today(), blockedTask.expectedResolutionDate)
    : 3; // conservative default
  const totalDelayDays = waitingDays + expectedResolutionDays;

  // Impact score 0–100
  const impactScore = Math.min(
    100,
    Math.round(
      deadlinesAtRisk.filter((d) => d.daysUntil <= 3).length * 25 +
      downstreamTaskIds.length * 8 +
      waitingDays * 3 +
      (blockedTask._severity?.score || 0) * 0.2
    )
  );

  let summary = `Blocking ${downstreamTaskIds.length} downstream task${downstreamTaskIds.length !== 1 ? 's' : ''}.`;
  if (deadlinesAtRisk.length > 0) {
    summary += ` ${deadlinesAtRisk.length} deadline${deadlinesAtRisk.length !== 1 ? 's' : ''} at risk.`;
  }
  summary += ` Estimated ${totalDelayDays}-day delay if not resolved. Impact score: ${impactScore}/100.`;

  return {
    downstreamTaskIds,
    downstreamCount: downstreamTaskIds.length,
    deadlinesAtRisk,
    addedRealityGap,
    capacityImpact,
    plannerImpact,
    totalDelayDays,
    impactScore,
    summary,
  };
}

// ─── 6. generateUnblockSuggestions ───────────────────────────────────────────

/**
 * Generate a ranked list of recommended actions to unblock a specific task.
 *
 * Recommendations are chosen based on dependency type, days waiting,
 * urgency, and whether parallel work is possible.
 *
 * @param {object} task        - A blocked task object (enriched by detectBlockedTasks).
 * @param {object} [options]
 * @param {Array<object>} [options.allTasks=[]]  - All tasks (to find parallel work candidates).
 * @param {number} [options.downstreamCount=0]   - How many tasks are downstream.
 * @returns {{
 *   suggestions: Array<{
 *     action: string,
 *     label: string,
 *     reasoning: string,
 *     priority: number,
 *     effort: 'low'|'medium'|'high'
 *   }>,
 *   primarySuggestion: object|null,
 *   summary: string
 * }}
 *
 * @example
 * const { suggestions, primarySuggestion } = generateUnblockSuggestions(task);
 * console.log(primarySuggestion.label); // → "Send a reminder"
 */
export function generateUnblockSuggestions(task, { allTasks = [], downstreamCount = 0 } = {}) {
  const blocker = task._blocker || {};
  const urgency = blocker.urgency || URGENCY.LOW;
  const depType = blocker.dependencyType || DEPENDENCY_TYPES.PERSON;
  const waitingDays = blocker.waitingDays || 0;
  const suggestions = [];

  // — Send reminder (relevant when waiting on a person/approval for 2+ days)
  if (
    waitingDays >= 2 &&
    [DEPENDENCY_TYPES.PERSON, DEPENDENCY_TYPES.APPROVAL, DEPENDENCY_TYPES.REVIEW,
     DEPENDENCY_TYPES.FEEDBACK, DEPENDENCY_TYPES.TEAMMATE, DEPENDENCY_TYPES.DOCUMENT].includes(depType)
  ) {
    suggestions.push({
      action: ACTIONS.SEND_REMINDER,
      label: 'Send a polite reminder',
      reasoning: `You have been waiting ${waitingDays} day${waitingDays !== 1 ? 's' : ''}. A gentle follow-up is appropriate and professional.`,
      priority: urgency === URGENCY.CRITICAL ? 1 : 2,
      effort: 'low',
    });
  }

  // — Escalate (relevant when waiting 5+ days or critical urgency)
  if (waitingDays >= 5 || urgency === URGENCY.CRITICAL) {
    suggestions.push({
      action: ACTIONS.ESCALATE,
      label: 'Escalate to a higher authority',
      reasoning: `This blocker has persisted for ${waitingDays} day${waitingDays !== 1 ? 's' : ''} and is ${urgency} priority. Escalating to a supervisor or alternate contact may be necessary.`,
      priority: urgency === URGENCY.CRITICAL ? 2 : 4,
      effort: 'medium',
    });
  }

  // — Ask a teammate (when waiting on colleague / review)
  if ([DEPENDENCY_TYPES.TEAMMATE, DEPENDENCY_TYPES.REVIEW].includes(depType)) {
    suggestions.push({
      action: ACTIONS.ASK_TEAMMATE,
      label: 'Ask another teammate to help',
      reasoning: `If the original person is unavailable, a different teammate may be able to unblock this faster.`,
      priority: 3,
      effort: 'low',
    });
  }

  // — Start parallel work (always useful when there is independent work available)
  const parallelCandidates = allTasks.filter(
    (t) => t.id !== task.id && !t.blockedBy && !t.waitingFor &&
      (t.status === 'todo' || t.status === 'in_progress')
  );
  if (parallelCandidates.length > 0) {
    suggestions.push({
      action: ACTIONS.START_PARALLEL,
      label: 'Start parallel independent work',
      reasoning: `While waiting, you can make progress on other tasks that don't depend on this blocker. ${parallelCandidates.length} candidate task${parallelCandidates.length !== 1 ? 's' : ''} available.`,
      priority: 3,
      effort: 'medium',
    });
  }

  // — Prepare prerequisites (when blocker is document/approval)
  if ([DEPENDENCY_TYPES.DOCUMENT, DEPENDENCY_TYPES.APPROVAL, DEPENDENCY_TYPES.DATASET].includes(depType)) {
    suggestions.push({
      action: ACTIONS.PREPARE_PREREQUISITES,
      label: 'Prepare everything else in advance',
      reasoning: 'Use the waiting time to prepare all prerequisite steps so you can move immediately once the dependency is resolved.',
      priority: 3,
      effort: 'medium',
    });
  }

  // — Split task (when the blocked task is large and only part is blocked)
  if (task.estimatedMinutes && task.estimatedMinutes > 90) {
    suggestions.push({
      action: ACTIONS.SPLIT_TASK,
      label: 'Split: do the unblocked parts now',
      reasoning: 'This task appears large. Consider splitting it into a blocked portion and an independent portion so you can make partial progress.',
      priority: 4,
      effort: 'medium',
    });
  }

  // — Wait (when urgency is low and it just started)
  if (urgency === URGENCY.LOW && waitingDays <= 1) {
    suggestions.push({
      action: ACTIONS.WAIT,
      label: 'Wait — it\'s too early to follow up',
      reasoning: 'You have been waiting less than 2 days. Give the other party a bit more time before following up.',
      priority: 5,
      effort: 'low',
    });
  }

  // — Reduce scope (when deadline is very close and resolution is unlikely)
  if (blocker.hasDeadline && blocker.daysUntilDeadline <= 2 && waitingDays >= 5) {
    suggestions.push({
      action: ACTIONS.REDUCE_SCOPE,
      label: 'Reduce scope or submit partial work',
      reasoning: 'Deadline is very close and the blocker is long-standing. Consider submitting what you have, marking it as "partial", or renegotiating the scope with stakeholders.',
      priority: urgency === URGENCY.CRITICAL ? 1 : 2,
      effort: 'medium',
    });
  }

  // — Schedule a sync meeting (when back-and-forth communication is failing)
  if (waitingDays >= 4 && [DEPENDENCY_TYPES.FEEDBACK, DEPENDENCY_TYPES.DECISION, DEPENDENCY_TYPES.APPROVAL].includes(depType)) {
    suggestions.push({
      action: ACTIONS.SCHEDULE_MEETING,
      label: 'Schedule a quick sync call',
      reasoning: 'Async communication is not resolving this. A 15-minute call or meeting can often unblock what emails cannot.',
      priority: 3,
      effort: 'low',
    });
  }

  // — Cancel (when blocker is stale and task may no longer be needed)
  if (waitingDays >= 14 && urgency === URGENCY.LOW) {
    suggestions.push({
      action: ACTIONS.CANCEL,
      label: 'Consider cancelling or deprioritising',
      reasoning: `This has been waiting ${waitingDays} days with low urgency. It may be worth reassessing whether this work is still needed.`,
      priority: 6,
      effort: 'low',
    });
  }

  // Sort by priority ascending
  suggestions.sort((a, b) => a.priority - b.priority);

  const primarySuggestion = suggestions[0] || null;
  const summary = primarySuggestion
    ? `Recommended action: ${primarySuggestion.label}. ${primarySuggestion.reasoning}`
    : 'No specific suggestions at this time.';

  return { suggestions, primarySuggestion, summary };
}

// ─── 7. generateReminderDraft ─────────────────────────────────────────────────

/**
 * Generate a professional reminder message draft tailored to the contact
 * role and the nature of the blocker.
 *
 * Does NOT send messages. Returns drafts only.
 *
 * @param {object} params
 * @param {string} params.taskTitle       - Title of the blocked task.
 * @param {string} params.contactName     - Name of the person being reminded.
 * @param {string} params.contactRole     - CONTACT_ROLES constant.
 * @param {string} params.blockerDescription - What is being waited on.
 * @param {number} params.waitingDays     - How long the user has been waiting.
 * @param {string} [params.senderName=''] - The user's name (for sign-off).
 * @param {string} [params.deadline='']   - Deadline string for urgency context.
 * @param {string} [params.tone='polite'] - 'polite' | 'direct' | 'urgent'
 * @returns {{
 *   subject: string,
 *   body: string,
 *   tone: string,
 *   contactRole: string,
 *   summary: string
 * }}
 *
 * @example
 * const draft = generateReminderDraft({
 *   taskTitle: 'Research Paper Submission',
 *   contactName: 'Dr. Sharma',
 *   contactRole: 'professor',
 *   blockerDescription: 'dataset access approval',
 *   waitingDays: 5
 * });
 * console.log(draft.body);
 */
export function generateReminderDraft({
  taskTitle       = 'Untitled Task',
  contactName     = 'there',
  contactRole     = CONTACT_ROLES.PERSON,
  blockerDescription = 'your response',
  waitingDays     = 0,
  senderName      = '',
  deadline        = '',
  tone            = 'polite',
}) {
  const greetings = {
    [CONTACT_ROLES.PROFESSOR]:  `Dear Professor ${contactName}`,
    [CONTACT_ROLES.MANAGER]:    `Hi ${contactName}`,
    [CONTACT_ROLES.RECRUITER]:  `Hi ${contactName}`,
    [CONTACT_ROLES.CLIENT]:     `Dear ${contactName}`,
    [CONTACT_ROLES.TEAMMATE]:   `Hey ${contactName}`,
    [CONTACT_ROLES.FRIEND]:     `Hey ${contactName}`,
    [CONTACT_ROLES.ORGANIZER]:  `Hi ${contactName}`,
  };
  const greeting = greetings[contactRole] || `Hi ${contactName}`;

  const waitingStr = waitingDays === 1
    ? 'yesterday'
    : waitingDays > 1
      ? `${waitingDays} days ago`
      : 'recently';

  const deadlineClause = deadline
    ? ` My deadline for this is ${deadline}, so any help before then would be greatly appreciated.`
    : '';

  const signOff = senderName ? `\n\nBest regards,\n${senderName}` : '\n\nThank you';

  // Tone-specific openers
  const toneOpeners = {
    polite: `I hope you're doing well. I wanted to gently follow up on ${blockerDescription} related to "${taskTitle}".`,
    direct: `I'm following up on ${blockerDescription} for "${taskTitle}" which I requested ${waitingStr}.`,
    urgent: `This is an urgent follow-up regarding ${blockerDescription} for "${taskTitle}". I've been waiting ${waitingStr} and the matter is now time-sensitive.`,
  };
  const opener = toneOpeners[tone] || toneOpeners.polite;

  // Role-specific context lines
  const contextLines = {
    [CONTACT_ROLES.PROFESSOR]:
      `I reached out ${waitingStr} and haven't heard back yet. I'd greatly appreciate any update you can share at your convenience.${deadlineClause}`,
    [CONTACT_ROLES.MANAGER]:
      `I wanted to make sure this didn't slip through the cracks. Could you let me know the status at your earliest convenience?${deadlineClause}`,
    [CONTACT_ROLES.RECRUITER]:
      `I remain very interested in the opportunity and would love to hear any updates you can share.${deadlineClause}`,
    [CONTACT_ROLES.CLIENT]:
      `To keep the project moving forward, your input on this point is essential. Please let me know when you have a moment.${deadlineClause}`,
    [CONTACT_ROLES.TEAMMATE]:
      `Just a quick ping — I'm blocked on your end for this one. No rush if you're slammed, but letting me know an ETA would help me plan around it.${deadlineClause}`,
    [CONTACT_ROLES.FRIEND]:
      `No worries if you're busy! Just checking in since I need this to move forward.${deadlineClause}`,
    [CONTACT_ROLES.ORGANIZER]:
      `I wanted to check in on the status of ${blockerDescription}. It would help me prepare accordingly if you could share any updates.${deadlineClause}`,
  };
  const context = contextLines[contactRole] || `I'm awaiting ${blockerDescription} to move forward.${deadlineClause}`;

  const subjects = {
    [CONTACT_ROLES.PROFESSOR]:  `Follow-up: ${taskTitle}`,
    [CONTACT_ROLES.MANAGER]:    `Quick check-in: ${taskTitle}`,
    [CONTACT_ROLES.RECRUITER]:  `Following up on my application / ${taskTitle}`,
    [CONTACT_ROLES.CLIENT]:     `Action needed: ${taskTitle}`,
    [CONTACT_ROLES.TEAMMATE]:   `Ping: ${taskTitle} — need your input`,
    [CONTACT_ROLES.FRIEND]:     `Hey — quick follow-up`,
    [CONTACT_ROLES.ORGANIZER]:  `Follow-up: ${blockerDescription}`,
  };
  const subject = subjects[contactRole] || `Follow-up: ${taskTitle}`;

  const body = `${greeting},\n\n${opener}\n\n${context}${signOff}`;

  return {
    subject,
    body,
    tone,
    contactRole,
    summary: `Reminder draft ready for ${contactRole} "${contactName}" regarding "${taskTitle}". Tone: ${tone}.`,
  };
}

// ─── 8. generateFollowupDraft ─────────────────────────────────────────────────

/**
 * Generate a follow-up message draft for when a prior reminder was sent
 * but not responded to. More assertive than a first reminder.
 *
 * Does NOT send messages. Returns drafts only.
 *
 * @param {object} params
 * @param {string} params.taskTitle         - Title of the blocked task.
 * @param {string} params.contactName       - Name of the person being followed up with.
 * @param {string} params.contactRole       - CONTACT_ROLES constant.
 * @param {string} params.blockerDescription - What is being waited on.
 * @param {number} params.totalWaitingDays  - Total days since the work was blocked.
 * @param {number} [params.remindersSent=1] - How many prior reminders have been sent.
 * @param {string} [params.senderName='']   - The user's name.
 * @param {string} [params.deadline='']     - Deadline string.
 * @returns {{
 *   subject: string,
 *   body: string,
 *   escalationRecommended: boolean,
 *   summary: string
 * }}
 *
 * @example
 * const draft = generateFollowupDraft({
 *   taskTitle: 'Code Review',
 *   contactName: 'Alex',
 *   contactRole: 'teammate',
 *   blockerDescription: 'PR review',
 *   totalWaitingDays: 9,
 *   remindersSent: 2
 * });
 */
export function generateFollowupDraft({
  taskTitle            = 'Untitled Task',
  contactName          = 'there',
  contactRole          = CONTACT_ROLES.TEAMMATE,
  blockerDescription   = 'your response',
  totalWaitingDays     = 0,
  remindersSent        = 1,
  senderName           = '',
  deadline             = '',
}) {
  const escalationRecommended = remindersSent >= 2 || totalWaitingDays >= 10;
  const signOff = senderName ? `\n\nBest,\n${senderName}` : '\n\nThank you';
  const deadlineClause = deadline ? ` My deadline is ${deadline}.` : '';

  const openings = {
    1: `I wanted to follow up once more on ${blockerDescription} for "${taskTitle}". I know you're busy, but this is becoming a blocker for me.`,
    2: `I'm reaching out again about ${blockerDescription} for "${taskTitle}". I've been waiting ${totalWaitingDays} days and this is now impacting my schedule significantly.${deadlineClause}`,
    default: `This is a critical follow-up on ${blockerDescription} for "${taskTitle}". After ${remindersSent} follow-ups and ${totalWaitingDays} days of waiting, I must flag this as an urgent matter.${deadlineClause}`,
  };
  const opening = openings[remindersSent] || openings.default;

  const escalationLine = escalationRecommended
    ? `\n\nIf I don't hear back by end of day, I may need to escalate this to ensure we meet the project timeline.`
    : '';

  const body = `Hi ${contactName},\n\n${opening}${escalationLine}${signOff}`;

  const subject = remindersSent >= 2
    ? `URGENT follow-up: ${taskTitle}`
    : `Following up again: ${taskTitle}`;

  return {
    subject,
    body,
    escalationRecommended,
    summary: `Follow-up draft #${remindersSent + 1} ready. ${escalationRecommended ? 'Escalation recommended.' : 'Firm but professional tone.'}`,
  };
}

// ─── 9. generateBlockerReport ────────────────────────────────────────────────

/**
 * Generate a comprehensive, structured blocker report for a full set of tasks.
 *
 * This is the primary entry point for the Blocker Breaker subsystem.
 * It orchestrates all other functions and returns a unified report.
 *
 * @param {Array<object>} tasks  - All tasks from the data layer.
 * @param {object} [options]
 * @param {string} [options.referenceDate]  - ISO date used as "today".
 * @param {string} [options.userName]       - User's name for draft messages.
 * @returns {{
 *   blockedTasks: Array<object>,
 *   graph: object,
 *   criticalBlockers: object,
 *   delayImpacts: Array<object>,
 *   suggestions: Array<object>,
 *   overallSeverity: 'critical'|'high'|'medium'|'low'|'none',
 *   totalBlockedCount: number,
 *   blockerScore: number,
 *   insights: Array<string>,
 *   summary: string,
 *   generatedAt: string
 * }}
 *
 * @example
 * const report = generateBlockerReport(allTasks, { userName: 'Arjun' });
 * console.log(report.summary);
 * // → "3 blocked tasks detected. 1 critical. Top blocker: Professor approval."
 */
export function generateBlockerReport(tasks = [], { referenceDate, userName = '' } = {}) {
  // Step 1: detect blocked tasks
  const detection = detectBlockedTasks(tasks, { referenceDate });
  const { blockedTasks } = detection;

  if (blockedTasks.length === 0) {
    return {
      blockedTasks: [],
      graph: { nodes: [], edges: [], blockedChains: [], criticalPaths: [] },
      criticalBlockers: { criticalBlockers: [], urgentBlockers: [], totalCritical: 0, topBlocker: null },
      delayImpacts: [],
      suggestions: [],
      overallSeverity: 'none',
      totalBlockedCount: 0,
      blockerScore: 0,
      insights: ['✅ No blocked tasks detected. Your work is flowing freely.'],
      summary: 'No blocked tasks detected. All clear!',
      generatedAt: new Date().toISOString(),
    };
  }

  // Step 2: build dependency graph
  const graph = buildDependencyGraph(tasks);

  // Step 3: identify critical blockers
  const criticalAnalysis = identifyCriticalBlockers(blockedTasks, graph);

  // Step 4: delay impact for top 5 blockers
  const topBlockers = criticalAnalysis.criticalBlockers.length > 0
    ? criticalAnalysis.criticalBlockers.slice(0, 5)
    : blockedTasks.slice(0, 5);

  const delayImpacts = topBlockers.map((task) => ({
    taskId: task.id,
    taskTitle: task.title || task.name || `Task ${task.id}`,
    impact: estimateDelayImpact(task, tasks, graph),
  }));

  // Step 5: generate suggestions for each blocked task (top 5)
  const suggestions = blockedTasks.slice(0, 5).map((task) => ({
    taskId: task.id,
    taskTitle: task.title || task.name || `Task ${task.id}`,
    ...generateUnblockSuggestions(task, { allTasks: tasks }),
  }));

  // Step 6: derive overall severity
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };
  let overallSeverity = 'low';
  if (criticalAnalysis.totalCritical > 0) overallSeverity = 'critical';
  else if (criticalAnalysis.urgentBlockers.length > 0) overallSeverity = 'high';
  else if (blockedTasks.length >= 3) overallSeverity = 'medium';

  // Step 7: derive blocker score (inverse of health — 0 is perfect, 100 is worst)
  const avgSeverityScore = blockedTasks.reduce((sum, t) => {
    return sum + (t._severity?.score || calculateBlockSeverity(t).score);
  }, 0) / Math.max(1, blockedTasks.length);
  const blockerScore = Math.min(100, Math.round(avgSeverityScore * 0.6 + blockedTasks.length * 4));

  // Step 8: assemble human-readable insights
  const insights = [];
  if (detection.criticalCount > 0) {
    insights.push(`🚨 ${detection.criticalCount} critical blocker${detection.criticalCount !== 1 ? 's' : ''} need immediate action.`);
  }
  if (criticalAnalysis.topBlocker) {
    const top = criticalAnalysis.topBlocker;
    const blocker = top._blocker || {};
    insights.push(`⛔ Top blocker: "${top.title || top.name}" — waiting ${blocker.waitingDays || 0} day${blocker.waitingDays !== 1 ? 's' : ''} for ${dependencyTypeLabel(blocker.dependencyType)}.`);
  }
  if (graph.criticalPaths.length > 0) {
    insights.push(`🔗 ${graph.criticalPaths.length} critical path${graph.criticalPaths.length !== 1 ? 's' : ''} affected — deadline chain at risk.`);
  }
  const highImpact = delayImpacts.filter((d) => d.impact.impactScore >= 50);
  if (highImpact.length > 0) {
    insights.push(`📉 ${highImpact.length} blocker${highImpact.length !== 1 ? 's' : ''} with high downstream impact detected.`);
  }
  if (suggestions.length > 0 && suggestions[0].primarySuggestion) {
    insights.push(`💡 Suggested next action: ${suggestions[0].primarySuggestion.label}.`);
  }

  const summary = [
    detection.summary,
    criticalAnalysis.summary,
  ].join(' ');

  return {
    blockedTasks,
    graph,
    criticalBlockers: criticalAnalysis,
    delayImpacts,
    suggestions,
    overallSeverity,
    totalBlockedCount: blockedTasks.length,
    blockerScore,
    insights,
    summary,
    generatedAt: new Date().toISOString(),
  };
}
