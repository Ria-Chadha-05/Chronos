/**
 * useReviewConversation.ts
 *
 * Integration hook that connects the Executive Conversation
 * with the Review → Reflect → Learn subsystem.
 *
 * Detects review-related queries and routes them to ReviewConversationQueries
 * before the query reaches the AI layer, so answers are always grounded
 * in real data rather than hallucinated.
 *
 * Usage in the Executive Conversation:
 *
 *   const { handleReviewQuery, injectReviewContext } = useReviewConversation(report);
 *
 *   // Check if a user message is a review query
 *   const reviewAnswer = handleReviewQuery(userMessage);
 *   if (reviewAnswer) {
 *     // Use the deterministic answer — no AI needed
 *     appendMessage(reviewAnswer);
 *     return;
 *   }
 *
 *   // Otherwise, inject the review context into the AI system prompt
 *   const systemPrompt = baseSystemPrompt + injectReviewContext();
 */

import { useMemo } from 'react';
import {
  ReviewConversationQueries,
  EMPTY_REVIEW_REFLECTION_REPORT,
  type ReviewReflectionReport,
} from '../intelligence/review';

// ─── Query patterns ───────────────────────────────────────────────────────────

type QueryIntent =
  | 'summary'
  | 'positives'
  | 'issues'
  | 'patterns'
  | 'recommendations'
  | 'progress'
  | 'narrative'
  | 'none';

const QUERY_PATTERNS: Array<{ intent: QueryIntent; patterns: RegExp[] }> = [
  {
    intent: 'summary',
    patterns: [
      /review (my )?(day|week|month)/i,
      /how (did|was) (my )?(day|week|month)/i,
      /what happened (today|this week|this month)/i,
      /summarize (my )?(day|week|period)/i,
      /summary of (my )?(day|week|month)/i,
    ],
  },
  {
    intent: 'positives',
    patterns: [
      /what went well/i,
      /what (was|were) (good|positive|successful)/i,
      /what (did|have) I (do|done) well/i,
      /successes/i,
      /wins (today|this week)/i,
    ],
  },
  {
    intent: 'issues',
    patterns: [
      /what went wrong/i,
      /what (was|were) (bad|negative|problems?|issues?)/i,
      /where (did|have) I (struggle|fail)/i,
      /what (didn't|did not) work/i,
      /problems? (today|this week)/i,
    ],
  },
  {
    intent: 'patterns',
    patterns: [
      /what patterns/i,
      /what (do you|have you) noticed/i,
      /recurring (issues?|problems?|themes?)/i,
      /behavioral (patterns?|trends?)/i,
      /what (keeps|am I consistently)/i,
    ],
  },
  {
    intent: 'recommendations',
    patterns: [
      /what should I (improve|change|do differently)/i,
      /how (can|should) I improve/i,
      /coaching (advice|recommendations?)/i,
      /what (are|are your) recommendations/i,
      /what should I focus on/i,
      /advice for (next week|improvement)/i,
    ],
  },
  {
    intent: 'progress',
    patterns: [
      /how have I changed/i,
      /am I improving/i,
      /progress (over time|report)/i,
      /trends? (over time|in my (behavior|work))/i,
      /how (have|am) I (been|doing) (over|lately|recently)/i,
    ],
  },
  {
    intent: 'narrative',
    patterns: [
      /reflect on (today|this week|my (day|week))/i,
      /tell me about (today|this week|my (day|week))/i,
      /how was (my )?(day|week)/i,
      /walk me through (today|this week)/i,
    ],
  },
];

// ─── Intent detection ─────────────────────────────────────────────────────────

function detectQueryIntent(message: string): QueryIntent {
  const normalized = message.trim();
  for (const { intent, patterns } of QUERY_PATTERNS) {
    if (patterns.some(p => p.test(normalized))) {
      return intent;
    }
  }
  return 'none';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseReviewConversationResult {
  /**
   * Checks if a user message is a review-related query.
   * If yes, returns a deterministic answer grounded in report data.
   * If no, returns null (caller should handle via AI).
   */
  handleReviewQuery: (userMessage: string) => string | null;

  /**
   * Returns a context block to inject into the AI system prompt
   * so the AI can answer review-adjacent questions accurately.
   *
   * Call this when handleReviewQuery returns null.
   */
  injectReviewContext: () => string;

  /**
   * The detected intent of the last query (for debugging / logging).
   */
  detectIntent: (message: string) => QueryIntent;

  /**
   * Whether a valid (non-empty) review report is available.
   */
  hasReport: boolean;
}

/**
 * useReviewConversation
 *
 * @param report - The current ReviewReflectionReport, or null if not yet generated.
 */
export function useReviewConversation(
  report: ReviewReflectionReport | null,
): UseReviewConversationResult {
  const activeReport = report ?? EMPTY_REVIEW_REFLECTION_REPORT;
  const hasReport = !!(report && report.review && report.review.commitments.planned > 0);

  const handlers = useMemo(() => {
    function handleReviewQuery(userMessage: string): string | null {
      const intent = detectQueryIntent(userMessage);

      if (intent === 'none') return null;

      if (!hasReport) {
        return 'No review data is available yet. Run a period review first, then I can answer questions about what happened, what patterns I see, and how to improve.';
      }

      switch (intent) {
        case 'summary':
          return ReviewConversationQueries.getSummary(activeReport);
        case 'positives':
          return ReviewConversationQueries.getPositives(activeReport);
        case 'issues':
          return ReviewConversationQueries.getIssues(activeReport);
        case 'patterns':
          return ReviewConversationQueries.getPatterns(activeReport);
        case 'recommendations':
          return ReviewConversationQueries.getRecommendations(activeReport);
        case 'progress':
          return ReviewConversationQueries.getProgressOverTime(activeReport);
        case 'narrative':
          return ReviewConversationQueries.getNarrative(activeReport);
        default:
          return null;
      }
    }

    function injectReviewContext(): string {
      if (!hasReport) {
        return '\n\n[REVIEW CONTEXT: No review data available. If the user asks about their review, tell them to run a period review first.]\n';
      }
      return `\n\n[REVIEW CONTEXT]\n${activeReport.conversationContext}\n[/REVIEW CONTEXT]\n`;
    }

    function detectIntent(message: string): QueryIntent {
      return detectQueryIntent(message);
    }

    return { handleReviewQuery, injectReviewContext, detectIntent };
  }, [activeReport, hasReport]);

  return {
    ...handlers,
    hasReport,
  };
}

// ─── Standalone helpers (non-hook) ────────────────────────────────────────────

/**
 * Detect if a message is asking about review data without the React hook.
 * Useful in non-component contexts (e.g. server-side, tests).
 */
export function isReviewQuery(message: string): boolean {
  return detectQueryIntent(message) !== 'none';
}

/**
 * Answer a review query directly from a report without the hook.
 */
export function answerReviewQuery(
  message: string,
  report: ReviewReflectionReport | null,
): string | null {
  const intent = detectQueryIntent(message);
  if (intent === 'none') return null;

  if (!report || !report.review) {
    return 'No review data available. Run a period review first.';
  }

  switch (intent) {
    case 'summary':         return ReviewConversationQueries.getSummary(report);
    case 'positives':       return ReviewConversationQueries.getPositives(report);
    case 'issues':          return ReviewConversationQueries.getIssues(report);
    case 'patterns':        return ReviewConversationQueries.getPatterns(report);
    case 'recommendations': return ReviewConversationQueries.getRecommendations(report);
    case 'progress':        return ReviewConversationQueries.getProgressOverTime(report);
    case 'narrative':       return ReviewConversationQueries.getNarrative(report);
    default:                return null;
  }
}
