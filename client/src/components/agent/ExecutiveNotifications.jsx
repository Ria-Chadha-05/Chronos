/**
 * ExecutiveNotifications.jsx
 *
 * Displays real-time executive notifications emitted by the Agent Loop.
 * Consumed by the Dashboard's Executive Brief section.
 *
 * ▸ Reads from AgentContext only — no engine imports.
 * ▸ Purely presentational after context data arrives.
 */

import React, { useState } from 'react';
import { useAgent } from '../../context/AgentContext.jsx';

const URGENCY_STYLE = {
  critical: { color: '#FF3366', border: 'rgba(255,51,102,0.4)',  bg: 'rgba(255,51,102,0.10)', dot: '#FF3366', pulse: true  },
  high:     { color: '#FF8C00', border: 'rgba(255,140,0,0.35)',  bg: 'rgba(255,140,0,0.08)',  dot: '#FF8C00', pulse: true  },
  medium:   { color: '#00D4FF', border: 'rgba(0,212,255,0.3)',   bg: 'rgba(0,212,255,0.06)',  dot: '#00D4FF', pulse: false },
  low:      { color: '#9B59FF', border: 'rgba(155,89,255,0.25)', bg: 'rgba(155,89,255,0.05)', dot: '#9B59FF', pulse: false },
  normal:   { color: '#00FF88', border: 'rgba(0,255,136,0.22)',  bg: 'rgba(0,255,136,0.05)',  dot: '#00FF88', pulse: false },
};

function PulseDot({ color, pulse }) {
  return (
    <span style={{
      display:       'inline-block',
      width:         7,
      height:        7,
      borderRadius:  '50%',
      background:    color,
      boxShadow:     `0 0 6px ${color}`,
      flexShrink:    0,
      marginTop:     1,
      animation:     pulse ? 'chronos-pulse 1.6s ease-in-out infinite' : 'none',
    }} />
  );
}

function NotificationItem({ notif, onRead }) {
  const s = URGENCY_STYLE[notif.urgency] || URGENCY_STYLE.normal;
  return (
    <div
      onClick={() => !notif.read && onRead(notif.id)}
      style={{
        display:       'flex',
        gap:           10,
        padding:       '10px 13px',
        background:    notif.read ? 'rgba(8,15,30,0.55)' : s.bg,
        border:        `1px solid ${notif.read ? 'var(--border)' : s.border}`,
        borderRadius:  10,
        cursor:        notif.read ? 'default' : 'pointer',
        transition:    'all 0.2s ease',
        opacity:       notif.read ? 0.6 : 1,
      }}
    >
      <PulseDot color={s.dot} pulse={s.pulse && !notif.read} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily:  'Orbitron',
          fontSize:    10,
          fontWeight:  800,
          color:       notif.read ? 'var(--muted)' : s.color,
          marginBottom: 3,
          whiteSpace:  'nowrap',
          overflow:    'hidden',
          textOverflow: 'ellipsis',
        }}>
          {notif.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
          {notif.body}
        </div>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)', textTransform: 'uppercase', whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: 2 }}>
        {notif.engine}
      </div>
    </div>
  );
}

export default function ExecutiveNotifications({ compact = false }) {
  const { executiveNotifications, unreadNotifCount, markNotificationRead, isProcessing } = useAgent();
  const [expanded, setExpanded] = useState(true);

  if (!executiveNotifications?.length && !isProcessing) return null;

  const visible = compact ? executiveNotifications.slice(0, 3) : executiveNotifications;
  const hasMore = compact && executiveNotifications.length > 3;

  return (
    <div style={{ marginBottom: 14 }}>
      <style>{`
        @keyframes chronos-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px currentColor; }
          50%       { opacity: 0.5; box-shadow: 0 0 2px currentColor; }
        }
      `}</style>

      {/* Header */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           8,
          marginBottom:  expanded ? 10 : 0,
          cursor:        'pointer',
          userSelect:    'none',
        }}
      >
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Agent Alerts
        </div>
        {unreadNotifCount > 0 && (
          <span style={{
            fontFamily:  'Orbitron',
            fontSize:    8,
            fontWeight:  900,
            color:       '#FF3366',
            background:  'rgba(255,51,102,0.15)',
            border:      '1px solid rgba(255,51,102,0.35)',
            borderRadius: 999,
            padding:     '1px 7px',
          }}>
            {unreadNotifCount} new
          </span>
        )}
        {isProcessing && (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--cyan)', letterSpacing: '0.1em' }}>
            ◌ RUNNING
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--dim)', fontSize: 10 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Notification list */}
      {expanded && (
        <div style={{ display: 'grid', gap: 7 }}>
          {visible.map(n => (
            <NotificationItem key={n.id} notif={n} onRead={markNotificationRead} />
          ))}
          {hasMore && (
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--dim)', textAlign: 'center', padding: '4px 0' }}>
              +{executiveNotifications.length - 3} more alerts
            </div>
          )}
        </div>
      )}
    </div>
  );
}
