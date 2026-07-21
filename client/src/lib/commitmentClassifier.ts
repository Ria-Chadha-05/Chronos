/**
 * commitmentClassifier.ts
 *
 * Smart detection: infers CommitmentType from Google Calendar events.
 * Does NOT hardcode special cases. Uses keyword tables and structural signals.
 */

import type {
  CommitmentType,
  OngoingProjectFields,
  WorkWindow,
  ClassifiedCommitment,
} from '../CommitmentTypes';
import {
  DEFAULT_EFFORT_HOURS_PER_DAY,
  DEFAULT_EFFORT_MINUTES_PER_DAY,
  MULTI_DAY_DURATION_THRESHOLD_MINUTES,
} from '../CommitmentTypes';

// ─── Keyword tables ───────────────────────────────────────────────────────────

/**
 * Terms that strongly indicate an ONGOING_PROJECT.
 * When a multi-day event title or description contains these words,
 * classify as ONGOING_PROJECT and prompt the user.
 */
const ONGOING_PROJECT_KEYWORDS = [
  'hackathon',
  'project',
  'prep',
  'preparation',
  'research',
  'study',
  'assignment',
  'course',
  'training',
  'bootcamp',
  'thesis',
  'dissertation',
  'internship',
  'placement',
  'sprint',
  'milestone',
  'development',
  'certification',
  'challenge',
  'practice',
  'revision',
  'reading',
  'learning',
  'school',
  'semester',
  'module',
  'workshop series',
  'program',
  'camp',
];

/**
 * Terms that indicate an ALL_DAY_EVENT (blocks full days).
 */
const ALL_DAY_BLOCK_KEYWORDS = [
  'trip',
  'vacation',
  'holiday',
  'wedding',
  'conference',
  'hospital',
  'travel',
  'tour',
  'retreat',
  'leave',
  'off',
  'away',
  'trek',
  'expedition',
  'surgery',
  'admission',
  'inpatient',
  'cruise',
  'festival',
  'fair',
];

/**
 * Terms that indicate a LIFE_ANCHOR (protected daily routine).
 */
const LIFE_ANCHOR_KEYWORDS = [
  'sleep',
  'wake',
  'breakfast',
  'lunch',
  'dinner',
  'meals',
  'gym',
  'workout',
  'exercise',
  'meditation',
  'prayer',
  'family time',
  'commute',
];

// ─── Structural helpers ───────────────────────────────────────────────────────

/**
 * Returns true when the commitment spans more than one calendar day.
 * Uses the same date-string comparison Google Calendar does.
 */
export function isMultiDayEvent(startISO: string | null, endISO: string | null): boolean {
  if (!startISO || !endISO) return false;

  const start = new Date(startISO);
  const end = new Date(endISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

  // Normalise to midnight so we compare calendar days, not exact times
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  return endDay.getTime() > startDay.getTime();
}

/**
 * Returns the number of calendar days spanned, inclusive of start day.
 */
export function calendarSpanDays(startISO: string | null, endISO: string | null): number {
  if (!startISO || !endISO) return 1;
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function matchesKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

// ─── Core classifier ──────────────────────────────────────────────────────────

export interface CommitmentInput {
  title?: string;
  description?: string;
  notes?: string;
  allDay?: boolean;
  startDateTime?: string | null;
  endDateTime?: string | null;
  durationMinutes?: number;
  duration?: number;
  type?: string;
  flexibility?: string;
  /** Pre-existing commitmentType (if any) — respected for backwards compat. */
  commitmentType?: CommitmentType;
}

/**
 * Classify a commitment into one of the four CommitmentTypes.
 * Only classifies multi-day events as ONGOING_PROJECT or ALL_DAY_EVENT.
 * Single-day events default to TIMED_EVENT or LIFE_ANCHOR.
 */
export function classifyCommitmentType(input: CommitmentInput): CommitmentType {
  // Respect any pre-existing classification
  if (input.commitmentType) return input.commitmentType;

  const text = [input.title, input.description, input.notes].filter(Boolean).join(' ');

  // Life anchors — apply regardless of span
  if (matchesKeyword(text, LIFE_ANCHOR_KEYWORDS)) return 'LIFE_ANCHOR';

  const multiDay = isMultiDayEvent(
    input.startDateTime ?? null,
    input.endDateTime ?? null,
  );

  if (!multiDay) {
    // Single-day: TIMED_EVENT (all-day single-day events are still just timed events
    // that block the day — the engine handles them via the allDay flag)
    return 'TIMED_EVENT';
  }

  // Multi-day: try to infer type from keywords
  if (matchesKeyword(text, ONGOING_PROJECT_KEYWORDS)) return 'ONGOING_PROJECT';
  if (matchesKeyword(text, ALL_DAY_BLOCK_KEYWORDS)) return 'ALL_DAY_EVENT';

  // Multi-day with allDay flag in Google Calendar → ALL_DAY_EVENT
  if (input.allDay) return 'ALL_DAY_EVENT';

  // Multi-day unknown → safer to classify as ONGOING_PROJECT and prompt user
  // because treating it as ALL_DAY_EVENT could falsely block all capacity
  return 'ONGOING_PROJECT';
}

// ─── Effective duration resolver ──────────────────────────────────────────────

/**
 * Resolves the EFFECTIVE duration in minutes that the Capacity Engine
 * should use. This is the single source of truth.
 *
 * Rules:
 *   TIMED_EVENT     → calendar durationMinutes
 *   ALL_DAY_EVENT   → DAY_MINUTES (1440) — marks day unavailable
 *   ONGOING_PROJECT → effortHoursPerDay * 60 (never calendar span)
 *   LIFE_ANCHOR     → calendar durationMinutes (they're real time blocks)
 *
 * Safety: any commitment with raw durationMinutes > 1440 that is not
 * ALL_DAY_EVENT triggers a warning and is capped.
 */
export function resolveEffectiveDuration(
  commitmentType: CommitmentType,
  rawDurationMinutes: number,
  ongoingProject?: Pick<OngoingProjectFields, 'effortHoursPerDay'>,
): number {
  switch (commitmentType) {
    case 'TIMED_EVENT':
    case 'LIFE_ANCHOR': {
      if (rawDurationMinutes > MULTI_DAY_DURATION_THRESHOLD_MINUTES) {
        console.warn(
          '[CommitmentClassifier] Safety: commitment flagged as TIMED_EVENT or LIFE_ANCHOR ' +
          `has durationMinutes=${rawDurationMinutes} which exceeds 24h. ` +
          'Capping at 480 minutes (8h). Review this event.',
          { rawDurationMinutes },
        );
        return 480; // 8 hours is a conservative safe cap
      }
      return rawDurationMinutes;
    }

    case 'ALL_DAY_EVENT':
      return 24 * 60; // 1440 — full day unavailable

    case 'ONGOING_PROJECT': {
      const hoursPerDay = ongoingProject?.effortHoursPerDay ?? DEFAULT_EFFORT_HOURS_PER_DAY;
      const effectiveMinutes = hoursPerDay * 60;

      if (rawDurationMinutes > MULTI_DAY_DURATION_THRESHOLD_MINUTES) {
        console.info(
          '[CommitmentClassifier] ONGOING_PROJECT: ignoring calendar span. ' +
          `Calendar durationMinutes=${rawDurationMinutes}, using effortHoursPerDay=${hoursPerDay} (${effectiveMinutes} min/day).`,
        );
      }

      return effectiveMinutes;
    }
  }
}

// ─── Default ongoing project fields ──────────────────────────────────────────

export function defaultOngoingProjectFields(
  startISO: string | null,
  endISO: string | null,
): OngoingProjectFields {
  return {
    effortHoursPerDay: DEFAULT_EFFORT_HOURS_PER_DAY,
    preferredWorkWindow: 'any' as WorkWindow,
    workDays: [],
    estimatedTotalHours: undefined,
    confirmationStatus: 'pending',
  };
}

// ─── Main enrichment function ─────────────────────────────────────────────────

/**
 * Given any commitment-like object, returns the ClassifiedCommitment fields
 * to merge in. Does not mutate input.
 *
 * Usage in transformer:
 *   const classification = classifyAndEnrich(event);
 *   return { ...transformedEvent, ...classification };
 */
export function classifyAndEnrich(input: CommitmentInput): ClassifiedCommitment {
  const rawDuration = Number(input.durationMinutes ?? input.duration ?? 0);
  const commitmentType = classifyCommitmentType(input);

  const multiDay = isMultiDayEvent(
    input.startDateTime ?? null,
    input.endDateTime ?? null,
  );

  const spanDays = multiDay
    ? calendarSpanDays(input.startDateTime ?? null, input.endDateTime ?? null)
    : undefined;

  // Build ongoingProject fields only for ONGOING_PROJECT
  const ongoingProject: OngoingProjectFields | undefined =
    commitmentType === 'ONGOING_PROJECT'
      ? defaultOngoingProjectFields(input.startDateTime ?? null, input.endDateTime ?? null)
      : undefined;

  const effectiveDurationMinutes = resolveEffectiveDuration(
    commitmentType,
    rawDuration,
    ongoingProject,
  );

  return {
    commitmentType,
    ongoingProject,
    effectiveDurationMinutes,
    isMultiDay: multiDay,
    calendarSpanDays: spanDays,
  };
}

// ─── User confirmation handler ─────────────────────────────────────────────────

export type UserConfirmationChoice =
  | 'blocks_full_days'
  | 'hours_daily'
  | 'flexible'
  | 'ask_later';

/**
 * Applies user's answer about how an ONGOING_PROJECT works.
 * Returns updated ongoingProject fields and possibly a new commitmentType.
 */
export function applyUserConfirmation(
  existing: ClassifiedCommitment,
  choice: UserConfirmationChoice,
  hoursPerDay?: number,
): Partial<ClassifiedCommitment> {
  switch (choice) {
    case 'blocks_full_days':
      return {
        commitmentType: 'ALL_DAY_EVENT',
        ongoingProject: undefined,
        effectiveDurationMinutes: 24 * 60,
      };

    case 'hours_daily': {
      const effort = hoursPerDay ?? DEFAULT_EFFORT_HOURS_PER_DAY;
      const updatedProject: OngoingProjectFields = {
        ...(existing.ongoingProject ?? defaultOngoingProjectFields(null, null)),
        effortHoursPerDay: effort,
        confirmationStatus: 'confirmed_hours_daily',
      };
      return {
        commitmentType: 'ONGOING_PROJECT',
        ongoingProject: updatedProject,
        effectiveDurationMinutes: effort * 60,
      };
    }

    case 'flexible': {
      const updatedProject: OngoingProjectFields = {
        ...(existing.ongoingProject ?? defaultOngoingProjectFields(null, null)),
        effortHoursPerDay: DEFAULT_EFFORT_HOURS_PER_DAY,
        confirmationStatus: 'confirmed_flexible',
      };
      return {
        commitmentType: 'ONGOING_PROJECT',
        ongoingProject: updatedProject,
        effectiveDurationMinutes: DEFAULT_EFFORT_MINUTES_PER_DAY,
      };
    }

    case 'ask_later':
      return {
        ongoingProject: {
          ...(existing.ongoingProject ?? defaultOngoingProjectFields(null, null)),
          confirmationStatus: 'pending',
        },
      };
  }
}

/**
 * Returns true if this commitment should prompt the user for confirmation.
 * Only fires for newly-detected ONGOING_PROJECT events that haven't been confirmed.
 */
export function needsUserConfirmation(commitment: ClassifiedCommitment): boolean {
  return (
    commitment.commitmentType === 'ONGOING_PROJECT' &&
    (commitment.ongoingProject?.confirmationStatus === 'pending' ||
     commitment.ongoingProject?.confirmationStatus === 'auto_inferred')
  );
}
