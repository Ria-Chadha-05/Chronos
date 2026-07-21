/**
 * CommitmentTypes.ts
 *
 * Core commitment classification model for Chronos.
 * Separates calendar span from human effort — the central distinction
 * that makes the Capacity Engine accurate for multi-day projects.
 */

// ─── Commitment Classification ────────────────────────────────────────────────

/**
 * Four mutually exclusive commitment types.
 *
 * TIMED_EVENT     – Has fixed start/end times. Duration = calendar duration.
 * ALL_DAY_EVENT   – Blocks an entire day. No sub-day scheduling possible.
 * ONGOING_PROJECT – Spans multiple days but only requires a few hours/day.
 *                   NEVER use calendar span for capacity calculation.
 * LIFE_ANCHOR     – Protected routine (sleep, meals, gym).
 *                   Planner and Rescue must never move these.
 */
export type CommitmentType =
  | 'TIMED_EVENT'
  | 'ALL_DAY_EVENT'
  | 'ONGOING_PROJECT'
  | 'LIFE_ANCHOR';

// ─── Preferred work windows for ongoing projects ──────────────────────────────

export type WorkWindow = 'morning' | 'afternoon' | 'evening' | 'any';

export type WorkDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// ─── Confirmation status for user-prompted events ─────────────────────────────

export type ProjectConfirmationStatus =
  | 'confirmed_block_full'   // user said: blocks full days
  | 'confirmed_hours_daily'  // user said: few hours daily (effortHoursPerDay set)
  | 'confirmed_flexible'     // user said: flexible
  | 'pending'                // awaiting user response
  | 'auto_inferred';         // Chronos inferred without prompting (low-confidence)

// ─── Manual task status ───────────────────────────────────────────────────────

export type ManualTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// ─── Ongoing project effort fields ────────────────────────────────────────────

export interface OngoingProjectFields {
  /**
   * Hours per day the user actually works on this project.
   * Used instead of calendar span by Capacity Engine.
   * Default: 2 if not specified (conservative).
   */
  effortHoursPerDay: number;

  /** Preferred time of day for project work sessions. */
  preferredWorkWindow: WorkWindow;

  /**
   * Days of the week to schedule work sessions on.
   * Empty array = every day.
   */
  workDays: WorkDay[];

  /**
   * Total estimated hours to complete the project.
   * Used for progress tracking and deadline awareness.
   * Optional — can be undefined for open-ended commitments.
   */
  estimatedTotalHours?: number;

  /** How the project type was determined. */
  confirmationStatus: ProjectConfirmationStatus;

  // ─── Part 3: Extended project tracking fields ─────────────────────────────

  /**
   * Project deadline (ISO date string, e.g. "2025-07-15").
   * Informs the Planner when distributing sessions across days.
   */
  deadline?: string;

  /**
   * Total effective effort duration in minutes (estimatedTotalHours * 60).
   * Mirrors estimatedTotalHours in minutes for engine consumption.
   */
  effectiveDuration?: number;

  /**
   * Remaining effort in minutes = effectiveDuration * (1 - completionPercentage/100).
   * Recomputed whenever completionPercentage is updated.
   */
  remainingDuration?: number;

  /**
   * Daily focus target in hours.
   * Equivalent to effortHoursPerDay but surfaced separately for UI clarity.
   */
  dailyTarget?: number;

  /**
   * Minimum contiguous focus block in minutes.
   * The Planner will not schedule sessions shorter than this.
   */
  minimumFocusBlock?: number;

  /**
   * Estimated number of sessions to complete the project.
   * Derived: ceil(estimatedTotalHours / effortHoursPerDay).
   */
  estimatedSessions?: number;

  /**
   * User-reported completion percentage (0–100).
   * Drives remainingDuration and progress display in Dashboard.
   */
  completionPercentage?: number;
}

// ─── Extended commitment shape ────────────────────────────────────────────────

/**
 * ClassifiedCommitment extends any existing commitment object with
 * the new type system fields. All existing fields remain unchanged
 * for full backwards compatibility.
 */
export interface ClassifiedCommitment {
  /** The canonical Chronos commitment classification. */
  commitmentType: CommitmentType;

  /**
   * Effort fields — ONLY populated when commitmentType === 'ONGOING_PROJECT'.
   * Must be undefined for all other types to avoid confusion.
   */
  ongoingProject?: OngoingProjectFields;

  /**
   * Effective duration in minutes for Capacity Engine consumption.
   * Computed by resolveEffectiveDuration().
   * This is what ALL downstream engines must use instead of raw durationMinutes.
   */
  effectiveDurationMinutes: number;

  /**
   * Whether this commitment spans multiple calendar days.
   * True when the calendar end date is on a different day than the start date.
   */
  isMultiDay: boolean;

  /**
   * For ONGOING_PROJECT: the full calendar span in days.
   * Informational only — NOT used for capacity.
   */
  calendarSpanDays?: number;
}

// ─── Default effort constants ─────────────────────────────────────────────────

/**
 * Conservative default effort when effortHoursPerDay is missing.
 * 2 hours = 120 minutes.
 */
export const DEFAULT_EFFORT_HOURS_PER_DAY = 2;
export const DEFAULT_EFFORT_MINUTES_PER_DAY = DEFAULT_EFFORT_HOURS_PER_DAY * 60;

/**
 * Safety threshold: any commitment with durationMinutes > this that is NOT
 * an ALL_DAY_EVENT is flagged as suspicious and prevented from blocking capacity.
 * 24 hours = 1440 minutes.
 */
export const MULTI_DAY_DURATION_THRESHOLD_MINUTES = 24 * 60;

/**
 * Default minimum focus block for ongoing projects (30 minutes).
 */
export const DEFAULT_MINIMUM_FOCUS_BLOCK_MINUTES = 30;
