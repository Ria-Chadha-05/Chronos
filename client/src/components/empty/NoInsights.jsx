/**
 * NoInsights.jsx
 *
 * Empty state for the AI Insights panel when no plan has been run yet.
 *
 * @prop {string} [message='No insights yet.']
 * @prop {string} [subtext]
 * @prop {Function} [onRunPlan] - Callback to trigger a plan run.
 * @prop {string} [className='']
 */

import React from 'react';

/**
 * NoInsights component.
 * @param {object} props
 */
export default function NoInsights({
  message = 'No insights yet.',
  subtext = 'Run Chronos on today\'s commitments to generate AI-powered scheduling insights and recommendations.',
  onRunPlan = null,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-[#0D1628] border border-[rgba(155,89,255,0.2)] flex items-center justify-center text-3xl mb-4"
        style={{ boxShadow: 'inset 0 0 16px rgba(155,89,255,0.08)' }}>
        🧠
      </div>
      <h3 className="font-display text-sm text-[#7A9ABB] mb-1">{message}</h3>
      <p className="text-xs text-[#3D5A7A] max-w-[240px] leading-relaxed mb-5">{subtext}</p>
      {onRunPlan && (
        <button
          onClick={onRunPlan}
          className="px-5 py-2.5 rounded-lg text-xs font-display tracking-widest uppercase text-[#050A14] bg-[#9B59FF] hover:bg-[#8b45f5] transition-colors"
          style={{ boxShadow: '0 0 14px rgba(155,89,255,0.35)' }}
        >
          ✨ Generate Insights
        </button>
      )}
    </div>
  );
}
