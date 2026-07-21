/**
 * IntelligenceCenter.jsx
 *
 * Gemini-powered Intelligence Center screen.
 *
 * Architecture:
 *   1. Reads ChronosReport (from generateChronosReport — no recomputation)
 *   2. Reads ExecutiveReport (from generateExecutiveReport — no recomputation)
 *   3. Sends both + user question to /api/intelligence (Gemini)
 *   4. Renders the response via presentational cards
 *
 * Gemini handles: explanation, prioritization, tradeoffs, narrative, recommendations
 * Deterministic engines handle: all scoring and calculations (already done)
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useChronos }     from '../context/ChronosContext.jsx';
import { useCommitments } from '../context/CommitmentContext.jsx';
import { useDemo }        from '../context/DemoContext.jsx';

import { generateChronosReport } from '../services/chronosReport.js';
import { generateExecutiveReport } from '../intelligence/executiveAgent.ts';
import { intelligence as askIntelligence } from '../lib/api.js';

import { Card, CardHeader, Button, ScreenHeader } from '../components/ui/index.jsx';

import ExecutiveSummaryCard from '../components/intelligence/ExecutiveSummaryCard.jsx';
import RiskCard             from '../components/intelligence/RiskCard.jsx';
import PriorityCard         from '../components/intelligence/PriorityCard.jsx';
import WhatChangedCard      from '../components/intelligence/WhatChangedCard.jsx';

// ─── Suggested questions ──────────────────────────────────────────────────────

const STARTER_QUESTIONS = [
  'What should I do today?',
  'Why is today difficult?',
  'What changed since yesterday?',
  'What is my biggest risk right now?',
  'What can I postpone without consequences?',
  'Which commitment is causing overload?',
  'How do I make today manageable?',
  'What would happen if I dropped one thing today?',
];

// ─── Urgency colors ───────────────────────────────────────────────────────────

const URGENCY_COLOR = {
  critical: 'var(--red)',
  high:     'var(--red)',
  medium:   'var(--amber)',
  low:      'var(--cyan)',
  normal:   'var(--green)',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '12px 16px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--cyan)',
          animation: `bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }`}</style>
    </div>
  );
}

function RecommendationRow({ rec }) {
  const color = URGENCY_COLOR[rec.urgency] || 'var(--muted)';
  return (
    <div style={{
      padding: '10px 12px',
      background: 'rgba(8,15,30,0.70)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      display: 'grid',
      gap: 3,
    }}>
      <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 800, color }}>{rec.title}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>{rec.body}</div>
    </div>
  );
}

function TradeoffRow({ tradeoff }) {
  return (
    <div style={{
      padding: '10px 13px',
      background: 'rgba(8,15,30,0.65)',
      border: '1px solid var(--border)',
      borderRadius: 10,
    }}>
      <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 800, color: 'var(--text)', marginBottom: 7 }}>
        {tradeoff.option}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ padding: '7px 9px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.18)', borderRadius: 8 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Pro</div>
          <div style={{ fontSize: 10, color: 'var(--text)', lineHeight: 1.4 }}>{tradeoff.pro}</div>
        </div>
        <div style={{ padding: '7px 9px', background: 'rgba(255,51,102,0.06)', border: '1px solid rgba(255,51,102,0.18)', borderRadius: 8 }}>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Risk</div>
          <div style={{ fontSize: 10, color: 'var(--text)', lineHeight: 1.4 }}>{tradeoff.con}</div>
        </div>
      </div>
    </div>
  );
}

function IntelligenceResponse({ response, onFollowUp }) {
  if (!response) return null;

  const {
    answer,
    narrative,
    recommendations = [],
    tradeoffs = [],
    suggestedQuestions = [],
    confidence = 0,
    enginesReferenced = [],
  } = response;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Main answer */}
      <div style={{
        padding: '18px 20px',
        background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(155,89,255,0.06))',
        border: '1px solid rgba(0,212,255,0.22)',
        borderRadius: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: narrative ? 10 : 0 }}>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.65, flex: 1 }}>{answer}</div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 11, fontWeight: 900, color: 'var(--cyan)', lineHeight: 1 }}>{confidence}%</div>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)', textTransform: 'uppercase' }}>confidence</div>
          </div>
        </div>
        {narrative && (
          <div style={{
            paddingTop: 10,
            borderTop: '1px solid rgba(0,212,255,0.12)',
            fontSize: 12,
            color: 'var(--muted)',
            fontStyle: 'italic',
            lineHeight: 1.55,
          }}>
            {narrative}
          </div>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
            Recommendations
          </div>
          <div style={{ display: 'grid', gap: 7 }}>
            {recommendations.map((rec, i) => <RecommendationRow key={i} rec={rec} />)}
          </div>
        </div>
      )}

      {/* Tradeoffs */}
      {tradeoffs.length > 0 && (
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
            Tradeoffs
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {tradeoffs.map((t, i) => <TradeoffRow key={i} tradeoff={t} />)}
          </div>
        </div>
      )}

      {/* Engines referenced */}
      {enginesReferenced.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Data from:
          </span>
          {enginesReferenced.map(e => (
            <span key={e} style={{
              fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px',
            }}>
              {e}
            </span>
          ))}
        </div>
      )}

      {/* Follow-up questions */}
      {suggestedQuestions.length > 0 && (
        <div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
            You might also ask
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp(q)}
                style={{
                  background: 'rgba(155,89,255,0.08)',
                  border: '1px solid rgba(155,89,255,0.28)',
                  borderRadius: 999,
                  padding: '5px 13px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  color: 'var(--purple)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  letterSpacing: '0.04em',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationTurn({ turn }) {
  const isUser = turn.role === 'user';

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isUser
          ? 'rgba(155,89,255,0.15)'
          : 'rgba(0,212,255,0.12)',
        border: isUser
          ? '1px solid rgba(155,89,255,0.35)'
          : '1px solid rgba(0,212,255,0.3)',
        fontFamily: 'Orbitron',
        fontSize: 10,
        color: isUser ? 'var(--purple)' : 'var(--cyan)',
      }}>
        {isUser ? 'U' : '🧠'}
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 'calc(100% - 48px)' }}>
        {isUser ? (
          <div style={{
            padding: '11px 15px',
            background: 'rgba(155,89,255,0.10)',
            border: '1px solid rgba(155,89,255,0.25)',
            borderRadius: '14px 14px 4px 14px',
            fontSize: 13,
            color: 'var(--text)',
            lineHeight: 1.55,
          }}>
            {turn.text}
          </div>
        ) : (
          <div style={{ borderRadius: '14px 14px 14px 4px', overflow: 'hidden' }}>
            {turn.loading ? (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.18)',
                borderRadius: 14,
              }}>
                <TypingIndicator />
              </div>
            ) : (
              <IntelligenceResponse response={turn.response} onFollowUp={turn.onFollowUp} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function IntelligenceCenter() {
  const { tasks, lifeMode, plan } = useChronos();
  const { commitments } = useCommitments();
  const { isDemoMode, demoState } = useDemo();

  const [question, setQuestion]   = useState('');
  const [history, setHistory]     = useState([]);   // { role: 'user'|'ai', text, response?, loading? }
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const inputRef     = useRef(null);
  const bottomRef    = useRef(null);
  const prevReportRef = useRef(null);

  // ── Step 1: Compute ChronosReport once (no engine logic here) ──────────────
  const chronosReport = useMemo(() =>
    generateChronosReport({ tasks, today: new Date().toISOString().slice(0, 10), isDemoMode, demoState }),
    [tasks, isDemoMode, demoState],
  );

  // ── Step 2: Executive Report (orchestration layer) ──────────────────────────
  const executiveReport = useMemo(
    () => generateExecutiveReport(chronosReport),
    [chronosReport],
  );

  // ── Step 3: Snapshot management (for WhatChanged) ──────────────────────────
  // Store previous snapshot in a ref so it survives re-renders without causing them
  const [prevSnapshot, setPrevSnapshot] = useState(null);
  const snapshotTaken = useRef(false);
  if (!snapshotTaken.current && chronosReport?.meta?.totalCommitments > 0) {
    // Take baseline snapshot once on first real data load
    // We don't set state here — just store in ref to avoid extra render
    prevReportRef.current = null; // will be set after user's first interaction
    snapshotTaken.current = true;
  }

  // ─── Send question to Gemini ─────────────────────────────────────────────

  const sendQuestion = useCallback(async (q) => {
    const trimmed = (q || question).trim();
    if (!trimmed || loading) return;

    setQuestion('');
    setError(null);

    // Save snapshot before this turn (for WhatChanged diffing)
    if (!prevSnapshot) {
      setPrevSnapshot(chronosReport);
    }

    const userTurn = { role: 'user', text: trimmed };
    const aiTurn   = { role: 'ai', loading: true, response: null, onFollowUp: sendQuestion };

    setHistory(h => [...h, userTurn, aiTurn]);
    setLoading(true);

    // Scroll to bottom
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const conversationHistory = history
        .filter(t => !t.loading)
        .map(t => ({
          role: t.role,
          text: t.role === 'user' ? t.text : (t.response?.answer ?? ''),
        }));

      const response = await askIntelligence({
        question: trimmed,
        chronosReport,
        executiveReport,
        history: conversationHistory,
        lifeMode,
      });

      setHistory(h => {
        const next = [...h];
        const lastIdx = next.length - 1;
        next[lastIdx] = { ...next[lastIdx], loading: false, response, onFollowUp: sendQuestion };
        return next;
      });
    } catch (e) {
      setError(e.message || 'Intelligence service unavailable.');
      setHistory(h => {
        const next = [...h];
        const lastIdx = next.length - 1;
        next[lastIdx] = {
          ...next[lastIdx],
          loading: false,
          response: {
            answer: 'Intelligence service encountered an error. Please try again.',
            narrative: null,
            recommendations: [],
            tradeoffs: [],
            suggestedQuestions: ['What should I do today?', 'What is my biggest risk?', 'What can I postpone?'],
            confidence: 0,
            enginesReferenced: [],
          },
          onFollowUp: sendQuestion,
        };
        return next;
      });
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [question, loading, chronosReport, executiveReport, history, lifeMode, prevSnapshot]);

  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  }, [sendQuestion]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setError(null);
    setPrevSnapshot(null);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  const hasConversation = history.length > 0;

  return (
    <div>
      <ScreenHeader
        eyebrow="Intelligence Center"
        title="Ask Your"
        highlight="AI Executive"
        sub="Ask anything about your schedule. Gemini interprets your live Chronos data."
      />

      {/* ── Dashboard cards (always visible) ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
        <ExecutiveSummaryCard
          executiveReport={executiveReport}
          onAskAI={(q) => { setQuestion(q || ''); inputRef.current?.focus(); }}
        />
        <RiskCard
          executiveReport={executiveReport}
          chronosReport={chronosReport}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
        <PriorityCard
          executiveReport={executiveReport}
          chronosReport={chronosReport}
          onAskAI={sendQuestion}
        />
        <WhatChangedCard
          prevReport={prevSnapshot}
          currReport={chronosReport}
          sinceLabel="since last session"
        />
      </div>

      {/* ── Conversation area ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="🧠 Intelligence Center">
          {hasConversation && (
            <Button variant="ghost" size="sm" onClick={clearHistory}>
              Clear conversation
            </Button>
          )}
        </CardHeader>

        {/* Starter questions (shown before first turn) */}
        {!hasConversation && (
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)',
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12,
            }}>
              Suggested questions
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STARTER_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendQuestion(q)}
                  style={{
                    background: 'rgba(0,212,255,0.06)',
                    border: '1px solid rgba(0,212,255,0.22)',
                    borderRadius: 999,
                    padding: '6px 14px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: 9,
                    color: 'var(--cyan)',
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    letterSpacing: '0.04em',
                  }}
                  onMouseEnter={e => {
                    e.target.style.background = 'rgba(0,212,255,0.12)';
                    e.target.style.borderColor = 'rgba(0,212,255,0.4)';
                  }}
                  onMouseLeave={e => {
                    e.target.style.background = 'rgba(0,212,255,0.06)';
                    e.target.style.borderColor = 'rgba(0,212,255,0.22)';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation history */}
        {hasConversation && (
          <div style={{
            display: 'grid',
            gap: 18,
            marginBottom: 20,
            maxHeight: 680,
            overflowY: 'auto',
            paddingRight: 4,
          }}>
            {history.map((turn, i) => (
              <ConversationTurn key={i} turn={turn} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255,51,102,0.08)',
            border: '1px solid rgba(255,51,102,0.26)',
            borderRadius: 10,
            fontSize: 11,
            color: 'var(--red)',
            marginBottom: 14,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Input area */}
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          padding: '14px 16px',
          background: 'rgba(8,15,30,0.70)',
          border: '1px solid var(--border)',
          borderRadius: 14,
        }}>
          <textarea
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your day, schedule, risks, priorities…"
            disabled={loading}
            rows={2}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 13,
              color: 'var(--text)',
              lineHeight: 1.55,
              minHeight: 42,
              maxHeight: 120,
              overflow: 'auto',
            }}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => sendQuestion()}
            disabled={loading || !question.trim()}
            style={{ flexShrink: 0, alignSelf: 'flex-end' }}
          >
            {loading ? '…' : '✦ Ask'}
          </Button>
        </div>

        {/* Footer hint */}
        <div style={{
          marginTop: 8,
          fontFamily: 'JetBrains Mono',
          fontSize: 7,
          color: 'var(--dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          textAlign: 'center',
        }}>
          Enter to send · Shift+Enter for new line · Powered by Gemini + Chronos Engine
        </div>
      </Card>
    </div>
  );
}
