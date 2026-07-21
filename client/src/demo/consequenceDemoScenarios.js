/**
 * consequenceDemoScenarios.js
 *
 * Realistic, pre-baked demo scenarios for the Deadline Consequence Simulator.
 * Independent of src/demo/demoData.js — does not modify or import it, so it
 * cannot create a circular dependency or collide with existing Demo Mode.
 *
 * Each entry pairs a small "current schedule" snippet with a scenario action,
 * ready to be fed straight into `simulateScenario()` from
 * `src/services/consequenceSimulatorEngine.js`.
 */

import { SCENARIO_TYPES } from '../services/consequenceSimulatorEngine.js';

/** Returns a YYYY-MM-DD string offset by `days` from today. */
function daysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const TODAY = daysFromToday(0);
const TOMORROW = daysFromToday(1);
const IN3DAYS = daysFromToday(3);
const IN5DAYS = daysFromToday(5);

/** A representative "today" schedule shared as the baseline for several scenarios. */
const BASE_SCHEDULE = [
  { id: 'sleep', title: 'Sleep', type: 'sleep', commitmentType: 'LIFE_ANCHOR', date: TODAY, startTime: '23:00', endTime: '07:00' },
  { id: 'class1', title: 'Power Electronics Lecture', type: 'class', date: TODAY, startTime: '09:00', endTime: '11:00' },
  { id: 'dsa', title: 'DSA Practice', type: 'study', date: TODAY, startTime: '17:00', endTime: '19:00' },
  { id: 'gym', title: 'Gym', type: 'gym', date: TODAY, startTime: '19:30', endTime: '20:30' },
  { id: 'dinner', title: 'Dinner', type: 'meal', date: TODAY, startTime: '20:45', endTime: '21:30' },
];

/**
 * 1. Accept Interview — collides with an existing study block.
 */
export const SCENARIO_ACCEPT_INTERVIEW = {
  label: 'Accept Interview',
  description: 'A Business Analyst interview slot lands right on top of evening DSA practice.',
  currentCommitments: BASE_SCHEDULE,
  scenario: {
    type: SCENARIO_TYPES.ACCEPT_MEETING,
    commitment: { id: 'interview', title: 'BA Intern Interview', type: 'interview', date: TODAY, startTime: '18:00', endTime: '19:00' },
  },
};

/**
 * 2. Add Hackathon — a multi-day, high-effort ongoing project.
 */
export const SCENARIO_ADD_HACKATHON = {
  label: 'Add Hackathon',
  description: 'A weekend hackathon would add a large ongoing-project workload over 3 days.',
  currentCommitments: BASE_SCHEDULE,
  scenario: {
    type: SCENARIO_TYPES.ADD_COMMITMENT,
    commitment: {
      id: 'hackathon',
      title: 'Smart India Hackathon',
      type: 'hackathon',
      commitmentType: 'ONGOING_PROJECT',
      date: TOMORROW,
      ongoingProject: { effortHoursPerDay: 6, preferredWorkWindow: 'any', workDays: [] },
    },
  },
};

/**
 * 3. Delay Assignment — pushing a deadline out by two days.
 */
export const SCENARIO_DELAY_ASSIGNMENT = {
  label: 'Delay Assignment',
  description: 'Pushing the Industrial Instrumentation assignment from tomorrow to in 3 days.',
  currentCommitments: [
    ...BASE_SCHEDULE,
    { id: 'assignment', title: 'ICICC19 Assignment', type: 'assignment', date: TOMORROW, startTime: '10:00', endTime: '12:00' },
  ],
  scenario: {
    type: SCENARIO_TYPES.DELAY_TASK,
    targetId: 'assignment',
    changes: { newDate: IN3DAYS, newStartTime: '10:00', newEndTime: '12:00' },
  },
};

/**
 * 4. Add Exam — a fixed, high-importance, non-movable commitment.
 */
export const SCENARIO_ADD_EXAM = {
  label: 'Add Exam',
  description: 'An end-semester exam is added on top of an already busy day.',
  currentCommitments: BASE_SCHEDULE,
  scenario: {
    type: SCENARIO_TYPES.ADD_COMMITMENT,
    commitment: { id: 'exam', title: 'Power Electronics End-Sem Exam', type: 'exam', date: TODAY, startTime: '14:00', endTime: '17:00' },
  },
};

/**
 * 5. Add Flight — a long, fixed travel block on a packed day.
 */
export const SCENARIO_ADD_FLIGHT = {
  label: 'Add Flight',
  description: 'A flight booking lands in the middle of the evening study + gym block.',
  currentCommitments: BASE_SCHEDULE,
  scenario: {
    type: SCENARIO_TYPES.ADD_COMMITMENT,
    commitment: { id: 'flight', title: 'Flight to Mumbai', type: 'flight', date: TODAY, startTime: '18:30', endTime: '21:00' },
  },
};

/**
 * 6. Add Doctor's Appointment — short, fixed, medium-importance.
 */
export const SCENARIO_ADD_DOCTOR = {
  label: "Add Doctor's Appointment",
  description: 'A doctor visit is squeezed in during the late afternoon.',
  currentCommitments: BASE_SCHEDULE,
  scenario: {
    type: SCENARIO_TYPES.ADD_COMMITMENT,
    commitment: { id: 'doctor', title: "Doctor's Appointment", type: 'doctor', date: TODAY, startTime: '16:30', endTime: '17:15' },
  },
};

/**
 * 7. Extend Meeting — a recurring sync runs long.
 */
export const SCENARIO_EXTEND_MEETING = {
  label: 'Extend Meeting',
  description: 'A team sync that was supposed to be 30 minutes is extended by 45.',
  currentCommitments: [
    ...BASE_SCHEDULE,
    { id: 'sync', title: 'Maruti QA Team Sync', type: 'meeting', date: TODAY, startTime: '15:00', endTime: '15:30', effectiveDurationMinutes: 30 },
  ],
  scenario: {
    type: SCENARIO_TYPES.EXTEND_DURATION,
    targetId: 'sync',
    changes: { deltaMinutes: 45 },
  },
};

/**
 * 8. Cancel Class — removing a fixed commitment to free up the morning.
 */
export const SCENARIO_CANCEL_CLASS = {
  label: 'Cancel Class',
  description: "Today's lecture is cancelled, freeing up the morning.",
  currentCommitments: BASE_SCHEDULE,
  scenario: {
    type: SCENARIO_TYPES.CANCEL_TASK,
    targetId: 'class1',
  },
};

/** Ordered list of all demo scenarios, ready for a picker UI. */
export const ALL_CONSEQUENCE_DEMO_SCENARIOS = [
  SCENARIO_ACCEPT_INTERVIEW,
  SCENARIO_ADD_HACKATHON,
  SCENARIO_DELAY_ASSIGNMENT,
  SCENARIO_ADD_EXAM,
  SCENARIO_ADD_FLIGHT,
  SCENARIO_ADD_DOCTOR,
  SCENARIO_EXTEND_MEETING,
  SCENARIO_CANCEL_CLASS,
];

export { IN5DAYS };
