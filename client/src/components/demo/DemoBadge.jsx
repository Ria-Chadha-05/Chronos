/**
 * DemoBadge.jsx
 *
 * A small status badge displayed whenever Chronos is running in Demo Mode.
 * Informs users at a glance that no live data or Google authentication is
 * in use.
 *
 * The badge is intentionally unobtrusive — it lives in a corner of the layout
 * and never occludes content. It carries the Chronos dark-UI palette and
 * a subtle pulse animation to signal "live demo" state.
 *
 * This component has zero external dependencies: no context, no hooks, no
 * router imports. Drop it anywhere in the tree.
 *
 * @module components/demo/DemoBadge
 */

import React from 'react';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Badge displayed when Chronos is running in Demo Mode.
 *
 * @param {Object}  props
 * @param {string}  [props.className]    - Optional CSS class for the root element.
 * @param {'sm'|'md'|'lg'} [props.size]  - Badge size preset. Default `'md'`.
 * @param {boolean} [props.showIcon]     - Show the waveform icon. Default `true`.
 * @param {boolean} [props.showSubline]  - Show the "No live data" subline. Default `true`.
 *
 * @returns {JSX.Element}
 *
 * @example
 * // Compact — icon only, no subline (e.g. tight navbars)
 * <DemoBadge size="sm" showSubline={false} />
 *
 * // Full badge with subline (e.g. dashboard header)
 * <DemoBadge />
 */
export default function DemoBadge({
  className = '',
  size      = 'md',
  showIcon  = true,
  showSubline = true,
}) {
  const scale = SIZE_SCALE[size] ?? SIZE_SCALE.md;

  return (
    <div
      className={className}
      style={{
        display:     'inline-flex',
        alignItems:  'center',
        gap:         scale.gap,
        padding:     scale.padding,
        borderRadius: scale.radius,
        background:  'rgba(0,212,255,0.07)',
        border:      '1px solid rgba(0,212,255,0.28)',
        backdropFilter: 'blur(8px)',
        userSelect:  'none',
      }}
    >
      {/* Animated waveform icon */}
      {showIcon && (
        <WaveformIcon size={scale.iconSize} />
      )}

      {/* Text block */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span
          style={{
            fontFamily:    'Orbitron, monospace',
            fontSize:      scale.titleSize,
            fontWeight:    700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         '#00D4FF',
            textShadow:    '0 0 8px rgba(0,212,255,0.5)',
            lineHeight:    1,
          }}
        >
          Demo Mode
        </span>

        {showSubline && (
          <span
            style={{
              fontFamily:    'JetBrains Mono, monospace',
              fontSize:      scale.subSize,
              color:         'rgba(0,212,255,0.5)',
              letterSpacing: '0.06em',
              lineHeight:    1,
            }}
          >
            No live data · Sandbox
          </span>
        )}
      </div>

      {/* Pulsing dot */}
      <LiveDot size={scale.dotSize} />

      {/* Animation keyframes */}
      <style>{`
        @keyframes demoBadgePulse {
          0%, 100% { opacity: 1;    transform: scale(1);    }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes demoBadgeBar {
          0%, 100% { transform: scaleY(0.3); }
          50%       { transform: scaleY(1);   }
        }
      `}</style>
    </div>
  );
}

// ─── Size presets ─────────────────────────────────────────────────────────────

const SIZE_SCALE = {
  sm: {
    gap:       5,
    padding:   '4px 8px',
    radius:    8,
    iconSize:  10,
    titleSize: 7,
    subSize:   0,   // subline hidden at sm regardless
    dotSize:   5,
  },
  md: {
    gap:       7,
    padding:   '6px 11px',
    radius:    10,
    iconSize:  13,
    titleSize: 9,
    subSize:   8,
    dotSize:   6,
  },
  lg: {
    gap:       9,
    padding:   '8px 14px',
    radius:    12,
    iconSize:  16,
    titleSize: 11,
    subSize:   9,
    dotSize:   8,
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Animated waveform icon (3 bars, staggered).
 *
 * @param {{ size: number }} props
 */
function WaveformIcon({ size = 13 }) {
  const barW  = Math.max(1, Math.round(size * 0.18));
  const barH  = size;
  const gap   = Math.max(1, Math.round(size * 0.12));
  const width = barW * 3 + gap * 2;

  const BAR_DELAYS = ['0s', '0.2s', '0.4s'];
  const BAR_HEIGHTS = [0.55, 1, 0.7]; // relative heights

  return (
    <div
      style={{
        display:       'inline-flex',
        alignItems:    'flex-end',
        gap:           gap,
        width:         width,
        height:        barH,
        flexShrink:    0,
      }}
    >
      {BAR_DELAYS.map((delay, i) => (
        <div
          key={i}
          style={{
            width:           barW,
            height:          `${BAR_HEIGHTS[i] * 100}%`,
            borderRadius:    barW,
            background:      '#00D4FF',
            boxShadow:       '0 0 4px rgba(0,212,255,0.6)',
            transformOrigin: 'bottom',
            animation:       `demoBadgeBar 1.1s ease-in-out ${delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * A pulsing status dot indicating "live demo" state.
 *
 * @param {{ size: number }} props
 */
function LiveDot({ size = 6 }) {
  return (
    <span
      style={{
        width:        size,
        height:       size,
        borderRadius: '50%',
        background:   '#00D4FF',
        boxShadow:    '0 0 6px rgba(0,212,255,0.7)',
        flexShrink:   0,
        animation:    'demoBadgePulse 2s ease-in-out infinite',
        display:      'inline-block',
      }}
    />
  );
}
