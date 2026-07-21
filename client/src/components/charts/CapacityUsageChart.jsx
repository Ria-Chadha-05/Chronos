/**
 * CapacityUsageChart.jsx
 *
 * Radial gauge showing current capacity utilisation percentage,
 * plus a small breakdown of scheduled vs available time.
 *
 * @prop {number} utilizationPct - 0–100+ percent (can exceed 100 when overloaded).
 * @prop {number} [scheduledMinutes=0] - Total scheduled minutes.
 * @prop {number} [availableMinutes=480] - Total available minutes.
 * @prop {string} [status='Healthy'] - CapacityStatus string.
 * @prop {string} [title='Capacity Usage']
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

const STATUS_COLOR = {
  Peak:       '#00FF88',
  Healthy:    '#00FF88',
  Busy:       '#00D4FF',
  'High Load':'#FF8C00',
  Overloaded: '#FF3366',
};

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const start = polarToXY(cx, cy, r, startDeg);
  const end = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

/**
 * CapacityUsageChart component.
 * @param {object} props
 */
export default function CapacityUsageChart({
  utilizationPct = 0,
  scheduledMinutes = 0,
  availableMinutes = 480,
  status = 'Healthy',
  title = 'Capacity Usage',
  loading = false,
  className = '',
}) {
  const color = STATUS_COLOR[status] ?? '#00D4FF';
  const clampedPct = Math.min(utilizationPct, 100);
  const isOverloaded = utilizationPct > 100;

  // Gauge spans 220° (from -110° to +110° relative to bottom)
  const START_DEG = -220;
  const END_DEG = 40;
  const RANGE = END_DEG - START_DEG; // 260°
  const fillEnd = START_DEG + (clampedPct / 100) * RANGE;

  const CX = 80, CY = 80, R = 58, IR = 42;

  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-24 rounded bg-[#111D35] animate-pulse mb-3" />
        <div className="w-32 h-32 rounded-full bg-[#111D35] animate-pulse mx-auto" />
      </div>
    );
  }

  return (
    <div className={`rounded-xl border bg-[#0D1628] p-4 ${className}`}
      style={{ borderColor: `${color}33`, boxShadow: `inset 0 0 20px ${color}0a` }}>
      <h4 className="font-display text-[10px] tracking-widest text-[#7A9ABB] uppercase mb-3">{title}</h4>

      <div className="flex items-center gap-4">
        {/* Gauge */}
        <div className="shrink-0">
          <svg width={160} height={110} viewBox="0 0 160 110">
            {/* Track */}
            <path
              d={arcPath(CX, CY, R, START_DEG, END_DEG)}
              fill="none" stroke="#111D35" strokeWidth={10} strokeLinecap="round"
            />
            {/* Fill */}
            {clampedPct > 0 && (
              <path
                d={arcPath(CX, CY, R, START_DEG, fillEnd)}
                fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
              />
            )}
            {/* Overload indicator */}
            {isOverloaded && (
              <path
                d={arcPath(CX, CY, R, START_DEG + RANGE * 0.98, END_DEG)}
                fill="none" stroke="#FF3366" strokeWidth={10} strokeLinecap="round"
                opacity="0.6"
              />
            )}
            {/* Centre text */}
            <text x={CX} y={CY - 6} textAnchor="middle" fontSize="22"
              fontFamily="Orbitron, monospace" fontWeight="bold" fill={color}>
              {Math.round(utilizationPct)}%
            </text>
            <text x={CX} y={CY + 10} textAnchor="middle" fontSize="8"
              fontFamily="JetBrains Mono, monospace" fill="#7A9ABB">
              {status}
            </text>
            {isOverloaded && (
              <text x={CX} y={CY + 24} textAnchor="middle" fontSize="7.5"
                fontFamily="JetBrains Mono, monospace" fill="#FF3366">
                OVERLOADED
              </text>
            )}
          </svg>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="font-display text-[9px] tracking-widest text-[#3D5A7A] uppercase mb-0.5">Scheduled</div>
            <div className="font-display text-base font-bold" style={{ color }}>{formatDuration(scheduledMinutes)}</div>
          </div>
          <div>
            <div className="font-display text-[9px] tracking-widest text-[#3D5A7A] uppercase mb-0.5">Available</div>
            <div className="font-display text-base font-bold text-[#7A9ABB]">{formatDuration(availableMinutes)}</div>
          </div>
          {isOverloaded && (
            <div>
              <div className="font-display text-[9px] tracking-widest text-[#3D5A7A] uppercase mb-0.5">Over by</div>
              <div className="font-display text-base font-bold text-[#FF3366]">
                {formatDuration(scheduledMinutes - availableMinutes)}
              </div>
            </div>
          )}
          <div className="h-1 rounded-full bg-[#111D35] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${clampedPct}%`, background: color }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
