/**
 * conversationRouter.js
 *
 * Executive Conversation Layer — client-side intent classifier.
 *
 * Responsibilities:
 *   1. Classify user messages into a known intent string.
 *
 * What this module does NOT do:
 *   - Does NOT assemble engine context (see EngineContextFactory.js)
 *   - Does NOT call any engine or API
 *   - Does NOT duplicate any intelligence logic
 *
 * The intent produced here is treated as a HINT by the server.
 * The server re-validates intent independently before building its prompt.
 */

// ─── Intent registry ──────────────────────────────────────────────────────────
// Order matters: firefighter and rescue before planning/general to avoid
// stress/overwhelm phrases falling through to a weaker match.

const INTENT_PATTERNS = [
  {
    // Acute stress, overwhelm, emergencies, sudden deadline changes.
    intent: 'firefighter',
    patterns: [
      /overwhelm|stressed|exhausted|burnt.?out|burning out|drowning|can'?t keep up|too much (work|on my plate)/i,
      /emergency|crisis|urgent|panic|drop everything|help.{0,10}now|SOS/i,
      /professor moved|deadline (moved|changed|shifted)|exam moved|meeting cancelled/i,
      /surprise|unexpected|everything.{0,15}(fell|falling) apart|disaster/i,
      /i'?m (stressed|dying|losing it|freaking out|struggling|overwhelmed)/i,
    ],
  },
  {
    // Day recovery — missed time, running late, need to catch up.
    intent: 'rescue',
    patterns: [
      /rescue (my|the)? ?(schedule|day|plan|morning)|save (my|the)? ?(day|schedule|morning)/i,
      /get (me )?back on track|fix (today|my day|the schedule|this mess)/i,
      /missed|behind|falling behind|lost (my )?morning|overslept|wasted (the|my)/i,
      /too late (to|for)|already \d+(am|pm| ?hours?)|catch up|day is broken/i,
      /everything.{0,20}behind|running late|start over/i,
    ],
  },
  {
    // Hypothetical / simulation queries.
    intent: 'whatif',
    patterns: [
      /what (if|would happen if|happens if)|simulate|consequences? of/i,
      /if i (skip|drop|cancel|delay|sleep|add|take|postpone|push)/i,
      /sleep (until|in|an extra|one more)|postpone .{3,40}/i,
      /what (would|will) (happen|change) (if|when)/i,
      /should i (lock|block|skip|cancel|drop|delay|postpone)/i,
    ],
  },
  {
    // Schedule building, blocking focus time, organising the day.
    intent: 'planning',
    patterns: [
      /plan (my|the|today|tomorrow|this week|next)|replan|build (my|a) (plan|schedule|day)/i,
      /schedule (my|today|tomorrow|the day)|optimize( my| the)? (day|schedule|week)/i,
      /lock (my|the)? ?(schedule|calendar|day)|block (my|the)? ?(calendar|time|schedule)/i,
      /protect (my )?(focus|deep work|morning|time)|organize (my|the)? ?(day|week|schedule)/i,
      /free time|i have time|help me plan|create a schedule|plan tomorrow|structure my/i,
      /what (should i|do i) (do|work on|focus on) (today|tomorrow|first|next)/i,
    ],
  },
  {
    // Explanation and reasoning queries.
    intent: 'explain',
    patterns: [
      /why (did|is|are|was|were|have)|explain|what caused|how come|reason (for|why)/i,
      /why (did you|you) (move|schedule|place|put|change|block|recommend)/i,
      /why (is this|this is) (blocked|scheduled|here|recommended|flagged)/i,
      /explain (this|the|my) (plan|schedule|recommendation|block|conflict)/i,
      /what does this mean|why (today|this slot|this time)/i,
    ],
  },
  {
    // Retrospective / review / weekly summaries.
    intent: 'reflection',
    patterns: [
      /review (my|the|today|this week|the week|yesterday)|weekly review|week(ly)? summary/i,
      /summarize (my|the) (week|day|today)|how (did|was) (my|the) (week|day|today)/i,
      /reflect (on|over)? ?(today|this week|my week|the day)|end of (day|week)/i,
      /what (did i|have i) (accomplish|complete|finish|do) (today|this week)/i,
      /mistakes i (made|keep making)|pattern(s)? (i|in my)/i,
      /look back|in retrospect|how was (today|my week|this week)/i,
    ],
  },
  {
    // Productivity, progress, blockers, priorities.
    intent: 'productivity',
    patterns: [
      /how (productive|efficient|effective) (have i|am i|was i|have i been)/i,
      /productivity|am i (productive|on track|making progress)|my (progress|performance)/i,
      /biggest (blocker|risk|problem|issue|concern)|what('s| is) blocking (me|my)/i,
      /what should i (do|focus on|tackle|start|prioritize) (first|next|now)/i,
      /highest.{0,10}priority|top priority|most important (task|thing)/i,
      /how am i doing|track record|performance (today|this week|overall)/i,
    ],
  },
];

export const VALID_INTENTS = [
  'planning', 'explain', 'rescue', 'firefighter',
  'whatif', 'reflection', 'productivity', 'general',
];

/**
 * Classify a raw user message into one of the known intent strings.
 * Falls back to 'general' when no pattern matches.
 *
 * @param {string} message
 * @returns {string} intent
 */
export function classifyIntent(message) {
  const msg = (message || '').trim();
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(msg))) return intent;
  }
  return 'general';
}
