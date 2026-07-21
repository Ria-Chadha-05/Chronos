/**
 * server/src/routes/converse.js
 *
 * Executive Conversation Layer — Gemini endpoint.
 *
 * Receives:
 *   - message        string   Raw user message
 *   - intentHint     string   Client's classified intent (treated as hint only)
 *   - engineContext  object   Pre-sanitized engine context from EngineContextFactory
 *   - history        array    Last N turns [ { role: 'user'|'assistant', text } ]
 *   - lifeMode       string
 *
 * Returns:
 *   {
 *     reply        string
 *     suggestions  string[]   Always exactly 3
 *     actions      { type, label, route }[]   Typed navigation actions
 *     enginesUsed  string[]
 *     intent       string     The intent the server actually used (may differ from hint)
 *   }
 *
 * STREAMING READINESS:
 *   The route sets X-Supports-Streaming: true so clients can detect future capability.
 *   When true streaming is enabled, replace the JSON response with SSE chunks:
 *     data: { chunk: "..." }\n\n   (partial reply text)
 *     data: { done: true, metadata: {...} }\n\n
 *   The response schema above is the final-message schema in both modes.
 *   No client-side API changes are needed to upgrade to streaming.
 *
 * ARCHITECTURE:
 *   - Gemini receives pre-sanitized context only — never raw ChronosReport.
 *   - Server re-verifies intent independently of the client hint.
 *   - No engine logic runs on the server side. All data is pre-computed client-side.
 */

import { Router } from 'express';
import { groqWithTools, groqJSON } from '../lib/groq.js';
import { AGENT_TOOLS, executeTool } from '../lib/agentTools.js';

const router = Router();

// ─── Intent registry (mirrors client-side but is authoritative) ───────────────
// The server classifies intent from the raw message independently.
// The client hint is used as a tiebreaker when the message is ambiguous.

// ─── Intent registry (authoritative — mirrors client patterns) ────────────────
// Order matters: firefighter and rescue before planning/general.

const SERVER_INTENT_PATTERNS = [
  {
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

const VALID_INTENTS = new Set([
  'planning', 'explain', 'rescue', 'firefighter',
  'whatif', 'reflection', 'productivity', 'general',
]);

/**
 * Verify and normalise the intent.
 * The client hint is accepted only if it is a valid known intent.
 * The server then independently pattern-matches; if it finds a match
 * that differs from the hint, the server classification wins.
 * Falls back to 'general' when ambiguous.
 */
function resolveIntent(message, intentHint) {
  const msg = (message || '').trim();

  // Server-side classification
  for (const { intent, patterns } of SERVER_INTENT_PATTERNS) {
    if (patterns.some(p => p.test(msg))) return intent;
  }

  // Ambiguous — trust the client hint if it is valid
  if (intentHint && VALID_INTENTS.has(intentHint)) return intentHint;

  return 'general';
}

// ─── Action type registry ─────────────────────────────────────────────────────
// Gemini returns action types from this set; the client maps type → route.
// Adding a new action never requires a server change.

const ACTION_TYPES = {
  OPEN_PLAN:         { label: 'Open Plan',       route: '/plan' },
  OPEN_RESCUE:       { label: 'Open Rescue',     route: '/rescue' },
  OPEN_FIREFIGHTER:  { label: 'Open Firefighter',route: '/firefighter' },
  OPEN_WHATIF:       { label: 'Simulate It',     route: '/consequence' },
  OPEN_REFLECT:      { label: 'Open Reflect',    route: '/reflect' },
  OPEN_REVIEW:       { label: 'Open Review',     route: '/review' },
  OPEN_TASKS:        { label: 'Open Tasks',      route: '/tasks' },
  OPEN_DASHBOARD:    { label: 'Open Dashboard',  route: '/dashboard' },
  OPEN_INTELLIGENCE: { label: 'Intelligence Center', route: '/intelligence' },
};

const VALID_ACTION_TYPES = Object.keys(ACTION_TYPES);

/**
 * Normalise actions returned by Gemini.
 * Gemini only needs to return the type string; label and route come from the
 * server registry so neither the model nor the client hardcodes routes.
 */
function normaliseActions(rawActions) {
  if (!Array.isArray(rawActions)) return [];
  return rawActions
    .slice(0, 2)
    .filter(a => a?.type && VALID_ACTION_TYPES.includes(a.type))
    .map(a => ({
      type:  a.type,
      label: ACTION_TYPES[a.type].label,
      route: ACTION_TYPES[a.type].route,
    }));
}

// ─── Intent → engine labels (for prompt context only) ────────────────────────

const INTENT_ENGINE_LABELS = {
  planning:     'PlannerEngine, CapacityEngine, ConflictEngine',
  explain:      'ExplanationEngine, ChronosReport, ExecutiveAgent',
  rescue:       'RescueEngine, PlannerEngine',
  firefighter:  'FirefighterEngine, RescueEngine, BlockerBreaker',
  whatif:       'ConsequenceSimulator, CapacityEngine',
  reflection:   'ReflectionEngine, StatisticsEngine, StreakEngine',
  productivity: 'BlockerBreaker, CapacityEngine, ExecutiveAgent',
  general:      'Full ChronosReport',
};

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(intent, lifeMode) {
  return `You are Chronos Executive — the AI chief-of-staff inside a personal scheduling system.

Life mode: ${lifeMode || 'college'}
Intent: ${intent}
Data sources: ${INTENT_ENGINE_LABELS[intent] || 'ChronosReport'}

Tone:
- Direct and confident. Never hedge with "I think maybe".
- Reference specific tasks, times, and conflicts from the data supplied.
- Never invent facts not present in the engine data.
- If data is sparse, say exactly what is missing.
- No generic motivational filler. No repeating the user's question.

YOU ARE AN AGENT — you can act, not just recommend:
- Use create_calendar_event / reschedule_calendar_event when the user wants a
  concrete scheduling change made. Do it — don't just describe what you'd do.
- Use activate_rescue_mode / activate_firefighter_mode when the situation
  clearly calls for it — don't ask permission first, just activate and explain why.
- Use draft_email when the user wants to communicate something by email.
  IMPORTANT: draft_email only ever creates a draft. You can NEVER send an email.
  Sending requires the user's explicit confirmation in the UI after you draft it.
  Never claim in your reply that an email has been sent — say it's "drafted and
  ready for your review" instead.
- If a tool call fails (e.g. missing Google access), tell the user plainly what
  went wrong and what they need to do (e.g. reconnect their Google account).
- Only call tools that genuinely serve the user's request. Don't create events
  or drafts speculatively.

Output: valid JSON only. No markdown. No preamble.`;
}

function buildAgentUserPrompt(message, engineContext, history) {
  const historyBlock = (history || [])
    .slice(-6)
    .map(t => `${t.role === 'user' ? 'User' : 'Chronos'}: ${t.text}`)
    .join('\n');

  return `${historyBlock ? `CONVERSATION HISTORY:\n${historyBlock}\n\n` : ''}ENGINE DATA (pre-computed — do not recalculate or alter):
${JSON.stringify(engineContext || {}, null, 2)}

USER: "${message}"

Decide whether any tools are needed to fulfill this request, and call them if so.
If no tool is needed, don't call anything — you'll be asked for the final reply next.`;
}

function buildFinalReplyInstruction() {
  return `Now produce the final response as JSON only, no markdown, no preamble:
{
  "reply": "2–5 sentence answer. Reference specific data. No bullet lists.",
  "suggestions": [
    "Follow-up question 1?",
    "Follow-up question 2?",
    "Follow-up question 3?"
  ],
  "actions": [
    { "type": "OPEN_RESCUE" }
  ],
  "enginesUsed": ["RescueEngine", "CapacityEngine"]
}

Rules:
- reply: required. 2–5 sentences. Prose only.
  - If you executed any tools above, describe what you did in past tense
    ("I've created...", "I've drafted...", "I've activated...").
  - If a tool call failed, explain plainly what went wrong.
  - NEVER claim to have sent an email — only ever "drafted".
- suggestions: always exactly 3 short questions.
- actions: 0–2 items. Only include when navigating a screen would genuinely help.
  Valid action types: ${VALID_ACTION_TYPES.join(', ')}
- enginesUsed: which engine data you drew on.`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const {
    message,
    intentHint   = 'general',
    engineContext = {},
    history       = [],
    lifeMode      = 'college',
  } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'message is required.' });
  }

  // Google access token, forwarded per-request from the client. Chronos never
  // stores this — it's only held in memory for the lifetime of this request.
  const accessToken = req.get('X-Google-Access-Token') || null;

  // Server re-validates intent — client hint is a tiebreaker, not authority
  const intent = resolveIntent(message, intentHint);

  // Advertise streaming readiness without breaking current clients
  res.setHeader('X-Supports-Streaming', 'false');
  res.setHeader('X-Chronos-Intent', intent);

  const messages = [
    { role: 'system', content: buildSystemPrompt(intent, lifeMode) },
    { role: 'user',   content: buildAgentUserPrompt(message, engineContext, history) },
  ];

  const executedActions = [];
  let emailDraft = null;

  try {
    // Phase 1: tool-calling loop. Capped at 3 rounds so a confused model
    // can't loop forever; most requests resolve in 0-1 rounds.
    for (let round = 0; round < 3; round++) {
      const assistantMsg = await groqWithTools(messages, AGENT_TOOLS);
      messages.push(assistantMsg);

      if (!assistantMsg.tool_calls?.length) break;

      for (const call of assistantMsg.tool_calls) {
        let toolResultPayload;
        try {
          const args = JSON.parse(call.function.arguments || '{}');
          const { result, executedAction, emailDraft: draft } =
            await executeTool(call.function.name, args, { accessToken });
          if (executedAction) executedActions.push(executedAction);
          if (draft) emailDraft = draft;
          toolResultPayload = result;
        } catch (toolErr) {
          toolResultPayload = { error: toolErr.message };
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolResultPayload),
        });
      }
    }

    // Phase 2: final structured reply, informed by any tool results above.
    messages.push({ role: 'user', content: buildFinalReplyInstruction() });
    const data = await groqJSON(messages);

    res.json({
      reply:       (typeof data.reply === 'string' && data.reply) ? data.reply : 'No response generated.',
      suggestions: Array.isArray(data.suggestions) ? data.suggestions.slice(0, 3) : [],
      actions:     normaliseActions(data.actions),
      enginesUsed: Array.isArray(data.enginesUsed) ? data.enginesUsed : [],
      executedActions,  // real actions the agent performed this turn
      emailDraft,       // { id, to, subject, body } if a draft was created — client shows confirm popup
      intent,           // echo resolved intent back to client
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
