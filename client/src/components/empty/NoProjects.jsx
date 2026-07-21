/**
 * NoProjects.jsx
 *
 * Empty state shown when there are no ongoing projects.
 *
 * @prop {string} [message='No ongoing projects.']
 * @prop {string} [subtext]
 * @prop {Function} [onAdd] - Callback to add a project.
 * @prop {string} [className='']
 */

import React from 'react';

/**
 * NoProjects component.
 * @param {object} props
 */
export default function NoProjects({
  message = 'No ongoing projects.',
  subtext = 'Add a multi-day project so Chronos can track effort, schedule work sessions, and protect your deadlines.',
  onAdd = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-[#0D1628] border border-[rgba(255,140,0,0.2)] flex items-center justify-center text-3xl mb-4"
        style={{ boxShadow: 'inset 0 0 16px rgba(255,140,0,0.06)' }}>
        🗂️
      </div>
      <h3 className="font-display text-sm text-[#7A9ABB] mb-1">{message}</h3>
      <p className="text-xs text-[#3D5A7A] max-w-[240px] leading-relaxed mb-5">{subtext}</p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="px-5 py-2.5 rounded-lg text-xs font-display tracking-widest uppercase text-[#050A14] bg-[#FF8C00] hover:bg-[#e67e00] transition-colors"
          style={{ boxShadow: '0 0 14px rgba(255,140,0,0.3)' }}
        >
          + Add Project
        </button>
      )}
    </div>
  );
}
