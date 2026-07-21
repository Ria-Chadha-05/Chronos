/**
 * CompanionDashboard.jsx
 *
 * Companion-aesthetic port of the Lovable "Home" concept, wired to REAL data:
 *   - greeting name        ← useAuth().user.displayName
 *   - narrative paragraph  ← useAgent().executiveReport.summary (real AI text, unedited)
 *   - "Worth knowing"      ← executiveReport.recommendations + .alerts (real engine output)
 *   - "Your week" strip    ← useCommitments().commitments, grouped by real date/time
 *   - chat dock            ← navigates to /converse with the typed message pre-filled
 *
 * This is ADDITIVE — it does not replace screens/Dashboard.jsx. Mounted at
 * /dashboard-new in App.jsx so it can be compared side-by-side before deciding
 * whether it becomes the real /dashboard.
 *
 * No engine calls happen here — same rule as the original Dashboard: this
 * screen only reads already-computed report/commitment data.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgent } from '../context/AgentContext.jsx';
import { useCommitments } from '../context/CommitmentContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Orb, TopBar, PresenceField, WanderingCompanion, useCompanion,
} from '../components/companion/CompanionShared.jsx';

const DOT_CYCLE = ['a', 'b', 'c'];

function buildWeek(commitments) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const dayTasks = (commitments || [])
      .filter((c) => c.date === key && c.manualStatus !== 'cancelled')
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    days.push({
      key,
      name: d.toLocaleDateString([], { weekday: 'short' }),
      num: String(d.getDate()),
      today: i === 0,
      tasks: dayTasks.map((t, idx) => ({
        time: t.startTime || '',
        name: t.title || 'Untitled',
        color: DOT_CYCLE[idx % 3],
        done: t.manualStatus === 'completed',
      })),
    });
  }
  return days;
}

function WeekStrip({ days }) {
  const navigate = useNavigate();
  return (
    <div className="week">
      {days.map((d, i) => (
        <div
          key={d.key}
          className={`day-card ${d.today ? 'today' : ''}`}
          style={{ animationDelay: `${420 + i * 70}ms`, cursor: 'pointer' }}
          onClick={() => navigate(`/tasks?date=${d.key}`)}
          role="button"
          tabIndex={0}
        >
          <div className="day-head">
            <span className="day-name">{d.name}</span>
            <span className="day-num">{d.num}</span>
          </div>
          {d.tasks.map((t, j) => (
            <div key={j} className={`task-pill ${t.done ? 'done' : ''}`}>
              <span className="tdot" style={{ background: `var(--glow-${t.color})` }} />
              <span className="ttime">{t.time}</span>
              <span className="tname">{t.name}</span>
            </div>
          ))}
          {d.tasks.length === 0 && (
            <div className="empty-note">{d.today ? 'Nothing planned yet' : 'Not planned yet'}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CompanionDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { executiveReport, chronosReport } = useAgent();
  const { commitments } = useCommitments();
  const { setOrbState, listening, startListening, stopListening } = useCompanion();

  const [input, setInput] = useState('');

  useEffect(() => { setOrbState('idle'); }, [setOrbState]);

  const week = useMemo(() => buildWeek(commitments), [commitments]);

  const firstName = user?.displayName?.split(' ')[0] || 'there';

  const narrative = executiveReport?.summary
    || 'Still building today\u2019s picture — check back in a moment.';

  // Real recommendations + alerts + hidden-engine signals, capped at 3.
  // Firefighter, Review, and Reflect no longer have their own screens — this
  // is now the only place their output surfaces, ranked by urgency.
  const moments = useMemo(() => {
    const items = [];

    // Highest priority: an active crisis the Firefighter engine has detected
    if (chronosReport?.firefighterReport?.isActive) {
      items.push({
        label: 'Firefighter',
        body: chronosReport.firefighterReport.triggerReason || 'Today needs immediate replanning.',
        urgent: true,
      });
    }

    const fromAlerts = (executiveReport?.alerts || []).map((a) => ({
      label: 'Flag',
      body: a.message || a.body || a.title,
      urgent: a.urgency === 'critical' || a.urgency === 'high',
    }));
    items.push(...fromAlerts);

    const fromRecs = (executiveReport?.recommendations || []).map((r) => ({
      label: r.source || 'Recommendation',
      body: r.body || r.title,
      urgent: r.urgency === 'critical' || r.urgency === 'high',
    }));
    items.push(...fromRecs);

    // Quiet win: yesterday's review/reflection, when available — this is the
    // only surface for Review + Reflect now that they have no dedicated screen
    const reviewSummary = chronosReport?.reviewReport?.review?.summary;
    if (reviewSummary && items.length < 3) {
      items.push({ label: 'Yesterday', body: reviewSummary, urgent: false });
    }

    return items.slice(0, 3);
  }, [executiveReport, chronosReport]);

  const onSubmit = () => {
    const text = input.trim();
    if (!text) return;
    if (listening) stopListening();
    setInput('');
    navigate('/converse', { state: { prefill: text } });
  };

  return (
    <main className="chronos-app">
      <PresenceField />
      <WanderingCompanion />
      <TopBar />

      <Orb size={96} />

      <section className="greeting rise">
        <span className="eyebrow">Good evening, {firstName}</span>
        <h1>Here's where today <em>actually</em> stands.</h1>
      </section>

      <p className="narrative rise">{narrative}</p>

      {moments.length > 0 && (
        <>
          <div className="section-label rise">Worth knowing</div>
          <div className="moments">
            {moments.map((m, i) => (
              <div key={i} className="moment rise">
                <div className={`dot ${m.urgent ? 'warm' : DOT_CYCLE[i % 3] === 'a' ? 'warm' : DOT_CYCLE[i % 3] === 'b' ? 'soft' : 'calm'}`} />
                <div className="body">
                  <div className="label">{m.label}</div>
                  <p>{m.body}</p>
                </div>
                {m.urgent && (
                  <button className="action" onClick={() => navigate('/rescue')}>
                    Open Rescue
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-label rise">Your week</div>
      <WeekStrip days={week} />

      <div className="dock">
        <div className="dock-inner">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
            placeholder={listening ? 'Listening…' : 'Talk to Chronos — ask, plan, or just vent about tomorrow…'}
            aria-label="Message Chronos"
          />
          <button
            className={`mic-btn ${listening ? 'listening' : ''}`}
            onClick={() => (listening ? stopListening() : startListening((t) => setInput(t)))}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v3" />
            </svg>
          </button>
          <button className="send-btn" onClick={onSubmit} disabled={!input.trim()} aria-label="Send message">↑</button>
        </div>
      </div>
    </main>
  );
}
