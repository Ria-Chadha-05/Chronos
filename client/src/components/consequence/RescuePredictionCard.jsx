/**
 * RescuePredictionCard.jsx
 *
 * Shows whether Rescue Mode would be predicted to activate under a
 * simulated scenario, with confidence and estimated cost to recover.
 *
 * @prop {object} rescuePrediction - Output of predictRescueActivation().
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

export default function RescuePredictionCard({ rescuePrediction = null, loading = false, className = '' }) {
  if (loading || !rescuePrediction) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-32 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="h-8 rounded bg-[#111D35] animate-pulse" />
      </div>
    );
  }

  const { required, confidence, estimatedRecoveryDays, workCompressionNeeded, delegationLikelihood } = rescuePrediction;
  const color = required ? '#FF3366' : '#00FF88';

  return (
    <div
      className={`rounded-xl border bg-[#0D1628] p-4 ${className}`}
      style={{ borderColor: required ? 'rgba(255,51,102,0.25)' : 'rgba(0,255,136,0.2)', boxShadow: `inset 0 0 20px ${required ? 'rgba(255,51,102,0.08)' : 'rgba(0,255,136,0.08)'}` }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-[10px] tracking-widest uppercase text-[#7A9ABB]">🚨 Rescue Prediction</h3>
        <span className="font-display text-xs font-bold uppercase" style={{ color }}>
          {required ? 'Would Activate' : 'Not Needed'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[10px] text-[#3D5A7A] uppercase tracking-widest mb-0.5">Confidence</div>
          <div className="font-display font-bold" style={{ color }}>{Math.round(confidence * 100)}%</div>
        </div>
        <div>
          <div className="text-[10px] text-[#3D5A7A] uppercase tracking-widest mb-0.5">Recovery Days</div>
          <div className="font-display font-bold text-[#00D4FF]">{estimatedRecoveryDays}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#3D5A7A] uppercase tracking-widest mb-0.5">Compression Needed</div>
          <div className="font-display font-bold" style={{ color: workCompressionNeeded ? '#FF8C00' : '#00FF88' }}>
            {workCompressionNeeded ? 'Yes' : 'No'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#3D5A7A] uppercase tracking-widest mb-0.5">Delegation Likelihood</div>
          <div className="font-display font-bold text-[#9B59FF]">{delegationLikelihood}</div>
        </div>
      </div>
    </div>
  );
}
