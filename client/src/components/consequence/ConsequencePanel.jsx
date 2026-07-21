/**
 * ConsequencePanel.jsx
 *
 * Top-level panel for the Deadline Consequence Simulator. Composes all
 * consequence/ subcomponents around a single `report` object produced by
 * `generateSimulationReport()` / `simulateScenario()` from
 * `src/services/consequenceSimulatorEngine.js`.
 *
 * This component is intentionally self-contained: it does not read from
 * CommitmentContext or any other existing context. It is fed via props so
 * it can be wired into Dashboard / Planner / Rescue later without those
 * files needing to change for this component to exist.
 *
 * @prop {object} report - Output of generateSimulationReport()/simulateScenario().
 * @prop {string} [title] - Optional heading, e.g. "What happens if I accept this?"
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';
import ScenarioComparisonCard from './ScenarioComparisonCard.jsx';
import BeforeAfterTimeline from './BeforeAfterTimeline.jsx';
import CapacityImpactCard from './CapacityImpactCard.jsx';
import RealityGapCard from './RealityGapCard.jsx';
import ConflictPredictionCard from './ConflictPredictionCard.jsx';
import RescuePredictionCard from './RescuePredictionCard.jsx';
import TradeoffCard from './TradeoffCard.jsx';
import RecommendationCard from './RecommendationCard.jsx';

export default function ConsequencePanel({
  report = null,
  title = 'What happens if I do this?',
  loading = false,
  className = '',
}) {
  if (loading || !report) {
    return (
      <div className={`rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#0A1220] p-5 space-y-4 ${className}`}>
        <div className="h-4 w-56 rounded bg-[#111D35] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-[#111D35] animate-pulse" />)}
        </div>
      </div>
    );
  }

  const {
    comparison,
    capacityImpact,
    realityGapChange,
    newConflicts,
    resolvedConflicts,
    rescuePrediction,
    tradeoffs,
    recommendation,
  } = report;

  return (
    <div className={`rounded-2xl border border-[rgba(0,212,255,0.15)] bg-[#0A1220] p-5 space-y-5 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">🔮</span>
        <h2 className="font-display text-sm tracking-widest uppercase text-[#00D4FF]">{title}</h2>
      </div>

      <RecommendationCard recommendation={recommendation} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScenarioComparisonCard comparison={comparison} />
        <BeforeAfterTimeline comparison={comparison} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CapacityImpactCard capacityImpact={capacityImpact} />
        <RealityGapCard realityGapChange={realityGapChange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ConflictPredictionCard newConflicts={newConflicts} resolvedConflicts={resolvedConflicts} />
        <RescuePredictionCard rescuePrediction={rescuePrediction} />
      </div>

      <TradeoffCard tradeoffs={tradeoffs} />
    </div>
  );
}
