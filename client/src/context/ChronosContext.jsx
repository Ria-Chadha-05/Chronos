import { showLoading, hideLoading } from '../components/ui/LoadingOverlay.jsx';
import { useToast } from './ToastContext.jsx';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useCommitments } from './CommitmentContext.jsx';


import * as api from '../lib/api.js';

import { useDemo } from './DemoContext.jsx';

const ChronosContext = createContext(null);

export function ChronosProvider({ children }) {
  const { commitments, setCommitments } = useCommitments();
  const { isDemoMode, demoState } = useDemo();
  const [anchors,    setAnchors]    = useLocalStorage('chronos_anchors', []);
  const [lifeMode,   setLifeMode]   = useLocalStorage('chronos_mode', 'college');
  
  // Real live stores
  const [livePlan,       setLivePlan]       = useLocalStorage('chronos_plan', null);
  const [liveRescue,     setLiveRescue]     = useLocalStorage('chronos_rescue', null);
  const [liveReview,     setLiveReview]     = useLocalStorage('chronos_review', null);
  const [liveReflection, setLiveReflection] = useLocalStorage('chronos_reflection', null);
  
  const [simResult,  setSimResult]  = useState(null);
  const [prepResult, setPrepResult] = useState(null);

  // Derivations mapping to either demoState elements or live stores
  const plan = isDemoMode ? demoState?.planner : livePlan;
  const rescue = isDemoMode ? demoState?.rescue : liveRescue;
  const review = isDemoMode ? (demoState ? { reviewNotes: demoState.reflection?.aiSummary } : null) : liveReview;
  const reflection = isDemoMode ? demoState?.reflection : liveReflection;

  const setPlan = useCallback((val) => {
    if (!isDemoMode) setLivePlan(val);
  }, [isDemoMode, setLivePlan]);

  const setRescue = useCallback((val) => {
    if (!isDemoMode) setLiveRescue(val);
  }, [isDemoMode, setLiveRescue]);

  const setReview = useCallback((val) => {
    if (!isDemoMode) setLiveReview(val);
  }, [isDemoMode, setLiveReview]);

  const setReflection = useCallback((val) => {
    if (!isDemoMode) setLiveReflection(val);
  }, [isDemoMode, setLiveReflection]);

  // Clean up live / simulation states when Demo Mode changes to prevent cross-leakage
  useEffect(() => {
    setSimResult(null);
    setPrepResult(null);
  }, [isDemoMode]);

  const { toast } = useToast();
  const tasks = commitments;

  // Invalidate stale planner/rescue cache when commitments change or when transitioning to Live Mode
  useEffect(() => {
    if (isDemoMode) return;

    // Check if the livePlan or liveRescue exists but holds outdated/stale schedules
    // derived from no-longer-existing tasks, or if the commitments are empty.
    if (!tasks.length) {
      if (livePlan) setLivePlan(null);
      if (liveRescue) setLiveRescue(null);
      if (liveReview) setLiveReview(null);
      if (liveReflection) setLiveReflection(null);
      return;
    }

    // Verify task match: if the plan exists, compare plan target items with current tasks
    if (livePlan?.schedule) {
      const livePlanTitles = new Set(livePlan.schedule.map(item => item.title || item.name));
      const currentTaskTitles = new Set(tasks.map(t => t.title || t.name));
      
      // If none of the current tasks match the schedule stored in local storage,
      // it means the saved plan is from a completely different set of commitments (e.g. demo data or old cached session).
      const hasOverlap = [...currentTaskTitles].some(title => livePlanTitles.has(title));
      if (!hasOverlap) {
        console.info('[Chronos Pipeline] Invalidating stale planner and rescue cache');
        setLivePlan(null);
        setLiveRescue(null);
        setLiveReview(null);
        setLiveReflection(null);
      }
    }
  }, [tasks, isDemoMode, livePlan, liveRescue, setLivePlan, setLiveRescue, setLiveReview, setLiveReflection]);

  useEffect(() => {
    console.info('[Chronos Pipeline] ChronosContext received commitments', {
      commitmentCount: commitments.length,
      calendarCommitmentCount: commitments.filter(commitment => commitment.source === 'google_calendar').length,
    });
  }, [commitments]);

  const setTasks = useCallback((nextTasks) => {
    setCommitments(current => (
      typeof nextTasks === 'function' ? nextTasks(current) : nextTasks
    ));
  }, [setCommitments]);

  const runPlan = useCallback(async () => {
    if (!tasks.length) { toast('Add tasks first', 'error'); return null; }
    showLoading('PLANNING ENGINE', 'Gemini is building your schedule...');
    try {
      const data = await api.plan({ tasks, lifeMode });
      setPlan(data);
      toast('Plan generated', 'success');
      return data;
    } catch (e) {
      toast('Planning failed: ' + e.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }, [tasks, lifeMode]);

  const runRescue = useCallback(async () => {
    showLoading('RESCUE ENGINE', 'Chronos is rebuilding your day...');
    try {
      const data = await api.rescue({
        tasks,
        conflicts: plan?.conflicts || [],
        capacityAnalysis: plan?.capacityAnalysis || {},
        anchors,
      });
      setRescue(data);
      toast('Rescue plan ready', 'info');
      return data;
    } catch (e) {
      toast('Rescue failed: ' + e.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }, [tasks, plan, anchors]);

  const runReview = useCallback(async () => {
    const schedule = rescue?.rescuedSchedule || plan?.schedule || [];
    showLoading('NIGHTLY REVIEW', 'Evaluating tomorrow...');
    try {
      const data = await api.review({ schedule, anchors, lifeMode });
      setReview(data);
      toast('Nightly review complete', 'success');
      return data;
    } catch (e) {
      toast('Review failed: ' + e.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }, [rescue, plan, anchors, lifeMode]);

  const runReflection = useCallback(async (lifeAreas, feelings) => {
    showLoading('WEEKLY REFLECTION', 'Synthesising your week...');
    try {
      const weekSummary = {
        lifeMode,
        totalTasks: plan?.schedule?.length || 0,
        feasible: plan?.capacityAnalysis?.feasible,
        conflictsFound: plan?.conflicts?.length || 0,
      };
      const data = await api.reflect({ weekSummary, lifeAreas, feelings });
      setReflection(data);
      toast('Reflection complete', 'success');
      return data;
    } catch (e) {
      toast('Reflection failed: ' + e.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }, [lifeMode, plan]);

  const runSimulate = useCallback(async (newItem) => {
    showLoading('CONSEQUENCE SIM', 'Calculating trade-offs...');
    try {
      const data = await api.simulate({
        existingTasks: tasks,
        newItem,
        capacityAnalysis: plan?.capacityAnalysis || {},
      });
      setSimResult(data);
      toast('Simulation complete', 'info');
      return data;
    } catch (e) {
      toast('Simulation failed: ' + e.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }, [tasks, plan]);

  const runPrep = useCallback(async (task) => {
    showLoading('PREP PACK', 'Generating checklist...');
    try {
      const data = await api.prep({ task });
      setPrepResult({ ...data, taskId: task.id });
      toast('Prep pack ready', 'success');
      return data;
    } catch (e) {
      toast('Prep failed: ' + e.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }, []);

  return (
    <ChronosContext.Provider value={{
      tasks, setTasks,
      anchors, setAnchors,
      lifeMode, setLifeMode,
      plan, setPlan,
      rescue, setRescue,
      review, setReview,
      reflection, setReflection,
      simResult, setSimResult,
      prepResult, setPrepResult,
      runPlan, runRescue, runReview, runReflection, runSimulate, runPrep,
    }}>
      {children}
    </ChronosContext.Provider>
  );
}

export const useChronos = () => {
  const ctx = useContext(ChronosContext);
  if (!ctx) throw new Error('useChronos must be used within ChronosProvider');
  return ctx;
};
