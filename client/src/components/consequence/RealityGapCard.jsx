/**
 * RealityGapCard.jsx
 *
 * Shows Current Gap → Future Gap → Difference for a simulated scenario.
 *
 * @prop {object} realityGapChange - Output of estimateRealityGapChange().
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

const SEVERITY_COLOR = { Low: '#00FF88', Medium: '#FF8C00', High: '#FF3366' };

export default function RealityGapCard({ realityGapChange = null, loading = false, className = '' }) {
  if (loading || !realityGapChange) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-28 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="h-8 rounded bg-[#111D35] animate-pulse" />
      </div>
    );
  }

  const { currentGap, futureGap, difference, direction, severity } = realityGapChange;
  const color = SEVERITY_COLOR[severity] ?? '#7A9ABB';
  const arrow = direction === 'increase' ? '↑' : direction === 'decrease' ? '↓' : '→';
  const arrowColor = direction === 'increase' ? '#FF3366' : direction === 'decrease' ? '#00FF88' : '#7A9ABB';

  return (
    <div
      className={`rounded-xl border border-[rgba(155,89,255,0.2)] bg-[#0D1628] p-4 ${className}`}
      style={{ boxShadow: 'inset 0 0 20px rgba(155,89,255,0.08)' }}
    >
      <h3 className="font-display text-[10px] tracking-widest uppercase text-[#7A9ABB] mb-3">🪞 Reality Gap</h3>
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="text-[10px] text-[#3D5A7A] mb-1">Current</div>
          <div className="font-display text-xl font-bold text-[#7A9ABB]">{currentGap}</div>
        </div>
        <div className="text-center px-2">
          <div className="font-mono text-lg" style={{ color: arrowColor }}>{arrow}</div>
          <div className="text-[10px] font-mono" style={{ color: arrowColor }}>
            {difference > 0 ? `+${difference}` : difference}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-[#3D5A7A] mb-1">Future</div>
          <div className="font-display text-xl font-bold" style={{ color }}>{futureGap}</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between">
        <span className="text-xs text-[#3D5A7A]">Severity</span>
        <span className="text-xs font-display font-bold uppercase" style={{ color }}>{severity}</span>
      </div>
    </div>
  );
}
