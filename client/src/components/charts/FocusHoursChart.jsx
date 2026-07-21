/**
 * FocusHoursChart.jsx
 *
 * Line chart showing daily deep work / focus hours over the past N days.
 * Pure SVG — no external charting dependencies.
 *
 * @prop {Array<{label:string, hours:number, date?:string}>} data - Daily focus data points.
 * @prop {number} [targetHours=2] - Target daily focus hours shown as a dashed line.
 * @prop {string} [title='Focus Hours'] - Chart title.
 * @prop {number} [height=100] - SVG chart area height.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React, { useState } from 'react';

const VW = 320;

/**
 * FocusHoursChart component.
 * @param {object} props
 */
export default function FocusHoursChart({
  data = [],
  targetHours = 2,
  title = 'Focus Hours',
  height = 100,
  loading = false,
  className = '',
}) {
  const [tooltip, setTooltip] = useState(null);

  const pts = data.length > 0 ? data : Array.from({ length: 7 }, (_, i) => ({
    label: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i], hours: 0,
  }));

  const maxH = Math.max(targetHours * 1.5, ...pts.map((d) => d.hours), 0.1);
  const padL = 24, padR = 12, padT = 10, padB = 20;
  const chartW = VW - padL - padR;
  const chartH = height;

  const xScale = (i) => padL + (i / (pts.length - 1 || 1)) * chartW;
  const yScale = (h) => padT + chartH - (h / maxH) * chartH;

  const points = pts.map((d, i) => ({ x: xScale(i), y: yScale(d.hours), ...d }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  const areaPoints = [
    `${xScale(0)},${padT + chartH}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${xScale(pts.length - 1)},${padT + chartH}`,
  ].join(' ');

  const targetY = yScale(targetHours);

  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-24 rounded bg-[#111D35] animate-pulse mb-3" />
        <div className="h-20 rounded bg-[#111D35] animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[rgba(0,212,255,0.15)] bg-[#0D1628] p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display text-[10px] tracking-widest text-[#7A9ABB] uppercase">{title}</h4>
        <span className="text-[9px] font-mono text-[#9B59FF]">target: {targetHours}h</span>
      </div>

      <svg
        viewBox={`0 0 ${VW} ${height + padT + padB}`}
        className="w-full"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Area fill */}
        <defs>
          <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#focusGrad)" />

        {/* Target line */}
        <line
          x1={padL} y1={targetY} x2={VW - padR} y2={targetY}
          stroke="#9B59FF" strokeWidth="1" strokeDasharray="4 3" opacity="0.6"
        />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none" stroke="#00D4FF" strokeWidth="1.5" strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setTooltip({ ...p, i })}>
            <circle cx={p.x} cy={p.y} r={4} fill="transparent" className="cursor-pointer" />
            <circle cx={p.x} cy={p.y} r={tooltip?.i === i ? 4 : 2.5}
              fill={p.hours >= targetHours ? '#00FF88' : '#00D4FF'}
              stroke="#050A14" strokeWidth="1"
              className="transition-all duration-150"
            />
            <text x={p.x} y={padT + chartH + 14} textAnchor="middle"
              fontSize="7.5" fill="#3D5A7A" fontFamily="JetBrains Mono, monospace">
              {(p.label ?? '').slice(0, 3)}
            </text>
          </g>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x - 22, VW - 60)} y={tooltip.y - 26}
              width={52} height={18} rx="4"
              fill="#111D35" stroke="rgba(0,212,255,0.3)" strokeWidth="1"
            />
            <text
              x={Math.min(tooltip.x - 22, VW - 60) + 26} y={tooltip.y - 14}
              fontSize="9" fill="#00D4FF" textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
            >
              {tooltip.hours}h focus
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
