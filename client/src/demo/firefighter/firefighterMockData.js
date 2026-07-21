/**
 * firefighterMockData.js
 *
 * Mock emergency scenarios for Firefighter Mode development and testing.
 *
 * All objects match the canonical Chronos commitment schema so they can be
 * passed directly to firefighterEngine.js functions without any transformation.
 *
 * ▸ No live API calls — everything is pre-baked.
 * ▸ Dates are relative to today so the demo always looks current.
 * ▸ Three complete emergency scenarios: student, professional, hybrid.
 */

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function iso(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00.000Z`;
}

const TODAY    = daysFromToday(0);
const TOMORROW = daysFromToday(1);
const IN3DAYS  = daysFromToday(3);
const TZ       = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

// ─── Scenario 1: Student Chaos Day ───────────────────────────────────────────

/**
 * A CS student with three overlapping deadlines, two lectures, a study group,
 * and a part-time shift — totalling ~780 committed minutes vs 480 available.
 *
 * @type {object[]}
 */
export const MOCK_STUDENT_EMERGENCY = [
  {
    id: 'ff-student-001',
    source: 'google_calendar',
    type: 'calendar_event',
    commitmentType: 'TIMED_EVENT',
    title: 'CS401 — Machine Learning Lecture',
    date: TODAY,
    startDateTime: iso(TODAY, '09:00'),
    endDateTime:   iso(TODAY, '10:30'),
    startTime: '09:00',
    endTime: '10:30',
    durationMinutes: 90,
    effectiveDurationMinutes: 90,
    flexibility: 'fixed',
    priority: 'high',
    urgency: 'high',
    location: 'Room 302, Engineering Block',
    status: 'confirmed',
  },
  {
    id: 'ff-student-002',
    source: 'manual',
    type: 'manual_task',
    commitmentType: 'DEADLINE',
    title: 'Submit Algorithm Assignment 3',
    date: TODAY,
    startDateTime: iso(TODAY, '23:59'),
    endDateTime:   iso(TODAY, '23:59'),
    durationMinutes: 180,
    effectiveDurationMinutes: 180,
    flexibility: 'fixed',
    priority: 'critical',
    urgency: 'critical',
    notes: 'Due 11:59 PM — 30% of final grade',
    status: 'pending',
  },
  {
    id: 'ff-student-003',
    source: 'gmail',
    type: 'email_deadline',
    commitmentType: 'DEADLINE',
    title: 'Group Project Proposal — Submit to Portal',
    date: TODAY,
    startDateTime: iso(TODAY, '17:00'),
    endDateTime:   iso(TODAY, '17:00'),
    durationMinutes: 120,
    effectiveDurationMinutes: 120,
    flexibility: 'fixed',
    priority: 'high',
    urgency: 'high',
    notes: 'Group of 4 — your section is Introduction and Methodology',
    status: 'pending',
  },
  {
    id: 'ff-student-004',
    source: 'google_calendar',
    type: 'calendar_event',
    commitmentType: 'TIMED_EVENT',
    title: 'MATH201 — Linear Algebra Tutorial',
    date: TODAY,
    startDateTime: iso(TODAY, '11:00'),
    endDateTime:   iso(TODAY, '12:00'),
    startTime: '11:00',
    endTime: '12:00',
    durationMinutes: 60,
    effectiveDurationMinutes: 60,
    flexibility: 'fixed',
    priority: 'medium',
    urgency: 'medium',
    location: 'Tutorial Room B1',
    status: 'confirmed',
  },
  {
    id: 'ff-student-005',
    source: 'manual',
    type: 'manual_task',
    commitmentType: 'TIMED_EVENT',
    title: 'Study Group — Exam Prep Session',
    date: TODAY,
    startDateTime: iso(TODAY, '14:00'),
    endDateTime:   iso(TODAY, '16:00'),
    durationMinutes: 120,
    effectiveDurationMinutes: 120,
    flexibility: 'flexible',
    priority: 'medium',
    urgency: 'low',
    notes: 'Optional but exam is in 3 days',
    status: 'pending',
  },
  {
    id: 'ff-student-006',
    source: 'google_calendar',
    type: 'calendar_event',
    commitmentType: 'TIMED_EVENT',
    title: 'Part-Time Shift — Campus Café',
    date: TODAY,
    startDateTime: iso(TODAY, '17:30'),
    endDateTime:   iso(TODAY, '20:30'),
    startTime: '17:30',
    endTime: '20:30',
    durationMinutes: 180,
    effectiveDurationMinutes: 180,
    flexibility: 'fixed',
    priority: 'high',
    urgency: 'high',
    notes: 'Cannot cancel — short-staffed today',
    status: 'confirmed',
  },
  {
    id: 'ff-student-007',
    source: 'gmail',
    type: 'email_assignment',
    commitmentType: 'DEADLINE',
    title: 'Lab Report — Physics Practical',
    date: TODAY,
    startDateTime: iso(TODAY, '23:59'),
    endDateTime:   iso(TODAY, '23:59'),
    durationMinutes: 60,
    effectiveDurationMinutes: 60,
    flexibility: 'fixed',
    priority: 'medium',
    urgency: 'medium',
    notes: 'Worth 10% — prof said no late submissions',
    status: 'pending',
  },
];

// ─── Scenario 2: Professional Crunch Day ─────────────────────────────────────

/**
 * A product manager with back-to-back meetings, a board presentation,
 * a critical client call, and a hiring interview — ~720 committed minutes.
 *
 * @type {object[]}
 */
export const MOCK_PROFESSIONAL_EMERGENCY = [
  {
    id: 'ff-pro-001',
    source: 'google_calendar',
    type: 'calendar_event',
    commitmentType: 'TIMED_EVENT',
    title: 'Q3 Board Presentation — Strategy Review',
    date: TODAY,
    startDateTime: iso(TODAY, '09:00'),
    endDateTime:   iso(TODAY, '11:00'),
    startTime: '09:00',
    endTime: '11:00',
    durationMinutes: 120,
    effectiveDurationMinutes: 120,
    flexibility: 'fixed',
    priority: 'critical',
    urgency: 'critical',
    location: 'Boardroom, Floor 12',
    status: 'confirmed',
    notes: 'Presenting to 8 VPs — prepare slides tonight (still incomplete)',
  },
  {
    id: 'ff-pro-002',
    source: 'google_calendar',
    type: 'calendar_event',
    commitmentType: 'TIMED_EVENT',
    title: 'Client Call — Acme Corp Renewal',
    date: TODAY,
    startDateTime: iso(TODAY, '11:30'),
    endDateTime:   iso(TODAY, '12:30'),
    startTime: '11:30',
    endTime: '12:30',
    durationMinutes: 60,
    effectiveDurationMinutes: 60,
    flexibility: 'fixed',
    priority: 'critical',
    urgency: 'critical',
    status: 'confirmed',
    notes: '$2M renewal — cannot reschedule',
  },
  {
    id: 'ff-pro-003',
    source: 'manual',
    type: 'manual_task',
    commitmentType: 'DEADLINE',
    title: 'Finalise Board Deck & Send to EA',
    date: TODAY,
    startDateTime: iso(TODAY, '08:00'),
    endDateTime:   iso(TODAY, '08:45'),
    durationMinutes: 120,
    effectiveDurationMinutes: 120,
    flexibility: 'fixed',
    priority: 'critical',
    urgency: 'critical',
    notes: 'Must be with EA by 8:45 AM for printing',
    status: 'pending',
  },
  {
    id: 'ff-pro-004',
    source: 'google_calendar',
    type: 'calendar_event',
    commitmentType: 'TIMED_EVENT',
    title: 'Engineering Sync — Sprint Planning',
    date: TODAY,
    startDateTime: iso(TODAY, '13:00'),
    endDateTime:   iso(TODAY, '14:30'),
    startTime: '13:00',
    endTime: '14:30',
    durationMinutes: 90,
    effectiveDurationMinutes: 90,
    flexibility: 'flexible',
    priority: 'medium',
    urgency: 'medium',
    status: 'confirmed',
    notes: 'Recurring — could send delegate',
  },
  {
    id: 'ff-pro-005',
    source: 'gmail',
    type: 'email_interview',
    commitmentType: 'TIMED_EVENT',
    title: 'Interview — Senior Designer Candidate',
    date: TODAY,
    startDateTime: iso(TODAY, '15:00'),
    endDateTime:   iso(TODAY, '16:00'),
    durationMinutes: 60,
    effectiveDurationMinutes: 60,
    flexibility: 'fixed',
    priority: 'high',
    urgency: 'high',
    status: 'confirmed',
    notes: 'Final round — candidate has competing offers',
  },
  {
    id: 'ff-pro-006',
    source: 'manual',
    type: 'manual_task',
    commitmentType: 'DEADLINE',
    title: 'Write & Send Weekly PM Update',
    date: TODAY,
    startDateTime: iso(TODAY, '17:00'),
    endDateTime:   iso(TODAY, '17:00'),
    durationMinutes: 45,
    effectiveDurationMinutes: 45,
    flexibility: 'flexible',
    priority: 'medium',
    urgency: 'low',
    notes: 'Send to team Slack before 5 PM',
    status: 'pending',
  },
  {
    id: 'ff-pro-007',
    source: 'google_calendar',
    type: 'calendar_event',
    commitmentType: 'TIMED_EVENT',
    title: '1:1 with Direct Report — Maria',
    date: TODAY,
    startDateTime: iso(TODAY, '16:30'),
    endDateTime:   iso(TODAY, '17:00'),
    startTime: '16:30',
    endTime: '17:00',
    durationMinutes: 30,
    effectiveDurationMinutes: 30,
    flexibility: 'flexible',
    priority: 'low',
    urgency: 'low',
    status: 'confirmed',
    notes: 'Could async if needed',
  },
  {
    id: 'ff-pro-008',
    source: 'manual',
    type: 'ongoing_project',
    commitmentType: 'ONGOING_PROJECT',
    title: 'Feature Spec — Mobile Onboarding Redesign',
    date: TODAY,
    startDateTime: iso(TODAY, '17:30'),
    endDateTime:   iso(TODAY, '19:00'),
    durationMinutes: 90,
    effectiveDurationMinutes: 90,
    flexibility: 'flexible',
    priority: 'medium',
    urgency: 'medium',
    notes: 'Engineering waiting on this — was supposed to be done yesterday',
    status: 'pending',
    ongoingProject: {
      completionPercentage: 40,
      remainingDuration: 90,
      effortHoursPerDay: 1.5,
    },
  },
];

// ─── Scenario 3: Hybrid Mild Warning ─────────────────────────────────────────

/**
 * A lighter overload — the day is at ~105% capacity, triggering a warning
 * rather than a full emergency. Useful for testing the warning state UI.
 *
 * @type {object[]}
 */
export const MOCK_WARNING_DAY = [
  {
    id: 'ff-warn-001',
    source: 'google_calendar',
    type: 'calendar_event',
    commitmentType: 'TIMED_EVENT',
    title: 'Team Standup',
    date: TODAY,
    startDateTime: iso(TODAY, '09:00'),
    endDateTime:   iso(TODAY, '09:30'),
    startTime: '09:00',
    endTime: '09:30',
    durationMinutes: 30,
    effectiveDurationMinutes: 30,
    flexibility: 'fixed',
    priority: 'medium',
    status: 'confirmed',
  },
  {
    id: 'ff-warn-002',
    source: 'manual',
    type: 'manual_task',
    commitmentType: 'DEADLINE',
    title: 'Submit Expense Report',
    date: TODAY,
    startDateTime: iso(TODAY, '12:00'),
    endDateTime:   iso(TODAY, '12:00'),
    durationMinutes: 45,
    effectiveDurationMinutes: 45,
    flexibility: 'fixed',
    priority: 'medium',
    urgency: 'medium',
    status: 'pending',
  },
  {
    id: 'ff-warn-003',
    source: 'google_calendar',
    type: 'calendar_event',
    commitmentType: 'TIMED_EVENT',
    title: 'Product Review — Design Critique',
    date: TODAY,
    startDateTime: iso(TODAY, '14:00'),
    endDateTime:   iso(TODAY, '15:30'),
    startTime: '14:00',
    endTime: '15:30',
    durationMinutes: 90,
    effectiveDurationMinutes: 90,
    flexibility: 'flexible',
    priority: 'medium',
    status: 'confirmed',
  },
  {
    id: 'ff-warn-004',
    source: 'manual',
    type: 'manual_task',
    commitmentType: 'TIMED_EVENT',
    title: 'Write Documentation — API v2',
    date: TODAY,
    startDateTime: iso(TODAY, '10:00'),
    endDateTime:   iso(TODAY, '12:00'),
    durationMinutes: 120,
    effectiveDurationMinutes: 120,
    flexibility: 'flexible',
    priority: 'medium',
    urgency: 'low',
    status: 'pending',
  },
  {
    id: 'ff-warn-005',
    source: 'google_calendar',
    type: 'calendar_event',
    commitmentType: 'TIMED_EVENT',
    title: 'Lunch with Sarah (Networking)',
    date: TODAY,
    startDateTime: iso(TODAY, '12:30'),
    endDateTime:   iso(TODAY, '13:30'),
    startTime: '12:30',
    endTime: '13:30',
    durationMinutes: 60,
    effectiveDurationMinutes: 60,
    flexibility: 'flexible',
    priority: 'low',
    urgency: 'low',
    status: 'confirmed',
    notes: 'Could reschedule to next week',
  },
  {
    id: 'ff-warn-006',
    source: 'manual',
    type: 'manual_task',
    commitmentType: 'DEADLINE',
    title: 'Code Review — Auth Service PR',
    date: TODAY,
    startDateTime: iso(TODAY, '16:00'),
    endDateTime:   iso(TODAY, '16:00'),
    durationMinutes: 60,
    effectiveDurationMinutes: 60,
    flexibility: 'flexible',
    priority: 'medium',
    urgency: 'medium',
    status: 'pending',
    notes: 'Blocking teammate — try to prioritise',
  },
  {
    id: 'ff-warn-007',
    source: 'manual',
    type: 'manual_task',
    commitmentType: 'TIMED_EVENT',
    title: 'Prepare Slides for Tomorrow\'s Demo',
    date: TODAY,
    startDateTime: iso(TODAY, '17:00'),
    endDateTime:   iso(TODAY, '18:30'),
    durationMinutes: 90,
    effectiveDurationMinutes: 90,
    flexibility: 'flexible',
    priority: 'high',
    urgency: 'high',
    status: 'pending',
  },
];

// ─── Scenario registry ────────────────────────────────────────────────────────

/**
 * All available mock scenarios keyed by identifier.
 *
 * @type {Record<string, { label: string, description: string,
 *                         commitments: object[], expectedLevel: string }>}
 */
export const FIREFIGHTER_SCENARIOS = {
  student_emergency: {
    label:       'Student Chaos Day',
    description: 'Three deadlines, two lectures, a study group, and a part-time shift.',
    commitments: MOCK_STUDENT_EMERGENCY,
    expectedLevel: 'critical',
  },
  professional_emergency: {
    label:       'Professional Crunch Day',
    description: 'Board presentation, $2M client call, hiring interview — all on the same day.',
    commitments: MOCK_PROFESSIONAL_EMERGENCY,
    expectedLevel: 'high',
  },
  warning_day: {
    label:       'Warning: Near Capacity',
    description: 'Day is slightly over capacity — a nudge before it becomes a crisis.',
    commitments: MOCK_WARNING_DAY,
    expectedLevel: 'moderate',
  },
};

/**
 * Returns the commitments for a given scenario key.
 * Throws if the key is unknown.
 *
 * @param {string} scenarioKey - One of the FIREFIGHTER_SCENARIOS keys.
 * @returns {object[]}
 */
export function getMockScenario(scenarioKey) {
  const scenario = FIREFIGHTER_SCENARIOS[scenarioKey];
  if (!scenario) {
    throw new Error(
      `Unknown firefighter scenario: "${scenarioKey}". ` +
      `Valid keys: ${Object.keys(FIREFIGHTER_SCENARIOS).join(', ')}`
    );
  }
  return scenario.commitments;
}
