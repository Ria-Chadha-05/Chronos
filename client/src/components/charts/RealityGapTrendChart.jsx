/**
 * RealityGapTrendChart.jsx
 *
 * Stepped area chart showing reality gap severity trend over time.
 * Severity is mapped to a numeric score: Low=1, Medium=2, High=3.
 *
 * @prop {Array<{date:string, severity:'Low'|'Medium'|'High', severityScore?:number}>} data
 * @prop {string} [title='Reality Gap Trend']
 * @prop {number} [height=100]
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React, { useState } from 'react';

const SEVERITY_SCORE = { Low: 1, Medium: 2, High: 3 };
const SEVERITY_COLOR = { 1: '#00FF88', 2: '#FF8C00', 3: '#FF3366' };
const SEVERITY_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High' };

const VW = 320;

/**
 * RealityGapTrendChart component.
 * @param {object} props
 */
export default function RealityGapTrendChart({
  data = [],
  title = 'Reality Gap Trend',
  height = 100,
  loading = false,
  className = '',
}) {
  const [tooltip, setTooltip] = useState(null);

  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(255,51,102,0.15)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-32 rounded bg-[#111D35] animate-pulse mb-3" />
        <div className="h-20 rounded bg-[#111D35] animate-pulse" />
      </div>
    );
  }

  const pts = data.length > 0 ? data : [];

  if (pts.length === 0) {
    return (
      <div className={`rounded-xl border border-[rgba(255,51,102,0.1)] bg-[#0D1628] p-4 text-center ${className}`}>
        <h4 className="font-display text-[10px] tracking-widest text-[#7A9ABB] uppercase mb-2">{title}</h4>
        <p className="text-sm text-[#3D5A7A]">No trend data yet.</p>
      </div>
    );
  }

  const padL = 24, padR = 12, padT = 10, padB = 20;
  const chartW = VW - padL - padR;
  const chartH = height;
  const maxScore = 3;

  const xScale = (i) => padL + (i / Math.max(pts.length - 1, 1)) * chartW;
  const yScale = (s) => padT + chartH - ((s - 1) / (maxScore - 1)) * chartH;

  const points = pts.map((d, i) => ({
    x: xScale(i),
    y: yScale(d.severityScore ?? SEVERITY_SCORE[d.severity] ?? 1),
    score: d.severityScore ?? SEVERITY_SCORE[d.severity] ?? 1,
    label: d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    severity: d.severity ?? SEVERITY_LABEL[d.severityScore] ?? 'Low',
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPoints = [
    `${xScale(0)},${padT + chartH}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${xScale(pts.length - 1)},${padT + chartH}`,
  ].join(' ');

  // Determine overall trend color
  const avgScore = points.reduce((s, p) => s + p.score, 0) / points.length;
  const trendColor = avgScore <= 1.5 ? '#00FF88' : avgScore <= 2.2 ? '#FF8C00' : '#FF3366';

  return (
    <div className={`rounded-xl border bg-[#0D1628] p-4 ${className}`}
      style={{ borderColor: `${trendColor}33` }}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-display text-[10px] tracking-widest text-[#7A9ABB] uppercase">{title}</h4>
        <div className="flex items-center gap-2 text-[9px] font-mono">
          {['Low','Medium','High'].map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: SEVERITY_COLOR[SEVERITY_SCORE[s]] }} />
              <span className="text-[#3D5A7A]">{s}</span>
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VW} ${height + padT + padB}`}
        className="w-full"
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="rgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y-axis labels */}
        {[1, 2, 3].map((s) => (
          <text key={s} x={padL - 4} y={yScale(s) + 3}
            fontSize="7" fill={SEVERITY_COLOR[s]} textAnchor="end"
            fontFamily="JetBrains Mono, monospace">
            {SEVERITY_LABEL[s].slice(0, 3)}
          </text>
        ))}

        {/* Horizontal guides */}
        {[1, 2, 3].map((s) => (
          <line key={s}
            x1={padL} y1={yScale(s)} x2={VW - padR} y2={yScale(s)}
            stroke={SEVERITY_COLOR[s]} strokeWidth="0.5" strokeDasharray="3 4" opacity="0.2"
          />
        ))}

        {/* Area */}
        <polygon points={areaPoints} fill="url(#rgGrad)" />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke={trendColor} strokeWidth="1.5" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setTooltip({ ...p, i })}>
            <circle cx={p.x} cy={p.y} r={6} fill="transparent" className="cursor-pointer" />
            <circle cx={p.x} cy={p.y} r={tooltip?.i === i ? 4 : 3}
              fill={SEVERITY_COLOR[p.score]}
              stroke="#050A14" strokeWidth="1.5"
              className="transition-all duration-150"
            />
          </g>
        ))}

        {/* X-axis labels (show first, middle, last) */}
        {[0, Math.floor(pts.length / 2), pts.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <text key={i} x={points[i]?.x ?? 0} y={padT + chartH + 14}
            textAnchor="middle" fontSize="7" fill="#3D5A7A"
            fontFamily="JetBrains Mono, monospace">
            {points[i]?.label ?? ''}
          </text>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={Math.min(Math.max(tooltip.x - 28, padL), VW - 70)} y={tooltip.y - 28}
              width={66} height={18} rx="4"
              fill="#111D35" stroke={`${SEVERITY_COLOR[tooltip.score]}66`} strokeWidth="1"
            />
            <text
              x={Math.min(Math.max(tooltip.x - 28, padL), VW - 70) + 33} y={tooltip.y - 16}
              fontSize="9" fill={SEVERITY_COLOR[tooltip.score]} textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
            >
              {tooltip.severity}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
