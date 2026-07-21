/**
 * capacityUtils.ts
 *
 * Core types and utilities for the Capacity Engine.
 *
 * Key change: CapacityCommitment now includes the new classification fields.
 * normalizeCommitment() reads effectiveDurationMinutes when available,
 * and falls back to raw durationMinutes only for backwards compat.
 */

import type { CommitmentType, OngoingProjectFields } from '../commitmentClassifier';
import { MULTI_DAY_DURATION_THRESHOLD_MINUTES } from '../CommitmentTypes';

export type EnergyLevel = 'excellent' | 'normal' | 'tired';

export type CapacityStatus = 'Peak' | 'Healthy' | 'Busy' | 'High Load' | 'Overloaded';

// ─── CapacityCommitment (extended) ───────────────────────────────────────────

export interface CapacityCommitment {
  id?: string;
  title?: string;
  type?: string;
  source?: string;
  start?: string | { dateTime?: string; date?: string } | null;
  end?: string | { dateTime?: string; date?: string } | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  date?: string;
  startTime?: string;
  endTime?: string;

  /** Raw calendar duration — preserved for backwards compat. DO NOT use in engines. */
  durationMinutes?: number;
  duration?: number;

  allDay?: boolean;

  // ── NEW: Classification fields ─────────────────────────────────────────────

  /**
   * Commitment classification introduced in the architecture refactor.
   * When present, drives how effectiveDurationMinutes is derived.
   */
  commitmentType?: CommitmentType;

  /**
   * The duration that ALL capacity calculations must use.
   * Set by the transformer via resolveEffectiveDuration().
   * When missing (old events), falls back gracefully.
   */
  effectiveDurationMinutes?: number;

  /** Effort fields for ONGOING_PROJECT type. */
  ongoingProject?: OngoingProjectFields | null;

  /** Whether the event spans multiple calendar days. */
  isMultiDay?: boolean;

  /** Full calendar span for ONGOING_PROJECT (informational only). */
  calendarSpanDays?: number;
}

// ─── NormalizedCapacityEvent ──────────────────────────────────────────────────

export interface NormalizedCapacityEvent {
  id: string;
  title: string;
  type: string;
  commitmentType: CommitmentType;
  start: Date | null;
  end: Date | null;
  /**
   * The resolved effective duration used for ALL capacity math.
   * Never the raw calendar span for ONGOING_PROJECT.
   */
  durationMinutes: number;
  allDay: boolean;
  isLifeAnchor: boolean;
  isOngoingProject: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const DAY_MINUTES = 24 * 60;

export const ENERGY_MODIFIERS: Record<EnergyLevel, number> = {
  excellent: 1.1,
  normal: 1.0,
  tired: 0.8,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function parseDateTime(value: CapacityCommitment['start']): Date | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const parsed = new Date(value);
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

function parseLocalDateAndTime(date: string | undefined, time: string | undefined): Date | null {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// ─── Duration resolution ──────────────────────────────────────────────────────

/**
 * Resolves the effective duration for capacity calculation.
 *
 * Priority:
 *   1. commitment.effectiveDurationMinutes (set by transformer — most accurate)
 *   2. Compute from commitmentType rules if available
 *   3. Fall back to explicit durationMinutes/duration
 *   4. Compute from start/end timestamps
 *
 * Safety: single commitment > 24h that is not ALL_DAY_EVENT → warn & cap.
 */
function resolveCapacityDuration(
  commitment: CapacityCommitment,
  start: Date | null,
  end: Date | null,
): number {
  // ── Path 1: use pre-resolved effectiveDurationMinutes from transformer ────
  if (Number.isFinite(commitment.effectiveDurationMinutes) && commitment.effectiveDurationMinutes! >= 0) {
    return commitment.effectiveDurationMinutes!;
  }

  // ── Path 2: apply type rules for legacy events that haven't been re-transformed
  if (commitment.commitmentType) {
    switch (commitment.commitmentType) {
      case 'ALL_DAY_EVENT':
        return DAY_MINUTES;

      case 'ONGOING_PROJECT': {
        const hoursPerDay = commitment.ongoingProject?.effortHoursPerDay ?? 2;
        return hoursPerDay * 60;
      }

      case 'LIFE_ANCHOR':
      case 'TIMED_EVENT':
        // Fall through to explicit / timestamp calculation below
        break;
    }
  }

  // ── Path 3: use explicit durationMinutes ──────────────────────────────────
  const explicitDuration = Number(commitment.durationMinutes ?? commitment.duration);

  if (Number.isFinite(explicitDuration) && explicitDuration >= 0) {
    // Safety check: warn on suspiciously long events that aren't ALL_DAY_EVENT
    if (
      explicitDuration > MULTI_DAY_DURATION_THRESHOLD_MINUTES &&
      commitment.commitmentType !== 'ALL_DAY_EVENT' &&
      !commitment.allDay
    ) {
      console.warn(
        '[CapacityUtils] Safety: commitment has durationMinutes > 24h and is not ALL_DAY_EVENT. ' +
        'Capping at 480 minutes. Re-transform this event to apply proper classification.',
        { id: commitment.id, title: commitment.title, durationMinutes: explicitDuration },
      );
      return 480;
    }
    return explicitDuration;
  }

  // ── Path 4: compute from timestamps ───────────────────────────────────────
  if (start && end) {
    const computed = minutesBetween(start, end);

    if (
      computed > MULTI_DAY_DURATION_THRESHOLD_MINUTES &&
      commitment.commitmentType !== 'ALL_DAY_EVENT' &&
      !commitment.allDay
    ) {
      console.warn(
        '[CapacityUtils] Safety: computed duration from timestamps > 24h. ' +
        'This event spans multiple days but lacks commitmentType. ' +
        'Defaulting to 2h/day until user confirms.',
        { id: commitment.id, title: commitment.title, computedMinutes: computed },
      );
      return 120; // 2 hours safe default
    }

    return computed;
  }

  return 0;
}

// ─── Commitment normalization ─────────────────────────────────────────────────

export function normalizeCommitment(commitment: CapacityCommitment): NormalizedCapacityEvent {
  const start =
    parseDateTime(commitment.startDateTime || null) ||
    parseDateTime(commitment.start || null) ||
    parseLocalDateAndTime(commitment.date, commitment.startTime);

  const end =
    parseDateTime(commitment.endDateTime || null) ||
    parseDateTime(commitment.end || null) ||
    parseLocalDateAndTime(commitment.date, commitment.endTime);

  const durationMinutes = resolveCapacityDuration(commitment, start, end);

  const commitmentType: CommitmentType = commitment.commitmentType ?? 'TIMED_EVENT';

  return {
    id: commitment.id || crypto.randomUUID(),
    title: commitment.title || 'Untitled commitment',
    type: normalizeType(commitment.type || commitment.title || 'default'),
    commitmentType,
    start,
    end,
    durationMinutes,
    allDay: Boolean(commitment.allDay) || commitmentType === 'ALL_DAY_EVENT',
    isLifeAnchor: commitmentType === 'LIFE_ANCHOR',
    isOngoingProject: commitmentType === 'ONGOING_PROJECT',
  };
}

export function normalizeCommitments(commitments: CapacityCommitment[]): NormalizedCapacityEvent[] {
  return commitments.map(normalizeCommitment);
}

// ─── Type normalizer (unchanged) ──────────────────────────────────────────────

export function normalizeType(value: string): string {
  const normalized = value.toLowerCase().replace(/[_-]+/g, ' ');

  if (normalized.includes('exam')) return 'exam';
  if (normalized.includes('interview')) return 'interview';
  if (normalized.includes('coding') || normalized.includes('code')) return 'coding';
  if (normalized.includes('meeting')) return 'meeting';
  if (normalized.includes('lecture')) return 'lecture';
  if (normalized.includes('class')) return 'class';
  if (normalized.includes('study')) return 'study';
  if (normalized.includes('gym') || normalized.includes('workout')) return 'gym';
  if (normalized.includes('travel') || normalized.includes('flight')) return 'travel';
  if (normalized.includes('meal') || normalized.includes('lunch') || normalized.includes('dinner')) return 'meal';
  if (normalized.includes('break')) return 'break';
  if (normalized.includes('sleep')) return 'sleep';

  return normalized.trim() || 'default';
}

export function sortChronologically(events: NormalizedCapacityEvent[]): NormalizedCapacityEvent[] {
  return [...events].sort((a, b) => {
    const aTime = a.start?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.start?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}
