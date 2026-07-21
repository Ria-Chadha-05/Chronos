/**
 * ReminderDraftCard.jsx
 *
 * Generates and renders a professional reminder draft for a blocked task.
 * Users can toggle between tones (polite / direct / urgent) and copy
 * the draft to clipboard. Reminder is generated via the engine — no messages sent.
 *
 * @prop {object}  task          - Blocked task enriched by detectBlockedTasks().
 * @prop {string}  [userName=''] - Sender name for the sign-off.
 * @prop {string}  [className=''] - Extra Tailwind classes.
 */

import React, { useState, useMemo } from 'react';
import {
  generateReminderDraft,
  generateFollowupDraft,
} from '../../services/blockerBreakerEngine.js';

const TONE_OPTIONS = [
  { value: 'polite', label: 'Polite',  emoji: '😊' },
  { value: 'direct', label: 'Direct',  emoji: '🎯' },
  { value: 'urgent', label: 'Urgent',  emoji: '🚨' },
];

const DRAFT_TYPE_OPTIONS = [
  { value: 'reminder', label: '1st Reminder' },
  { value: 'followup', label: 'Follow-up'    },
];

/**
 * ReminderDraftCard component.
 * @param {object} props
 */
export default function ReminderDraftCard({ task = {}, userName = '', className = '' }) {
  const [tone,      setTone]      = useState('polite');
  const [draftType, setDraftType] = useState('reminder');
  const [copied,    setCopied]    = useState(false);

  const blocker = task._blocker || {};
  const title   = task.title || task.name || `Task ${task.id}`;

  // Parse a contact name from the waitingFor field or use generic
  const contactName = useMemo(() => {
    const raw = task.waitingFor || blocker.description || '';
    // Try to extract a name: take first proper-cased word segment
    const match = raw.match(/([A-Z][a-z]+ ?[A-Z]?[a-z]*)/);
    return match ? match[1].trim() : 'them';
  }, [task.waitingFor, blocker.description]);

  const draft = useMemo(() => {
    if (draftType === 'followup') {
      return generateFollowupDraft({
        taskTitle:          title,
        contactName,
        contactRole:        blocker.contactRole || 'teammate',
        blockerDescription: blocker.description || 'your response',
        totalWaitingDays:   blocker.waitingDays || 0,
        remindersSent:      1,
        senderName:         userName,
        deadline:           blocker.deadline || '',
      });
    }

    return generateReminderDraft({
      taskTitle:          title,
      contactName,
      contactRole:        blocker.contactRole || 'person',
      blockerDescription: blocker.description || 'your response',
      waitingDays:        blocker.waitingDays || 0,
      senderName:         userName,
      deadline:           blocker.deadline || '',
      tone,
    });
  }, [title, contactName, blocker, userName, tone, draftType]);

  function handleCopy() {
    const text = `Subject: ${draft.subject}\n\n${draft.body}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const roleLabel = (blocker.contactRole || 'contact').replace(/_/g, ' ');

  return (
    <div
      className={`rounded-xl border border-[rgba(0,212,255,0.12)] bg-[#080F1E] overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(0,212,255,0.08)]">
        <div>
          <p className="text-xs font-medium text-[#E8F4FF] truncate max-w-[200px]">{title}</p>
          <p className="text-[11px] text-[#3D5A7A] capitalize">{roleLabel} reminder</p>
        </div>
        <div className="flex gap-2">
          {DRAFT_TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDraftType(value)}
              className="text-[10px] px-2.5 py-1 rounded-full border transition-all"
              style={{
                borderColor: draftType === value ? '#00D4FF' : 'rgba(0,212,255,0.15)',
                color: draftType === value ? '#00D4FF' : '#3D5A7A',
                background: draftType === value ? 'rgba(0,212,255,0.1)' : 'transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tone selector (only for first reminder) */}
      {draftType === 'reminder' && (
        <div className="flex gap-2 px-4 py-2 border-b border-[rgba(0,212,255,0.06)]">
          <span className="text-[10px] text-[#3D5A7A] uppercase tracking-wider self-center mr-1">Tone:</span>
          {TONE_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => setTone(value)}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all"
              style={{
                borderColor: tone === value ? '#9B59FF' : 'rgba(0,212,255,0.12)',
                color: tone === value ? '#9B59FF' : '#3D5A7A',
                background: tone === value ? 'rgba(155,89,255,0.1)' : 'transparent',
              }}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Escalation notice for follow-up */}
      {draftType === 'followup' && draft.escalationRecommended && (
        <div className="px-4 py-2 border-b border-[rgba(255,51,102,0.15)] bg-[rgba(255,51,102,0.05)]">
          <p className="text-[11px] text-[#FF3366]">
            ⚠️ Escalation recommended based on wait duration.
          </p>
        </div>
      )}

      {/* Subject line */}
      {draft.subject && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] uppercase tracking-wider text-[#3D5A7A] mb-1">Subject</p>
          <p className="text-xs text-[#00D4FF] font-medium">{draft.subject}</p>
        </div>
      )}

      {/* Draft body */}
      <div className="px-4 pt-2 pb-3">
        <p className="text-[10px] uppercase tracking-wider text-[#3D5A7A] mb-2">Message draft</p>
        <div
          className="rounded-lg border border-[rgba(0,212,255,0.08)] bg-[rgba(0,212,255,0.03)] p-3"
        >
          <pre
            className="text-xs text-[#7A9ABB] leading-relaxed whitespace-pre-wrap font-sans"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {draft.body}
          </pre>
        </div>
      </div>

      {/* Actions footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(0,212,255,0.08)]">
        <p className="text-[10px] text-[#3D5A7A] italic">
          Draft only — not sent
        </p>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border transition-all"
          style={{
            borderColor: copied ? '#00FF88' : 'rgba(0,212,255,0.25)',
            color: copied ? '#00FF88' : '#00D4FF',
            background: copied ? 'rgba(0,255,136,0.08)' : 'rgba(0,212,255,0.06)',
          }}
        >
          {copied ? '✓ Copied' : '⎘ Copy draft'}
        </button>
      </div>
    </div>
  );
}
