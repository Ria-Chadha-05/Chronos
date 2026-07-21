/**
 * demoData.js
 *
 * Static demo dataset for Chronos Demo Mode.
 *
 * All objects match the canonical Chronos commitment schema produced by
 * commitmentTransformer.js, including the classification fields introduced
 * by CommitmentTypes.ts (commitmentType, effectiveDurationMinutes, isMultiDay,
 * ongoingProject).
 *
 * Design rules:
 *  - No live API calls. Everything is pre-baked.
 *  - Dates are generated relative to "today" at module evaluation time so
 *    the demo always looks current regardless of when it is run.
 *  - IDs are stable strings (not random UUIDs) so UI keys never change
 *    between renders within a single demo session.
 */

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Returns a YYYY-MM-DD string offset by `days` from today. */
function daysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Builds an ISO datetime string for a given date string and HH:MM time.
 * @param {string} dateStr  YYYY-MM-DD
 * @param {string} timeStr  HH:MM (24-hour)
 * @returns {string}        ISO 8601 datetime
 */
function iso(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00.000Z`;
}

/**
 * Computes duration in minutes between two HH:MM strings.
 * @param {string} start  HH:MM
 * @param {string} end    HH:MM
 * @returns {number}
 */
function mins(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

const TODAY      = daysFromToday(0);
const TOMORROW   = daysFromToday(1);
const IN2DAYS    = daysFromToday(2);
const IN3DAYS    = daysFromToday(3);
const IN4DAYS    = daysFromToday(4);
const IN5DAYS    = daysFromToday(5);
const IN7DAYS    = daysFromToday(7);
const IN10DAYS   = daysFromToday(10);
const IN14DAYS   = daysFromToday(14);
const YESTERDAY  = daysFromToday(-1);

// ─── Local timezone ───────────────────────────────────────────────────────────
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// ─── Calendar Events ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} DemoCommitment
 * Full Chronos commitment object. Matches the shape produced by
 * commitmentTransformer.js and expected by CapacityEngine, PlannerEngine,
 * RescueEngine, and all UI screens.
 */

/** @type {DemoCommitment[]} */
export const DEMO_CALENDAR_EVENTS = [
  // ── CS301 Algorithms Class ─────────────────────────────────────────────────
  {
    id: 'demo-cal-001',
    source: 'google_calendar',
    sourceId: 'demo-cal-001',
    sourceCalendarId: 'primary',
    sourceEtag: null,
    type: 'calendar_event',
    title: 'CS301 — Algorithms & Data Structures',
    notes: 'Lecture + live coding session. Bring laptop.',
    description: 'Lecture + live coding session. Bring laptop.',
    location: 'Room 204, CS Building',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '09:00'), timeZone: TZ },
    end:   { dateTime: iso(TODAY, '10:30'), timeZone: TZ },
    startDateTime: iso(TODAY, '09:00'),
    endDateTime:   iso(TODAY, '10:30'),
    date: TODAY,
    startTime: '09:00',
    endTime: '10:30',
    durationMinutes: 90,
    duration: 90,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 90,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: true,
    recurringEventId: 'demo-recurring-cs301',
    originalStartTime: null,
    recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'],
    createdAt: iso(YESTERDAY, '08:00'),
    updatedAt: iso(YESTERDAY, '08:00'),
    sourceMetadata: { googleCalendar: {} },
  },

  // ── Weekly Team Standup ────────────────────────────────────────────────────
  {
    id: 'demo-cal-002',
    source: 'google_calendar',
    sourceId: 'demo-cal-002',
    sourceCalendarId: 'primary',
    sourceEtag: null,
    type: 'calendar_event',
    title: 'Weekly Team Standup',
    notes: 'Sprint progress, blockers, and next steps.',
    description: 'Sprint progress, blockers, and next steps.',
    location: 'Google Meet',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '11:00'), timeZone: TZ },
    end:   { dateTime: iso(TODAY, '11:30'), timeZone: TZ },
    startDateTime: iso(TODAY, '11:00'),
    endDateTime:   iso(TODAY, '11:30'),
    date: TODAY,
    startTime: '11:00',
    endTime: '11:30',
    durationMinutes: 30,
    duration: 30,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 30,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'medium',
    energyLoad: 'light',
    isRecurring: true,
    recurringEventId: 'demo-recurring-standup',
    originalStartTime: null,
    recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO'],
    createdAt: iso(YESTERDAY, '08:00'),
    updatedAt: iso(YESTERDAY, '08:00'),
    sourceMetadata: { googleCalendar: {} },
  },

  // ── SDE Internship Interview — Google ──────────────────────────────────────
  {
    id: 'demo-cal-003',
    source: 'google_calendar',
    sourceId: 'demo-cal-003',
    sourceCalendarId: 'primary',
    sourceEtag: null,
    type: 'calendar_event',
    title: 'SDE Internship Interview — Google',
    notes: '3 rounds: DSA, System Design, Behavioural. Confirm Zoom link 1h before.',
    description: '3 rounds: DSA, System Design, Behavioural.',
    location: 'Zoom',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TOMORROW, '14:00'), timeZone: TZ },
    end:   { dateTime: iso(TOMORROW, '17:00'), timeZone: TZ },
    startDateTime: iso(TOMORROW, '14:00'),
    endDateTime:   iso(TOMORROW, '17:00'),
    date: TOMORROW,
    startTime: '14:00',
    endTime: '17:00',
    durationMinutes: 180,
    duration: 180,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 180,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '10:00'),
    updatedAt: iso(YESTERDAY, '10:00'),
    sourceMetadata: { googleCalendar: {} },
  },

  // ── Doctor Appointment ─────────────────────────────────────────────────────
  {
    id: 'demo-cal-004',
    source: 'google_calendar',
    sourceId: 'demo-cal-004',
    sourceCalendarId: 'primary',
    sourceEtag: null,
    type: 'calendar_event',
    title: 'Doctor Appointment — Annual Checkup',
    notes: 'Bring insurance card and previous reports.',
    description: 'Annual physical. Bring insurance card.',
    location: 'City Health Clinic, Block 7',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(IN2DAYS, '10:00'), timeZone: TZ },
    end:   { dateTime: iso(IN2DAYS, '11:00'), timeZone: TZ },
    startDateTime: iso(IN2DAYS, '10:00'),
    endDateTime:   iso(IN2DAYS, '11:00'),
    date: IN2DAYS,
    startTime: '10:00',
    endTime: '11:00',
    durationMinutes: 60,
    duration: 60,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 60,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'high',
    energyLoad: 'medium',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '08:00'),
    updatedAt: iso(YESTERDAY, '08:00'),
    sourceMetadata: { googleCalendar: {} },
  },

  // ── Gym ───────────────────────────────────────────────────────────────────
  {
    id: 'demo-cal-005',
    source: 'google_calendar',
    sourceId: 'demo-cal-005',
    sourceCalendarId: 'primary',
    sourceEtag: null,
    type: 'calendar_event',
    title: 'Gym — Push Day',
    notes: 'Chest, shoulders, triceps. Target: 1h 15 min.',
    description: 'Push day workout.',
    location: 'Campus Fitness Center',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '06:30'), timeZone: TZ },
    end:   { dateTime: iso(TODAY, '07:45'), timeZone: TZ },
    startDateTime: iso(TODAY, '06:30'),
    endDateTime:   iso(TODAY, '07:45'),
    date: TODAY,
    startTime: '06:30',
    endTime: '07:45',
    durationMinutes: 75,
    duration: 75,
    commitmentType: 'LIFE_ANCHOR',
    effectiveDurationMinutes: 75,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: true,
    recurringEventId: 'demo-recurring-gym',
    originalStartTime: null,
    recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'],
    createdAt: iso(YESTERDAY, '08:00'),
    updatedAt: iso(YESTERDAY, '08:00'),
    sourceMetadata: { googleCalendar: {} },
  },

  // ── Priya's Birthday Dinner ────────────────────────────────────────────────
  {
    id: 'demo-cal-006',
    source: 'google_calendar',
    sourceId: 'demo-cal-006',
    sourceCalendarId: 'primary',
    sourceEtag: null,
    type: 'calendar_event',
    title: "Priya's Birthday Dinner 🎂",
    notes: 'Restaurant: The Spice Route. Reservation at 7:30 PM.',
    description: 'Birthday dinner for Priya.',
    location: 'The Spice Route Restaurant',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(IN3DAYS, '19:30'), timeZone: TZ },
    end:   { dateTime: iso(IN3DAYS, '22:00'), timeZone: TZ },
    startDateTime: iso(IN3DAYS, '19:30'),
    endDateTime:   iso(IN3DAYS, '22:00'),
    date: IN3DAYS,
    startTime: '19:30',
    endTime: '22:00',
    durationMinutes: 150,
    duration: 150,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 150,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'medium',
    energyLoad: 'light',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '08:00'),
    updatedAt: iso(YESTERDAY, '08:00'),
    sourceMetadata: { googleCalendar: {} },
  },

  // ── Amazon ML School Exam ──────────────────────────────────────────────────
  {
    id: 'demo-cal-007',
    source: 'google_calendar',
    sourceId: 'demo-cal-007',
    sourceCalendarId: 'primary',
    sourceEtag: null,
    type: 'calendar_event',
    title: 'Amazon ML School — Final Exam',
    notes: 'Covers supervised learning, neural networks, and MLOps. 90 min online. No notes.',
    description: 'Amazon ML School final exam. Online proctored.',
    location: 'Online (Amazon portal)',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(IN4DAYS, '10:00'), timeZone: TZ },
    end:   { dateTime: iso(IN4DAYS, '11:30'), timeZone: TZ },
    startDateTime: iso(IN4DAYS, '10:00'),
    endDateTime:   iso(IN4DAYS, '11:30'),
    date: IN4DAYS,
    startTime: '10:00',
    endTime: '11:30',
    durationMinutes: 90,
    duration: 90,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 90,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '08:00'),
    updatedAt: iso(YESTERDAY, '08:00'),
    sourceMetadata: { googleCalendar: {} },
  },

  // ── Flight to Bangalore ────────────────────────────────────────────────────
  {
    id: 'demo-cal-008',
    source: 'google_calendar',
    sourceId: 'demo-cal-008',
    sourceCalendarId: 'primary',
    sourceEtag: null,
    type: 'calendar_event',
    title: 'Flight DEL → BLR — IndiGo 6E 412',
    notes: 'Check-in opens 2h before. Terminal 2. Seat 14A.',
    description: 'Flight to Bangalore for hackathon. IndiGo 6E 412.',
    location: 'Indira Gandhi International Airport, Terminal 2',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(IN7DAYS, '05:45'), timeZone: TZ },
    end:   { dateTime: iso(IN7DAYS, '08:15'), timeZone: TZ },
    startDateTime: iso(IN7DAYS, '05:45'),
    endDateTime:   iso(IN7DAYS, '08:15'),
    date: IN7DAYS,
    startTime: '05:45',
    endTime: '08:15',
    durationMinutes: 150,
    duration: 150,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 150,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'high',
    energyLoad: 'medium',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '08:00'),
    updatedAt: iso(YESTERDAY, '08:00'),
    sourceMetadata: { googleCalendar: {} },
  },
];

// ─── Gmail Commitments ────────────────────────────────────────────────────────

/** @type {DemoCommitment[]} */
export const DEMO_GMAIL_COMMITMENTS = [
  // ── Hackathon Registration Confirmation ────────────────────────────────────
  {
    id: 'demo-gmail-001',
    source: 'gmail',
    sourceId: 'demo-gmail-001',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'email_event',
    title: 'HackIndia 2025 — Registration Confirmed ✅',
    notes: 'Your team "Chronos" is registered. Report at 9 AM on the event day.',
    description: 'HackIndia 2025 registration confirmation. Team: Chronos. Venue: IIIT Bangalore.',
    location: 'IIIT Bangalore',
    status: 'confirmed',
    cancelled: false,
    allDay: true,
    start: { dateTime: iso(IN7DAYS, '00:00'), timeZone: TZ },
    end:   { dateTime: iso(IN7DAYS, '23:59'), timeZone: TZ },
    startDateTime: iso(IN7DAYS, '00:00'),
    endDateTime:   iso(IN7DAYS, '23:59'),
    date: IN7DAYS,
    startTime: '09:00',
    endTime: '18:00',
    durationMinutes: 540,
    duration: 540,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 540,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '14:00'),
    updatedAt: iso(YESTERDAY, '14:00'),
    sourceMetadata: { gmail: { subject: 'HackIndia 2025 — You\'re In!', from: 'noreply@hackindia.com' } },
  },

  // ── Assignment Deadline ────────────────────────────────────────────────────
  {
    id: 'demo-gmail-002',
    source: 'gmail',
    sourceId: 'demo-gmail-002',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'email_deadline',
    title: 'ML Assignment 3 Submission — Due Midnight',
    notes: 'Submit via course portal. Late submissions penalised 10% per day.',
    description: 'CS501 Machine Learning — Assignment 3 deadline.',
    location: '',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(IN2DAYS, '23:00'), timeZone: TZ },
    end:   { dateTime: iso(IN2DAYS, '23:59'), timeZone: TZ },
    startDateTime: iso(IN2DAYS, '23:00'),
    endDateTime:   iso(IN2DAYS, '23:59'),
    date: IN2DAYS,
    startTime: '23:00',
    endTime: '23:59',
    durationMinutes: 59,
    duration: 59,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 59,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'high',
    energyLoad: 'medium',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '09:00'),
    updatedAt: iso(YESTERDAY, '09:00'),
    sourceMetadata: { gmail: { subject: 'CS501 — Assignment 3 Due Reminder', from: 'cs501-staff@university.edu' } },
  },

  // ── Internship Interview Invitation ───────────────────────────────────────
  {
    id: 'demo-gmail-003',
    source: 'gmail',
    sourceId: 'demo-gmail-003',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'email_interview',
    title: 'Microsoft SWE Internship — Phone Screen Invite',
    notes: 'Recruiter: Ananya Sharma. Duration: 45 min. Use the Webex link in the email.',
    description: 'Microsoft SWE Internship phone screen invitation.',
    location: 'Webex (link in email)',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(IN5DAYS, '15:00'), timeZone: TZ },
    end:   { dateTime: iso(IN5DAYS, '15:45'), timeZone: TZ },
    startDateTime: iso(IN5DAYS, '15:00'),
    endDateTime:   iso(IN5DAYS, '15:45'),
    date: IN5DAYS,
    startTime: '15:00',
    endTime: '15:45',
    durationMinutes: 45,
    duration: 45,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 45,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '11:00'),
    updatedAt: iso(YESTERDAY, '11:00'),
    sourceMetadata: { gmail: { subject: 'Interview Invitation — Microsoft SWE Internship', from: 'recruiting@microsoft.com' } },
  },

  // ── Conference Registration ────────────────────────────────────────────────
  {
    id: 'demo-gmail-004',
    source: 'gmail',
    sourceId: 'demo-gmail-004',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'email_event',
    title: 'PyData Delhi 2025 — Registration Open (Closes Friday)',
    notes: 'Early-bird ticket: ₹500. Use code STUDENT30 for 30% off.',
    description: 'PyData Delhi conference registration reminder.',
    location: 'India Habitat Centre, New Delhi',
    status: 'confirmed',
    cancelled: false,
    allDay: true,
    start: { dateTime: iso(IN10DAYS, '00:00'), timeZone: TZ },
    end:   { dateTime: iso(IN10DAYS, '23:59'), timeZone: TZ },
    startDateTime: iso(IN10DAYS, '00:00'),
    endDateTime:   iso(IN10DAYS, '23:59'),
    date: IN10DAYS,
    startTime: '10:00',
    endTime: '18:00',
    durationMinutes: 480,
    duration: 480,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 480,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'medium',
    energyLoad: 'medium',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '08:30'),
    updatedAt: iso(YESTERDAY, '08:30'),
    sourceMetadata: { gmail: { subject: 'PyData Delhi 2025 — Last Chance to Register', from: 'events@pydata.org' } },
  },

  // ── Payment Reminder ──────────────────────────────────────────────────────
  {
    id: 'demo-gmail-005',
    source: 'gmail',
    sourceId: 'demo-gmail-005',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'email_reminder',
    title: 'Hostel Fee Payment Due — ₹28,000',
    notes: 'Pay via student portal. Late fee ₹500 after the due date.',
    description: 'Hostel fee payment reminder for current semester.',
    location: '',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(IN3DAYS, '17:00'), timeZone: TZ },
    end:   { dateTime: iso(IN3DAYS, '17:30'), timeZone: TZ },
    startDateTime: iso(IN3DAYS, '17:00'),
    endDateTime:   iso(IN3DAYS, '17:30'),
    date: IN3DAYS,
    startTime: '17:00',
    endTime: '17:30',
    durationMinutes: 30,
    duration: 30,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 30,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'fixed',
    priority: 'high',
    energyLoad: 'light',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '09:00'),
    updatedAt: iso(YESTERDAY, '09:00'),
    sourceMetadata: { gmail: { subject: 'Hostel Fee Payment Reminder — Due in 3 Days', from: 'accounts@university.edu' } },
  },
];

// ─── Manual Tasks ─────────────────────────────────────────────────────────────

/** @type {DemoCommitment[]} */
export const DEMO_MANUAL_TASKS = [
  // ── Study DSA ─────────────────────────────────────────────────────────────
  {
    id: 'manual:demo-task-001',
    source: 'manual',
    sourceId: 'demo-task-001',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'manual_task',
    title: 'Study DSA — Trees & Graph Traversal',
    notes: 'Cover BFS, DFS, Dijkstra. Solve 5 LeetCode problems (medium).',
    description: 'Study DSA — Trees & Graph Traversal',
    location: '',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '20:00'), timeZone: TZ },
    end:   { dateTime: iso(TODAY, '22:00'), timeZone: TZ },
    startDateTime: iso(TODAY, '20:00'),
    endDateTime:   iso(TODAY, '22:00'),
    date: TODAY,
    startTime: '20:00',
    endTime: '22:00',
    durationMinutes: 120,
    duration: 120,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 120,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '19:00'),
    updatedAt: iso(YESTERDAY, '19:00'),
    sourceMetadata: { id: 'demo-task-001', raw: {} },
  },

  // ── Finish ML Assignment ──────────────────────────────────────────────────
  {
    id: 'manual:demo-task-002',
    source: 'manual',
    sourceId: 'demo-task-002',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'manual_task',
    title: 'Finish ML Assignment 3 — CNN Implementation',
    notes: 'Complete forward pass, backprop, and training loop. Write analysis section.',
    description: 'Finish ML Assignment 3 — CNN Implementation',
    location: '',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '14:00'), timeZone: TZ },
    end:   { dateTime: iso(TODAY, '17:00'), timeZone: TZ },
    startDateTime: iso(TODAY, '14:00'),
    endDateTime:   iso(TODAY, '17:00'),
    date: TODAY,
    startTime: '14:00',
    endTime: '17:00',
    durationMinutes: 180,
    duration: 180,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 180,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '12:00'),
    updatedAt: iso(YESTERDAY, '12:00'),
    sourceMetadata: { id: 'demo-task-002', raw: {} },
  },

  // ── Blocked: Dataset Access (Blocker Breaker integration demo) ───────────
  {
    id: 'manual:demo-task-blocked-001',
    source: 'manual',
    sourceId: 'demo-task-blocked-001',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'manual_task',
    title: 'Dataset Access Approval',
    notes: 'Blocked until Professor Chen approves ML dataset usage for Assignment 3.',
    description: 'Waiting for professor approval on ML dataset usage',
    location: '',
    status: 'blocked',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '13:00'), timeZone: TZ },
    end:   { dateTime: iso(TODAY, '13:30'), timeZone: TZ },
    startDateTime: iso(TODAY, '13:00'),
    endDateTime:   iso(TODAY, '13:30'),
    date: TODAY,
    startTime: '13:00',
    endTime: '13:30',
    durationMinutes: 30,
    duration: 30,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 30,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'high',
    energyLoad: 'medium',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    tags: ['blocked', 'approval'],
    waitingFor: 'Professor Dr. Chen',
    blockerDescription: 'Waiting for professor approval on ML dataset usage for Assignment 3',
    waitingSince: daysFromToday(-4),
    dependencyType: 'approval',
    contactRole: 'professor',
    deadline: daysFromToday(2),
    createdAt: iso(daysFromToday(-4), '09:00'),
    updatedAt: iso(YESTERDAY, '10:00'),
    sourceMetadata: { id: 'demo-task-blocked-001', raw: {} },
  },

  // ── Practice System Design ────────────────────────────────────────────────
  {
    id: 'manual:demo-task-003',
    source: 'manual',
    sourceId: 'demo-task-003',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'manual_task',
    title: 'Practice System Design — Design Twitter',
    notes: 'Use Excalidraw. Cover feed generation, caching, CDN, rate limiting.',
    description: 'Practice System Design — Design Twitter',
    location: '',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TOMORROW, '10:00'), timeZone: TZ },
    end:   { dateTime: iso(TOMORROW, '11:30'), timeZone: TZ },
    startDateTime: iso(TOMORROW, '10:00'),
    endDateTime:   iso(TOMORROW, '11:30'),
    date: TOMORROW,
    startTime: '10:00',
    endTime: '11:30',
    durationMinutes: 90,
    duration: 90,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 90,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '18:00'),
    updatedAt: iso(YESTERDAY, '18:00'),
    sourceMetadata: { id: 'demo-task-003', raw: {} },
  },

  // ── Update Resume ─────────────────────────────────────────────────────────
  {
    id: 'manual:demo-task-004',
    source: 'manual',
    sourceId: 'demo-task-004',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'manual_task',
    title: 'Update Resume — Add Chronos Project',
    notes: 'Add Chronos to projects section. Quantify impact. Tailor for SDE roles.',
    description: 'Update Resume — Add Chronos Project',
    location: '',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TOMORROW, '13:00'), timeZone: TZ },
    end:   { dateTime: iso(TOMORROW, '14:00'), timeZone: TZ },
    startDateTime: iso(TOMORROW, '13:00'),
    endDateTime:   iso(TOMORROW, '14:00'),
    date: TOMORROW,
    startTime: '13:00',
    endTime: '14:00',
    durationMinutes: 60,
    duration: 60,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 60,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'medium',
    energyLoad: 'medium',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '16:00'),
    updatedAt: iso(YESTERDAY, '16:00'),
    sourceMetadata: { id: 'demo-task-004', raw: {} },
  },

  // ── Grocery Shopping ──────────────────────────────────────────────────────
  {
    id: 'manual:demo-task-005',
    source: 'manual',
    sourceId: 'demo-task-005',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'manual_task',
    title: 'Grocery Shopping',
    notes: 'Oats, bananas, eggs, peanut butter, protein powder, vegetables.',
    description: 'Grocery Shopping',
    location: 'D-Mart, Sector 18',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '18:00'), timeZone: TZ },
    end:   { dateTime: iso(TODAY, '19:00'), timeZone: TZ },
    startDateTime: iso(TODAY, '18:00'),
    endDateTime:   iso(TODAY, '19:00'),
    date: TODAY,
    startTime: '18:00',
    endTime: '19:00',
    durationMinutes: 60,
    duration: 60,
    commitmentType: 'TIMED_EVENT',
    effectiveDurationMinutes: 60,
    isMultiDay: false,
    calendarSpanDays: null,
    ongoingProject: null,
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'low',
    energyLoad: 'light',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '20:00'),
    updatedAt: iso(YESTERDAY, '20:00'),
    sourceMetadata: { id: 'demo-task-005', raw: {} },
  },
];

// ─── Ongoing Projects ─────────────────────────────────────────────────────────

/** @type {DemoCommitment[]} */
export const DEMO_ONGOING_PROJECTS = [
  // ── Chronos Hackathon Project ─────────────────────────────────────────────
  {
    id: 'demo-project-001',
    source: 'manual',
    sourceId: 'demo-project-001',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'manual_task',
    title: 'Chronos Hackathon — Feature Development',
    notes: 'Build Demo Mode, polish UI, prepare pitch deck.',
    description: 'Chronos AI Life OS — Hackathon sprint.',
    location: '',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '00:00'), timeZone: TZ },
    end:   { dateTime: iso(IN7DAYS, '23:59'), timeZone: TZ },
    startDateTime: iso(TODAY, '00:00'),
    endDateTime:   iso(IN7DAYS, '23:59'),
    date: TODAY,
    startTime: '19:00',
    endTime: '22:00',
    durationMinutes: 180,
    duration: 180,
    commitmentType: 'ONGOING_PROJECT',
    effectiveDurationMinutes: 180,
    isMultiDay: true,
    calendarSpanDays: 7,
    ongoingProject: {
      effortHoursPerDay: 3,
      preferredWorkWindow: 'evening',
      workDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      estimatedTotalHours: 21,
      confirmationStatus: 'confirmed_hours_daily',
    },
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '10:00'),
    updatedAt: iso(YESTERDAY, '10:00'),
    sourceMetadata: { id: 'demo-project-001', raw: {} },
  },

  // ── Research Paper ────────────────────────────────────────────────────────
  {
    id: 'demo-project-002',
    source: 'manual',
    sourceId: 'demo-project-002',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'manual_task',
    title: 'Research Paper — Attention Mechanisms Survey',
    notes: 'Literature review, write related work section, draft experiments.',
    description: 'Survey paper on attention mechanisms in transformers.',
    location: '',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '00:00'), timeZone: TZ },
    end:   { dateTime: iso(IN14DAYS, '23:59'), timeZone: TZ },
    startDateTime: iso(TODAY, '00:00'),
    endDateTime:   iso(IN14DAYS, '23:59'),
    date: TODAY,
    startTime: '15:00',
    endTime: '17:00',
    durationMinutes: 120,
    duration: 120,
    commitmentType: 'ONGOING_PROJECT',
    effectiveDurationMinutes: 120,
    isMultiDay: true,
    calendarSpanDays: 14,
    ongoingProject: {
      effortHoursPerDay: 2,
      preferredWorkWindow: 'afternoon',
      workDays: ['mon', 'wed', 'fri'],
      estimatedTotalHours: 30,
      confirmationStatus: 'confirmed_hours_daily',
    },
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '10:00'),
    updatedAt: iso(YESTERDAY, '10:00'),
    sourceMetadata: { id: 'demo-project-002', raw: {} },
  },

  // ── Placement Preparation ─────────────────────────────────────────────────
  {
    id: 'demo-project-003',
    source: 'manual',
    sourceId: 'demo-project-003',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'manual_task',
    title: 'Placement Preparation — DSA + System Design',
    notes: 'Daily LeetCode, system design mock, HR prep.',
    description: 'Placement season preparation — ongoing.',
    location: '',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '00:00'), timeZone: TZ },
    end:   { dateTime: iso(IN14DAYS, '23:59'), timeZone: TZ },
    startDateTime: iso(TODAY, '00:00'),
    endDateTime:   iso(IN14DAYS, '23:59'),
    date: TODAY,
    startTime: '20:00',
    endTime: '22:00',
    durationMinutes: 120,
    duration: 120,
    commitmentType: 'ONGOING_PROJECT',
    effectiveDurationMinutes: 120,
    isMultiDay: true,
    calendarSpanDays: 14,
    ongoingProject: {
      effortHoursPerDay: 2,
      preferredWorkWindow: 'evening',
      workDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
      estimatedTotalHours: 40,
      confirmationStatus: 'confirmed_hours_daily',
    },
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'high',
    energyLoad: 'high',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '10:00'),
    updatedAt: iso(YESTERDAY, '10:00'),
    sourceMetadata: { id: 'demo-project-003', raw: {} },
  },

  // ── Portfolio Website ─────────────────────────────────────────────────────
  {
    id: 'demo-project-004',
    source: 'manual',
    sourceId: 'demo-project-004',
    sourceCalendarId: null,
    sourceEtag: null,
    type: 'manual_task',
    title: 'Portfolio Website — Redesign & Deploy',
    notes: 'React + Tailwind, add projects section, deploy to Vercel.',
    description: 'Personal portfolio website redesign.',
    location: '',
    status: 'confirmed',
    cancelled: false,
    allDay: false,
    start: { dateTime: iso(TODAY, '00:00'), timeZone: TZ },
    end:   { dateTime: iso(IN10DAYS, '23:59'), timeZone: TZ },
    startDateTime: iso(TODAY, '00:00'),
    endDateTime:   iso(IN10DAYS, '23:59'),
    date: TODAY,
    startTime: '16:00',
    endTime: '17:30',
    durationMinutes: 90,
    duration: 90,
    commitmentType: 'ONGOING_PROJECT',
    effectiveDurationMinutes: 90,
    isMultiDay: true,
    calendarSpanDays: 10,
    ongoingProject: {
      effortHoursPerDay: 1.5,
      preferredWorkWindow: 'afternoon',
      workDays: ['sat', 'sun'],
      estimatedTotalHours: 15,
      confirmationStatus: 'confirmed_hours_daily',
    },
    timezone: TZ,
    flexibility: 'flexible',
    priority: 'medium',
    energyLoad: 'medium',
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    recurrence: [],
    createdAt: iso(YESTERDAY, '10:00'),
    updatedAt: iso(YESTERDAY, '10:00'),
    sourceMetadata: { id: 'demo-project-004', raw: {} },
  },
];

// ─── All commitments combined ─────────────────────────────────────────────────

/**
 * The complete demo commitment dataset. Use this as the primary data source
 * when populating CommitmentContext in demo mode.
 *
 * @type {DemoCommitment[]}
 */
export const ALL_DEMO_COMMITMENTS = [
  ...DEMO_CALENDAR_EVENTS,
  ...DEMO_GMAIL_COMMITMENTS,
  ...DEMO_MANUAL_TASKS,
  ...DEMO_ONGOING_PROJECTS,
];

// ─── Demo Statistics ──────────────────────────────────────────────────────────

/**
 * Pre-baked statistics for the Dashboard in demo mode.
 * Values are chosen to tell a realistic but slightly-overloaded story
 * so Chronos's AI recommendations appear meaningful and actionable.
 *
 * @typedef {Object} DemoStatistics
 */

/** @type {DemoStatistics} */
export const DEMO_STATISTICS = {
  // Capacity
  capacityScore: 62,          // Today is over-planned; not critical
  hoursPlanned: 11.5,         // Planned total for today
  hoursCompleted: 4.0,        // Completed so far (morning)
  availableCapacityHours: 1.5,// Headroom left after today's load

  // Reality Gap
  realityGapScore: 41,        // High gap — planned >> historical average
  plannedVsActualRatio: 1.64, // 64% more planned than avg actual

  // Completion
  completionRate: 71,         // 71% of tasks completed this week
  tasksCompleted: 17,
  tasksTotal: 24,
  tasksMissed: 7,

  // Focus
  focusHours: 5.5,            // Deep uninterrupted work hours today
  deepWorkHours: 3.0,         // Truly distraction-free (Pomodoro-style)
  productivityScore: 74,      // Composite daily productivity

  // Streaks
  currentStreak: 6,           // Days in a row with ≥80% completion
  longestStreak: 14,
  consistencyScore: 68,       // Weekly habit consistency (0-100)

  // Conflicts
  conflictCount: 3,           // Scheduling overlaps detected today

  // Weekly snapshot
  weeklyHoursPlanned: 58,
  weeklyHoursCompleted: 39,
  weeklyCompletionRate: 67,
};

// ─── Demo Planner Output ──────────────────────────────────────────────────────

/**
 * @typedef {Object} DemoPlannerAction
 * @property {string} id
 * @property {string} type          - KEEP | MOVE | POSTPONE | PROTECT | BREAK | FOCUS_BLOCK
 * @property {string} [commitmentId]
 * @property {string} title
 * @property {string} explanation
 * @property {string} [suggestedTime]
 */

/**
 * @typedef {Object} DemoPlannerOutput
 * @property {number} score
 * @property {string} summary
 * @property {DemoPlannerAction[]} actions
 */

/** @type {DemoPlannerOutput} */
export const DEMO_PLANNER_OUTPUT = {
  score: 72,
  summary:
    'Today is overloaded by ~2.5 hours relative to your recent average. ' +
    'Chronos moved two flexible tasks and compressed the evening block to restore balance. ' +
    'Your interview prep window tomorrow morning is fully protected.',
  actions: [
    {
      id: 'plan-action-001',
      type: 'PROTECT',
      commitmentId: 'demo-cal-005',
      title: 'Preserve Gym (Life Anchor)',
      explanation:
        'Your morning gym session is marked as a Life Anchor. ' +
        'Chronos will never reschedule or compress it — skipping workouts degrades your focus score within 48 hours.',
      suggestedTime: '06:30',
    },
    {
      id: 'plan-action-002',
      type: 'MOVE',
      commitmentId: 'manual:demo-task-001',
      title: 'Move DSA Practice to Tomorrow Morning',
      explanation:
        'Today already has 11.5 hours planned. Your DSA session is flexible and ' +
        'tomorrow 08:00–10:00 is clear. Moving it frees a 2-hour buffer tonight for recovery.',
      suggestedTime: '08:00',
    },
    {
      id: 'plan-action-003',
      type: 'POSTPONE',
      commitmentId: 'manual:demo-task-005',
      title: 'Delay Grocery Shopping to Tomorrow Evening',
      explanation:
        'Grocery shopping is the lowest-priority item today. ' +
        'Tomorrow 18:00 is available and requires no rescheduling of other commitments.',
      suggestedTime: '18:00',
    },
    {
      id: 'plan-action-004',
      type: 'MOVE',
      commitmentId: 'manual:demo-task-004',
      title: 'Schedule Resume Update After Lunch (13:00)',
      explanation:
        'Post-lunch is a natural low-energy window. Resume editing requires moderate focus — ' +
        'it fits well at 13:00 tomorrow after System Design practice ends.',
      suggestedTime: '13:00',
    },
    {
      id: 'plan-action-005',
      type: 'BREAK',
      commitmentId: 'manual:demo-task-002',
      title: 'Compress ML Assignment Block — Split into Two 90-min Sessions',
      explanation:
        'A 3-hour unbroken coding block at 14:00 will lower your quality of output. ' +
        'Chronos recommends a 15-minute break at 15:30 to maintain deep-work performance.',
      suggestedTime: '15:30',
    },
    {
      id: 'plan-action-006',
      type: 'PROTECT',
      commitmentId: 'demo-cal-003',
      title: 'Protect Google Interview Window (Tomorrow 14:00–17:00)',
      explanation:
        'High-stakes immovable event. Chronos has cleared the 30 minutes before ' +
        '(13:30–14:00) as a preparation buffer with no other tasks scheduled.',
    },
  ],
};

// ─── Demo Rescue Output ───────────────────────────────────────────────────────

/**
 * @typedef {Object} DemoRescueOutput
 * @property {boolean} activated
 * @property {string}  severity          - Low | Medium | High | Critical
 * @property {number}  estimatedStressReduction
 * @property {number}  commitmentsProtected
 * @property {number}  commitmentsMoved
 * @property {number}  commitmentsPostponed
 * @property {string}  summary
 * @property {Array}   actions
 * @property {number}  recoveryScore
 */

/** @type {DemoRescueOutput} */
export const DEMO_RESCUE_OUTPUT = {
  activated: true,
  severity: 'Medium',
  estimatedStressReduction: 34,
  commitmentsProtected: 3,
  commitmentsMoved: 2,
  commitmentsPostponed: 1,
  recoveryScore: 88,
  summary:
    'You missed your morning study block (2 hours). Chronos has activated a recovery plan. ' +
    'Two flexible tasks have been rescheduled and your workload has been reduced by 1.5 hours. ' +
    'Sleep and Life Anchors remain untouched.',
  actions: [
    {
      id: 'rescue-action-001',
      type: 'PROTECT',
      commitmentId: 'demo-cal-005',
      title: 'Keep Gym Unchanged (Life Anchor)',
      explanation:
        'Gym is a Life Anchor. Even during recovery, preserving physical anchors stabilises your system ' +
        'and prevents a cascade of missed routines.',
    },
    {
      id: 'rescue-action-002',
      type: 'MOVE',
      commitmentId: 'manual:demo-task-002',
      title: 'Move ML Assignment to Tomorrow 10:00',
      explanation:
        'You missed 2 hours of prep this morning. The assignment deadline is in 2 days — ' +
        'there is enough buffer to move the work session to tomorrow 10:00–13:00 without penalty.',
      suggestedTime: '10:00',
    },
    {
      id: 'rescue-action-003',
      type: 'POSTPONE',
      commitmentId: 'manual:demo-task-005',
      title: 'Postpone Grocery Shopping by One Day',
      explanation:
        'Grocery shopping is the most deferrable item. Moving it to tomorrow evening ' +
        'recovers a 1-hour window to absorb overrun from the ML assignment.',
      suggestedTime: '18:00',
    },
    {
      id: 'rescue-action-004',
      type: 'INSERT_BREAK',
      commitmentId: null,
      title: 'Add 20-Minute Recovery Break at 15:30',
      explanation:
        'After a missed morning session, your cognitive load is already elevated. ' +
        'A short break before the afternoon deep-work block prevents further slippage.',
      suggestedTime: '15:30',
    },
    {
      id: 'rescue-action-005',
      type: 'PROTECT',
      commitmentId: 'demo-cal-003',
      title: 'Protect Google Interview — Zero Rescheduling',
      explanation:
        'Interview is high-stakes and immovable. All recovery actions work around it, ' +
        'not through it. The 30-minute prep buffer at 13:30 is preserved.',
    },
    {
      id: 'rescue-action-006',
      type: 'KEEP',
      commitmentId: null,
      title: 'Keep Sleep Anchor Unchanged',
      explanation:
        'Sleep is never reduced in a rescue plan. Cognitive debt from lost sleep ' +
        'takes 2–3 days to repay and will damage tomorrow\'s interview performance.',
    },
  ],
};

// ─── Demo AI Explanations ─────────────────────────────────────────────────────

/**
 * @typedef {Object} DemoInsight
 * @property {string} id
 * @property {string} type     - 'warning' | 'info' | 'success' | 'tip'
 * @property {string} title
 * @property {string} body
 * @property {string} [metric]
 */

/** @type {DemoInsight[]} */
export const DEMO_INSIGHTS = [
  {
    id: 'insight-001',
    type: 'warning',
    title: 'Overload Detected',
    body:
      'You planned 11.5 hours today but your recent 7-day average is 7 hours. ' +
      'This 64% overload increases the probability of a cascade failure — where one missed task delays everything downstream.',
    metric: 'Reality Gap: 41',
  },
  {
    id: 'insight-002',
    type: 'info',
    title: 'Chronos Reduced Overload Automatically',
    body:
      'By moving DSA Practice to tomorrow and deferring Grocery Shopping, ' +
      'Chronos freed 3 hours of buffer. Your revised schedule is now within 12% of your sustainable capacity.',
    metric: 'Capacity Score: 62 → 78',
  },
  {
    id: 'insight-003',
    type: 'success',
    title: 'Gym Preserved as Life Anchor',
    body:
      'Your morning gym session was marked as a Life Anchor and is protected in all plans. ' +
      'Chronos detected 2 other events that could have displaced it and re-routed them instead.',
  },
  {
    id: 'insight-004',
    type: 'info',
    title: 'Tomorrow Has Capacity for Postponed Work',
    body:
      'Tomorrow currently has 5.5 hours of planned commitments against a 9-hour capacity. ' +
      'The 3.5-hour buffer comfortably absorbs the DSA session and resume update without conflict.',
    metric: 'Tomorrow Capacity: 61%',
  },
  {
    id: 'insight-005',
    type: 'warning',
    title: '3 Scheduling Conflicts Detected',
    body:
      'Your ML Assignment block (14:00–17:00) and the Team Standup (11:00–11:30) have a ' +
      'preparation overlap. Chronos flagged the transition risk and added a 15-minute buffer.',
    metric: 'Conflicts: 3',
  },
  {
    id: 'insight-006',
    type: 'tip',
    title: 'Your Focus Hours Peak Between 09:00 and 12:00',
    body:
      'Based on your completion patterns, tasks requiring deep work are completed at 23% ' +
      'higher quality when scheduled in the morning block. Consider front-loading DSA and ML work.',
  },
  {
    id: 'insight-007',
    type: 'success',
    title: '6-Day Consistency Streak 🔥',
    body:
      'You have completed at least 80% of planned tasks for 6 consecutive days. ' +
      'Your longest streak is 14 days. Chronos recommends protecting tomorrow\'s morning block to maintain momentum.',
    metric: 'Streak: 6 days',
  },
];

// ─── Demo Reflection Output ───────────────────────────────────────────────────

/**
 * @typedef {Object} DemoReflection
 * @property {string} date
 * @property {number} completionRate
 * @property {number} focusHours
 * @property {string} moodSummary
 * @property {string} aiSummary
 * @property {string[]} wins
 * @property {string[]} improvements
 * @property {string[]} tomorrowSuggestions
 */

/** @type {DemoReflection} */
export const DEMO_REFLECTION = {
  date: TODAY,
  completionRate: 71,
  focusHours: 5.5,
  moodSummary: 'Productive but slightly stretched',
  aiSummary:
    'Overall a strong day — you completed your core academic tasks and protected your ' +
    'gym anchor. The afternoon overload was real but manageable. Tomorrow\'s interview ' +
    'is your highest-stakes event; Chronos recommends a light morning to arrive sharp.',
  wins: [
    'Completed CS301 lecture and took detailed notes',
    'Finished 3 of 5 LeetCode problems (medium difficulty)',
    'Attended Team Standup and unblocked two teammates',
    'Maintained gym streak — 6 days strong',
  ],
  improvements: [
    'ML Assignment ran 45 minutes over schedule — break earlier next time',
    'Grocery Shopping was deferred again — third consecutive day',
    'Evening DSA block was skipped due to fatigue',
  ],
  tomorrowSuggestions: [
    'Keep the morning light — arrive at the Google interview fully rested',
    'Complete the ML Assignment in a focused 2-hour block (10:00–12:00)',
    'Do Grocery Shopping on the way back from the doctor appointment',
    'One LeetCode problem only — quality over quantity before an interview',
  ],
};
