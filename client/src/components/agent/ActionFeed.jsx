/**
 * ActionFeed.jsx
 *
 * Live Intelligence Action Feed
 *
 * Displays the real-time action feed from the Intelligence Report.
 * Items are sorted by urgency and recency, driven by the Agent Loop.
 *
 * ▸ Reads from AgentContext.intelligenceReport.actionFeed only.
 * ▸ No engine imports.
 */

import React, { useState } from 'react';
import { useAgent } from '../../context/AgentContext.jsx';

const TYPE_CONFIG = {
  alert:          { icon: '⚠', color: 'var(--red)',    label: 'Alert'          },
  recommendation: { icon: '✦', color: 'var(--cyan)',   label: 'Recommendation' },
  change:         { icon: '◎', color: 'var(--amber)',  label: 'Change'         },
  insight:        { icon: '◈', color: 'var(--purple)', label: 'Insight'        },
};

const URGENCY_COLOR = {
  critical: '#FF3366',
  high:     '#FF8C00',
  medium:   '#00D4FF',
  low:      '#9B59FF',
  normal:   '#00FF88',
};

function FeedItem({ item }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.insight;
  const urgencyColor = URGENCY_COLOR[item.urgency] || URGENCY_COLOR.normal;
  const ts = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div style={{
      display:      'flex',
      gap:          10,
      padding:      '10px 12px',
      background:   'rgba(8,15,30,0.72)',
      border:       '1px solid var(--border)',
      borderRadius: 10,
      borderLeft:   `3px solid ${urgencyColor}`,
    }}>
      <span style={{ fontFamily: 'Orbitron', fontSize: 11, color: cfg.color, flexShrink: 0, marginTop: 1 }}>
        {cfg.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
          <div style={{
            fontFamily:   'Orbitron',
            fontSize:     10,
            fontWeight:   800,
            color:        'var(--text)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            flex:         1,
          }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <span style={{
              fontFamily:   'JetBrains Mono',
              fontSize:     7,
              color:        urgencyColor,
              border:       `1px solid ${urgencyColor}33`,
              borderRadius: 3,
              padding:      '1px 5px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {item.urgency}
            </span>
            {ts && (
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)' }}>
                {ts}
              </span>
            )}
          </div>
        </div>
        {item.body && (
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
            {item.body}
          </div>
        )}
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {cfg.label} · {item.source}
        </div>
      </div>
    </div>
  );
}

export default function ActionFeed({ maxItems = 8 }) {
  const { intelligenceReport, isProcessing, lastRunAt } = useAgent();
  const [showAll, setShowAll] = useState(false);

  const feed = intelligenceReport?.actionFeed ?? [];
  const visible = showAll ? feed : feed.slice(0, maxItems);
  const hasMore = !showAll && feed.length > maxItems;

  const lastRunLabel = lastRunAt
    ? new Date(lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  if (!feed.length && !isProcessing) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          fontFamily:   'JetBrains Mono',
          fontSize:     8,
          color:        'var(--muted)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          Intelligence Feed
        </div>
        {isProcessing && (
          <span style={{
            fontFamily:   'JetBrains Mono',
            fontSize:     7,
            color:        'var(--cyan)',
            animation:    'feed-pulse 1s ease-in-out infinite',
          }}>
            ◌ UPDATING
          </span>
        )}
        {lastRunLabel && !isProcessing && (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 7, color: 'var(--dim)' }}>
            Last run {lastRunLabel}
          </span>
        )}
      </div>

      <style>{`
        @keyframes feed-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      {/* Feed items */}
      <div style={{ display: 'grid', gap: 7 }}>
        {visible.map(item => <FeedItem key={item.id} item={item} />)}

        {isProcessing && feed.length === 0 && (
          <div style={{
            padding:      '16px 14px',
            background:   'rgba(8,15,30,0.55)',
            border:       '1px solid var(--border)',
            borderRadius: 10,
            fontFamily:   'JetBrains Mono',
            fontSize:     9,
            color:        'var(--dim)',
            textAlign:    'center',
            animation:    'feed-pulse 1.5s ease-in-out infinite',
          }}>
            Agent loop running…
          </div>
        )}
      </div>

      {/* Show more */}
      {hasMore && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            marginTop:   10,
            width:       '100%',
            padding:     '8px 0',
            background:  'transparent',
            border:      '1px solid var(--border)',
            borderRadius: 8,
            fontFamily:  'JetBrains Mono',
            fontSize:    8,
            color:       'var(--muted)',
            cursor:      'pointer',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          +{feed.length - maxItems} more items
        </button>
      )}
    </div>
  );
}
