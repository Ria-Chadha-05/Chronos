/**
 * RescueUtils.ts
 *
 * Utility functions for the Rescue subsystem.
 *
 * Change: triageCommitment() now respects commitmentType.
 * LIFE_ANCHOR → always NeverMove.
 * ONGOING_PROJECT → MoveIfNeeded (move the work session, not the project).
 */

import type { CapacityCommitment, CapacityReport } from '../capacity';
import type { RealityGapReport } from '../reality';
import type { ConflictReport } from '../conflicts';
import type { PlannerReport } from '../planner';
import type { BlockerReport } from '../blocker';
import type { RescueTier, RescueSeverity, TriagedCommitment } from './RescueTypes';

// ─── Keyword tables ───────────────────────────────────────────────────────────

const NEVER_MOVE_KEYWORDS = [
  'exam', 'interview', 'flight', 'doctor', 'appointment',
  'surgery', 'visa', 'court', 'anchor', 'funeral', 'wedding',
  'deadline', 'submission', 'presentation', 'conference',
];

const MOVE_IF_NEEDED_KEYWORDS = [
  'assignment', 'coding', 'code', 'study', 'project',
  'meeting', 'review', 'work', 'research', 'task',
  'lecture', 'lab', 'tutorial', 'homework',
];

const MOVE_FIRST_KEYWORDS = [
  'gym', 'workout', 'exercise', 'jog', 'run', 'yoga',
  'reading', 'read', 'shopping', 'grocery', 'cleaning',
  'laundry', 'errands', 'personal', 'leisure', 'meditation',
  'movie', 'tv', 'netflix', 'social', 'hang',
];

// ─── Triage a single commitment ───────────────────────────────────────────────

export function triageCommitment(c: CapacityCommitment): RescueTier {
  // LIFE_ANCHOR → always protected, never moved
  if (c.commitmentType === 'LIFE_ANCHOR') return 'NeverMove';

  // ALL_DAY_EVENT → NeverMove (we can't shrink someone's vacation)
  if (c.commitmentType === 'ALL_DAY_EVENT') return 'NeverMove';

  // ONGOING_PROJECT → MoveIfNeeded: we move the work SESSION not the project
  if (c.commitmentType === 'ONGOING_PROJECT') return 'MoveIfNeeded';

  // Keyword-based triage for TIMED_EVENT and unclassified legacy events
  const raw = (c.title ?? c.type ?? '').toLowerCase();

  if (NEVER_MOVE_KEYWORDS.some(k => raw.includes(k))) return 'NeverMove';
  if (MOVE_FIRST_KEYWORDS.some(k => raw.includes(k))) return 'MoveFirst';
  if (MOVE_IF_NEEDED_KEYWORDS.some(k => raw.includes(k))) return 'MoveIfNeeded';

  const source = (c as Record<string, unknown>)['source'] as string | undefined;
  if (source === 'google_calendar') return 'MoveIfNeeded';

  return 'MoveIfNeeded';
}

// ─── Parse start/end from the CapacityCommitment union shape ─────────────────

export function parseStart(c: CapacityCommitment): Date | null {
  const candidates = [
    c.startDateTime,
    typeof c.start === 'string'
      ? c.start
      : (c.start as { dateTime?: string; date?: string } | null)?.dateTime
        ?? (c.start as { dateTime?: string; date?: string } | null)?.date,
    c.date && c.startTime ? `${c.date}T${c.startTime}` : undefined,
    c.date,
  ];

  for (const v of candidates) {
    if (!v) continue;
    const d = new Date(v.includes('T') ? v : `${v}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function parseEnd(c: CapacityCommitment): Date | null {
  const candidates = [
    c.endDateTime,
    typeof c.end === 'string'
      ? c.end
      : (c.end as { dateTime?: string; date?: string } | null)?.dateTime
        ?? (c.end as { dateTime?: string; date?: string } | null)?.date,
    c.date && c.endTime ? `${c.date}T${c.endTime}` : undefined,
  ];

  for (const v of candidates) {
    if (!v) continue;
    const d = new Date(v.includes('T') ? v : `${v}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }

  const start = parseStart(c);
  // Use effectiveDurationMinutes for end calculation — not raw span
  const dur = c.effectiveDurationMinutes ?? c.durationMinutes ?? c.duration;
  if (start && dur) return new Date(start.getTime() + dur * 60_000);
  return null;
}

// ─── Enrich commitment list with triage tier and parsed dates ─────────────────

export function triageAll(commitments: CapacityCommitment[]): TriagedCommitment[] {
  return commitments.map(c => ({
    ...c,
    tier: triageCommitment(c),
    startDate: parseStart(c),
    endDate: parseEnd(c),
    commitmentType: c.commitmentType ?? 'TIMED_EVENT',
    ongoingProject: c.ongoingProject ?? null,
  }));
}

// ─── Determine rescue severity from all reports ───────────────────────────────

export function computeRescueSeverity(
  capacityReport: CapacityReport,
  realityGapReport: RealityGapReport,
  conflictReport: ConflictReport,
  plannerReport: PlannerReport,
): RescueSeverity {
  let level = 0;

  if (capacityReport.score < 20)              level = Math.max(level, 3);
  else if (capacityReport.score < 35)         level = Math.max(level, 2);
  else if (capacityReport.score < 55)         level = Math.max(level, 1);

  if (realityGapReport.severity === 'High')   level = Math.max(level, 2);
  else if (realityGapReport.severity === 'Medium') level = Math.max(level, 1);

  if (conflictReport.highSeverity > 1)        level = Math.max(level, 3);
  else if (conflictReport.highSeverity > 0)   level = Math.max(level, 2);
  else if (conflictReport.mediumSeverity > 0) level = Math.max(level, 1);

  if (plannerReport.score < 40)               level = Math.max(level, 3);
  else if (plannerReport.score < 60)          level = Math.max(level, 2);

  const map: RescueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
  return map[level];
}

// ─── Decide whether rescue mode should activate ───────────────────────────────

export function shouldActivate(
  capacityReport: CapacityReport,
  realityGapReport: RealityGapReport,
  conflictReport: ConflictReport,
  plannerReport: PlannerReport,
  blockerReport?: BlockerReport,
): boolean {
  const blockerCritical = blockerReport?.totalBlockedCount
    ? blockerReport.overallSeverity === 'critical'
    : false;

  return (
    capacityReport.score < 35 ||
    realityGapReport.severity === 'High' ||
    conflictReport.highSeverity > 0 ||
    plannerReport.score < 60 ||
    blockerCritical
  );
}

// ─── Estimate stress reduction ────────────────────────────────────────────────

export function estimateStressReduction(
  moveFirstCount: number,
  moveIfNeededCount: number,
  breaksInserted: number,
  severity: RescueSeverity,
): number {
  const base = moveFirstCount * 6 + moveIfNeededCount * 9 + breaksInserted * 5;
  const severityBoost: Record<RescueSeverity, number> = {
    Low: 0, Medium: 4, High: 8, Critical: 12,
  };
  return Math.min(60, base + severityBoost[severity]);
}

// ─── Format time helper ───────────────────────────────────────────────────────

export function formatTime(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Unique ID generator ──────────────────────────────────────────────────────

let _seq = 0;
export function nextRescueId(): string {
  return `ra_${Date.now()}_${++_seq}`;
}
