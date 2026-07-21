/**
 * TradeoffCard.jsx
 *
 * Renders a "Gain / Lose" trade-off breakdown for a simulated scenario.
 *
 * @prop {object} tradeoffs - Output of generateTradeoffs(): { gains, losses, netAssessment }.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

const ASSESSMENT_COLOR = {
  'Worth it': '#00FF88',
  Risky: '#FF8C00',
  'Not worth it': '#FF3366',
};

export default function TradeoffCard({ tradeoffs = null, loading = false, className = '' }) {
  if (loading || !tradeoffs) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-24 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="h-16 rounded bg-[#111D35] animate-pulse" />
      </div>
    );
  }

  const { gains = [], losses = [], netAssessment } = tradeoffs;
  const color = ASSESSMENT_COLOR[netAssessment] ?? '#7A9ABB';

  return (
    <div
      className={`rounded-xl border border-[rgba(255,140,0,0.2)] bg-[#0D1628] p-4 space-y-3 ${className}`}
      style={{ boxShadow: 'inset 0 0 20px rgba(255,140,0,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[10px] tracking-widest uppercase text-[#7A9ABB]">⚖️ Trade-offs</h3>
        <span className="font-display text-xs font-bold uppercase" style={{ color }}>{netAssessment}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#00FF88] font-display mb-1.5">Gain</div>
          {gains.length ? (
            <ul className="space-y-1">
              {gains.map((g, i) => (
                <li key={i} className="text-sm text-[#7A9ABB] flex items-start gap-1.5">
                  <span className="text-[#00FF88]">+</span>{g}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-[#3D5A7A]">Nothing gained.</p>}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#FF3366] font-display mb-1.5">Lose</div>
          {losses.length ? (
            <ul className="space-y-1">
              {losses.map((l, i) => (
                <li key={i} className="text-sm text-[#7A9ABB] flex items-start gap-1.5">
                  <span className="text-[#FF3366]">−</span>{l}
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-[#3D5A7A]">Nothing lost.</p>}
        </div>
      </div>
    </div>
  );
}
