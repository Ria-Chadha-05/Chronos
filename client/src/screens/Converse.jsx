/**
 * Converse.jsx
 *
 * Executive Conversation Layer — chat screen.
 *
 * Data flow (read-only — no engine calls):
 *   1. ChronosReport  ← generateChronosReport()  (same pattern as IntelligenceCenter)
 *   2. ExecutiveReport ← generateExecutiveReport()
 *   3. classifyIntent(message) → intentHint  (client-side hint)
 *   4. buildEngineContext(intentHint, { chronosReport, ... }) → engineContext  (EngineContextFactory)
 *   5. POST /api/converse { message, intentHint, engineContext, history, lifeMode }
 *   6. Server re-validates intent, calls Gemini, returns { reply, suggestions, actions, intent }
 *   7. Render response; actions array drives navigation buttons
 *
 * Features:
 *   - Session-only chat history (no persistence — resets on reload)
 *   - Typing indicator
 *   - Suggestion chips after each response
 *   - Structured action buttons (type-driven, never hardcoded routes)
 *   - Keyboard: Enter sends, Shift+Enter newline
 *   - Auto-scroll to latest message
 *   - Starter prompt grid when history is empty
 *   - Mobile responsive
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChronos }        from '../context/ChronosContext.jsx';
import { useCommitments }    from '../context/CommitmentContext.jsx';
import { useDemo }           from '../context/DemoContext.jsx';
import { generateChronosReport }  from '../services/chronosReport.js';
import { generateExecutiveReport } from '../intelligence/executiveAgent.ts';
import { classifyIntent }         from '../services/conversationRouter.js';
import { buildEngineContext }      from '../services/EngineContextFactory.js';
import { converse as converseApi, sendEmail as sendEmailApi } from '../lib/api.js';
import { useReviewConversation }   from '../hooks/useReviewConversation.ts';

// ─── Starter prompts ──────────────────────────────────────────────────────────

const STARTER_PROMPTS = [
  { label: 'What should I do first?',             icon: '⚡' },
  { label: 'Replan my day',                        icon: '⬟' },
  { label: 'Why is today overloaded?',             icon: '◎' },
  { label: 'I missed my morning — rescue me',     icon: '⚠' },
  { label: 'What are my biggest risks right now?', icon: '🔮' },
  { label: 'What if I sleep an extra hour?',      icon: '💭' },
  { label: 'How did I do today?',                 icon: '✦' },
  { label: 'What is blocking me?',                icon: '◈' },
];

// ─── Intent display metadata ──────────────────────────────────────────────────

const INTENT_META = {
  planning:     { label: 'PLANNING',     color: 'var(--cyan)',   icon: '⬟' },
  explain:      { label: 'EXPLAIN',      color: 'var(--purple)', icon: '◎' },
  rescue:       { label: 'RESCUE',       color: 'var(--amber)',  icon: '⚠' },
  firefighter:  { label: 'FIREFIGHTER',  color: 'var(--red)',    icon: '🔥' },
  whatif:       { label: 'WHAT-IF',      color: 'var(--purple)', icon: '🔮' },
  reflection:   { label: 'REFLECT',      color: 'var(--green)',  icon: '✦' },
  productivity: { label: 'PRODUCTIVITY', color: 'var(--cyan)',   icon: '⚡' },
  general:      { label: 'GENERAL',      color: 'var(--muted)',  icon: '◈' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '14px 18px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--cyan)',
          animation: `convBounce 1.1s ease-in-out ${i * 0.16}s infinite`,
        }} />
      ))}
      <style>{`@keyframes convBounce{0%,80%,100%{transform:translateY(0);opacity:.5}40%{transform:translateY(-7px);opacity:1}}`}</style>
    </div>
  );
}

function IntentBadge({ intent }) {
  const meta = INTENT_META[intent] || INTENT_META.general;
  return (
    <span style={{
      fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700,
      letterSpacing: '0.12em', color: meta.color,
      border: `1px solid ${meta.color}44`,
      borderRadius: 4, padding: '2px 6px',
      background: `${meta.color}10`,
    }}>
      {meta.icon} {meta.label}
    </span>
  );
}

/**
 * ActionButton — renders a single structured action.
 * Receives { type, label, route } from the server registry.
 * Never hardcodes routes client-side.
 */
function ActionButton({ action, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(action.route)}
      style={{
        padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
        border: '1px solid rgba(0,212,255,0.25)',
        background: 'rgba(0,212,255,0.08)',
        color: 'var(--cyan)', fontFamily: 'Orbitron',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
        transition: 'all 0.18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.16)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.08)'; }}
    >
      {action.label} →
    </button>
  );
}

function SuggestionChip({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      style={{
        padding: '6px 11px', borderRadius: 20, cursor: 'pointer',
        border: '1px solid rgba(0,212,255,0.18)',
        background: 'rgba(0,212,255,0.05)',
        color: 'var(--muted)', fontFamily: 'JetBrains Mono',
        fontSize: 10, letterSpacing: '0.03em',
        transition: 'all 0.18s', whiteSpace: 'nowrap', textAlign: 'left',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)';
        e.currentTarget.style.color = 'var(--cyan)';
        e.currentTarget.style.background = 'rgba(0,212,255,0.10)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(0,212,255,0.18)';
        e.currentTarget.style.color = 'var(--muted)';
        e.currentTarget.style.background = 'rgba(0,212,255,0.05)';
      }}
    >
      {text}
    </button>
  );
}

function ExecutedActions({ actions }) {
  if (!actions?.length) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {actions.map((a, i) => (
        <span key={i} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 8,
          border: '1px solid rgba(0,230,140,0.3)',
          background: 'rgba(0,230,140,0.08)',
          color: 'var(--green, #00e68c)', fontFamily: 'JetBrains Mono',
          fontSize: 10, letterSpacing: '0.02em',
        }}>
          ✓ {a.label}
        </span>
      ))}
    </div>
  );
}

function EmailDraftCard({ draft }) {
  const [status, setStatus] = useState('pending'); // pending | sending | sent | discarded | error
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSend = async () => {
    setStatus('sending');
    try {
      await sendEmailApi(draft.id);
      setStatus('sent');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send.');
      setStatus('error');
    }
  };

  return (
    <div style={{
      border: '1px solid rgba(255,180,0,0.3)',
      background: 'rgba(255,180,0,0.06)',
      borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontFamily: 'Orbitron', fontSize: 9, letterSpacing: '0.1em', color: 'var(--amber)' }}>
        EMAIL DRAFT — NOT SENT
      </div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>
        <div><strong>To:</strong> {draft.to}</div>
        <div><strong>Subject:</strong> {draft.subject}</div>
        <div style={{ marginTop: 6, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>{draft.body}</div>
      </div>

      {status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={handleSend} style={{
            padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.12)',
            color: 'var(--cyan)', fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
          }}>SEND</button>
          <button onClick={() => setStatus('discarded')} style={{
            padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
            color: 'var(--muted)', fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
          }}>DISCARD</button>
        </div>
      )}
      {status === 'sending' && <span style={{ fontSize: 10, color: 'var(--muted)' }}>Sending…</span>}
      {status === 'sent' && <span style={{ fontSize: 10, color: 'var(--green, #00e68c)' }}>✓ Sent</span>}
      {status === 'discarded' && <span style={{ fontSize: 10, color: 'var(--muted)' }}>Discarded — draft left in Gmail</span>}
      {status === 'error' && <span style={{ fontSize: 10, color: 'var(--red)' }}>⚠ {errorMsg}</span>}
    </div>
  );
}

function MessageBubble({ msg, onSuggestion, onNavigate }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{
          maxWidth: '72%', padding: '11px 16px',
          background: 'rgba(0,212,255,0.12)',
          border: '1px solid rgba(0,212,255,0.22)',
          borderRadius: '16px 16px 4px 16px',
          color: 'var(--text)', fontSize: 13, lineHeight: 1.5,
          fontFamily: 'JetBrains Mono',
        }}>
          {msg.text}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'rgba(0,212,255,0.12)',
          border: '1px solid rgba(0,212,255,0.25)',
          display: 'grid', placeItems: 'center',
          fontFamily: 'Orbitron', fontSize: 10, fontWeight: 900, color: 'var(--cyan)',
        }}>C</div>
        <span style={{ fontFamily: 'Orbitron', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.1em' }}>
          CHRONOS EXECUTIVE
        </span>
        {msg.intent && <IntentBadge intent={msg.intent} />}
        {msg.error && (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--red)' }}>⚠ ERROR</span>
        )}
      </div>

      {/* Reply bubble */}
      <div style={{
        padding: '14px 18px',
        background: 'rgba(8,15,30,0.8)',
        border: '1px solid rgba(0,212,255,0.12)',
        borderRadius: '4px 16px 16px 16px',
        color: 'var(--text)', fontSize: 13, lineHeight: 1.62,
      }}>
        {msg.text}
      </div>

      {/* Executed actions — things the agent actually did, not just suggested */}
      <ExecutedActions actions={msg.executedActions} />

      {/* Email draft confirmation — agent drafts, user confirms before send */}
      {msg.emailDraft && <EmailDraftCard draft={msg.emailDraft} />}

      {/* Structured action buttons — driven by server-returned type array */}
      {msg.actions?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {msg.actions.map((action, i) => (
            <ActionButton key={`${action.type}-${i}`} action={action} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      {/* Follow-up suggestion chips */}
      {msg.suggestions?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {msg.suggestions.map((s, i) => (
            <SuggestionChip key={i} text={s} onClick={onSuggestion} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Converse() {
  const navigate                              = useNavigate();
  const location                              = useLocation();
  const { plan, rescue, simResult, lifeMode } = useChronos();
  const { commitments }                       = useCommitments();
  const { isDemoMode, demoState }             = useDemo();

  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState(location.state?.prefill || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll when messages change or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-focus input textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // ChronosReport — same pattern as IntelligenceCenter; no engine logic here
  const chronosReport = useMemo(() => {
    const tasks = isDemoMode && demoState?.commitments ? demoState.commitments : commitments;
    return generateChronosReport({ tasks, isDemoMode, demoState });
  }, [commitments, isDemoMode, demoState]);

  const executiveReport = useMemo(() => {
    try { return generateExecutiveReport(chronosReport); }
    catch { return null; }
  }, [chronosReport]);

  // Review → Reflect → Learn — intercepts review/reflection queries client-side.
  // Uses the reviewReport already attached to chronosReport; no re-computation.
  const { handleReviewQuery } = useReviewConversation(chronosReport?.reviewReport ?? null);

  const taskCount = isDemoMode && demoState?.commitments
    ? demoState.commitments.length
    : commitments.length;

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (textOverride) => {
    const trimmed = (textOverride ?? input).trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setError(null);

    const userMsg = { role: 'user', text: trimmed, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Build history slice for context window
    // Note: we capture messages at call-time via the closure; no stale ref issue
    // because messages is read from the state snapshot at the time of the call.
    const historySnapshot = messages.slice(-8).map(m => ({ role: m.role, text: m.text }));

    // Client-side intent hint — server will verify independently
    const intentHint    = classifyIntent(trimmed);

    // ── Review intercept — answer deterministically from reviewReport ─────────
    // Avoids an unnecessary API round-trip for data we already have locally.
    const reviewAnswer = handleReviewQuery(trimmed);
    if (reviewAnswer) {
      setMessages(prev => [...prev, {
        role:        'assistant',
        text:        reviewAnswer,
        id:          Date.now(),
        intent:      'reflection',
        suggestions: [],
        actions:     [],
      }]);
      setIsLoading(false);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const engineContext = buildEngineContext(intentHint, {
      chronosReport,
      executiveReport,
      plan,
      rescue,
      simResult,
      taskCount,
    });

    try {
      const data = await converseApi({
        message:       trimmed,
        intentHint,          // hint only — server re-validates
        engineContext,
        history:       historySnapshot,
        lifeMode,
      });

      setMessages(prev => [...prev, {
        role:        'assistant',
        text:        data.reply || 'No response.',
        // Use the server's resolved intent (may differ from client hint)
        intent:      data.intent || intentHint,
        suggestions: data.suggestions || [],
        // Structured actions from server registry
        actions:     Array.isArray(data.actions) ? data.actions : [],
        enginesUsed: data.enginesUsed || [],
        // Real actions the agent performed this turn (calendar writes, mode
        // switches) and any Gmail draft awaiting the user's send/discard.
        executedActions: Array.isArray(data.executedActions) ? data.executedActions : [],
        emailDraft:       data.emailDraft || null,
        id:          Date.now() + 1,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role:        'assistant',
        text:        `I couldn't process that. ${err.message || 'Please try again.'}`,
        intent:      intentHint,
        error:       true,
        suggestions: [],
        actions:     [],
        id:          Date.now() + 1,
      }]);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  // messages is intentionally excluded from deps — we read it at call-time via closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isLoading, chronosReport, executiveReport, handleReviewQuery, plan, rescue, simResult, taskCount, lifeMode]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleSuggestion = useCallback((text) => sendMessage(text), [sendMessage]);
  const handleNavigate   = useCallback((route) => navigate(route), [navigate]);
  const handleClear      = useCallback(() => { setMessages([]); setError(null); }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      maxWidth: 820, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 62px - 74px)',
      minHeight: 500,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 12, fontWeight: 900,
            color: 'var(--cyan)', letterSpacing: '0.15em',
            textShadow: '0 0 24px rgba(0,212,255,0.3)',
            textTransform: 'uppercase',
          }}>
            AI Chief of Staff
          </div>
          <div style={{
            fontFamily: 'Orbitron', fontSize: 22, fontWeight: 900,
            color: 'var(--text)', marginTop: 4, marginBottom: 2,
          }}>
            Help me think
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--muted)', lineHeight: 1.4,
          }}>
            Speak with me to adjust plans, evaluate scenarios, or discuss your day.
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid rgba(0,212,255,0.15)',
              background: 'transparent', color: 'var(--muted)',
              fontFamily: 'JetBrains Mono', fontSize: 10, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.15)'; }}
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', paddingRight: 4,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0,212,255,0.15) transparent',
      }}>
        {messages.length === 0 ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'rgba(0,212,255,0.08)',
                border: '1.5px solid rgba(0,212,255,0.22)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'Orbitron', fontWeight: 900,
                color: 'var(--cyan)', fontSize: 22,
                margin: '0 auto 14px',
                boxShadow: '0 0 32px rgba(0,212,255,0.10)',
              }}>C</div>
              <div style={{
                fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700,
                color: 'var(--text)', letterSpacing: '0.08em', marginBottom: 6,
              }}>
                Your Executive AI is ready.
              </div>
              <div style={{
                fontFamily: 'JetBrains Mono', fontSize: 11,
                color: 'var(--muted)', lineHeight: 1.5,
              }}>
                Ask anything about your schedule, capacity, risks, or priorities.
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 10,
            }}>
              {STARTER_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  className="cos-stagger-item"
                  onClick={() => sendMessage(p.label)}
                  style={{
                    '--stagger': i + 1,
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                    border: '1px solid rgba(0,212,255,0.14)',
                    background: 'rgba(8,15,30,0.7)',
                    color: 'var(--muted)', fontFamily: 'JetBrains Mono',
                    fontSize: 11, textAlign: 'left', lineHeight: 1.4,
                    transition: 'all 0.18s', display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,212,255,0.32)';
                    e.currentTarget.style.color = 'var(--text)';
                    e.currentTarget.style.background = 'rgba(0,212,255,0.06)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,212,255,0.14)';
                    e.currentTarget.style.color = 'var(--muted)';
                    e.currentTarget.style.background = 'rgba(8,15,30,0.7)';
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ paddingBottom: 8 }}>
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onSuggestion={handleSuggestion}
                onNavigate={handleNavigate}
              />
            ))}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: 'rgba(0,212,255,0.12)',
                  border: '1px solid rgba(0,212,255,0.25)',
                  display: 'grid', placeItems: 'center',
                  fontFamily: 'Orbitron', fontSize: 10, fontWeight: 900, color: 'var(--cyan)',
                }}>C</div>
                <div style={{
                  background: 'rgba(8,15,30,0.8)',
                  border: '1px solid rgba(0,212,255,0.12)',
                  borderRadius: '4px 16px 16px 16px',
                }}>
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ borderTop: '1px solid rgba(0,212,255,0.1)', paddingTop: 16, marginTop: 8 }}>
        {error && (
          <div style={{
            fontFamily: 'JetBrains Mono', fontSize: 10,
            color: 'var(--red)', marginBottom: 8, paddingLeft: 2,
          }}>
            ⚠ {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your Executive AI anything…"
            rows={1}
            disabled={isLoading}
            style={{
              flex: 1, resize: 'none', overflowY: 'hidden',
              padding: '12px 16px', borderRadius: 14,
              border: '1px solid rgba(0,212,255,0.2)',
              background: 'rgba(8,15,30,0.85)',
              color: 'var(--text)', fontFamily: 'JetBrains Mono',
              fontSize: 13, lineHeight: 1.5, outline: 'none',
              transition: 'border 0.18s', minHeight: 46, maxHeight: 140,
              opacity: isLoading ? 0.5 : 1,
            }}
            onFocus={e  => { e.target.style.borderColor = 'rgba(0,212,255,0.45)'; }}
            onBlur={e   => { e.target.style.borderColor = 'rgba(0,212,255,0.2)'; }}
            onInput={e  => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            style={{
              width: 46, height: 46, borderRadius: 12, cursor: 'pointer',
              border: '1px solid rgba(0,212,255,0.3)',
              background: input.trim() && !isLoading
                ? 'rgba(0,212,255,0.18)' : 'rgba(0,212,255,0.04)',
              color: input.trim() && !isLoading ? 'var(--cyan)' : 'var(--dim)',
              fontSize: 18, flexShrink: 0, transition: 'all 0.18s',
              display: 'grid', placeItems: 'center',
            }}
          >
            {isLoading ? (
              <div style={{
                width: 16, height: 16,
                border: '2px solid rgba(0,212,255,0.3)',
                borderTopColor: 'var(--cyan)', borderRadius: '50%',
                animation: 'convSpin 0.8s linear infinite',
              }} />
            ) : '↑'}
            <style>{`@keyframes convSpin{to{transform:rotate(360deg)}}`}</style>
          </button>
        </div>
        <div style={{
          fontFamily: 'JetBrains Mono', fontSize: 9,
          color: 'var(--dim)', marginTop: 6, paddingLeft: 2,
        }}>
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}
