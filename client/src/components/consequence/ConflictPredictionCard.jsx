/**
 * ConflictPredictionCard.jsx
 *
 * Lists new conflicts introduced and existing conflicts resolved by a
 * simulated scenario.
 *
 * @prop {object[]} newConflicts - Output of detectNewConflicts().
 * @prop {object[]} resolvedConflicts - Output of detectResolvedConflicts().
 * @prop {boolean} [loading=false]
 * @prop {string} [className='']
 */

import React from 'react';

const SEVERITY_COLOR = { Low: '#00FF88', Medium: '#FF8C00', High: '#FF3366' };

function ConflictRow({ conflict }) {
  const color = SEVERITY_COLOR[conflict.severity] ?? '#7A9ABB';
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      <div>
        <span className="text-[#7A9ABB]">{conflict.description}</span>
        <span className="ml-1 text-[10px] uppercase font-display" style={{ color }}>
          {conflict.severity}
        </span>
      </div>
    </li>
  );
}

export default function ConflictPredictionCard({
  newConflicts = [],
  resolvedConflicts = [],
  loading = false,
  className = '',
}) {
  if (loading) {
    return (
      <div className={`rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1628] p-4 ${className}`}>
        <div className="h-3 w-36 rounded bg-[#111D35] animate-pulse mb-4" />
        <div className="h-10 rounded bg-[#111D35] animate-pulse" />
      </div>
    );
  }

  const hasNew = newConflicts.length > 0;
  const hasResolved = resolvedConflicts.length > 0;

  return (
    <div
      className={`rounded-xl border border-[rgba(255,51,102,0.2)] bg-[#0D1628] p-4 space-y-3 ${className}`}
      style={{ boxShadow: 'inset 0 0 20px rgba(255,51,102,0.06)' }}
    >
      <h3 className="font-display text-[10px] tracking-widest uppercase text-[#7A9ABB]">⚔️ Conflict Prediction</h3>

      {!hasNew && !hasResolved && (
        <p className="text-sm text-[#3D5A7A]">No conflict changes predicted.</p>
      )}

      {hasNew && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#FF3366] font-display mb-1.5">
            New Conflicts ({newConflicts.length})
          </div>
          <ul className="space-y-1.5">
            {newConflicts.map((c) => <ConflictRow key={c.id} conflict={c} />)}
          </ul>
        </div>
      )}

      {hasResolved && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#00FF88] font-display mb-1.5">
            Resolved Conflicts ({resolvedConflicts.length})
          </div>
          <ul className="space-y-1.5">
            {resolvedConflicts.map((c) => <ConflictRow key={c.id} conflict={c} />)}
          </ul>
        </div>
      )}
    </div>
  );
}
