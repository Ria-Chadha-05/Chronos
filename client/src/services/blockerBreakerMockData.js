/**
 * blockerBreakerMockData.js
 *
 * Realistic mock data for the Blocker Breaker subsystem.
 *
 * Scenarios covered:
 *  1. Research Paper (blocked by professor approval and dataset access)
 *  2. Hackathon (blocked by teammate, API access, and code review)
 *  3. Placement Interview (blocked by recruiter reply and HR documents)
 *  4. Team Project (blocked by client feedback and design review)
 *  5. Internship (blocked by offer letter and joining documents)
 *  6. College Assignment (blocked by professor sign-off and library access)
 *
 * ▸ Zero external imports.
 * ▸ Exported as named constants for use in demos and component dev.
 */

// ─── Scenario 1: Research Paper ───────────────────────────────────────────────

export const researchPaperTasks = [
  {
    id: 'rp-1',
    title: 'Topic Finalisation',
    status: 'done',
    tags: ['research'],
    deadline: null,
  },
  {
    id: 'rp-2',
    title: 'Professor Approval',
    status: 'waiting',
    tags: ['blocked', 'approval'],
    blockedBy: null,
    waitingFor: 'Professor Dr. Mehta',
    blockerDescription: 'Waiting for professor approval on research direction',
    waitingSince: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })(),
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 4); return d.toISOString().slice(0, 10); })(),
    dependencyType: 'approval',
    contactRole: 'professor',
    expectedResolutionDate: (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); })(),
  },
  {
    id: 'rp-3',
    title: 'Dataset Access Request',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['rp-2'],
    waitingFor: 'University IT Portal',
    blockerDescription: 'Dataset access requires professor approval first',
    waitingSince: (() => { const d = new Date(); d.setDate(d.getDate() - 4); return d.toISOString().slice(0, 10); })(),
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); })(),
    dependencyType: 'dataset',
  },
  {
    id: 'rp-4',
    title: 'Run Experiments',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['rp-3'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 8); return d.toISOString().slice(0, 10); })(),
    estimatedMinutes: 300,
  },
  {
    id: 'rp-5',
    title: 'Write Results Section',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['rp-4'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 12); return d.toISOString().slice(0, 10); })(),
    estimatedMinutes: 180,
  },
  {
    id: 'rp-6',
    title: 'Paper Submission',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['rp-5'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); })(),
  },
  {
    id: 'rp-7',
    title: 'Write Introduction & Literature Review',
    status: 'in_progress',
    tags: ['research'],
    deadline: null,
    estimatedMinutes: 240,
  },
];

// ─── Scenario 2: Hackathon ────────────────────────────────────────────────────

export const hackathonTasks = [
  {
    id: 'hk-1',
    title: 'API Key for OpenAI Integration',
    status: 'waiting',
    tags: ['blocked', 'api'],
    waitingFor: 'Hackathon Organiser',
    blockerDescription: 'Waiting for sponsored API keys from event organisers',
    waitingSince: (() => { const d = new Date(); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); })(),
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })(),
    dependencyType: 'api',
    contactRole: 'organizer',
  },
  {
    id: 'hk-2',
    title: 'Backend API Integration',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['hk-1'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); })(),
    estimatedMinutes: 180,
  },
  {
    id: 'hk-3',
    title: "Teammate's UI Component",
    status: 'waiting',
    tags: ['blocked', 'waiting'],
    waitingFor: 'Priya (teammate)',
    blockerDescription: 'Waiting for Priya to complete the dashboard UI component',
    waitingSince: (() => { const d = new Date(); d.setDate(d.getDate() - 3); return d.toISOString().slice(0, 10); })(),
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })(),
    dependencyType: 'teammate',
    contactRole: 'teammate',
  },
  {
    id: 'hk-4',
    title: 'Final Demo Integration',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['hk-2', 'hk-3'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); })(),
    estimatedMinutes: 120,
  },
  {
    id: 'hk-5',
    title: 'Prepare README & Documentation',
    status: 'in_progress',
    tags: [],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); })(),
    estimatedMinutes: 60,
  },
];

// ─── Scenario 3: Placement Interview ─────────────────────────────────────────

export const placementTasks = [
  {
    id: 'pl-1',
    title: 'Awaiting Recruiter Reply — Round 2 Results',
    status: 'waiting',
    tags: ['blocked', 'interview'],
    waitingFor: 'Anjali Sharma (Recruiter, TechCorp)',
    blockerDescription: 'Waiting for recruiter to share Round 2 interview result',
    waitingSince: (() => { const d = new Date(); d.setDate(d.getDate() - 8); return d.toISOString().slice(0, 10); })(),
    deadline: null,
    dependencyType: 'interview',
    contactRole: 'recruiter',
  },
  {
    id: 'pl-2',
    title: 'Offer Letter Review',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['pl-1'],
    deadline: null,
    estimatedMinutes: 60,
  },
  {
    id: 'pl-3',
    title: 'Background Verification Documents',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['pl-1'],
    waitingFor: 'HR Team',
    blockerDescription: 'Cannot submit documents until offer letter is received',
    dependencyType: 'document',
    deadline: null,
  },
  {
    id: 'pl-4',
    title: 'Prepare Interview Answers for Round 3',
    status: 'in_progress',
    tags: ['interview'],
    deadline: null,
    estimatedMinutes: 150,
  },
  {
    id: 'pl-5',
    title: 'Research Company Culture & Values',
    status: 'done',
    tags: [],
    deadline: null,
  },
];

// ─── Scenario 4: Team Project ─────────────────────────────────────────────────

export const teamProjectTasks = [
  {
    id: 'tp-1',
    title: 'Client Feedback on Wireframes',
    status: 'waiting',
    tags: ['blocked', 'feedback'],
    waitingFor: 'Mr. Ravi Kapoor (Client)',
    blockerDescription: 'Sent wireframes 5 days ago. Awaiting client feedback before proceeding.',
    waitingSince: (() => { const d = new Date(); d.setDate(d.getDate() - 5); return d.toISOString().slice(0, 10); })(),
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); })(),
    dependencyType: 'feedback',
    contactRole: 'client',
  },
  {
    id: 'tp-2',
    title: 'High-Fidelity Design',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['tp-1'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); })(),
    estimatedMinutes: 240,
  },
  {
    id: 'tp-3',
    title: 'Code Review from Senior Dev',
    status: 'waiting',
    tags: ['blocked', 'review'],
    waitingFor: 'Karan (Senior Developer)',
    blockerDescription: 'PR submitted 3 days ago. No review yet.',
    waitingSince: (() => { const d = new Date(); d.setDate(d.getDate() - 3); return d.toISOString().slice(0, 10); })(),
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); })(),
    dependencyType: 'review',
    contactRole: 'teammate',
  },
  {
    id: 'tp-4',
    title: 'Merge and Deploy to Staging',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['tp-3'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); })(),
  },
  {
    id: 'tp-5',
    title: 'Write Unit Tests',
    status: 'in_progress',
    tags: [],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 4); return d.toISOString().slice(0, 10); })(),
    estimatedMinutes: 120,
  },
];

// ─── Scenario 5: Internship ───────────────────────────────────────────────────

export const internshipTasks = [
  {
    id: 'in-1',
    title: 'Internship Offer Letter',
    status: 'waiting',
    tags: ['blocked', 'document'],
    waitingFor: 'HR — StartupXYZ',
    blockerDescription: 'Verbal offer made 9 days ago. Written offer letter still not received.',
    waitingSince: (() => { const d = new Date(); d.setDate(d.getDate() - 9); return d.toISOString().slice(0, 10); })(),
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); })(),
    dependencyType: 'document',
    contactRole: 'manager',
  },
  {
    id: 'in-2',
    title: 'Internship NOC from College',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['in-1'],
    waitingFor: 'Academic Office',
    blockerDescription: 'College NOC requires the official offer letter',
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10); })(),
    dependencyType: 'document',
  },
  {
    id: 'in-3',
    title: 'Onboarding Paperwork',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['in-1', 'in-2'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 8); return d.toISOString().slice(0, 10); })(),
    estimatedMinutes: 90,
  },
  {
    id: 'in-4',
    title: 'First Day Preparation',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['in-3'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().slice(0, 10); })(),
  },
  {
    id: 'in-5',
    title: 'Learn Company Tech Stack',
    status: 'in_progress',
    tags: [],
    deadline: null,
    estimatedMinutes: 300,
  },
];

// ─── Scenario 6: College Assignment ──────────────────────────────────────────

export const collegeAssignmentTasks = [
  {
    id: 'ca-1',
    title: 'Library Journal Access',
    status: 'waiting',
    tags: ['blocked', 'document'],
    waitingFor: 'College Library Portal Admin',
    blockerDescription: 'Login credentials for journal database still not received after request 4 days ago',
    waitingSince: (() => { const d = new Date(); d.setDate(d.getDate() - 4); return d.toISOString().slice(0, 10); })(),
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); })(),
    dependencyType: 'dataset',
    contactRole: 'organizer',
  },
  {
    id: 'ca-2',
    title: 'Literature Review Section',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['ca-1'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 3); return d.toISOString().slice(0, 10); })(),
    estimatedMinutes: 180,
  },
  {
    id: 'ca-3',
    title: 'Professor Sign-off on Outline',
    status: 'waiting',
    tags: ['blocked', 'approval'],
    waitingFor: 'Prof. Desai',
    blockerDescription: 'Submitted outline for approval 7 days ago. No response yet.',
    waitingSince: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })(),
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })(),
    dependencyType: 'approval',
    contactRole: 'professor',
  },
  {
    id: 'ca-4',
    title: 'Main Body Writing',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['ca-2', 'ca-3'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); })(),
    estimatedMinutes: 360,
  },
  {
    id: 'ca-5',
    title: 'Final Submission',
    status: 'blocked',
    tags: ['blocked'],
    blockedBy: ['ca-4'],
    deadline: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })(),
  },
  {
    id: 'ca-6',
    title: 'Draft Introduction',
    status: 'in_progress',
    tags: [],
    deadline: null,
    estimatedMinutes: 60,
  },
];

// ─── Combined scenario (all tasks merged) ─────────────────────────────────────

export const allMockTasks = [
  ...researchPaperTasks,
  ...hackathonTasks,
  ...placementTasks,
  ...teamProjectTasks,
  ...internshipTasks,
  ...collegeAssignmentTasks,
];

/** Named demo scenarios for easy selection in the UI */
export const MOCK_SCENARIOS = [
  { id: 'research', label: 'Research Paper', tasks: researchPaperTasks, emoji: '📄' },
  { id: 'hackathon', label: 'Hackathon', tasks: hackathonTasks, emoji: '⚡' },
  { id: 'placement', label: 'Placement Interview', tasks: placementTasks, emoji: '💼' },
  { id: 'team', label: 'Team Project', tasks: teamProjectTasks, emoji: '👥' },
  { id: 'internship', label: 'Internship', tasks: internshipTasks, emoji: '🏢' },
  { id: 'college', label: 'College Assignment', tasks: collegeAssignmentTasks, emoji: '🎓' },
  { id: 'all', label: 'All Scenarios', tasks: allMockTasks, emoji: '🗂️' },
];
