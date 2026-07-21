/**
 * NoTasks.jsx
 *
 * Empty state shown when the task list is empty.
 *
 * @prop {string} [message='No tasks yet.'] - Primary message.
 * @prop {string} [subtext='Add a task to get started.'] - Supporting text.
 * @prop {Function} [onAction] - Callback for the CTA button.
 * @prop {string} [actionLabel='Add Task'] - CTA button label.
 * @prop {string} [className='']
 */

import React from 'react';

/**
 * NoTasks component.
 * @param {object} props
 */
export default function NoTasks({
  message = 'No tasks yet.',
  subtext = 'Add a task to get started tracking your work.',
  onAction = null,
  actionLabel = 'Add Task',
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-[#111D35] border border-[rgba(0,212,255,0.15)] flex items-center justify-center mb-4 text-3xl">
        ✅
      </div>
      <h3 className="font-display text-sm text-[#7A9ABB] mb-1">{message}</h3>
      <p className="text-xs text-[#3D5A7A] max-w-[240px] leading-relaxed mb-5">{subtext}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-lg text-xs font-display tracking-widest uppercase text-[#050A14] bg-[#00D4FF] hover:bg-[#00bfe8] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
