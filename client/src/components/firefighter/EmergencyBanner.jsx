/**
 * EmergencyBanner.jsx
 *
 * Full-width emergency notification strip displayed when Firefighter Mode is active.
 * Renders differently for 'warning' vs 'emergency' states.
 *
 * Props:
 *   isEmergency    {boolean}   Full emergency state
 *   isWarning      {boolean}   Soft warning state
 *   triggerReason  {string}    Human-readable explanation of why mode activated
 *   overloadMinutes {number}   Minutes over capacity
 *   onDismiss      {function}  Optional dismiss callback
 *   onActivate     {function}  Optional "Open Firefighter" callback
 *
 * Standalone — no context or store imports.
 */

import React, { useState } from 'react';

// ─── Sub-components ───────────────────────────────────────────────────────────

function PulsingDot({ colour }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
      <span style={{
        position:   'absolute',
        inset:      0,
        borderRadius: '50%',
        background: colour,
        opacity:    0.6,
        animation:  'ff-ping 1.4s ease-in-out infinite',
      }} />
      <span style={{
        position:   'relative',
        display:    'inline-flex',
        borderRadius: '50%',
        width:      10,
        height:     10,
        background: colour,
      }} />
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {{ isEmergency: boolean, isWarning: boolean, triggerReason: string,
 *            overloadMinutes: number, onDismiss?: function,
 *            onActivate?: function }} props
 */
export function EmergencyBanner({
  isEmergency    = false,
  isWarning      = false,
  triggerReason  = '',
  overloadMinutes = 0,
  onDismiss,
  onActivate,
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || (!isEmergency && !isWarning)) return null;

  const isRed  = isEmergency;
  const colour = isRed ? '#FF3366' : '#FF8C00';
  const glow   = isRed ? 'rgba(255,51,102,0.25)' : 'rgba(255,140,0,0.2)';
  const icon   = isRed ? '🔥' : '⚠️';
  const title  = isRed ? 'FIREFIGHTER MODE ACTIVE' : 'DAY AT RISK';

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes ff-ping {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50%       { transform: scale(2); opacity: 0; }
        }
        @keyframes ff-banner-in {
          from { opacity: 0; transform: translateY(-100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        width:      '100%',
        background: `linear-gradient(135deg, ${glow}, rgba(13,22,40,0.98))`,
        border:     `1px solid ${colour}`,
        borderLeft: `4px solid ${colour}`,
        borderRadius: 12,
        padding:    '12px 18px',
        display:    'flex',
        alignItems: 'center',
        gap:        14,
        boxShadow:  `0 0 28px ${glow}, inset 0 0 28px ${glow}`,
        animation:  'ff-banner-in 0.35s ease forwards',
        position:   'relative',
        overflow:   'hidden',
      }}>
        {/* Animated background pulse */}
        <div style={{
          position:   'absolute',
          inset:      0,
          background: `radial-gradient(ellipse at left, ${glow}, transparent 60%)`,
          animation:  'ff-ping 3s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Icon + dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <PulsingDot colour={colour} />
        </div>

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily:    'Orbitron, monospace',
            fontSize:      11,
            fontWeight:    700,
            letterSpacing: '0.18em',
            color:         colour,
            textShadow:    `0 0 10px ${glow}`,
            marginBottom:  3,
          }}>
            {title}
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   13,
            color:      'rgba(255,255,255,0.75)',
            lineHeight: 1.4,
            overflow:   'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {triggerReason || (
              isEmergency
                ? `Today is ${Math.round(overloadMinutes / 60 * 10) / 10}h over capacity — emergency recovery required.`
                : 'Day is near capacity. Consider deferring optional tasks.'
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {onActivate && (
            <button
              onClick={onActivate}
              style={{
                background:    colour,
                color:         '#050A14',
                border:        'none',
                borderRadius:  8,
                padding:       '6px 14px',
                fontFamily:    'Orbitron, monospace',
                fontSize:      10,
                fontWeight:    700,
                letterSpacing: '0.12em',
                cursor:        'pointer',
                textTransform: 'uppercase',
                whiteSpace:    'nowrap',
                boxShadow:     `0 0 12px ${glow}`,
              }}
            >
              Open Recovery
            </button>
          )}
          {onDismiss && (
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              style={{
                background:  'transparent',
                color:       'rgba(255,255,255,0.4)',
                border:      '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                width:       28,
                height:      28,
                display:     'flex',
                alignItems:  'center',
                justifyContent: 'center',
                cursor:      'pointer',
                fontSize:    14,
                flexShrink:  0,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </>
  );
}
