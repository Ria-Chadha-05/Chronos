/**
 * src/demo/index.js
 *
 * Public API for Chronos Demo Mode.
 *
 * Import from this file rather than the individual modules to keep import
 * paths stable as the demo layer evolves.
 *
 * @example
 * import {
 *   generateDemoCommitments,
 *   generateDemoStatistics,
 *   generateFullDemoState,
 *   DEMO_USER,
 * } from '../demo';
 */

// ── Generator functions ────────────────────────────────────────────────────────
export {
  generateDemoCommitments,
  generateDemoCalendarEvents,
  generateDemoGmailCommitments,
  generateDemoManualTasks,
  generateDemoOngoingProjects,
  generateDemoCommitmentsForDate,
  generateDemoStatistics,
  generateDemoPlanner,
  generateDemoInsights,
  generateDemoRescue,
  generateDemoReflection,
  generateFullDemoState,
} from './demoGenerator.js';

// ── Raw datasets (use generators above in most cases) ─────────────────────────
export {
  DEMO_CALENDAR_EVENTS,
  DEMO_GMAIL_COMMITMENTS,
  DEMO_MANUAL_TASKS,
  DEMO_ONGOING_PROJECTS,
  ALL_DEMO_COMMITMENTS,
  DEMO_STATISTICS,
  DEMO_PLANNER_OUTPUT,
  DEMO_RESCUE_OUTPUT,
  DEMO_INSIGHTS,
  DEMO_REFLECTION,
} from './demoData.js';

// ── Synthetic demo user ────────────────────────────────────────────────────────

/**
 * A synthetic user object that mirrors the Firebase `user` shape used by
 * AuthContext. Inject into AuthContext to bypass Google sign-in in demo mode.
 *
 * @type {Object}
 */
export const DEMO_USER = {
  uid:         'demo-user-chronos',
  email:       'demo@chronos.app',
  displayName: 'Alex (Demo)',
  photoURL:    null,
  isDemo:      true,
};
