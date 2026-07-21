/**
 * commitmentTransformer.js
 *
 * Transforms raw Google Calendar events, manual tasks, Gmail emails, and
 * ongoing projects into Chronos commitment objects.
 *
 * All transformers call classifyAndEnrich() which adds:
 *   - commitmentType (TIMED_EVENT | ALL_DAY_EVENT | ONGOING_PROJECT | LIFE_ANCHOR)
 *   - effectiveDurationMinutes (what Capacity Engine must use)
 *   - ongoingProject (effort fields for multi-day projects)
 *   - isMultiDay / calendarSpanDays
 */

import { classifyAndEnrich } from './commitmentClassifier';

// ─── Utility helpers ──────────────────────────────────────────────────────────

function cloneSerializable(value) {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}

function parseGoogleDateTime(value) {
  if (!value) return null;
  if (value.dateTime) {
    const date = new Date(value.dateTime);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value.date) {
    const date = new Date(`${value.date}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatTime(date, allDay, isEnd = false) {
  if (!date) return '';
  if (allDay) return isEnd ? '23:59' : '00:00';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDurationMinutes(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
}

function getManualId(task) {
  if (task?.id) {
    return String(task.id).startsWith('manual:') ? task.id : `manual:${task.id}`;
  }
  return `manual:${crypto.randomUUID()}`;
}

function getProjectId(project) {
  if (project?.id) {
    return String(project.id).startsWith('project:') ? project.id : `project:${project.id}`;
  }
  return `project:${crypto.randomUUID()}`;
}

function getLocalTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
}

function parseManualDateTime(date, time) {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addMinutes(date, minutes) {
  if (!date || !Number.isFinite(minutes)) return null;
  return new Date(date.getTime() + minutes * 60000);
}

function buildManualMetadata(task) {
  return {
    id: task.id || null,
    deadline: task.deadline || null,
    estimatedDuration: task.estimatedDuration || null,
    effortLevel: task.effortLevel || null,
    raw: cloneSerializable(task),
  };
}

// ─── Month name table ──────────────────────────────────────────────────────────

const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// ─── Gmail classification rules (extended) ────────────────────────────────────

const GMAIL_COMMITMENT_RULES = [
  {
    kind: 'interview',
    type: 'email_interview',
    titlePrefix: 'Interview',
    priority: 'high',
    flexibility: 'fixed',
    durationMinutes: 60,
    confidence: 0.92,
    pattern: /\b(interview|technical round|phone screen|onsite|recruiter call|hiring manager|coding round|hr round)\b/i,
  },
  {
    kind: 'exam',
    type: 'email_exam',
    titlePrefix: 'Exam',
    priority: 'high',
    flexibility: 'fixed',
    durationMinutes: 120,
    confidence: 0.95,
    pattern: /\b(exam|assessment|test|quiz|midterm|final|end-term|end term|proctored)\b/i,
  },
  {
    kind: 'meeting',
    type: 'email_meeting',
    titlePrefix: 'Meeting',
    priority: 'medium',
    flexibility: 'fixed',
    durationMinutes: 60,
    confidence: 0.85,
    pattern: /\b(meeting|calendar invite|invitation|webinar|conference call|zoom|google meet|teams meeting|video call|sync)\b/i,
  },
  {
    kind: 'hackathon',
    type: 'email_hackathon',
    titlePrefix: 'Hackathon',
    priority: 'high',
    flexibility: 'fixed',
    durationMinutes: 1440,
    confidence: 0.90,
    pattern: /\b(hackathon|hack day|buildathon|code sprint|datathon|ideathon|hackfest)\b/i,
  },
  {
    kind: 'assignment',
    type: 'email_assignment',
    titlePrefix: 'Assignment',
    priority: 'high',
    flexibility: 'fixed',
    durationMinutes: 0,
    confidence: 0.88,
    pattern: /\b(assignment|homework|lab submission|project submission|coursework|graded|submit your|due on|due date)\b/i,
  },
  {
    kind: 'bill',
    type: 'email_bill',
    titlePrefix: 'Bill Due',
    priority: 'high',
    flexibility: 'fixed',
    durationMinutes: 0,
    confidence: 0.82,
    pattern: /\b(bill due|payment due|invoice due|emi due|rent due|electricity bill|utility bill|credit card due|minimum payment|auto-debit|standing instruction)\b/i,
  },
  {
    kind: 'booking',
    type: 'email_booking',
    titlePrefix: 'Booking',
    priority: 'medium',
    flexibility: 'fixed',
    durationMinutes: 0,
    confidence: 0.80,
    pattern: /\b(booking confirmed|reservation confirmed|your booking|order confirmed|ticket confirmed|purchase confirmed)\b/i,
  },
  {
    kind: 'registration',
    type: 'email_registration',
    titlePrefix: 'Registration',
    priority: 'medium',
    flexibility: 'fixed',
    durationMinutes: 0,
    confidence: 0.78,
    pattern: /\b(registration confirmed|you are registered|registration deadline|last date to register|enroll by|enrollment deadline|application deadline)\b/i,
  },
  {
    kind: 'appointment',
    type: 'email_appointment',
    titlePrefix: 'Appointment',
    priority: 'medium',
    flexibility: 'fixed',
    durationMinutes: 60,
    confidence: 0.87,
    pattern: /\b(appointment|consultation|confirmed for|scheduled for|your appointment|doctor|dentist|clinic)\b/i,
  },
  {
    kind: 'flight',
    type: 'email_flight',
    titlePrefix: 'Flight',
    priority: 'high',
    flexibility: 'fixed',
    durationMinutes: 180,
    confidence: 0.93,
    pattern: /\b(flight|boarding pass|departure|itinerary|pnr|booking reference|check-in online|web check-in)\b/i,
  },
  {
    kind: 'hotel',
    type: 'email_hotel',
    titlePrefix: 'Hotel',
    priority: 'medium',
    flexibility: 'fixed',
    durationMinutes: 0,
    confidence: 0.82,
    pattern: /\b(hotel|reservation|check-in|check in|check-out|check out|room confirmed|stay confirmed)\b/i,
  },
  {
    kind: 'event',
    type: 'email_event',
    titlePrefix: 'Event',
    priority: 'medium',
    flexibility: 'fixed',
    durationMinutes: 90,
    confidence: 0.75,
    pattern: /\b(event registration|you're registered|ticket|workshop|seminar|orientation|fest|competition|symposium|conference)\b/i,
  },
  {
    kind: 'deadline',
    type: 'email_deadline',
    titlePrefix: 'Deadline',
    priority: 'high',
    flexibility: 'fixed',
    durationMinutes: 0,
    confidence: 0.85,
    pattern: /\b(deadline|due date|due by|submit by|submission closes|application due|expires on|last chance|closing date)\b/i,
  },
  {
    kind: 'reminder',
    type: 'email_reminder',
    titlePrefix: 'Reminder',
    priority: 'medium',
    flexibility: 'fixed',
    durationMinutes: 30,
    confidence: 0.65,
    pattern: /\b(reminder|don't forget|do not forget|upcoming|action required|response needed)\b/i,
  },
];

const PROMOTIONAL_EMAIL_PATTERN = /\b(unsubscribe|sale|discount|coupon|deal|offer|limited time|newsletter|marketing|promo|promotion|shop now|buy now)\b/i;

// ─── Gmail helpers ─────────────────────────────────────────────────────────────

function buildGmailMetadata(email, classification, parsedTiming) {
  return {
    id: email.id || null,
    threadId: email.threadId || null,
    historyId: email.historyId || null,
    labelIds: cloneSerializable(email.labelIds || []),
    from: email.from || '',
    to: email.to || '',
    subject: email.subject || '',
    dateHeader: email.dateHeader || '',
    internalDate: email.internalDate || null,
    snippet: email.snippet || '',
    classification: classification?.kind || null,
    confidence: classification?.confidence || null,
    parsedTiming: cloneSerializable(parsedTiming || null),
    raw: cloneSerializable(email.raw || null),
  };
}

function buildGoogleMetadata(event) {
  return {
    id: event.id || null,
    etag: event.etag || null,
    status: event.status || null,
    htmlLink: event.htmlLink || null,
    iCalUID: event.iCalUID || null,
    created: event.created || null,
    updated: event.updated || null,
    creator: cloneSerializable(event.creator || null),
    organizer: cloneSerializable(event.organizer || null),
    attendees: cloneSerializable(event.attendees || []),
    location: event.location || '',
    colorId: event.colorId || null,
    transparency: event.transparency || null,
    visibility: event.visibility || null,
    eventType: event.eventType || null,
    hangoutLink: event.hangoutLink || null,
    conferenceData: cloneSerializable(event.conferenceData || null),
    reminders: cloneSerializable(event.reminders || null),
    recurringEventId: event.recurringEventId || null,
    originalStartTime: cloneSerializable(event.originalStartTime || null),
    recurrence: cloneSerializable(event.recurrence || []),
    sequence: event.sequence ?? null,
    raw: cloneSerializable(event),
  };
}

function cleanEmailSubject(subject = '') {
  return subject
    .replace(/^\s*(re|fw|fwd):\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function emailText(email) {
  return [email.subject, email.snippet, email.bodyText].filter(Boolean).join('\n');
}

function isPromotionalEmail(email) {
  const labels = email.labelIds || [];
  if (labels.includes('CATEGORY_PROMOTIONS') || labels.includes('CATEGORY_SOCIAL')) return true;
  const text = emailText(email);
  return PROMOTIONAL_EMAIL_PATTERN.test(text) && !GMAIL_COMMITMENT_RULES.some(rule => rule.pattern.test(text));
}

function classifyGmailEmail(email) {
  if (!email?.id || isPromotionalEmail(email)) return null;
  const text = emailText(email);
  return GMAIL_COMMITMENT_RULES.find(rule => rule.pattern.test(text)) || null;
}

/**
 * Extract location from email body text.
 * Looks for explicit "Venue:", "Location:", "Where:" patterns and known
 * platform names (Zoom, Teams, Google Meet, etc.).
 */
function extractLocationFromEmail(email) {
  const text = emailText(email);

  // Explicit label patterns
  const labelMatch = text.match(/\b(?:venue|location|where|place|address)\s*[:\-]\s*([^\n,]{5,80})/i);
  if (labelMatch) return labelMatch[1].trim();

  // Virtual meeting platforms
  if (/zoom\.us\/j\/\d+/i.test(text)) return 'Zoom (virtual)';
  if (/teams\.microsoft\.com/i.test(text)) return 'Microsoft Teams (virtual)';
  if (/meet\.google\.com/i.test(text)) return 'Google Meet (virtual)';
  if (/\bjoin zoom\b/i.test(text)) return 'Zoom (virtual)';
  if (/\bgoogle meet\b/i.test(text)) return 'Google Meet (virtual)';
  if (/\bms teams\b|\bteams meeting\b/i.test(text)) return 'Microsoft Teams (virtual)';
  if (/\bwebex\b/i.test(text)) return 'Webex (virtual)';
  if (/\bdiscord\b/i.test(text)) return 'Discord (virtual)';

  return '';
}

function normalizeYear(year) {
  if (!year) return { year: new Date().getFullYear(), explicit: false };
  const numeric = Number(year);
  return { year: numeric < 100 ? 2000 + numeric : numeric, explicit: true };
}

function makeFutureLeaningDate(yearInfo, month, day) {
  const { year, explicit } = typeof yearInfo === 'object' ? yearInfo : { year: yearInfo, explicit: true };
  const date = new Date(year, month, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today && !explicit) {
    date.setFullYear(date.getFullYear() + 1);
  }
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateFromText(text) {
  const iso = text.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) {
    return makeFutureLeaningDate({ year: Number(iso[1]), explicit: true }, Number(iso[2]) - 1, Number(iso[3]));
  }

  const numeric = text.match(/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/(\d{2,4})\b/);
  if (numeric) {
    return makeFutureLeaningDate(normalizeYear(numeric[3]), Number(numeric[1]) - 1, Number(numeric[2]));
  }

  const monthFirst = text.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+([0-3]?\d)(?:st|nd|rd|th)?(?:,\s*(\d{2,4}))?\b/i);
  if (monthFirst) {
    return makeFutureLeaningDate(normalizeYear(monthFirst[3]), MONTHS[monthFirst[1].toLowerCase()], Number(monthFirst[2]));
  }

  const dayFirst = text.match(/\b([0-3]?\d)(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)(?:,?\s*(\d{2,4}))?\b/i);
  if (dayFirst) {
    return makeFutureLeaningDate(normalizeYear(dayFirst[3]), MONTHS[dayFirst[2].toLowerCase()], Number(dayFirst[1]));
  }

  return null;
}

function parseTimeMatch(match) {
  if (!match) return null;
  let hour = Number(match[1] || match[4]);
  const minute = Number(match[2] || 0);
  const meridiem = (match[3] || match[5])?.toLowerCase();
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function setTime(date, time) {
  if (!date || !time) return null;
  const next = new Date(date);
  next.setHours(time.hour, time.minute, 0, 0);
  return next;
}

function parseTimingFromEmail(email, classification) {
  const text = emailText(email);
  const date = parseDateFromText(text);
  if (!date) return null;

  const timePattern = /\b([01]?\d|2[0-3]):([0-5]\d)\s*(am|pm)?\b|\b([1-9]|1[0-2])\s*(am|pm)\b/ig;
  const times = Array.from(text.matchAll(timePattern))
    .map(parseTimeMatch)
    .filter(Boolean);

  const hasTime = times.length > 0 && classification.kind !== 'deadline';
  const allDay = !hasTime || classification.durationMinutes === 0;
  const startDate = hasTime ? setTime(date, times[0]) : date;
  const endDate = hasTime && times[1]
    ? setTime(date, times[1])
    : addMinutes(startDate, classification.durationMinutes);

  return {
    date,
    startDate,
    endDate,
    allDay,
    startTime: allDay ? '00:00' : formatTime(startDate, false),
    endTime: allDay ? '23:59' : formatTime(endDate, false, true),
    durationMinutes: allDay ? classification.durationMinutes : getDurationMinutes(startDate, endDate),
  };
}

// ─── Gmail deduplication ───────────────────────────────────────────────────────

/**
 * Check if a Gmail-derived commitment is a duplicate of an existing one.
 * Deduplicates by:
 *   1. Exact Gmail source ID match.
 *   2. Same title prefix + same date (fuzzy duplicate).
 */
export function isGmailDuplicate(newCommitment, existingCommitments) {
  if (!newCommitment?.id) return false;

  // 1. Exact Gmail ID match
  const exactId = existingCommitments.some(c => c.id === newCommitment.id);
  if (exactId) return true;

  // 2. Fuzzy: same source metadata Gmail ID (different prefix format)
  const newGmailId = newCommitment.sourceMetadata?.gmail?.id;
  if (newGmailId) {
    const gmailIdMatch = existingCommitments.some(
      c => c.sourceMetadata?.gmail?.id === newGmailId,
    );
    if (gmailIdMatch) return true;
  }

  // 3. Same title (case-insensitive) + same date
  const newTitle = (newCommitment.title || '').toLowerCase().trim();
  const newDate = newCommitment.date;
  if (newTitle && newDate) {
    const titleDateMatch = existingCommitments.some(c => {
      if (c.source !== 'gmail') return false;
      return (
        (c.title || '').toLowerCase().trim() === newTitle &&
        c.date === newDate
      );
    });
    if (titleDateMatch) return true;
  }

  return false;
}

/**
 * Filter out duplicate Gmail commitments from a batch.
 * Preserves order; later duplicates are dropped.
 */
export function deduplicateGmailCommitments(incoming, existing = []) {
  const seen = new Set(existing.map(c => c.id));
  const result = [];

  for (const commitment of incoming) {
    if (!commitment) continue;
    if (seen.has(commitment.id)) continue;
    if (isGmailDuplicate(commitment, existing)) continue;
    seen.add(commitment.id);
    result.push(commitment);
  }

  return result;
}

// ─── Transformer: Google Calendar event ──────────────────────────────────────

export function transformCalendarEvent(event) {
  const rawEvent = cloneSerializable(event || {});
  const allDay = Boolean(rawEvent.start?.date);
  const cancelled = rawEvent.status === 'cancelled';
  const startDate = parseGoogleDateTime(rawEvent.start || rawEvent.originalStartTime);
  const endDate = parseGoogleDateTime(rawEvent.end);
  const durationMinutes = getDurationMinutes(startDate, endDate);
  const title = rawEvent.summary || (cancelled ? 'Cancelled calendar event' : 'Untitled calendar event');

  const startDateTime = startDate ? startDate.toISOString() : null;
  const endDateTime = endDate ? endDate.toISOString() : null;

  const classification = classifyAndEnrich({
    title,
    description: rawEvent.description || '',
    notes: rawEvent.description || '',
    allDay,
    startDateTime,
    endDateTime,
    durationMinutes,
  });

  return {
    id: `google-calendar:${rawEvent.id || rawEvent.iCalUID || crypto.randomUUID()}`,
    source: 'google_calendar',
    sourceId: rawEvent.id || null,
    sourceCalendarId: 'primary',
    sourceEtag: rawEvent.etag || null,
    type: 'calendar_event',
    title,
    notes: rawEvent.description || '',
    description: rawEvent.description || '',
    location: rawEvent.location || '',
    status: rawEvent.status || 'confirmed',
    cancelled,
    allDay,
    start: rawEvent.start ? cloneSerializable(rawEvent.start) : null,
    end: rawEvent.end ? cloneSerializable(rawEvent.end) : null,
    startDateTime,
    endDateTime,
    date: formatDate(startDate),
    startTime: formatTime(startDate, allDay),
    endTime: formatTime(endDate, allDay, true),
    durationMinutes,
    duration: durationMinutes,
    commitmentType: classification.commitmentType,
    effectiveDurationMinutes: classification.effectiveDurationMinutes,
    isMultiDay: classification.isMultiDay,
    calendarSpanDays: classification.calendarSpanDays,
    ongoingProject: classification.ongoingProject ?? null,
    timezone: rawEvent.start?.timeZone || rawEvent.end?.timeZone || null,
    flexibility: 'fixed',
    priority: cancelled ? 'low' : 'medium',
    energyLoad: 'medium',
    isRecurring: Boolean(rawEvent.recurringEventId || rawEvent.recurrence?.length),
    recurringEventId: rawEvent.recurringEventId || null,
    originalStartTime: rawEvent.originalStartTime ? cloneSerializable(rawEvent.originalStartTime) : null,
    recurrence: cloneSerializable(rawEvent.recurrence || []),
    createdAt: rawEvent.created || null,
    updatedAt: rawEvent.updated || null,
    sourceMetadata: { googleCalendar: buildGoogleMetadata(rawEvent) },
  };
}

export function transformCalendarEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.map(transformCalendarEvent);
}

// ─── Transformer: Manual task (Part 1) ───────────────────────────────────────
//
// Accepts all user-facing manual task fields:
//   title, description, priority, deadline, estimatedDuration,
//   flexibility, effortLevel, status
// and maps them onto the canonical Commitment model.

export function transformManualTask(task, options = {}) {
  const rawTask = cloneSerializable(task || {});
  const date = rawTask.date || options.date || formatDate(new Date());
  const startTime = rawTask.startTime || '';

  // estimatedDuration is the user-supplied estimate; use it as the scheduling
  // duration when no explicit start/end time is given.
  const estimatedDuration = Number(rawTask.estimatedDuration ?? rawTask.durationMinutes ?? rawTask.duration ?? 60);
  const durationMinutes = estimatedDuration;

  const startDate = parseManualDateTime(date, startTime);
  const providedEndDate = parseManualDateTime(date, rawTask.endTime);
  const endDate = providedEndDate || addMinutes(startDate, durationMinutes);
  const normalizedDuration = getDurationMinutes(startDate, endDate) || durationMinutes;
  const now = new Date().toISOString();

  const startDateTime = startDate ? startDate.toISOString() : null;
  const endDateTime = endDate ? endDate.toISOString() : null;

  // effortLevel → energyLoad mapping
  const effortToEnergyMap = { high: 'deep', medium: 'medium', low: 'light', deep: 'deep', light: 'light' };
  const energyLoad = effortToEnergyMap[rawTask.effortLevel] || rawTask.energyLoad || 'medium';

  // status normalisation — the model uses 'confirmed' / 'completed' / 'cancelled'
  // for backwards compat with downstream engines; we also preserve the richer
  // manual status ('pending', 'in_progress') in sourceMetadata.
  const manualStatus = rawTask.status || 'pending';
  const modelStatus = manualStatus === 'completed' ? 'completed'
    : manualStatus === 'cancelled' ? 'cancelled'
    : 'confirmed';

  const classification = classifyAndEnrich({
    title: rawTask.title || 'Untitled task',
    description: rawTask.description || rawTask.notes || '',
    allDay: Boolean(rawTask.allDay),
    startDateTime,
    endDateTime,
    durationMinutes: normalizedDuration,
    commitmentType: rawTask.commitmentType,
  });

  return {
    // ── Identity ──────────────────────────────────────────────────────────────
    id: getManualId(rawTask),
    source: 'manual',
    sourceId: rawTask.id || null,
    sourceCalendarId: null,
    sourceEtag: null,

    // ── Content ───────────────────────────────────────────────────────────────
    type: 'manual_task',
    title: rawTask.title || 'Untitled task',
    description: rawTask.description || rawTask.notes || '',
    notes: rawTask.description || rawTask.notes || '',
    location: rawTask.location || '',

    // ── Status (backwards-compat model status + rich manual status) ───────────
    status: modelStatus,
    manualStatus,           // 'pending' | 'in_progress' | 'completed' | 'cancelled'
    cancelled: manualStatus === 'cancelled',

    // ── Timing ───────────────────────────────────────────────────────────────
    allDay: Boolean(rawTask.allDay),
    start: startDate ? { dateTime: startDate.toISOString(), timeZone: getLocalTimezone() } : null,
    end: endDate ? { dateTime: endDate.toISOString(), timeZone: getLocalTimezone() } : null,
    startDateTime,
    endDateTime,
    date,
    startTime,
    endTime: rawTask.endTime || formatTime(endDate, false),

    // ── Duration ──────────────────────────────────────────────────────────────
    estimatedDuration,       // user-supplied estimate in minutes
    durationMinutes: normalizedDuration,
    duration: normalizedDuration,

    // ── Deadline (optional, ISO date string) ──────────────────────────────────
    deadline: rawTask.deadline || null,

    // ── Classification ────────────────────────────────────────────────────────
    commitmentType: classification.commitmentType,
    effectiveDurationMinutes: classification.effectiveDurationMinutes,
    isMultiDay: classification.isMultiDay,
    calendarSpanDays: classification.calendarSpanDays,
    ongoingProject: classification.ongoingProject ?? rawTask.ongoingProject ?? null,

    // ── User-facing scheduling fields ─────────────────────────────────────────
    timezone: getLocalTimezone(),
    flexibility: rawTask.flexibility || 'flexible',
    priority: rawTask.priority || 'medium',
    energyLoad,
    effortLevel: rawTask.effortLevel || 'medium',

    // ── Metadata ──────────────────────────────────────────────────────────────
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: rawTask.createdAt || now,
    updatedAt: now,
    sourceMetadata: { manual: buildManualMetadata(rawTask) },
  };
}

export function transformManualTasks(tasks, options = {}) {
  if (!Array.isArray(tasks)) return [];
  return tasks.map(task => transformManualTask(task, options));
}

// ─── Transformer: Ongoing Project (Part 3) ────────────────────────────────────
//
// Transforms a user-defined ongoing project into the Commitment model with
// commitmentType = 'ONGOING_PROJECT'. Does NOT create a fixed calendar event.
// The Planner distributes sessions across days using the ongoingProject fields.

export function transformOngoingProject(project, options = {}) {
  const raw = cloneSerializable(project || {});
  const now = new Date().toISOString();

  // Duration & session maths
  const estimatedTotalHours = Number(raw.estimatedTotalHours ?? raw.effectiveDuration ?? 10);
  const effectiveDuration = estimatedTotalHours * 60;                          // in minutes
  const completionPercentage = Number(raw.completionPercentage ?? 0);
  const remainingDuration = Math.round(effectiveDuration * (1 - completionPercentage / 100));
  const effortHoursPerDay = Number(raw.dailyTarget ?? raw.effortHoursPerDay ?? 2);
  const minimumFocusBlock = Number(raw.minimumFocusBlock ?? 30);
  const estimatedSessions = Math.ceil(estimatedTotalHours / effortHoursPerDay);
  const deadline = raw.deadline || null;

  // For the Capacity Engine: use effortHoursPerDay per day (not total span)
  const effectiveDurationMinutes = effortHoursPerDay * 60;

  // Start/end dates for the project span (informational only)
  const startDate = raw.startDate ? new Date(raw.startDate) : new Date();
  const startDateTime = startDate.toISOString();
  const endDateTime = deadline ? new Date(`${deadline}T23:59:59`).toISOString() : null;

  const ongoingProjectFields = {
    effortHoursPerDay,
    preferredWorkWindow: raw.preferredWorkWindow || 'any',
    workDays: raw.workDays || [],
    estimatedTotalHours,
    confirmationStatus: 'confirmed_hours_daily',
    // Extended Part 3 fields:
    deadline,
    effectiveDuration,
    remainingDuration,
    dailyTarget: effortHoursPerDay,
    minimumFocusBlock,
    estimatedSessions,
    completionPercentage,
  };

  return {
    // ── Identity ──────────────────────────────────────────────────────────────
    id: getProjectId(raw),
    source: 'manual',
    sourceId: raw.id || null,
    sourceCalendarId: null,
    sourceEtag: null,

    // ── Content ───────────────────────────────────────────────────────────────
    type: 'ongoing_project',
    title: raw.title || 'Untitled Project',
    description: raw.description || raw.notes || '',
    notes: raw.description || raw.notes || '',
    location: '',
    status: 'confirmed',
    manualStatus: 'in_progress',
    cancelled: false,

    // ── Timing (project span, NOT a fixed event) ──────────────────────────────
    allDay: false,
    start: { dateTime: startDateTime, timeZone: getLocalTimezone() },
    end: endDateTime ? { dateTime: endDateTime, timeZone: getLocalTimezone() } : null,
    startDateTime,
    endDateTime,
    date: formatDate(startDate),
    startTime: '',
    endTime: '',

    // ── Duration: per-day effort, not total span ──────────────────────────────
    estimatedDuration: effectiveDuration,
    durationMinutes: effectiveDurationMinutes,
    duration: effectiveDurationMinutes,

    deadline,

    // ── Classification (ONGOING_PROJECT) ──────────────────────────────────────
    commitmentType: 'ONGOING_PROJECT',
    effectiveDurationMinutes,
    isMultiDay: Boolean(endDateTime),
    calendarSpanDays: undefined,
    ongoingProject: ongoingProjectFields,

    // ── Scheduling fields ─────────────────────────────────────────────────────
    timezone: getLocalTimezone(),
    flexibility: 'flexible',
    priority: raw.priority || 'high',
    energyLoad: raw.energyLoad || 'deep',
    effortLevel: raw.effortLevel || 'high',

    // ── Metadata ──────────────────────────────────────────────────────────────
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: raw.createdAt || now,
    updatedAt: now,
    sourceMetadata: {
      manual: {
        id: raw.id || null,
        projectType: raw.projectType || 'custom',
        raw: cloneSerializable(raw),
      },
    },
  };
}

// ─── Transformer: Gmail email (Part 2) ────────────────────────────────────────

export function transformGmailEmail(email) {
  const rawEmail = cloneSerializable(email || {});
  const classification = classifyGmailEmail(rawEmail);
  if (!classification) return null;

  const timing = parseTimingFromEmail(rawEmail, classification);
  if (!timing?.date) return null;

  const subject = cleanEmailSubject(rawEmail.subject || '');
  const title = subject
    ? `${classification.titlePrefix}: ${subject}`
    : classification.titlePrefix;
  const durationMinutes = timing.durationMinutes || classification.durationMinutes;
  const receivedDate = rawEmail.internalDate
    ? new Date(Number(rawEmail.internalDate)).toISOString()
    : null;

  const location = extractLocationFromEmail(rawEmail);

  const startDateTime = timing.allDay || !timing.startDate ? null : timing.startDate.toISOString();
  const endDateTime = timing.allDay || !timing.endDate ? null : timing.endDate.toISOString();

  const commitmentClassification = classifyAndEnrich({
    title,
    allDay: timing.allDay,
    startDateTime,
    endDateTime,
    durationMinutes,
  });

  return {
    // ── Identity ──────────────────────────────────────────────────────────────
    id: `gmail:${rawEmail.id}`,
    source: 'gmail',
    sourceId: rawEmail.id || null,
    sourceCalendarId: null,
    sourceEtag: null,

    // ── Content ───────────────────────────────────────────────────────────────
    type: classification.type,
    title,
    notes: rawEmail.snippet || '',
    description: rawEmail.bodyText || rawEmail.snippet || '',
    location,
    status: 'confirmed',
    cancelled: false,

    // ── Timing ───────────────────────────────────────────────────────────────
    allDay: timing.allDay,
    start: timing.startDate ? { dateTime: timing.startDate.toISOString(), timeZone: getLocalTimezone() } : null,
    end: timing.endDate ? { dateTime: timing.endDate.toISOString(), timeZone: getLocalTimezone() } : null,
    startDateTime,
    endDateTime,
    date: formatDate(timing.date),
    startTime: timing.startTime,
    endTime: timing.endTime,

    // ── Duration ──────────────────────────────────────────────────────────────
    durationMinutes,
    duration: durationMinutes,

    // ── Deadline (for deadline-type emails) ───────────────────────────────────
    deadline: classification.kind === 'deadline' ? formatDate(timing.date) : null,

    // ── Classification ────────────────────────────────────────────────────────
    commitmentType: commitmentClassification.commitmentType,
    effectiveDurationMinutes: commitmentClassification.effectiveDurationMinutes,
    isMultiDay: commitmentClassification.isMultiDay,
    calendarSpanDays: commitmentClassification.calendarSpanDays,
    ongoingProject: null,

    // ── Confidence (from rule table) ──────────────────────────────────────────
    confidence: classification.confidence ?? 0.75,

    // ── Scheduling fields ─────────────────────────────────────────────────────
    timezone: getLocalTimezone(),
    flexibility: classification.flexibility,
    priority: classification.priority,
    energyLoad: classification.kind === 'deadline' ? 'medium' : 'light',

    // ── Metadata (Gmail IDs preserved for deduplication) ──────────────────────
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: receivedDate,
    updatedAt: receivedDate,
    sourceMetadata: {
      gmail: buildGmailMetadata(rawEmail, classification, timing),
    },
  };
}

export function transformGmailEmails(emails) {
  if (!Array.isArray(emails)) return [];
  return emails.map(transformGmailEmail).filter(Boolean);
}
