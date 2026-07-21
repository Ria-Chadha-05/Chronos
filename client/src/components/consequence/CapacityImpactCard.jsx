/**
 * CapacityImpactCard.jsx
 *
 * Displays predicted capacity impact (usable hours lost, reserve remaining,
 * overtime required, fatigue increase) for a simulated scenario.
 *
 * @prop {object} capacityImpact - Output of estimateCapacityImpact().
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

function Stat({ label, value, color }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-display text-[10px] tracking-widest uppercase text-[#7A9ABB]">{label}</span>
      <span className="font-display text-lg font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

export default function CapacityImpactCard({ capacityImpact = null, loading = false, className = '' }) {
  if (loading || !capacityImpact) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-32 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 rounded bg-[#111D35] animate-pulse" />)}
        </div>
      </div>
    );
  }

  const { usableHoursLost, reserveRemainingMinutes, overtimeRequiredMinutes, fatigueIncrease } = capacityImpact;

  return (
    <div
      className={`rounded-xl border border-[rgba(0,212,255,0.2)] bg-[#0D1628] p-4 ${className}`}
      style={{ boxShadow: 'inset 0 0 20px rgba(0,212,255,0.08)' }}
    >
      <h3 className="font-display text-[10px] tracking-widest uppercase text-[#7A9ABB] mb-3">⚡ Capacity Impact</h3>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Usable Hours Lost" value={`${usableHoursLost}h`} color={usableHoursLost > 1 ? '#FF3366' : '#00FF88'} />
        <Stat label="Reserve Remaining" value={`${Math.round(reserveRemainingMinutes / 60)}h`} color="#00D4FF" />
        <Stat label="Overtime Required" value={`${overtimeRequiredMinutes}m`} color={overtimeRequiredMinutes > 0 ? '#FF8C00' : '#00FF88'} />
        <Stat label="Fatigue Increase" value={`+${fatigueIncrease}`} color={fatigueIncrease > 15 ? '#FF3366' : fatigueIncrease > 5 ? '#FF8C00' : '#00FF88'} />
      </div>
    </div>
  );
}
