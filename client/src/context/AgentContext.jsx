/**
 * AgentContext.jsx
 *
 * Chronos Agent Loop
 *
 * Transforms Chronos from a passive dashboard into a proactive agent.
 * Monitors commitment state and reacts to changes — never polls.
 *
 * Flow:
 *   commitments change
 *     → generateChronosReport (single pipeline)
 *       → generateExecutiveReport
 *         → generateIntelligenceReport
 *           → emit AgentEvents
 *             → notify Dashboard
 *
 * ▸ No engine imports — only report consumers.
 * ▸ No polling — useEffect on commitments only.
 * ▸ All reports flow downstream. No duplicated calculations.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useCommitments } from './CommitmentContext.jsx';
import { useDemo }        from './DemoContext.jsx';
import { useCalendar }    from './CalendarContext.jsx';
import { generateChronosReport }  from '../services/chronosReport.js';
import { generateExecutiveReport } from '../intelligence/executiveAgent.ts';
import { generateIntelligenceReport } from '../intelligence/intelligenceReport.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_EVENTS = {
  COMMITMENT_ADDED:       'commitment:added',
  COMMITMENT_CHANGED:     'commitment:changed',
  CONFLICT_DETECTED:      'conflict:detected',
  PLANNER_RERUN:          'planner:rerun',
  FIREFIGHTER_TRIGGERED:  'firefighter:triggered',
  RESCUE_ACTIVATED:       'rescue:activated',
  BLOCKER_CRITICAL:       'blocker:critical',
  CAPACITY_OVERLOAD:      'capacity:overload',
  REALITY_GAP_HIGH:       'reality_gap:high',
  EXECUTIVE_NOTIFY:       'executive:notify',
};

const URGENCY_RANK = { critical: 4, high: 3, medium: 2, low: 1, normal: 0 };

// ─── Context ──────────────────────────────────────────────────────────────────

const AgentContext = createContext(null);

// ─── Internal helpers ─────────────────────────────────────────────────────────

function makeEvent(type, payload, urgency = 'normal') {
  return {
    id:        `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    payload,
    urgency,
    timestamp: new Date().toISOString(),
    read:      false,
  };
}

function detectChanges(prev, next) {
  if (!prev) return { added: next, removed: [], changed: [] };
  const prevMap = new Map(prev.map(c => [c.id, c]));
  const nextMap = new Map(next.map(c => [c.id, c]));
  const added   = next.filter(c => !prevMap.has(c.id));
  const removed = prev.filter(c => !nextMap.has(c.id));
  const changed = next.filter(c => {
    const p = prevMap.get(c.id);
    return p && JSON.stringify(p) !== JSON.stringify(c);
  });
  return { added, removed, changed };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AgentProvider({ children }) {
  const { commitments }         = useCommitments();
  const { isDemoMode, demoState } = useDemo();
  const { today }               = useCalendar();

  // Agent state
  const [agentEvents,          setAgentEvents]          = useState([]);
  const [chronosReport,        setChronosReport]        = useState(null);
  const [executiveReport,      setExecutiveReport]      = useState(null);
  const [intelligenceReport,   setIntelligenceReport]   = useState(null);
  const [executiveNotifications, setExecutiveNotifications] = useState([]);
  const [isProcessing,         setIsProcessing]         = useState(false);
  const [lastRunAt,            setLastRunAt]            = useState(null);

  const prevCommitmentsRef = useRef(null);
  const runIdRef           = useRef(0);

  // ── Core agent loop ─────────────────────────────────────────────────────────
  // Fires only when commitments change — never on a timer.

  const runAgentLoop = useCallback(async (currentCommitments, reason) => {
    const runId = ++runIdRef.current;
    setIsProcessing(true);

    try {
      console.info('[Chronos Agent] Loop triggered', { reason, commitmentCount: currentCommitments.length, runId });

      // ── 1. Detect what changed ─────────────────────────────────────────────
      const diff = detectChanges(prevCommitmentsRef.current, currentCommitments);
      prevCommitmentsRef.current = currentCommitments;

      // ── 2. Run ChronosReport (single pipeline, no duplication) ────────────
      const newChronosReport = generateChronosReport({
        tasks:      currentCommitments,
        today:      today || new Date().toISOString().slice(0, 10),
        energyLevel: 'normal',
        isDemoMode,
        demoState,
      });

      // ── 3. Run Executive Report (downstream of ChronosReport only) ─────────
      const newExecutiveReport = generateExecutiveReport(newChronosReport);

      // ── 4. Run Intelligence Report (downstream of both) ────────────────────
      const newIntelligenceReport = generateIntelligenceReport({
        chronosReport:    newChronosReport,
        executiveReport:  newExecutiveReport,
        commitmentsDiff:  diff,
      });

      // Abort if a newer run started
      if (runId !== runIdRef.current) return;

      // ── 5. Emit agent events based on what changed ─────────────────────────
      const newEvents = [];

      // Commitment change events
      if (diff.added.length > 0) {
        diff.added.forEach(c => {
          newEvents.push(makeEvent(
            AGENT_EVENTS.COMMITMENT_ADDED,
            { commitment: c, source: c.source },
            'low',
          ));
        });
      }

      if (diff.changed.length > 0 || diff.removed.length > 0) {
        newEvents.push(makeEvent(
          AGENT_EVENTS.COMMITMENT_CHANGED,
          { changed: diff.changed.length, removed: diff.removed.length },
          'low',
        ));
      }

      // Conflict detection
      const conflictCount = newChronosReport.conflictReport?.totalConflicts ?? 0;
      if (conflictCount > 0) {
        newEvents.push(makeEvent(
          AGENT_EVENTS.CONFLICT_DETECTED,
          { count: conflictCount, conflicts: newChronosReport.conflictReport?.conflicts?.slice(0, 3) ?? [] },
          newChronosReport.conflictReport?.highSeverity ? 'high' : 'medium',
        ));
      }

      // Planner rerun signal (always fires when commitments change)
      if (diff.added.length > 0 || diff.changed.length > 0) {
        newEvents.push(makeEvent(
          AGENT_EVENTS.PLANNER_RERUN,
          { score: newChronosReport.plannerReport?.score, actions: newChronosReport.plannerReport?.actions?.length },
          'low',
        ));
      }

      // Firefighter trigger
      if (newChronosReport.firefighterReport?.isActive) {
        newEvents.push(makeEvent(
          AGENT_EVENTS.FIREFIGHTER_TRIGGERED,
          { reason: newChronosReport.firefighterReport?.triggerReason, severity: newChronosReport.firefighterReport?.severity?.level },
          'critical',
        ));
      }

      // Rescue activation
      if (newChronosReport.rescueReport?.activated) {
        newEvents.push(makeEvent(
          AGENT_EVENTS.RESCUE_ACTIVATED,
          { severity: newChronosReport.rescueReport?.severity, summary: newChronosReport.rescueReport?.summary },
          newChronosReport.rescueReport?.severity === 'Critical' ? 'critical' : 'high',
        ));
      }

      // Critical blockers
      if ((newChronosReport.blockerReport?.criticalBlockers?.totalCritical ?? 0) > 0) {
        newEvents.push(makeEvent(
          AGENT_EVENTS.BLOCKER_CRITICAL,
          { count: newChronosReport.blockerReport.criticalBlockers.totalCritical },
          'critical',
        ));
      }

      // Capacity overload
      if (newChronosReport.capacityReport?.status === 'Overloaded') {
        newEvents.push(makeEvent(
          AGENT_EVENTS.CAPACITY_OVERLOAD,
          { score: newChronosReport.capacityReport?.score, status: newChronosReport.capacityReport?.status },
          'medium',
        ));
      }

      // Reality gap
      if (['High', 'Critical'].includes(newChronosReport.realityReport?.severity)) {
        newEvents.push(makeEvent(
          AGENT_EVENTS.REALITY_GAP_HIGH,
          { severity: newChronosReport.realityReport?.severity, summary: newChronosReport.realityReport?.summary },
          newChronosReport.realityReport?.severity === 'Critical' ? 'critical' : 'high',
        ));
      }

      // Executive notification (always)
      const overallUrgency = newExecutiveReport.urgency;
      newEvents.push(makeEvent(
        AGENT_EVENTS.EXECUTIVE_NOTIFY,
        {
          summary:    newExecutiveReport.summary,
          urgency:    overallUrgency,
          alerts:     newExecutiveReport.alerts?.length ?? 0,
          confidence: newExecutiveReport.confidence,
        },
        overallUrgency,
      ));

      // ── 6. Build executive notifications (filtered to actionable + urgent) ──
      const newNotifications = newExecutiveReport.alerts
        ?.filter(a => URGENCY_RANK[a.urgency] >= URGENCY_RANK['medium'])
        .map(alert => ({
          id:        alert.id,
          title:     alert.title,
          body:      alert.body,
          urgency:   alert.urgency,
          engine:    alert.engine,
          timestamp: new Date().toISOString(),
          read:      false,
        })) ?? [];

      // ── 7. Commit all state updates atomically ─────────────────────────────
      setChronosReport(newChronosReport);
      setExecutiveReport(newExecutiveReport);
      setIntelligenceReport(newIntelligenceReport);
      setAgentEvents(prev => [...newEvents, ...prev].slice(0, 100)); // rolling 100
      setExecutiveNotifications(newNotifications);
      setLastRunAt(new Date().toISOString());

      console.info('[Chronos Agent] Loop complete', {
        runId,
        events:         newEvents.length,
        urgency:        newExecutiveReport.urgency,
        notifications:  newNotifications.length,
      });

    } catch (err) {
      console.error('[Chronos Agent] Loop error', err);
    } finally {
      if (runId === runIdRef.current) {
        setIsProcessing(false);
      }
    }
  }, [today, isDemoMode, demoState]);

  // ── React to commitment changes — the only trigger ──────────────────────────
  useEffect(() => {
    runAgentLoop(commitments, 'commitments-changed');
  }, [commitments]); // eslint-disable-line react-hooks/exhaustive-deps
  // runAgentLoop is memoized on today/demo — safe to omit from deps to avoid
  // double-firing when demo toggles simultaneously with commitments update.

  // ── Event management helpers ───────────────────────────────────────────────

  const markEventRead = useCallback((eventId) => {
    setAgentEvents(prev => prev.map(e => e.id === eventId ? { ...e, read: true } : e));
  }, []);

  const markAllEventsRead = useCallback(() => {
    setAgentEvents(prev => prev.map(e => ({ ...e, read: true })));
  }, []);

  const clearEvents = useCallback(() => {
    setAgentEvents([]);
  }, []);

  const markNotificationRead = useCallback((notifId) => {
    setExecutiveNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  }, []);

  const unreadEventCount = agentEvents.filter(e => !e.read).length;
  const unreadNotifCount = executiveNotifications.filter(n => !n.read).length;

  return (
    <AgentContext.Provider value={{
      // Reports (single source of truth, computed by agent)
      chronosReport,
      executiveReport,
      intelligenceReport,

      // Agent events (raw feed)
      agentEvents,
      unreadEventCount,
      markEventRead,
      markAllEventsRead,
      clearEvents,

      // Executive notifications (filtered, actionable)
      executiveNotifications,
      unreadNotifCount,
      markNotificationRead,

      // Agent status
      isProcessing,
      lastRunAt,

      // Event type constants for consumers
      AGENT_EVENTS,
    }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}

export { AGENT_EVENTS };
