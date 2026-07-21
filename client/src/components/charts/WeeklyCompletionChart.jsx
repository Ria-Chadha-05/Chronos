/**
 * WeeklyCompletionChart.jsx
 *
 * Bar chart showing daily task completion rates over the current week.
 * Pure SVG — no external charting library required.
 *
 * @prop {Array<{label:string, pct:number, date?:string}>} data - 7 data points.
 * @prop {string} [title='Weekly Completion'] - Chart title.
 * @prop {number} [height=120] - Chart area height in px.
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React, { useState } from 'react';

const W = 320;

/**
 * WeeklyCompletionChart component.
 * @param {object} props
 */
export default function WeeklyCompletionChart({
  data = [],
  title = 'Weekly Completion',
  height = 120,
  loading = false,
  className = '',
}) {
  const [tooltip, setTooltip] = useState(null);

  const padded = data.length > 0
    ? data
    : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label) => ({ label, pct: 0 }));

  const barWidth = Math.floor((W - 32) / padded.length) - 4;
  const maxPct = 100;

  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(0,212,255,0.1)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-28 rounded bg-[#111D35] animate-pulse mb-3" />
        <div className="flex items-end gap-1 h-20">
          {[60,80,45,90,70,55,65].map((h_, i) => (
            <div key={i} className="flex-1 rounded-t bg-[#111D35] animate-pulse" style={{ height: `${h_}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[rgba(0,212,255,0.15)] bg-[#0D1628] p-4 ${className}`}>
      <h4 className="font-display text-[10px] tracking-widest text-[#7A9ABB] uppercase mb-3">{title}</h4>
      <div className="relative select-none">
        <svg
          viewBox={`0 0 ${W} ${height + 24}`}
          className="w-full"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Y-axis guide lines */}
          {[25, 50, 75, 100].map((y) => (
            <g key={y}>
              <line
                x1={16} y1={height - (y / maxPct) * height}
                x2={W - 16} y2={height - (y / maxPct) * height}
                stroke="rgba(255,255,255,0.04)" strokeWidth="1"
              />
              <text x={12} y={height - (y / maxPct) * height + 3}
                fontSize="8" fill="#3D5A7A" textAnchor="end" fontFamily="JetBrains Mono, monospace">
                {y}
              </text>
            </g>
          ))}

          {/* Bars */}
          {padded.map((d, i) => {
            const x = 20 + i * (barWidth + 4);
            const barH = Math.max(2, (d.pct / 100) * height);
            const y = height - barH;
            const isHigh = d.pct >= 80;
            const isMed = d.pct >= 50;
            const fill = isHigh ? '#00FF88' : isMed ? '#00D4FF' : d.pct > 0 ? '#FF8C00' : '#1a2740';
            const isActive = tooltip?.i === i;

            return (
              <g key={i}
                onMouseEnter={() => setTooltip({ i, x: x + barWidth / 2, y, pct: d.pct, label: d.label })}
              >
                <rect
                  x={x} y={y} width={barWidth} height={barH}
                  rx="3" fill={fill} opacity={isActive ? 1 : 0.75}
                  className="cursor-pointer transition-opacity"
                />
                <text
                  x={x + barWidth / 2} y={height + 14}
                  fontSize="8" fill="#7A9ABB" textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {d.label?.slice(0, 3) ?? ''}
                </text>
              </g>
            );
          })}

          {/* Tooltip */}
          {tooltip && (
            <g>
              <rect
                x={Math.min(tooltip.x - 20, W - 56)} y={tooltip.y - 24}
                width={48} height={18} rx="4"
                fill="#111D35" stroke="rgba(0,212,255,0.3)" strokeWidth="1"
              />
              <text
                x={Math.min(tooltip.x - 20, W - 56) + 24} y={tooltip.y - 12}
                fontSize="9" fill="#00D4FF" textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
              >
                {tooltip.pct}%
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
