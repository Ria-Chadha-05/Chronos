import React, { useEffect, useState } from 'react';

// ── CARD ──────────────────────────────────────────────────────
export function Card({ children, className = '', danger = false, success = false, style = {}, animate = false, stagger = 0 }) {
  return (
    <div
      className={`${animate ? 'cos-card-enter' : ''} ${className}`}
      style={{
        '--stagger': stagger,
        background: danger ? 'rgba(255,51,102,0.04)' : 'var(--surface)',
        border: `1px solid ${danger ? 'rgba(255,51,102,0.3)' : success ? 'rgba(0,255,136,0.3)' : 'var(--border)'}`,
        borderRadius: 18,
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700,
        letterSpacing: '0.15em', color: 'var(--cyan)', textTransform: 'uppercase',
      }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── BUTTON ────────────────────────────────────────────────────
const BTN_STYLES = {
  primary: { bg: 'var(--cyan-dim)',    border: 'var(--cyan)',   color: 'var(--cyan)',   shadow: '0 0 18px rgba(0,212,255,0.13)' },
  danger:  { bg: 'var(--red-dim)',     border: 'var(--red)',    color: 'var(--red)',    shadow: '0 0 18px rgba(255,51,102,0.13)' },
  success: { bg: 'var(--green-dim)',   border: 'var(--green)',  color: 'var(--green)',  shadow: 'none' },
  ghost:   { bg: 'transparent',        border: 'var(--border)', color: 'var(--muted)',  shadow: 'none' },
  purple:  { bg: 'var(--purple-dim)',  border: 'var(--purple)', color: 'var(--purple)', shadow: 'none' },
  amber:   { bg: 'var(--amber-dim)',   border: 'var(--amber)',  color: 'var(--amber)',  shadow: 'none' },
};

export function Button({ variant = 'ghost', size = 'md', onClick, disabled, children, style = {}, title, className = '' }) {
  const s = BTN_STYLES[variant] || BTN_STYLES.ghost;
  const padding  = size === 'sm' ? '6px 13px' : size === 'xs' ? '4px 9px' : '10px 20px';
  const fontSize = size === 'sm' ? 9 : size === 'xs' ? 8 : 10;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`cos-button ${className}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding, borderRadius: 10, border: `1px solid ${s.border}`,
        background: s.bg, color: s.color, boxShadow: s.shadow,
        fontFamily: 'Orbitron', fontSize, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── CHIP ──────────────────────────────────────────────────────
const CHIP_COLORS = {
  fixed:        { bg: 'rgba(0,212,255,0.13)',  border: 'rgba(0,212,255,0.3)',   text: '#00D4FF' },
  negotiable:   { bg: 'rgba(255,140,0,0.13)',  border: 'rgba(255,140,0,0.3)',   text: '#FF8C00' },
  flexible:     { bg: 'rgba(0,255,136,0.13)',  border: 'rgba(0,255,136,0.3)',   text: '#00FF88' },
  critical:     { bg: 'rgba(255,51,102,0.13)', border: 'rgba(255,51,102,0.3)',  text: '#FF3366' },
  high:         { bg: 'rgba(255,140,0,0.13)',  border: 'rgba(255,140,0,0.3)',   text: '#FF8C00' },
  medium:       { bg: 'rgba(155,89,255,0.13)', border: 'rgba(155,89,255,0.3)',  text: '#9B59FF' },
  low:          { bg: 'rgba(61,90,122,0.2)',   border: 'rgba(61,90,122,0.4)',   text: '#7A9ABB' },
  green:        { bg: 'rgba(0,255,136,0.13)',  border: 'rgba(0,255,136,0.3)',   text: '#00FF88' },
  red:          { bg: 'rgba(255,51,102,0.13)', border: 'rgba(255,51,102,0.3)',  text: '#FF3366' },
  amber:        { bg: 'rgba(255,140,0,0.13)',  border: 'rgba(255,140,0,0.3)',   text: '#FF8C00' },
  purple:       { bg: 'rgba(155,89,255,0.13)', border: 'rgba(155,89,255,0.3)',  text: '#9B59FF' },
  deep:         { bg: 'rgba(0,212,255,0.08)',  border: 'rgba(0,212,255,0.2)',   text: '#00D4FF' },
  kept:         { bg: 'rgba(0,255,136,0.13)',  border: 'rgba(0,255,136,0.3)',   text: '#00FF88' },
  dropped:      { bg: 'rgba(255,51,102,0.13)', border: 'rgba(255,51,102,0.3)',  text: '#FF3366' },
  moved:        { bg: 'rgba(255,140,0,0.13)',  border: 'rgba(255,140,0,0.3)',   text: '#FF8C00' },
  compressed:   { bg: 'rgba(0,212,255,0.13)',  border: 'rgba(0,212,255,0.3)',   text: '#00D4FF' },
  deferred:     { bg: 'rgba(255,140,0,0.13)',  border: 'rgba(255,140,0,0.3)',   text: '#FF8C00' },
  delegated:    { bg: 'rgba(155,89,255,0.13)', border: 'rgba(155,89,255,0.3)',  text: '#9B59FF' },
  split:        { bg: 'rgba(155,89,255,0.13)', border: 'rgba(155,89,255,0.3)',  text: '#9B59FF' },
  protected:    { bg: 'rgba(0,255,136,0.13)',  border: 'rgba(0,255,136,0.3)',   text: '#00FF88' },
  'at-risk':    { bg: 'rgba(255,140,0,0.13)',  border: 'rgba(255,140,0,0.3)',   text: '#FF8C00' },
  violated:     { bg: 'rgba(255,51,102,0.13)', border: 'rgba(255,51,102,0.3)',  text: '#FF3366' },
  perfect:      { bg: 'rgba(0,255,136,0.13)',  border: 'rgba(0,255,136,0.3)',   text: '#00FF88' },
  good:         { bg: 'rgba(0,212,255,0.13)',  border: 'rgba(0,212,255,0.3)',   text: '#00D4FF' },
  suboptimal:   { bg: 'rgba(255,140,0,0.13)',  border: 'rgba(255,140,0,0.3)',   text: '#FF8C00' },
};

export function Chip({ variant, children }) {
  const c = CHIP_COLORS[variant] || CHIP_COLORS.low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      fontFamily: 'JetBrains Mono', fontSize: 9, whiteSpace: 'nowrap',
      transition: 'opacity 0.15s ease',
    }}>
      {children}
    </span>
  );
}

// ── TRACE BOX ─────────────────────────────────────────────────
export function TraceBox({ lines, active = false }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 14, fontFamily: 'JetBrains Mono',
      fontSize: 11, color: 'var(--green)', minHeight: 70,
    }}>
      <div style={{ color: 'var(--dim)', fontSize: 9, letterSpacing: '0.1em', marginBottom: 7 }}>
        // AI REASONING TRACE
      </div>
      {!lines?.length
        ? <span style={{ color: 'var(--dim)' }}>Awaiting analysis...</span>
        : lines.map((line, i) => (
          <div
            key={i}
            className="trace-line"
            style={{ marginBottom: 3, lineHeight: 1.5, animationDelay: `${i * 0.4}s` }}
          >
            <span style={{ color: 'var(--cyan)' }}>&gt; </span>{line}
            {active && i === lines.length - 1 && <span className="cos-cursor" />}
          </div>
        ))
      }
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────
export function EmptyState({ icon, title, sub, action }) {
  return (
    <div className="cos-card-enter" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)' }}>
      <div style={{
        fontSize: 40, marginBottom: 14, opacity: 0.4,
        filter: 'drop-shadow(0 0 12px rgba(0,212,255,0.2))',
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: 'Orbitron', fontSize: 12, letterSpacing: '0.1em',
        marginBottom: 8, color: 'var(--muted)',
      }}>
        {title}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--dim)', maxWidth: 320, margin: '0 auto' }}>
        {sub}
      </div>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

// ── CAPACITY BAR ──────────────────────────────────────────────
export function CapBar({ required, available }) {
  const pct = Math.min(120, Math.round((required / available) * 100));
  const cls = pct > 100 ? 'over' : pct > 80 ? 'warn' : 'ok';
  const fillColors = {
    ok:   'linear-gradient(90deg, #00FF88, #00D4FF)',
    warn: 'linear-gradient(90deg, #00D4FF, #FF8C00)',
    over: 'linear-gradient(90deg, #FF8C00, #FF3366)',
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', marginBottom: 5 }}>
        <span>Available: {Math.round(available / 60)}h</span>
        <span>Required: {Math.round(required / 60)}h</span>
      </div>
      <div style={{ height: 7, background: 'var(--raised)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ height: '100%', borderRadius: 999, width: Math.min(pct, 100) + '%', background: fillColors[cls], transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}

// ── SCREEN HEADER ─────────────────────────────────────────────
export function ScreenHeader({ eyebrow, title, highlight, sub }) {
  return (
    <div className="cos-card-enter" style={{ '--stagger': 0, marginBottom: 28 }}>
      <div style={{
        fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--cyan)',
        letterSpacing: '0.2em', textTransform: 'uppercase',
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span
          className="cos-eyebrow-line"
          style={{ display: 'inline-block', height: 1, background: 'var(--cyan)', flexShrink: 0 }}
        />
        {eyebrow}
      </div>
      <h1 style={{
        fontFamily: 'Orbitron',
        fontSize: 'clamp(24px,4vw,44px)',
        fontWeight: 900, lineHeight: 1.05,
        letterSpacing: '-0.02em', marginBottom: 14,
        textShadow: '0 0 60px rgba(0,212,255,0.15)',
      }}>
        {title}{highlight ? <><br /><span style={{ color: 'var(--cyan)' }}>{highlight}</span></> : null}
      </h1>
      {sub && (
        <p style={{ color: 'var(--muted)', fontSize: 14, maxWidth: 580, lineHeight: 1.7, marginBottom: 24 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── SECTION LABEL ─────────────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700,
      letterSpacing: '0.2em', color: 'var(--muted)', textTransform: 'uppercase',
      marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {children}
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

// ── GRID ──────────────────────────────────────────────────────
export function Grid2({ children, style = {} }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18, ...style }}>{children}</div>;
}
export function Span2({ children }) {
  return <div style={{ gridColumn: 'span 2' }}>{children}</div>;
}

// ── AI THINKING STATE ─────────────────────────────────────────
const THINKING_MESSAGES = [
  'Reviewing your commitments…',
  'Checking your calendar…',
  'Calculating capacity…',
  'Finding scheduling conflicts…',
  'Protecting your priorities…',
  'Building today\'s strategy…',
  'Optimizing your schedule…',
  'Preparing your briefing…',
];

export function AIThinkingState({ messages = THINKING_MESSAGES, label }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % messages.length);
        setVisible(true);
      }, 200);
    }, 1800);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '16px 20px',
      background: 'rgba(0,212,255,0.04)',
      border: '1px solid rgba(0,212,255,0.12)',
      borderRadius: 14,
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        <span className="cos-dot" style={{ width: 7, height: 7, background: 'var(--cyan)' }} />
        <span className="cos-dot" style={{ width: 7, height: 7, background: 'var(--cyan)' }} />
        <span className="cos-dot" style={{ width: 7, height: 7, background: 'var(--cyan)' }} />
      </div>
      <div style={{
        fontFamily: 'Inter', fontSize: 13, color: 'rgba(232,244,255,0.75)',
        transition: 'opacity 0.2s ease',
        opacity: visible ? 1 : 0,
      }}>
        {label || messages[idx]}
      </div>
    </div>
  );
}

// ── SKELETON CARD ─────────────────────────────────────────────
export function SkeletonCard({ rows = 3, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 18, padding: 24,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      ...style,
    }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="cos-shimmer"
          style={{
            height: i === 0 ? 12 : 9,
            width: `${[75, 55, 85, 40, 65][i % 5]}%`,
            marginBottom: i < rows - 1 ? 12 : 0,
          }}
        />
      ))}
    </div>
  );
}
