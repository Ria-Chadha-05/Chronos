/**
 * WaitingCard.jsx
 *
 * Renders a single blocked or waiting task with its dependency context,
 * days waiting, urgency indicator, and quick-glance status.
 *
 * @prop {object}  task       - Task object enriched by detectBlockedTasks().
 * @prop {string}  [className=''] - Extra Tailwind classes.
 */

import React, { useState } from 'react';

const URGENCY_STYLES = {
  critical: { border: 'rgba(255,51,102,0.4)',  bg: 'rgba(255,51,102,0.07)',  dot: '#FF3366', label: 'Critical' },
  high:     { border: 'rgba(255,140,0,0.35)',  bg: 'rgba(255,140,0,0.07)',   dot: '#FF8C00', label: 'High' },
  medium:   { border: 'rgba(0,212,255,0.2)',   bg: 'rgba(0,212,255,0.05)',   dot: '#00D4FF', label: 'Medium' },
  low:      { border: 'rgba(61,90,122,0.4)',   bg: 'rgba(61,90,122,0.06)',   dot: '#3D5A7A', label: 'Low' },
};

const DEP_TYPE_EMOJI = {
  person:    '👤',
  document:  '📄',
  approval:  '✅',
  payment:   '💳',
  meeting:   '📅',
  interview: '🎯',
  review:    '👁️',
  api:       '🔌',
  teammate:  '👥',
  dataset:   '🗄️',
  equipment: '🔧',
  decision:  '🤔',
  feedback:  '💬',
};

/**
 * WaitingCard component.
 * @param {object} props
 */
export default function WaitingCard({ task = {}, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const blocker  = task._blocker || {};
  const urgency  = blocker.urgency || 'low';
  const style    = URGENCY_STYLES[urgency] || URGENCY_STYLES.low;
  const depEmoji = DEP_TYPE_EMOJI[blocker.dependencyType] || '⏳';
  const title    = task.title || task.name || `Task ${task.id}`;

  const waitLabel =
    blocker.waitingDays === 0 ? 'Today' :
    blocker.waitingDays === 1 ? '1 day' :
    `${blocker.waitingDays} days`;

  const deadlineLabel = blocker.hasDeadline && blocker.daysUntilDeadline !== null
    ? blocker.daysUntilDeadline === 0
      ? '⚠️ Due today'
      : blocker.daysUntilDeadline === 1
        ? '⚠️ Due tomorrow'
        : `📅 Due in ${blocker.daysUntilDeadline}d`
    : null;

  return (
    <div
      className={`rounded-xl border transition-all ${className}`}
      style={{ borderColor: style.border, background: style.bg }}
    >
      {/* Main row */}
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Urgency dot */}
        <span
          className="mt-1.5 w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: style.dot, boxShadow: `0 0 6px ${style.dot}` }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#E8F4FF] truncate">{title}</span>
            {deadlineLabel && (
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ color: blocker.daysUntilDeadline <= 1 ? '#FF3366' : '#FF8C00',
                         background: blocker.daysUntilDeadline <= 1 ? 'rgba(255,51,102,0.12)' : 'rgba(255,140,0,0.12)' }}
              >
                {deadlineLabel}
              </span>
            )}
          </div>
          {blocker.description && (
            <p className="text-xs text-[#7A9ABB] mt-0.5 leading-relaxed line-clamp-1">
              {depEmoji} {blocker.description}
            </p>
          )}
        </div>

        {/* Right meta */}
        <div className="flex flex-col items-end shrink-0 gap-1">
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{ color: style.dot, background: style.border.replace('0.4', '0.12') }}
          >
            {style.label}
          </span>
          <span className="text-[11px] text-[#3D5A7A] font-mono">{waitLabel}</span>
        </div>

        {/* Expand chevron */}
        <span
          className="text-[#3D5A7A] text-xs mt-1 transition-transform shrink-0"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-4 pb-3 border-t"
          style={{ borderColor: style.border }}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-3 text-xs">
            {blocker.dependencyType && (
              <DetailRow label="Dependency" value={blocker.dependencyType} />
            )}
            {blocker.waitingDays !== undefined && (
              <DetailRow label="Waiting since" value={`${blocker.waitingDays} day${blocker.waitingDays !== 1 ? 's' : ''} ago`} />
            )}
            {blocker.deadline && (
              <DetailRow label="Deadline" value={blocker.deadline} />
            )}
            {task.expectedResolutionDate && (
              <DetailRow label="Expected resolution" value={task.expectedResolutionDate} />
            )}
            {task.blockedBy && (
              <DetailRow
                label="Blocked by"
                value={Array.isArray(task.blockedBy) ? task.blockedBy.join(', ') : task.blockedBy}
              />
            )}
            {blocker.contactRole && (
              <DetailRow label="Contact role" value={blocker.contactRole} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <span className="text-[#3D5A7A] uppercase tracking-wider text-[10px]">{label}</span>
      <p className="text-[#7A9ABB] mt-0.5">{value}</p>
    </div>
  );
}
