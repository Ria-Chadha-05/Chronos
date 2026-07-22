import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useDemo } from './DemoContext.jsx';
import { fetchUpcomingEvents } from '../lib/calendarService.js';
import { fetchRecentEmails } from '../lib/gmailService.js';
import {
  transformCalendarEvents,
  transformGmailEmails,
  transformManualTask,
  transformOngoingProject,
  deduplicateGmailCommitments,
} from '../lib/commitmentTransformer.js';

const CommitmentContext = createContext(null);
const calendarCommitmentsByUser = new Map();
const calendarLoadPromiseByUser = new Map();
const gmailCommitmentsByUser = new Map();
const gmailLoadPromiseByUser = new Map();

function replaceSourceCommitments(existingCommitments, source, nextCommitments) {
  return [
    ...existingCommitments.filter(commitment => commitment.source !== source),
    ...nextCommitments,
  ];
}

export function CommitmentProvider({ children }) {
  const { user, loading, getAccessToken } = useAuth();
  const { isDemoMode, demoState } = useDemo();
  const [commitments, setCommitments] = useState([]);
  const loadedCalendarForUserRef = useRef(null);
  const loadedGmailForUserRef = useRef(null);
  const commitmentsRef = useRef(commitments);

  useEffect(() => {
    commitmentsRef.current = commitments;
  }, [commitments]);

  // ─── Demo Mode: override commitments with demo data ────────────────────────
  // When demo mode is on, ignore Google sources and use generated demo data.
  // We do NOT skip the rest of the context — CRUD ops (manual tasks, projects)
  // continue to work on the live store so the UI remains interactive.

  useEffect(() => {
    if (isDemoMode && demoState?.commitments) {
      console.info('[Chronos Pipeline] Demo Mode ON — loading demo commitments', {
        count: demoState.commitments.length,
      });
      setCommitments(demoState.commitments);
    } else if (!isDemoMode) {
      // When demo mode is turned OFF, clear demo commitments and force auth effects to re-fetch live data.
      loadedCalendarForUserRef.current = null;
      loadedGmailForUserRef.current = null;
      setCommitments([]);
    }
  }, [isDemoMode, demoState]);

  const getRestoredAccessToken = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const token = await getAccessToken();
      if (token) return token;
      await new Promise(resolve => setTimeout(resolve, 75));
    }
    return null;
  }, [getAccessToken]);

  // ─── Calendar loading (unchanged) ──────────────────────────────────────────

  const loadCalendarCommitments = useCallback(async ({ force = false, accessToken = null } = {}) => {
    if (!user) {
      console.info('[Chronos Pipeline] Commitment Store skipped Calendar load: no authenticated user');
      return [];
    }
    const userId = user.uid;

    if (!force && calendarCommitmentsByUser.has(userId)) {
      const cachedCommitments = calendarCommitmentsByUser.get(userId);
      console.info('[Chronos Pipeline] Commitment Store using cached Calendar commitments', {
        userId,
        commitmentCount: cachedCommitments.length,
      });
      setCommitments(current =>
        replaceSourceCommitments(current, 'google_calendar', cachedCommitments)
      );
      loadedCalendarForUserRef.current = userId;
      return cachedCommitments;
    }

    if (!force && calendarLoadPromiseByUser.has(userId)) {
      console.info('[Chronos Pipeline] Commitment Store awaiting in-flight Calendar load', { userId });
      const pendingCommitments = await calendarLoadPromiseByUser.get(userId);
      setCommitments(current =>
        replaceSourceCommitments(current, 'google_calendar', pendingCommitments)
      );
      loadedCalendarForUserRef.current = userId;
      return pendingCommitments;
    }

    const loadPromise = (async () => {
      console.info('[Chronos Commitments] Loading Google Calendar commitments', { userId });
      const calendarResponse = await fetchUpcomingEvents({ accessToken });
      const events = Array.isArray(calendarResponse?.items) ? calendarResponse.items : [];
      console.info('[Chronos Pipeline] Calendar API events ready for transform', {
        userId,
        eventCount: events.length,
      });
      const calendarCommitments = transformCalendarEvents(events);
      console.info('[Chronos Pipeline] Commitment Transformer output ready', {
        userId,
        commitmentCount: calendarCommitments.length,
      });
      calendarCommitmentsByUser.set(userId, calendarCommitments);
      setCommitments(current =>
        replaceSourceCommitments(current, 'google_calendar', calendarCommitments)
      );
      loadedCalendarForUserRef.current = userId;
      console.info('[Chronos Commitments] Stored Google Calendar commitments', {
        rawEventCount: events.length,
        commitmentCount: calendarCommitments.length,
      });
      return calendarCommitments;
    })().catch(error => {
      calendarCommitmentsByUser.delete(userId);
      console.error('[Chronos Commitments] Failed to load Google Calendar commitments', {
        message: error.message,
        status: error.status,
        details: error.details,
      });
      throw error;
    }).finally(() => {
      calendarLoadPromiseByUser.delete(userId);
    });

    calendarLoadPromiseByUser.set(userId, loadPromise);
    return loadPromise;
  }, [user]);

  const refreshCalendar = useCallback(async () => {
    if (user) {
      calendarCommitmentsByUser.delete(user.uid);
      calendarLoadPromiseByUser.delete(user.uid);
    }
    loadedCalendarForUserRef.current = null;
    return loadCalendarCommitments({ force: true });
  }, [loadCalendarCommitments]);

  // ─── Gmail loading with deduplication (Part 2) ─────────────────────────────

  const loadGmailCommitments = useCallback(async ({ force = false, accessToken = null } = {}) => {
    if (!user) {
      console.info('[Chronos Pipeline] Commitment Store skipped Gmail load: no authenticated user');
      return [];
    }
    const userId = user.uid;

    if (!force && gmailCommitmentsByUser.has(userId)) {
      const cachedCommitments = gmailCommitmentsByUser.get(userId);
      console.info('[Chronos Pipeline] Commitment Store using cached Gmail commitments', {
        userId,
        commitmentCount: cachedCommitments.length,
      });
      setCommitments(current =>
        replaceSourceCommitments(current, 'gmail', cachedCommitments)
      );
      loadedGmailForUserRef.current = userId;
      return cachedCommitments;
    }

    if (!force && gmailLoadPromiseByUser.has(userId)) {
      console.info('[Chronos Pipeline] Commitment Store awaiting in-flight Gmail load', { userId });
      const pendingCommitments = await gmailLoadPromiseByUser.get(userId);
      setCommitments(current =>
        replaceSourceCommitments(current, 'gmail', pendingCommitments)
      );
      loadedGmailForUserRef.current = userId;
      return pendingCommitments;
    }

    const loadPromise = (async () => {
      console.info('[Chronos Commitments] Loading Gmail commitments', { userId });
      const emails = await fetchRecentEmails({ accessToken });
      console.info('[Chronos Pipeline] Gmail emails ready for transform', {
        userId,
        emailCount: emails.length,
      });

      // Transform all emails that match commitment patterns
      const rawGmailCommitments = transformGmailEmails(emails);

      // Deduplicate against existing commitments in the store
      // (exclude current Gmail commitments so we're only deduplicating against
      // non-Gmail sources and previously-loaded gmail commitments)
      const existingNonGmail = commitmentsRef.current.filter(c => c.source !== 'gmail');
      const gmailCommitments = deduplicateGmailCommitments(rawGmailCommitments, existingNonGmail);

      console.info('[Chronos Pipeline] Gmail Commitment Transformer output ready', {
        userId,
        rawCount: rawGmailCommitments.length,
        afterDedup: gmailCommitments.length,
        duplicatesDropped: rawGmailCommitments.length - gmailCommitments.length,
      });

      gmailCommitmentsByUser.set(userId, gmailCommitments);
      setCommitments(current =>
        replaceSourceCommitments(current, 'gmail', gmailCommitments)
      );
      loadedGmailForUserRef.current = userId;
      console.info('[Chronos Commitments] Stored Gmail commitments', {
        rawEmailCount: emails.length,
        commitmentCount: gmailCommitments.length,
      });
      return gmailCommitments;
    })().catch(error => {
      gmailCommitmentsByUser.delete(userId);
      console.error('[Chronos Commitments] Failed to load Gmail commitments', {
        message: error.message,
        status: error.status,
        details: error.details,
      });
      throw error;
    }).finally(() => {
      gmailLoadPromiseByUser.delete(userId);
    });

    gmailLoadPromiseByUser.set(userId, loadPromise);
    return loadPromise;
  }, [user]);

  const refreshGmail = useCallback(async () => {
    if (user) {
      gmailCommitmentsByUser.delete(user.uid);
      gmailLoadPromiseByUser.delete(user.uid);
    }
    loadedGmailForUserRef.current = null;
    return loadGmailCommitments({ force: true });
  }, [loadGmailCommitments]);

  // ─── Manual Task CRUD (Part 1) ────────────────────────────────────────────
  //
  // All operations transform raw input into a Commitment and operate on the
  // shared Commitment Store. No separate task store is created.

  const addManualTask = useCallback((taskData, options = {}) => {
    const commitment = transformManualTask(taskData, options);
    console.info('[Chronos Pipeline] Manual task added to Commitment Store', {
      id: commitment.id,
      title: commitment.title,
      source: commitment.source,
      commitmentType: commitment.commitmentType,
    });
    setCommitments(current => [...current, commitment]);
    return commitment;
  }, []);

  const updateManualTask = useCallback((id, updates) => {
    setCommitments(current => {
      const idx = current.findIndex(c => c.id === id);
      if (idx === -1) {
        console.warn('[Chronos Pipeline] updateManualTask: commitment not found', { id });
        return current;
      }
      const existing = current[idx];
      // Merge raw update fields back through the transformer so classification
      // and effectiveDurationMinutes are always re-derived correctly.
      const rawTaskData = {
        ...existing.sourceMetadata?.manual?.raw,
        ...updates,
        id: existing.sourceId || existing.id.replace('manual:', ''),
        createdAt: existing.createdAt,
      };
      const updated = transformManualTask(rawTaskData, { date: existing.date });
      // Preserve the original commitment ID
      updated.id = existing.id;
      const next = [...current];
      next[idx] = updated;
      console.info('[Chronos Pipeline] Manual task updated in Commitment Store', {
        id,
        title: updated.title,
        manualStatus: updated.manualStatus,
      });
      return next;
    });
  }, []);

  const deleteManualTask = useCallback((id) => {
    setCommitments(current => {
      const filtered = current.filter(c => c.id !== id);
      console.info('[Chronos Pipeline] Manual task deleted from Commitment Store', {
        id,
        remainingCount: filtered.length,
      });
      return filtered;
    });
  }, []);

  const completeManualTask = useCallback((id) => {
    setCommitments(current => {
      const idx = current.findIndex(c => c.id === id);
      if (idx === -1) return current;
      const next = [...current];
      next[idx] = {
        ...next[idx],
        manualStatus: 'completed',
        status: 'completed',
        updatedAt: new Date().toISOString(),
      };
      console.info('[Chronos Pipeline] Manual task marked completed', { id });
      return next;
    });
  }, []);

  // ─── Ongoing Project CRUD (Part 3) ────────────────────────────────────────
  //
  // Projects enter the Commitment Store as ONGOING_PROJECT commitments.
  // The Planner distributes them across days using ongoingProject fields.

  const addOngoingProject = useCallback((projectData) => {
    const commitment = transformOngoingProject(projectData);
    console.info('[Chronos Pipeline] Ongoing project added to Commitment Store', {
      id: commitment.id,
      title: commitment.title,
      commitmentType: commitment.commitmentType,
      effortHoursPerDay: commitment.ongoingProject?.effortHoursPerDay,
      estimatedSessions: commitment.ongoingProject?.estimatedSessions,
    });
    setCommitments(current => [...current, commitment]);
    return commitment;
  }, []);

  const updateOngoingProject = useCallback((id, updates) => {
    setCommitments(current => {
      const idx = current.findIndex(c => c.id === id);
      if (idx === -1) {
        console.warn('[Chronos Pipeline] updateOngoingProject: commitment not found', { id });
        return current;
      }
      const existing = current[idx];
      const rawProjectData = {
        ...existing.sourceMetadata?.manual?.raw,
        ...updates,
        id: existing.sourceId || existing.id.replace('project:', ''),
        createdAt: existing.createdAt,
      };
      const updated = transformOngoingProject(rawProjectData);
      updated.id = existing.id;
      const next = [...current];
      next[idx] = updated;
      console.info('[Chronos Pipeline] Ongoing project updated in Commitment Store', {
        id,
        completionPercentage: updated.ongoingProject?.completionPercentage,
        remainingDuration: updated.ongoingProject?.remainingDuration,
      });
      return next;
    });
  }, []);

  const updateProjectCompletion = useCallback((id, completionPercentage) => {
    const pct = Math.max(0, Math.min(100, Number(completionPercentage)));
    setCommitments(current => {
      const idx = current.findIndex(c => c.id === id);
      if (idx === -1) return current;
      const existing = current[idx];
      const op = existing.ongoingProject;
      if (!op) return current;
      const effectiveDuration = op.effectiveDuration ?? (op.estimatedTotalHours ?? 0) * 60;
      const remainingDuration = Math.round(effectiveDuration * (1 - pct / 100));
      const next = [...current];
      next[idx] = {
        ...next[idx],
        ongoingProject: {
          ...op,
          completionPercentage: pct,
          remainingDuration,
        },
        updatedAt: new Date().toISOString(),
      };
      console.info('[Chronos Pipeline] Project completion updated', {
        id,
        completionPercentage: pct,
        remainingDuration,
      });
      return next;
    });
  }, []);

  const deleteOngoingProject = useCallback((id) => {
    setCommitments(current => {
      const filtered = current.filter(c => c.id !== id);
      console.info('[Chronos Pipeline] Ongoing project deleted from Commitment Store', { id });
      return filtered;
    });
  }, []);

  // ─── Auth-driven auto-load (unchanged) ────────────────────────────────────

  useEffect(() => {
    // Skip live data loading entirely in Demo Mode
    if (isDemoMode) {
      console.info('[Chronos Pipeline] Commitment Store skipped live load: Demo Mode is ON');
      return;
    }

    if (loading) {
      console.info('[Chronos Pipeline] Commitment Store waiting for authentication state');
      return;
    }

    if (!user) {
      console.info('[Chronos Pipeline] Commitment Store cleared Google commitments: signed out');
      loadedCalendarForUserRef.current = null;
      loadedGmailForUserRef.current = null;
      setCommitments(current =>
        current.filter(commitment => !['google_calendar', 'gmail'].includes(commitment.source))
      );
      return;
    }

    const needsCalendarLoad = loadedCalendarForUserRef.current !== user.uid;
    const needsGmailLoad = loadedGmailForUserRef.current !== user.uid;

    if (!needsCalendarLoad && !needsGmailLoad) {
      console.info('[Chronos Pipeline] Commitment Store already loaded Google sources for user', {
        userId: user.uid,
      });
      return;
    }

    console.info('[Chronos Pipeline] Commitment Store detected authenticated user', {
      userId: user.uid,
    });

    let cancelled = false;

    (async () => {
      const accessToken = await getRestoredAccessToken();
      if (cancelled) return;

      if (!accessToken) {
        console.info('[Chronos Pipeline] Commitment Store deferred Google source loads: OAuth token unavailable');
        return;
      }

      if (needsCalendarLoad) {
        loadCalendarCommitments({ accessToken }).catch(() => {});
      }

      if (needsGmailLoad) {
        loadGmailCommitments({ accessToken }).catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isDemoMode, loading, user, getRestoredAccessToken, loadCalendarCommitments, loadGmailCommitments]);

  const value = useMemo(() => ({
    commitments,
    setCommitments,
    // Calendar
    loadCalendarCommitments,
    refreshCalendar,
    // Gmail
    loadGmailCommitments,
    refreshGmail,
    // Manual Task CRUD (Part 1)
    addManualTask,
    updateManualTask,
    deleteManualTask,
    completeManualTask,
    // Ongoing Project CRUD (Part 3)
    addOngoingProject,
    updateOngoingProject,
    updateProjectCompletion,
    deleteOngoingProject,
  }), [
    commitments,
    setCommitments,
    loadCalendarCommitments,
    refreshCalendar,
    loadGmailCommitments,
    refreshGmail,
    addManualTask,
    updateManualTask,
    deleteManualTask,
    completeManualTask,
    addOngoingProject,
    updateOngoingProject,
    updateProjectCompletion,
    deleteOngoingProject,
  ]);

  return (
    <CommitmentContext.Provider value={value}>
      {children}
    </CommitmentContext.Provider>
  );
}

export function useCommitments() {
  const ctx = useContext(CommitmentContext);
  if (!ctx) throw new Error('useCommitments must be used within CommitmentProvider');
  return ctx;
}
