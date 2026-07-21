/**
 * DailyBrief.jsx
 *
 * Executive Brief — AI Chief of Staff
 *
 * Displays: Today's mission, Biggest risk, Recommended action,
 * Current urgency, Suggested next step.
 *
 * Reads from AgentContext.intelligenceReport.dailyBrief only.
 * No engine imports. No duplicated calculations.
 */

import React from 'react';
import { useAgent } from '../../context/AgentContext.jsx';

const URGENCY_PALETTE = {
  critical: { accent: '#FF3366', glow: 'rgba(255,51,102,0.25)', dim: 'rgba(255,51,102,0.10)', border: 'rgba(255,51,102,0.35)' },
  high:     { accent: '#FF8C00', glow: 'rgba(255,140,0,0.20)',  dim: 'rgba(255,140,0,0.08)',  border: 'rgba(255,140,0,0.32)'  },
  medium:   { accent: '#00D4FF', glow: 'rgba(0,212,255,0.18)',  dim: 'rgba(0,212,255,0.06)',  border: 'rgba(0,212,255,0.28)'  },
  low:      { accent: '#9B59FF', glow: 'rgba(155,89,255,0.15)', dim: 'rgba(155,89,255,0.05)', border: 'rgba(155,89,255,0.25)' },
  normal:   { accent: '#00FF88', glow: 'rgba(0,255,136,0.15)',  dim: 'rgba(0,255,136,0.05)',  border: 'rgba(0,255,136,0.22)' },
};

function BriefRow({ label, value, accent, mono = false, large = false }) {
  return (
    <div style={{
      padding:      '12px 14px',
      background:   'rgba(8,15,30,0.75)',
      border:       '1px solid var(--border)',
      borderRadius: 10,
    }}>
      <div style={{
        fontFamily:   'JetBrains Mono',
        fontSize:     8,
        color:        'var(--muted)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: mono ? 'Orbitron' : 'inherit',
        fontSize:   large ? 14 : 12,
        fontWeight: large ? 800 : 500,
        color:      accent || 'var(--text)',
        lineHeight: 1.45,
      }}>
        {value || '—'}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{
      height:       54,
      background:   'rgba(8,15,30,0.55)',
      border:       '1px solid var(--border)',
      borderRadius: 10,
      animation:    'brief-pulse 1.5s ease-in-out infinite',
    }} />
  );
}

export default function DailyBrief() {
  const { intelligenceReport, isProcessing } = useAgent();
  const brief = intelligenceReport?.dailyBrief;
  const palette = URGENCY_PALETTE[brief?.urgencyLevel ?? 'normal'];

  const isReady = !!brief && !isProcessing;

  return (
    <div style={{
      padding:      '20px 22px',
      background:   `linear-gradient(135deg, ${palette.dim}, rgba(8,15,30,0.92))`,
      border:       `1px solid ${palette.border}`,
      borderRadius: 16,
      position:     'relative',
      overflow:     'hidden',
    }}>
      <style>{`
        @keyframes brief-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 0.9; }
        }
        @keyframes brief-scan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>

      {/* Scan line when processing */}
      {isProcessing && (
        <div style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          height:     1,
          background: `linear-gradient(90deg, transparent, ${palette.accent}, transparent)`,
          animation:  'brief-scan 1.8s ease-in-out infinite',
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{
            fontFamily:   'Orbitron',
            fontSize:     11,
            fontWeight:   800,
            color:        palette.accent,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            textShadow:   `0 0 14px ${palette.glow}`,
            marginBottom: 3,
          }}>
            ◈ Executive Brief
          </div>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 8, color: 'var(--dim)', letterSpacing: '0.1em' }}>
            AI Chief of Staff · {brief?.date ?? '—'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isProcessing && (
            <span style={{
              fontFamily:  'JetBrains Mono',
              fontSize:     7,
              color:        palette.accent,
              border:       `1px solid ${palette.border}`,
              borderRadius: 999,
              padding:      '2px 8px',
              letterSpacing: '0.1em',
              animation:    'brief-pulse 1.2s ease-in-out infinite',
            }}>
              ◌ AGENT RUNNING
            </span>
          )}
          {!isProcessing && brief?.confidence > 0 && (
            <span style={{
              fontFamily:  'JetBrains Mono',
              fontSize:     7,
              color:        'var(--dim)',
              letterSpacing: '0.08em',
            }}>
              {brief.confidence}% confidence
            </span>
          )}
        </div>
      </div>

      {/* Content grid */}
      {!isReady ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <SkeletonRow />
          <SkeletonRow />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>

          {/* Mission — full width, prominent */}
          <div style={{
            padding:      '14px 16px',
            background:   palette.dim,
            border:       `1px solid ${palette.border}`,
            borderRadius: 12,
          }}>
            <div style={{
              fontFamily:   'JetBrains Mono',
              fontSize:     8,
              color:        palette.accent,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 6,
              opacity:      0.8,
            }}>
              Today's Mission
            </div>
            <div style={{
              fontSize:   14,
              fontWeight: 600,
              color:      'var(--text)',
              lineHeight: 1.5,
            }}>
              {brief.mission}
            </div>
          </div>

          {/* Two-column row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <BriefRow
              label="Biggest Risk"
              value={brief.biggestRisk}
              accent={['critical', 'high'].includes(brief.urgencyLevel) ? palette.accent : 'var(--text)'}
            />
            <BriefRow
              label="Current Urgency"
              value={brief.currentUrgency}
              accent={palette.accent}
              mono
              large
            />
          </div>

          {/* Two-column row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <BriefRow
              label="Recommended Action"
              value={brief.recommendedAction}
              accent="var(--cyan)"
            />
            <BriefRow
              label="Suggested Next Step"
              value={brief.nextStep}
              accent="var(--green)"
            />
          </div>

          {/* Engines row */}
          {brief.enginesUsed?.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
              <span style={{
                fontFamily:   'JetBrains Mono',
                fontSize:     7,
                color:        'var(--dim)',
                alignSelf:    'center',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                Engines:
              </span>
              {brief.enginesUsed.map(e => (
                <span key={e} style={{
                  fontFamily:   'JetBrains Mono',
                  fontSize:     7,
                  color:        'var(--muted)',
                  border:       '1px solid var(--border)',
                  borderRadius: 4,
                  padding:      '1px 6px',
                }}>
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
