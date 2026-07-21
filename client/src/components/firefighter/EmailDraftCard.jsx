/**
 * EmailDraftCard.jsx
 *
 * Displays a generated email draft with subject, body, tone badge, and
 * a copy-to-clipboard action. Does NOT send email — purely presentational.
 *
 * Props:
 *   draft      {object}    Email draft object from generateEmailDraft()
 *   expanded   {boolean}   Start expanded (default false)
 *
 * Standalone — no context or store imports.
 */

import React, { useState } from 'react';

// ─── Tone colour map ──────────────────────────────────────────────────────────

const TONE_COLOURS = {
  'professional':          '#00D4FF',
  'professional-direct':   '#00D4FF',
  'professional-formal':   '#9B59FF',
  'respectful-academic':   '#9B59FF',
  'casual-professional':   '#00FF88',
};

const TYPE_LABELS = {
  extension_request:    'Extension Request',
  assignment_extension: 'Assignment Extension',
  meeting_reschedule:   'Meeting Reschedule',
  interview_reschedule: 'Interview Reschedule',
  project_delay:        'Project Delay',
  professor_email:      'Professor Email',
  manager_email:        'Manager Update',
  teammate_message:     'Teammate Message',
};

const TYPE_ICONS = {
  extension_request:    '📋',
  assignment_extension: '📚',
  meeting_reschedule:   '📅',
  interview_reschedule: '🤝',
  project_delay:        '🚧',
  professor_email:      '🎓',
  manager_email:        '💼',
  teammate_message:     '💬',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        background:    copied ? 'rgba(0,255,136,0.15)' : 'rgba(0,212,255,0.1)',
        border:        `1px solid ${copied ? '#00FF88' : 'rgba(0,212,255,0.3)'}`,
        borderRadius:  6,
        padding:       '5px 12px',
        fontFamily:    'Orbitron, monospace',
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: '0.12em',
        color:         copied ? '#00FF88' : '#00D4FF',
        cursor:        'pointer',
        transition:    'all 0.2s ease',
        textTransform: 'uppercase',
        whiteSpace:    'nowrap',
        flexShrink:    0,
      }}
    >
      {copied ? '✓ Copied' : 'Copy Draft'}
    </button>
  );
}

function ToneBadge({ tone }) {
  const colour = TONE_COLOURS[tone] ?? '#7A9ABB';
  return (
    <span style={{
      fontFamily:    'Orbitron, monospace',
      fontSize:      8,
      fontWeight:    700,
      letterSpacing: '0.12em',
      color:         colour,
      background:    `${colour}14`,
      border:        `1px solid ${colour}30`,
      borderRadius:  4,
      padding:       '2px 7px',
      textTransform: 'uppercase',
      flexShrink:    0,
    }}>
      {(tone ?? 'professional').replace(/-/g, ' ')}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * @param {{ draft: { subject: string, body: string, tone: string, type: string },
 *            expanded?: boolean }} props
 */
export function EmailDraftCard({ draft, expanded: defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!draft) return null;

  const { subject = '', body = '', tone = 'professional', type = '' } = draft;
  const typeLabel = TYPE_LABELS[type] ?? 'Email Draft';
  const typeIcon  = TYPE_ICONS[type]  ?? '📧';
  const fullText  = subject ? `Subject: ${subject}\n\n${body}` : body;

  return (
    <div style={{
      background:   'rgba(13,22,40,0.95)',
      border:       '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      overflow:     'hidden',
    }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width:       '100%',
          background:  'transparent',
          border:      'none',
          cursor:      'pointer',
          padding:     '14px 18px',
          display:     'flex',
          alignItems:  'center',
          gap:         10,
          textAlign:   'left',
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>{typeIcon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily:   'Inter, sans-serif',
            fontSize:     13,
            fontWeight:   600,
            color:        'rgba(255,255,255,0.9)',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}>
            {typeLabel}
          </div>
          {subject && (
            <div style={{
              fontFamily:   'Inter, sans-serif',
              fontSize:     11,
              color:        'rgba(255,255,255,0.4)',
              marginTop:    2,
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}>
              {subject}
            </div>
          )}
        </div>
        <ToneBadge tone={tone} />
        <span style={{
          color:      'rgba(255,255,255,0.3)',
          fontSize:   12,
          transform:  expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s ease',
          flexShrink: 0,
          marginLeft: 4,
        }}>
          ▼
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Subject line */}
          {subject && (
            <div style={{
              padding:    '10px 18px 0',
              fontFamily: 'Inter, sans-serif',
              fontSize:   12,
              fontWeight: 600,
              color:      'rgba(255,255,255,0.6)',
            }}>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>Subject: </span>
              {subject}
            </div>
          )}

          {/* Body */}
          <pre style={{
            margin:     0,
            padding:    '12px 18px 16px',
            fontFamily: 'Inter, sans-serif',
            fontSize:   12,
            color:      'rgba(255,255,255,0.75)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak:  'break-word',
            background: 'transparent',
          }}>
            {body}
          </pre>

          {/* Footer actions */}
          <div style={{
            padding:         '10px 18px 14px',
            borderTop:       '1px solid rgba(255,255,255,0.05)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'space-between',
            gap:             10,
          }}>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   10,
              color:      'rgba(255,255,255,0.25)',
            }}>
              Draft only — not sent automatically
            </span>
            <CopyButton text={fullText} />
          </div>
        </div>
      )}
    </div>
  );
}
