/**
 * CommitmentSourceChart.jsx
 *
 * Donut chart showing distribution of commitments by source
 * (calendar, gmail, manual, task, etc.).
 *
 * @prop {Array<{source:string, pct:number, count:number}>} data - Source distribution.
 * @prop {string} [title='Commitment Sources']
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React, { useState } from 'react';

const SOURCE_COLORS = {
  calendar: '#00D4FF',
  gmail:    '#FF8C00',
  manual:   '#9B59FF',
  task:     '#00FF88',
  planner:  '#FF3366',
};

const fallbackColor = (i) => ['#00D4FF','#9B59FF','#FF8C00','#00FF88','#FF3366'][i % 5];

function sourceColor(source, i) {
  return SOURCE_COLORS[source?.toLowerCase()] ?? fallbackColor(i);
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const toRad = (d) => ((d - 90) * Math.PI) / 180;
  const sx = cx + r * Math.cos(toRad(startAngle));
  const sy = cy + r * Math.sin(toRad(startAngle));
  const ex = cx + r * Math.cos(toRad(endAngle));
  const ey = cy + r * Math.sin(toRad(endAngle));
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

/**
 * CommitmentSourceChart component.
 * @param {object} props
 */
export default function CommitmentSourceChart({
  data = [],
  title = 'Commitment Sources',
  loading = false,
  className = '',
}) {
  const [active, setActive] = useState(null);

  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-28 rounded bg-[#111D35] animate-pulse mb-3" />
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-[#111D35] animate-pulse" />
          <div className="space-y-2 flex-1">
            {[1,2,3].map((i) => <div key={i} className="h-3 rounded bg-[#111D35] animate-pulse" style={{ width: `${50 + i * 15}%` }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#0D1628] p-4 text-center ${className}`}>
        <p className="text-sm text-[#3D5A7A]">No source data.</p>
      </div>
    );
  }

  const CX = 56, CY = 56, R = 40, IR = 24;
  let cumAngle = 0;
  const arcs = data.map((d, i) => {
    const sweep = (d.pct / 100) * 360;
    const arc = { ...d, startAngle: cumAngle, endAngle: cumAngle + sweep, color: sourceColor(d.source, i) };
    cumAngle += sweep;
    return arc;
  });

  const activeItem = active != null ? arcs[active] : null;

  return (
    <div className={`rounded-xl border border-[rgba(0,212,255,0.15)] bg-[#0D1628] p-4 ${className}`}>
      <h4 className="font-display text-[10px] tracking-widest text-[#7A9ABB] uppercase mb-3">{title}</h4>
      <div className="flex items-center gap-4">
        {/* Donut */}
        <svg width={112} height={112} viewBox="0 0 112 112" className="shrink-0">
          {arcs.map((arc, i) => (
            <g key={i}>
              <path
                d={describeArc(CX, CY, R, arc.startAngle, arc.endAngle - 0.5)}
                fill="none"
                stroke={arc.color}
                strokeWidth={active === i ? 14 : 12}
                opacity={active == null || active === i ? 1 : 0.4}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
              <path
                d={describeArc(CX, CY, IR, arc.startAngle, arc.endAngle - 0.5)}
                fill="none" stroke="transparent" strokeWidth={12}
              />
            </g>
          ))}
          {/* Centre label */}
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="14"
            fontFamily="Orbitron, monospace" fontWeight="bold"
            fill={activeItem ? activeItem.color : '#00D4FF'}>
            {activeItem ? `${activeItem.pct}%` : `${data.length}`}
          </text>
          <text x={CX} y={CY + 10} textAnchor="middle" fontSize="7"
            fontFamily="JetBrains Mono, monospace" fill="#3D5A7A">
            {activeItem ? activeItem.source : 'sources'}
          </text>
        </svg>

        {/* Legend */}
        <ul className="flex-1 space-y-1.5">
          {arcs.map((arc, i) => (
            <li
              key={i}
              className="flex items-center gap-2 cursor-default text-sm"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              style={{ opacity: active == null || active === i ? 1 : 0.45 }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: arc.color }} />
              <span className="text-[#7A9ABB] capitalize flex-1 leading-none">{arc.source}</span>
              <span className="font-mono text-xs" style={{ color: arc.color }}>{arc.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
