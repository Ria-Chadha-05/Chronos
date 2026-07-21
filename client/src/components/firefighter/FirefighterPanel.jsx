/**
 * FirefighterPanel.jsx
 *
 * Main orchestrating panel for Firefighter Mode.
 * Accepts a commitments array, runs the engine internally, and renders all
 * sub-components in a cohesive emergency recovery UI.
 *
 * Props:
 *   commitments    {object[]}  Commitment array (from store or mock data)
 *   workdayMinutes {number}    Override available capacity (default 480)
 *   senderName     {string}    For email draft personalisation
 *   onClose        {function}  Optional close/dismiss callback
 *
 * Standalone — no context or store imports.
 * All engine calls happen inside this component via useMemo.
 */

import React, { useMemo, useState } from 'react';
import {
  generateFirefighterReport,
  detectEmergency,
} from '../../services/firefighterEngine.js';
import { SeverityGauge }      from './SeverityGauge.jsx';
import { EmergencyBanner }    from './EmergencyBanner.jsx';
import { RecoveryPlanCard }   from './RecoveryPlanCard.jsx';
import { EmailDraftCard }     from './EmailDraftCard.jsx';
import { DelegationCard }     from './DelegationCard.jsx';
import { CompressionCard }    from './CompressionCard.jsx';

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'plan',        label: 'Rebalance Plan', icon: '🗂' },
  { key: 'compress',    label: 'Compress Tasks', icon: '✂️' },
  { key: 'delegate',    label: 'Delegate Tasks', icon: '🤝' },
  { key: 'email',       label: 'Recovery Messages',  icon: '✉️' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, colour }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            2,
      padding:        '10px 16px',
      background:     `${colour}0A`,
      border:         `1px solid ${colour}25`,
      borderRadius:   10,
      flex:           1,
      minWidth:       90,
    }}>
      <span style={{
        fontFamily:    'Orbitron, monospace',
        fontSize:      18,
        fontWeight:    900,
        color:         colour,
        lineHeight:    1,
      }}>
        {value}
      </span>
      <span style={{
        fontFamily:    'Orbitron, monospace',
        fontSize:      8,
        fontWeight:    700,
        letterSpacing: '0.14em',
        color:         colour,
        textTransform: 'uppercase',
        opacity:       0.65,
        textAlign:     'center',
      }}>
        {label}
      </span>
    </div>
  );
}

function TabBar({ activeTab, onTabChange }) {
  return (
    <div style={{
      display:         'flex',
      gap:             4,
      marginBottom:    20,
      background:      'rgba(255,255,255,0.03)',
      borderRadius:    10,
      padding:         4,
    }}>
      {TABS.map(tab => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              flex:          1,
              background:    active ? 'rgba(255,51,102,0.15)' : 'transparent',
              border:        active ? '1px solid rgba(255,51,102,0.4)' : '1px solid transparent',
              borderRadius:  7,
              padding:       '8px 6px',
              cursor:        'pointer',
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           3,
              transition:    'all 0.18s ease',
            }}
          >
            <span style={{ fontSize: 14 }}>{tab.icon}</span>
            <span style={{
              fontFamily:    'Orbitron, monospace',
              fontSize:      8,
              fontWeight:    700,
              letterSpacing: '0.1em',
              color:         active ? '#FF3366' : 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              transition:    'color 0.18s ease',
              lineHeight:    1.2,
              textAlign:     'center',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {{ commitments: object[], workdayMinutes?: number,
 *            senderName?: string, onClose?: function }} props
 */
export function FirefighterPanel({
  commitments    = [],
  workdayMinutes = 480,
  senderName     = '',
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('plan');

  // Run the full engine — memoised so it only recomputes when commitments change
  const report = useMemo(() => {
    return generateFirefighterReport(commitments, { workdayMinutes, senderName });
  }, [commitments, workdayMinutes, senderName]);

  const { emergencyScore, severity, recovery, emailDrafts, isActive, triggerReason } = report;
  const { overloadMinutes, isEmergency, isWarning } = emergencyScore;

  // ── Derived display values
  const overloadHours = overloadMinutes > 0
    ? `${Math.round(overloadMinutes / 60 * 10) / 10}h`
    : '0h';

  const recoveryDays = emergencyScore.estimatedRecoveryDays;
  const confidence   = emergencyScore.confidence;

  // ── Colour theme based on level
  const levelColour = severity.level === 'critical' ? '#FF3366'
    : severity.level === 'high'     ? '#FF3366'
    : severity.level === 'moderate' ? '#FF8C00'
    : '#00FF88';

  return (
    <div style={{
      background:   '#080F1E',
      borderRadius: 20,
      border:       '1px solid rgba(255,51,102,0.2)',
      boxShadow:    '0 0 60px rgba(255,51,102,0.08)',
      overflow:     'hidden',
      maxWidth:     720,
      width:        '100%',
      margin:       '0 auto',
    }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        padding:    '22px 26px 18px',
        background: 'linear-gradient(135deg, rgba(255,51,102,0.08) 0%, rgba(8,15,30,0) 60%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display:    'flex',
        alignItems: 'center',
        gap:        16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily:    'Orbitron, monospace',
            fontSize:      13,
            fontWeight:    900,
            letterSpacing: '0.2em',
            color:         '#FF3366',
            textTransform: 'uppercase',
            textShadow:    '0 0 18px rgba(255,51,102,0.5)',
            marginBottom:  4,
          }}>
            ⚠️ Resolve Schedule Overload
          </div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   12,
            color:      'rgba(255,255,255,0.45)',
            lineHeight: 1.5,
            marginBottom: 10,
          }}>
            {emergencyScore.recommendedAction}
          </div>
          <div>
            <button 
              onClick={() => alert("Rebalance plan applied! Recovery drafts locked. 🚀")}
              className="cos-button"
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, var(--red), #FF5533)',
                color: '#050A14',
                border: 'none',
                fontFamily: 'Orbitron',
                fontWeight: 700,
                fontSize: 9,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 0 12px rgba(255, 51, 102, 0.25)',
              }}
            >
              ✓ Resolve Overload
            </button>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close Firefighter Panel"
            style={{
              background:  'rgba(255,255,255,0.06)',
              border:      '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              width:       32,
              height:      32,
              display:     'flex',
              alignItems:  'center',
              justifyContent: 'center',
              cursor:      'pointer',
              color:       'rgba(255,255,255,0.4)',
              fontSize:    14,
              flexShrink:  0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div style={{ padding: '22px 26px' }}>
        {/* ── Emergency Banner ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <EmergencyBanner
            isEmergency={isEmergency}
            isWarning={isWarning}
            triggerReason={triggerReason}
            overloadMinutes={overloadMinutes}
          />
        </div>

        {/* ── Gauge + Stats row ─────────────────────────────────────────────── */}
        <div style={{
          display:       'flex',
          gap:           20,
          alignItems:    'flex-start',
          marginBottom:  24,
          flexWrap:      'wrap',
        }}>
          {/* Gauge */}
          <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <SeverityGauge
              score={severity.score}
              level={severity.level}
              size={150}
            />
          </div>

          {/* Stat pills */}
          <div style={{
            display:   'flex',
            flexWrap:  'wrap',
            gap:       8,
            flex:      1,
            alignContent: 'flex-start',
          }}>
            <StatPill
              label="Overload"
              value={overloadHours}
              colour={levelColour}
            />
            <StatPill
              label="Recovery"
              value={recoveryDays === 0 ? 'Today' : `+${recoveryDays}d`}
              colour={recoveryDays === 0 ? '#00FF88' : '#FF8C00'}
            />
            <StatPill
              label="Confidence"
              value={`${confidence}%`}
              colour="#00D4FF"
            />
            <StatPill
              label="Tasks"
              value={recovery.rankedTasks.length}
              colour="#9B59FF"
            />
          </div>
        </div>

        {/* ── Tab navigation ──────────────────────────────────────────────── */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ── Tab content ─────────────────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <RecoveryPlanCard
            keepList={recovery.keepList}
            deferList={recovery.deferList}
            dropList={recovery.dropList}
          />
        )}

        {activeTab === 'compress' && (
          <CompressionCard compressions={recovery.compressions} />
        )}

        {activeTab === 'delegate' && (
          <DelegationCard delegations={recovery.delegations} />
        )}

        {activeTab === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              fontFamily:    'Orbitron, monospace',
              fontSize:      11,
              fontWeight:    700,
              letterSpacing: '0.15em',
              color:         '#00D4FF',
              textTransform: 'uppercase',
              marginBottom:  8,
            }}>
              ✉️ Email Drafts
            </div>
            {emailDrafts.length === 0 ? (
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize:   13,
                color:      'rgba(255,255,255,0.3)',
                padding:    '14px 0',
                fontStyle:  'italic',
                textAlign:  'center',
              }}>
                No email drafts generated — add context to produce personalised drafts.
              </div>
            ) : emailDrafts.map((draft, idx) => (
              <EmailDraftCard key={idx} draft={draft} expanded={idx === 0} />
            ))}
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{
          marginTop:   24,
          paddingTop:  16,
          borderTop:   '1px solid rgba(255,255,255,0.05)',
          fontFamily:  'Inter, sans-serif',
          fontSize:    10,
          color:       'rgba(255,255,255,0.2)',
          textAlign:   'center',
        }}>
          Firefighter Mode • Generated {new Date(report.meta.generatedAt).toLocaleTimeString()}
          &nbsp;·&nbsp;{report.meta.commitmentCount} commitments analysed
        </div>
      </div>
    </div>
  );
}
