/**
 * PlannerUtils.ts
 *
 * Utilities for the Planner subsystem.
 *
 * Change: enrichCommitments() now forwards commitmentType and ongoingProject
 * from the CapacityCommitment to CategorizedCommitment so rules can act on them.
 */

import type { CapacityCommitment } from '../capacity';
import type { CommitmentCategory, CategorizedCommitment } from './PlannerTypes';

// ─── Fixed commitment keywords ─────────────────────────────────────────────────

const FIXED_KEYWORDS = [
  'exam', 'interview', 'appointment', 'flight', 'surgery', 'visa',
  'court', 'wedding', 'funeral', 'conference', 'meeting', 'presentation',
  'deadline', 'submission', 'test', 'quiz',
];

const FLEXIBLE_KEYWORDS = [
  'gym', 'workout', 'exercise', 'jog', 'run', 'yoga', 'meditation',
  'reading', 'shopping', 'grocery', 'cleaning', 'laundry', 'errands',
  'movie', 'tv', 'netflix', 'leisure', 'relax', 'break',
];

// ─── Categorize a single commitment ──────────────────────────────────────────

export function categorizeCommitment(commitment: CapacityCommitment): CommitmentCategory {
  // LIFE_ANCHOR → always Fixed (most protected)
  if (commitment.commitmentType === 'LIFE_ANCHOR') return 'Fixed';

  const raw = (commitment.title ?? commitment.type ?? '').toLowerCase();
  const source = (commitment as Record<string, unknown>)['source'] as string | undefined;

  if (source === 'google_calendar') {
    if (FIXED_KEYWORDS.some(k => raw.includes(k))) return 'Fixed';
    return 'Important';
  }

  if (FIXED_KEYWORDS.some(k => raw.includes(k))) return 'Fixed';
  if (FLEXIBLE_KEYWORDS.some(k => raw.includes(k))) return 'Flexible';
  return 'Important';
}

// ─── Parse datetime from CapacityCommitment ───────────────────────────────────

export function parseCommitmentStart(c: CapacityCommitment): Date | null {
  const candidates = [
    c.startDateTime,
    typeof c.start === 'string'
      ? c.start
      : (c.start as { dateTime?: string; date?: string } | null)?.dateTime
        ?? (c.start as { dateTime?: string; date?: string } | null)?.date,
    c.date && c.startTime ? `${c.date}T${c.startTime}` : undefined,
    c.date,
  ];

  for (const val of candidates) {
    if (!val) continue;
    const d = new Date(val.includes('T') ? val : `${val}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function parseCommitmentEnd(c: CapacityCommitment): Date | null {
  const candidates = [
    c.endDateTime,
    typeof c.end === 'string'
      ? c.end
      : (c.end as { dateTime?: string; date?: string } | null)?.dateTime
        ?? (c.end as { dateTime?: string; date?: string } | null)?.date,
    c.date && c.endTime ? `${c.date}T${c.endTime}` : undefined,
  ];

  for (const val of candidates) {
    if (!val) continue;
    const d = new Date(val.includes('T') ? val : `${val}T00:00:00`);
    if (!isNaN(d.getTime())) return d;
  }

  const start = parseCommitmentStart(c);
  const dur = c.effectiveDurationMinutes ?? c.durationMinutes ?? c.duration;
  if (start && dur) {
    return new Date(start.getTime() + dur * 60_000);
  }
  return null;
}

// ─── Enrich commitments with category and parsed dates ───────────────────────

export function enrichCommitments(commitments: CapacityCommitment[]): CategorizedCommitment[] {
  return commitments.map(c => ({
    ...c,
    category: categorizeCommitment(c),
    startDate: parseCommitmentStart(c),
    endDate: parseCommitmentEnd(c),
    commitmentType: c.commitmentType ?? 'TIMED_EVENT',
    ongoingProject: c.ongoingProject ?? null,
  }));
}

// ─── Format a Date as a readable time string ──────────────────────────────────

export function formatTime(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Find the largest free block in the day (minutes) ────────────────────────

export function largestFreeBlockMinutes(commitments: CategorizedCommitment[]): number {
  const timed = commitments
    .filter(c => c.startDate && c.endDate)
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());

  const dayStart = 8 * 60;   // 08:00
  const dayEnd = 22 * 60;    // 22:00

  let cursor = dayStart;
  let largest = 0;

  for (const c of timed) {
    const s = c.startDate!.getHours() * 60 + c.startDate!.getMinutes();
    const e = c.endDate!.getHours() * 60 + c.endDate!.getMinutes();
    if (s > cursor) largest = Math.max(largest, s - cursor);
    cursor = Math.max(cursor, e);
  }

  largest = Math.max(largest, dayEnd - cursor);
  return largest;
}

// ─── Generate a unique action id ──────────────────────────────────────────────

let _counter = 0;
export function nextId(): string {
  return `pa_${Date.now()}_${++_counter}`;
}
