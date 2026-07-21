/**
 * SeverityGauge.jsx
 *
 * Animated radial gauge displaying the Firefighter Mode emergency severity score (0–100).
 *
 * Props:
 *   score        {number}  0–100 severity value
 *   level        {string}  'low' | 'moderate' | 'high' | 'critical'
 *   size         {number}  Diameter in px (default 180)
 *   showLabel    {boolean} Show score label in centre (default true)
 *   animate      {boolean} Animate fill on mount (default true)
 *
 * Standalone — no context or store imports.
 */

import React, { useEffect, useRef, useState } from 'react';

// ─── Colour map ───────────────────────────────────────────────────────────────

const LEVEL_COLOURS = {
  low:      '#00FF88',
  moderate: '#FF8C00',
  high:     '#FF3366',
  critical: '#FF3366',
};

const LEVEL_LABELS = {
  low:      'MANAGEABLE',
  moderate: 'WARNING',
  high:     'OVERLOAD',
  critical: 'CRITICAL',
};

const LEVEL_GLOW = {
  low:      'rgba(0,255,136,0.35)',
  moderate: 'rgba(255,140,0,0.35)',
  high:     'rgba(255,51,102,0.35)',
  critical: 'rgba(255,51,102,0.5)',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {{ score: number, level: string, size?: number,
 *            showLabel?: boolean, animate?: boolean }} props
 */
export function SeverityGauge({
  score     = 0,
  level     = 'low',
  size      = 180,
  showLabel = true,
  animate   = true,
}) {
  const [displayed, setDisplayed] = useState(animate ? 0 : score);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!animate) { setDisplayed(score); return; }

    const start     = performance.now();
    const duration  = 900;
    const from      = 0;
    const to        = score;

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayed(Math.round(from + (to - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score, animate]);

  const colour    = LEVEL_COLOURS[level] ?? LEVEL_COLOURS.low;
  const glow      = LEVEL_GLOW[level]    ?? LEVEL_GLOW.low;
  const labelText = LEVEL_LABELS[level]  ?? 'UNKNOWN';

  // SVG arc maths
  const strokeWidth = size * 0.08;
  const radius      = (size - strokeWidth) / 2;
  const cx          = size / 2;
  const cy          = size / 2;

  // Arc goes from 135° to 405° (270° sweep) — bottom-left to bottom-right
  const startAngle  = 135;
  const totalSweep  = 270;
  const fillSweep   = (displayed / 100) * totalSweep;

  function polarToCartesian(angle) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function describeArc(startDeg, sweepDeg) {
    const endDeg   = startDeg + sweepDeg;
    const start    = polarToCartesian(startDeg);
    const end      = polarToCartesian(endDeg);
    const largeArc = sweepDeg > 180 ? 1 : 0;
    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    ].join(' ');
  }

  const trackPath = describeArc(startAngle, totalSweep);
  const fillPath  = fillSweep > 0.5 ? describeArc(startAngle, fillSweep) : '';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <path
            d={trackPath}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Fill */}
          {fillPath && (
            <path
              d={fillPath}
              fill="none"
              stroke={colour}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{
                filter:     `drop-shadow(0 0 ${strokeWidth * 0.6}px ${glow})`,
                transition: animate ? 'none' : undefined,
              }}
            />
          )}
        </svg>

        {/* Centre label */}
        {showLabel && (
          <div style={{
            position:  'absolute',
            inset:     0,
            display:   'flex',
            flexDirection: 'column',
            alignItems:    'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily: 'Orbitron, monospace',
              fontSize:   size * 0.2,
              fontWeight: 900,
              color:      colour,
              lineHeight: 1,
              textShadow: `0 0 18px ${glow}`,
            }}>
              {displayed}
            </span>
            <span style={{
              fontFamily:    'Orbitron, monospace',
              fontSize:      size * 0.065,
              fontWeight:    700,
              color:         colour,
              letterSpacing: '0.12em',
              marginTop:     size * 0.02,
              opacity:       0.8,
            }}>
              / 100
            </span>
          </div>
        )}
      </div>

      {/* Level badge */}
      <div style={{
        fontFamily:    'Orbitron, monospace',
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: '0.2em',
        color:         colour,
        textShadow:    `0 0 12px ${glow}`,
        textTransform: 'uppercase',
        padding:       '4px 12px',
        border:        `1px solid ${colour}`,
        borderRadius:  20,
        background:    `${colour}14`,
      }}>
        {labelText}
      </div>
    </div>
  );
}
