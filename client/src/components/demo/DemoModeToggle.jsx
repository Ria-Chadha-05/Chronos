/**
 * DemoModeToggle.jsx
 *
 * A standalone toggle switch for enabling and disabling Chronos Demo Mode.
 *
 * This component is intentionally self-contained — it has no hard dependency
 * on any app context or routing. Wire it up by passing `isDemoMode` and
 * `onToggle` from whichever state layer you choose (local state, context,
 * localStorage, etc.).
 *
 * Design language: matches the existing Chronos dark-UI system
 * (Orbitron headings, JetBrains Mono metadata, cyan/green accent palette,
 * glassmorphism borders from index.css CSS variables).
 *
 * @module components/demo/DemoModeToggle
 */

import React, { useCallback, useId } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR = {
  on: {
    track:       'rgba(0,255,136,0.18)',
    trackBorder: 'rgba(0,255,136,0.45)',
    thumb:       '#00FF88',
    thumbShadow: '0 0 8px rgba(0,255,136,0.8)',
    label:       '#00FF88',
    labelGlow:   '0 0 10px rgba(0,255,136,0.4)',
    dot:         '#00FF88',
  },
  off: {
    track:       'rgba(0,212,255,0.06)',
    trackBorder: 'rgba(0,212,255,0.18)',
    thumb:       '#3D5A7A',
    thumbShadow: 'none',
    label:       '#7A9ABB',
    labelGlow:   'none',
    dot:         '#3D5A7A',
  },
};

const TRACK_W  = 40;
const TRACK_H  = 22;
const THUMB_D  = 16;
const THUMB_ON_X  = TRACK_W - THUMB_D - 3;
const THUMB_OFF_X = 3;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Toggle switch for enabling / disabling Demo Mode.
 *
 * @param {Object}   props
 * @param {boolean}  props.isDemoMode  - Current toggle state (controlled).
 * @param {Function} props.onToggle    - Called with the new boolean value when the switch changes.
 * @param {boolean}  [props.disabled]  - Disables interaction when `true`.
 * @param {string}   [props.className] - Optional CSS class for the root element.
 *
 * @returns {JSX.Element}
 *
 * @example
 * const [demo, setDemo] = useState(false);
 * <DemoModeToggle isDemoMode={demo} onToggle={setDemo} />
 */
export default function DemoModeToggle({
  isDemoMode = false,
  onToggle,
  disabled = false,
  className = '',
}) {
  const switchId = useId();
  const c = isDemoMode ? COLOR.on : COLOR.off;

  const handleChange = useCallback(() => {
    if (disabled || typeof onToggle !== 'function') return;
    onToggle(!isDemoMode);
  }, [isDemoMode, onToggle, disabled]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleChange();
    }
  }, [handleChange]);

  return (
    <div
      className={className}
      style={{
        display:    'inline-flex',
        alignItems: 'center',
        gap:        10,
        opacity:    disabled ? 0.45 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Label — left side */}
      <label
        htmlFor={switchId}
        style={{
          fontFamily:    'Orbitron, monospace',
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         c.label,
          textShadow:    c.labelGlow,
          cursor:        disabled ? 'not-allowed' : 'pointer',
          userSelect:    'none',
          transition:    'color 0.25s, text-shadow 0.25s',
          whiteSpace:    'nowrap',
        }}
      >
        Demo Mode
      </label>

      {/* Track + Thumb */}
      <div
        role="switch"
        aria-checked={isDemoMode}
        aria-disabled={disabled}
        aria-label="Toggle Demo Mode"
        tabIndex={disabled ? -1 : 0}
        id={switchId}
        onClick={handleChange}
        onKeyDown={handleKeyDown}
        style={{
          position:     'relative',
          width:        TRACK_W,
          height:       TRACK_H,
          borderRadius: TRACK_H / 2,
          background:   c.track,
          border:       `1px solid ${c.trackBorder}`,
          cursor:       disabled ? 'not-allowed' : 'pointer',
          flexShrink:   0,
          transition:   'background 0.25s, border-color 0.25s',
          outline:      'none',
        }}
      >
        {/* Thumb */}
        <div
          style={{
            position:     'absolute',
            top:          (TRACK_H - THUMB_D) / 2,
            left:         isDemoMode ? THUMB_ON_X : THUMB_OFF_X,
            width:        THUMB_D,
            height:       THUMB_D,
            borderRadius: '50%',
            background:   c.thumb,
            boxShadow:    c.thumbShadow,
            transition:   'left 0.22s cubic-bezier(0.34,1.56,0.64,1), background 0.25s, box-shadow 0.25s',
          }}
        />

        {/* Focus ring (keyboard nav) */}
        <style>{`
          [role="switch"]:focus-visible {
            box-shadow: 0 0 0 2px rgba(0,212,255,0.6);
          }
        `}</style>
      </div>

      {/* State indicator dot + text — right side */}
      <span
        style={{
          display:    'inline-flex',
          alignItems: 'center',
          gap:        5,
        }}
      >
        <span
          style={{
            width:        6,
            height:       6,
            borderRadius: '50%',
            background:   c.dot,
            boxShadow:    isDemoMode ? '0 0 6px rgba(0,255,136,0.7)' : 'none',
            flexShrink:   0,
            transition:   'background 0.25s, box-shadow 0.25s',
            ...(isDemoMode && { animation: 'demoPulse 2s ease-in-out infinite' }),
          }}
        />
        <style>{`
          @keyframes demoPulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.45; }
          }
        `}</style>

        <span
          style={{
            fontFamily:    'JetBrains Mono, monospace',
            fontSize:      9,
            color:         c.label,
            letterSpacing: '0.06em',
            transition:    'color 0.25s',
          }}
        >
          {isDemoMode ? 'ON' : 'OFF'}
        </span>
      </span>
    </div>
  );
}
