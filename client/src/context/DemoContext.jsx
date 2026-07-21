/**
 * DemoContext.jsx
 *
 * Provides Demo Mode state to the entire Chronos application.
 *
 * When isDemoMode is true:
 *   - demoState contains the full generated demo dataset
 *   - CommitmentContext reads from demoState.commitments
 *   - Dashboard and all screens use demo data for statistics,
 *     insights, planner, rescue, and reflection
 *
 * This context is deliberately flat: one boolean + one data object.
 * It does NOT duplicate any engine logic — it only holds the result of
 * generateFullDemoState() and exposes it to consumers.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { generateFullDemoState } from '../demo/index.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// ─── Context ──────────────────────────────────────────────────────────────────

const DemoContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useLocalStorage('chronos_demo_mode', false);

  // demoState is regenerated fresh each time Demo Mode is turned ON so that
  // numeric jitter (e.g. capacityScore ±5) applies on every enable.
  const [demoState, setDemoState] = useState(null);

  // Initialise demo state when Demo Mode is already on at mount time
  useEffect(() => {
    if (isDemoMode && !demoState) {
      setDemoState(generateFullDemoState());
    }
    if (!isDemoMode && demoState) {
      // Clear demo state when turned off so live mode starts fresh
      setDemoState(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode]);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => {
      const next = !prev;
      if (next) {
        // Generate fresh demo data when enabling
        setDemoState(generateFullDemoState());
      } else {
        setDemoState(null);
      }
      return next;
    });
  }, [setIsDemoMode]);

  const enableDemoMode = useCallback(() => {
    if (!isDemoMode) {
      setDemoState(generateFullDemoState());
      setIsDemoMode(true);
    }
  }, [isDemoMode, setIsDemoMode]);

  const disableDemoMode = useCallback(() => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setDemoState(null);
    }
  }, [isDemoMode, setIsDemoMode]);

  return (
    <DemoContext.Provider
      value={{
        isDemoMode: Boolean(isDemoMode),
        demoState,
        toggleDemoMode,
        enableDemoMode,
        disableDemoMode,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
