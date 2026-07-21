/**
 * server/src/routes/intelligence.js
 *
 * Gemini-powered Intelligence Center endpoint.
 *
 * Receives:
 *   - question        string          User's natural-language question
 *   - chronosReport   object          Full pre-computed ChronosReport (all engine outputs)
 *   - executiveReport object          Pre-computed ExecutiveReport from executiveAgent
 *   - history         array           Previous conversation turns [ { role, text } ]
 *   - lifeMode        string          'school' | 'college' | 'professional'
 *
 * Gemini is responsible for:
 *   - explanation, prioritization, tradeoffs, negotiation,
 *     daily narrative, recommendations
 *
 * Gemini is NOT responsible for:
 *   - calculations, scoring, or running engine logic
 *
 * Returns:
 *   {
 *     answer           string
 *     narrative        string | null
 *     recommendations  { title, body, urgency }[]
 *     tradeoffs        { option, pro, con }[]
 *     suggestedQuestions string[]
 *     confidence       number        0–100
 *     enginesReferenced string[]
 *   }
 */

import { Router } from 'express';
import { groq } from '../lib/groq.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Trim a report section to essential fields to keep the prompt within token limits.
 */
function slimReport(chronosReport, executiveReport) {
  if (!chronosReport) return {};
  const {
    capacityReport,
    realityReport,
    conflictReport,
    blockerReport,
    plannerReport,
    rescueReport,
    firefighterReport,
    completionStats,
    meta,
  } = chronosReport;

  return {
    meta: {
      today: meta?.today,
      todayCommitmentCount: meta?.todayCommitmentCount ?? 0,
      totalCommitments: meta?.totalCommitments ?? 0,
    },
    executive: {
      summary:    executiveReport?.summary,
      urgency:    executiveReport?.urgency,
      confidence: executiveReport?.confidence,
      priorities: (executiveReport?.priorities ?? []).slice(0, 5).map(p => ({
        rank: p.rank, title: p.title, reason: p.reason, urgency: p.urgency, engine: p.engine,
      })),
      alerts: (executiveReport?.alerts ?? []).map(a => ({
        type: a.type, title: a.title, body: a.body, urgency: a.urgency,
      })),
    },
    capacity: {
      score:           capacityReport?.score,
      status:          capacityReport?.status,
      recommendation:  capacityReport?.recommendation,
      mentalLoad:      capacityReport?.mentalLoad,
      switchCount:     capacityReport?.switchCount,
    },
    realityGap: {
      severity:       realityReport?.severity,
      summary:        realityReport?.summary,
      recommendation: realityReport?.recommendation,
    },
    conflicts: {
      totalConflicts: conflictReport?.totalConflicts ?? 0,
      highSeverity:   conflictReport?.highSeverity ?? false,
      summary:        conflictReport?.summary,
      topConflicts:   (conflictReport?.conflicts ?? []).slice(0, 3).map(c => ({
        title: c.title, severity: c.severity, description: c.description,
      })),
    },
    blockers: {
      totalBlocked:    blockerReport?.totalBlockedCount ?? 0,
      criticalCount:   blockerReport?.criticalBlockers?.totalCritical ?? 0,
      overallSeverity: blockerReport?.overallSeverity,
      summary:         blockerReport?.summary,
      topBlocked:      (blockerReport?.blockedTasks ?? []).slice(0, 3).map(t => ({
        title: t.title || t.name,
        blockerDescription: t._blocker?.description,
        waitingDays: t._blocker?.waitingDays,
      })),
    },
    planner: {
      score:   plannerReport?.score,
      summary: plannerReport?.summary,
      actions: (plannerReport?.actions ?? []).slice(0, 5).map(a => ({
        type: a.type, title: a.title, explanation: a.explanation, suggestedTime: a.suggestedTime,
      })),
    },
    rescue: {
      activated:                  rescueReport?.activated ?? false,
      severity:                   rescueReport?.severity,
      summary:                    rescueReport?.summary,
      commitmentsPostponed:       rescueReport?.commitmentsPostponed,
      estimatedStressReduction:   rescueReport?.estimatedStressReduction,
    },
    firefighter: {
      isActive:     firefighterReport?.isActive ?? false,
      triggerReason: firefighterReport?.triggerReason,
      severity:     firefighterReport?.severity?.level,
    },
    completion: {
      pct:            completionStats?.pct ?? 0,
      completedCount: completionStats?.completedCount ?? 0,
      totalCount:     completionStats?.totalCount ?? 0,
    },
  };
}

function buildConversationContext(history) {
  if (!history?.length) return '';
  const turns = history.slice(-6); // last 6 turns to stay within token budget
  return turns.map(t => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}`).join('\n');
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { question, chronosReport, executiveReport, history = [], lifeMode = 'college' } = req.body;

  if (!question?.trim()) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  const slim = slimReport(chronosReport, executiveReport);
  const conversationContext = buildConversationContext(history);

  const prompt = `You are Chronos Intelligence — the AI brain of a personal scheduling system called Chronos.
You have access to real-time analysis from Chronos's deterministic engines (Capacity, Reality Gap, Conflict, Planner, Rescue, Firefighter, Blocker Breaker).
You do NOT recalculate. You only interpret, explain, prioritise, and recommend using the data provided.

USER LIFE MODE: ${lifeMode}

CURRENT CHRONOS STATE (pre-computed engine outputs):
${JSON.stringify(slim, null, 2)}

${conversationContext ? `CONVERSATION HISTORY:\n${conversationContext}\n` : ''}
USER QUESTION: "${question}"

Your job:
1. Answer the question directly and personally — refer to specific commitments, times, conflicts, and blockers from the data.
2. Explain WHY in plain language (not jargon).
3. Surface tradeoffs when relevant (e.g. "If you postpone X you gain Y but risk Z").
4. Give concrete, actionable recommendations — not generic advice.
5. End with 2–3 follow-up questions the user might want to ask next.

Tone: direct, intelligent, warm — like a smart chief-of-staff who knows your schedule deeply.
Do NOT be generic. Do NOT invent data not in the report. If data is missing, say so.

Respond ONLY with valid JSON matching this exact schema:
{
  "answer": "Direct answer to the question in 2–4 sentences",
  "narrative": "Optional 1–3 sentence daily story arc (null if not relevant)",
  "recommendations": [
    { "title": "short title", "body": "concrete recommendation", "urgency": "critical|high|medium|low|normal" }
  ],
  "tradeoffs": [
    { "option": "what you could do", "pro": "benefit", "con": "cost or risk" }
  ],
  "suggestedQuestions": [
    "Follow-up question 1?",
    "Follow-up question 2?",
    "Follow-up question 3?"
  ],
  "confidence": 0,
  "enginesReferenced": ["Capacity", "Rescue"]
}

Rules:
- recommendations: 1–4 items, only if genuinely helpful
- tradeoffs: 0–3 items, only if there is a real choice to make
- suggestedQuestions: always exactly 3
- confidence: 0–100, reflecting how well the data answers the question
- enginesReferenced: which engine outputs you drew from`;

  try {
    const data = await groq(prompt);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
