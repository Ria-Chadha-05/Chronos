/**
 * BlockerTypes.ts
 *
 * Type definitions for the Blocker Breaker report consumed by Planner,
 * Rescue, Dashboard, and Explanation Engine.
 *
 * These types mirror the output of generateBlockerReport() without
 * importing the Blocker Breaker engine (avoids circular dependencies).
 */

export type BlockerSeverity = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface BlockedTaskInfo {
  id?: string;
  title?: string;
  name?: string;
  _blocker?: {
    waitingDays?: number;
    urgency?: string;
    dependencyType?: string;
    contactRole?: string;
    description?: string;
    hasDeadline?: boolean;
    daysUntilDeadline?: number | null;
    deadline?: string | null;
  };
}

export interface BlockerSuggestion {
  action: string;
  label: string;
  reasoning: string;
  priority: number;
  effort: 'low' | 'medium' | 'high';
}

export interface BlockerTaskSuggestion {
  taskId: string;
  taskTitle: string;
  suggestions: BlockerSuggestion[];
  primarySuggestion: BlockerSuggestion | null;
  summary: string;
}

export interface BlockerReport {
  blockedTasks: BlockedTaskInfo[];
  graph: {
    nodes: unknown[];
    edges: unknown[];
    criticalPaths: string[][];
    blockedChains: string[][];
    summary?: string;
  };
  criticalBlockers: {
    criticalBlockers: BlockedTaskInfo[];
    urgentBlockers: BlockedTaskInfo[];
    totalCritical: number;
    topBlocker: BlockedTaskInfo | null;
    summary?: string;
  };
  delayImpacts: Array<{
    taskId: string;
    taskTitle: string;
    impact: {
      downstreamCount: number;
      impactScore: number;
      summary: string;
    };
  }>;
  suggestions: BlockerTaskSuggestion[];
  overallSeverity: BlockerSeverity;
  totalBlockedCount: number;
  blockerScore: number;
  insights: string[];
  summary: string;
  generatedAt: string;
}

/** Extract blocked task IDs from a report (empty set when no blockers). */
export function getBlockedTaskIds(blockerReport?: BlockerReport | null): Set<string> {
  if (!blockerReport?.totalBlockedCount) return new Set();
  return new Set(
    blockerReport.blockedTasks
      .map(t => t.id)
      .filter((id): id is string => Boolean(id)),
  );
}

/** Empty report shape — used when no blockers are present. */
export const EMPTY_BLOCKER_REPORT: BlockerReport = {
  blockedTasks: [],
  graph: { nodes: [], edges: [], criticalPaths: [], blockedChains: [] },
  criticalBlockers: { criticalBlockers: [], urgentBlockers: [], totalCritical: 0, topBlocker: null },
  delayImpacts: [],
  suggestions: [],
  overallSeverity: 'none',
  totalBlockedCount: 0,
  blockerScore: 0,
  insights: [],
  summary: 'No blocked tasks detected. All clear!',
  generatedAt: '',
};
