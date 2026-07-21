import React, { useEffect } from 'react';
import { EmptyState } from './index.jsx';
import { useCalendar } from '../../context/CalendarContext.jsx';

const DAY_START = 6 * 60;
const DAY_END   = 22 * 60;
const RANGE     = DAY_END - DAY_START;
const HOURS     = [6, 8, 10, 12, 14, 16, 18, 20, 22];

function toMin(time) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function overlapsTimelineRange(task) {
  const startMin = toMin(task.startTime);
  const endMin   = toMin(task.endTime);
  return endMin > DAY_START && startMin < DAY_END;
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatSelectedDateLabel(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];
  return `${dow}, ${MONTH_SHORT[m - 1]} ${d}`;
}

// ─── Per-status visual configuration ─────────────────────────────────────────

function getStatusConfig(task, inConflict) {
  const status = (task.status || '').toLowerCase();
  const flex   = task.flexibility || 'flexible';
  const isFixed = flex === 'fixed';

  if (inConflict) {
    return {
      bg:         'rgba(255,51,102,0.10)',
      border:     '#FF3366',
      borderLeft: '3px solid #FF3366',
      color:      '#FF3366',
      opacity:    1,
      badgeLabel: '⚠ Conflict',
      badgeColor: '#FF3366',
      badgeBg:    'rgba(255,51,102,0.2)',
      className:  'conflict-pulse',
      isDimmed:   false,
    };
  }

  if (status === 'moved' || status === 'rescheduled') {
    return {
      bg:         'rgba(255,140,0,0.08)',
      border:     'rgba(255,140,0,0.4)',
      borderLeft: '3px solid #FF8C00',
      color:      '#FF8C00',
      opacity:    1,
      badgeLabel: '↻ Moved',
      badgeColor: '#FF8C00',
      badgeBg:    'rgba(255,140,0,0.18)',
      className:  'timeline-moved-enter',
      isDimmed:   false,
    };
  }

  if (status === 'compressed') {
    return {
      bg:         'rgba(0,212,255,0.07)',
      border:     'rgba(0,212,255,0.4)',
      borderLeft: '3px solid #00D4FF',
      color:      '#00D4FF',
      opacity:    1,
      badgeLabel: '⬡ Compressed',
      badgeColor: '#00D4FF',
      badgeBg:    'rgba(0,212,255,0.15)',
      className:  '',
      isDimmed:   false,
    };
  }

  if (status === 'deferred' || status === 'dropped') {
    return {
      bg:         'rgba(255,255,255,0.03)',
      border:     'rgba(255,255,255,0.12)',
      borderLeft: '3px solid rgba(255,255,255,0.15)',
      borderStyle:'dashed',
      color:      'var(--muted)',
      opacity:    0.55,
      badgeLabel: status === 'dropped' ? '✕ Dropped' : '⏸ Deferred',
      badgeColor: '#9B59FF',
      badgeBg:    'rgba(155,89,255,0.15)',
      className:  'timeline-deferred',
      isDimmed:   true,
    };
  }

  if (status === 'delegated') {
    return {
      bg:         'rgba(155,89,255,0.07)',
      border:     'rgba(155,89,255,0.35)',
      borderLeft: '3px solid #9B59FF',
      color:      '#9B59FF',
      opacity:    0.85,
      badgeLabel: '◎ Delegated',
      badgeColor: '#9B59FF',
      badgeBg:    'rgba(155,89,255,0.18)',
      className:  '',
      isDimmed:   false,
    };
  }

  // kept / no status — use flexibility colours
  if (isFixed) {
    return {
      bg:         'rgba(0,212,255,0.09)',
      border:     'rgba(0,212,255,0.6)',
      borderLeft: '3px solid #00D4FF',
      color:      '#00D4FF',
      opacity:    1,
      badgeLabel: '🔒 Fixed',
      badgeColor: '#00D4FF',
      badgeBg:    'rgba(0,212,255,0.15)',
      className:  '',
      isDimmed:   false,
    };
  }

  if (flex === 'negotiable') {
    return {
      bg:         'rgba(255,140,0,0.07)',
      border:     'rgba(255,140,0,0.35)',
      borderLeft: '3px solid rgba(255,140,0,0.5)',
      color:      '#FF8C00',
      opacity:    1,
      badgeLabel: null,
      badgeColor: null,
      badgeBg:    null,
      className:  '',
      isDimmed:   false,
    };
  }

  // flexible / default
  return {
    bg:         'rgba(0,255,136,0.06)',
    border:     'rgba(0,255,136,0.3)',
    borderLeft: '3px solid rgba(0,255,136,0.35)',
    color:      '#00FF88',
    opacity:    1,
    badgeLabel: null,
    badgeColor: null,
    badgeBg:    null,
    className:  '',
    isDimmed:   false,
  };
}

// ─── All-day banner ───────────────────────────────────────────────────────────

function AllDayBanner({ events }) {
  if (!events.length) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontFamily: 'JetBrains Mono',
        fontSize: 8,
        color: 'var(--dim)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: 6,
      }}>
        All-day
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {events.map(task => (
          <div
            key={task.id}
            title={task.title}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid rgba(155,89,255,0.45)',
              background: 'rgba(155,89,255,0.09)',
              color: '#9B59FF',
              fontFamily: 'JetBrains Mono',
              fontSize: 9,
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ opacity: 0.6 }}>◈</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NeuralTimeline({ tasks = [], conflicts = [] }) {
  const { selectedDate, today } = useCalendar();

  const dateStr = selectedDate || today;
  const forSelectedDate = tasks.filter(t => t.date === dateStr);

  const conflictIds = new Set((conflicts || []).flatMap(c => c.affectedTaskIds || []));

  const allDayEvents = forSelectedDate.filter(t => t.allDay);
  const timedEvents  = forSelectedDate.filter(t => !t.allDay && t.startTime && t.endTime);
  const timed        = timedEvents.filter(overlapsTimelineRange);

  useEffect(() => {
    console.info('[Chronos Pipeline] NeuralTimeline filtering by date', {
      selectedDate: dateStr,
      totalCommitments: tasks.length,
      forSelectedDate: forSelectedDate.length,
      allDayCount: allDayEvents.length,
      timedCount: timed.length,
    });
  }, [tasks.length, dateStr, forSelectedDate.length, allDayEvents.length, timed.length]);

  if (!forSelectedDate.length) {
    return (
      <EmptyState
        icon="◈"
        title="No commitments"
        sub={`Nothing scheduled for ${formatSelectedDateLabel(dateStr)}.`}
      />
    );
  }

  const isToday = dateStr === today;

  return (
    <div style={{ padding: '8px 0', overflowX: 'auto' }}>
      {/* Date label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono',
          fontSize: 9,
          color: 'var(--muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          {formatSelectedDateLabel(dateStr)}
        </div>
        {isToday && (
          <span style={{
            fontFamily: 'Orbitron',
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--cyan)',
            padding: '2px 7px',
            borderRadius: 4,
            background: 'rgba(0,212,255,0.1)',
            border: '1px solid rgba(0,212,255,0.25)',
          }}>TODAY</span>
        )}
        <div style={{
          fontFamily: 'JetBrains Mono',
          fontSize: 8,
          color: 'var(--dim)',
          marginLeft: 'auto',
        }}>
          {timed.length} event{timed.length !== 1 ? 's' : ''}
        </div>
      </div>

      <AllDayBanner events={allDayEvents} />

      {timed.length > 0 ? (
        <>
          {/* Hour markers */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'JetBrains Mono',
            fontSize: 8,
            color: 'var(--dim)',
            marginBottom: 8,
            paddingBottom: 4,
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}>
            {HOURS.map(h => (
              <span key={h}>{h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}</span>
            ))}
          </div>

          {/* Track */}
          <div style={{ position: 'relative', height: 96, marginBottom: 4 }}>
            {/* Subtle time grid lines */}
            {HOURS.map(h => {
              const leftPct = ((h * 60 - DAY_START) / RANGE) * 100;
              return (
                <div
                  key={h}
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: leftPct + '%',
                    width: 1,
                    background: 'rgba(255,255,255,0.04)',
                    pointerEvents: 'none',
                  }}
                />
              );
            })}

            {timed.map(task => {
              const startMin   = toMin(task.startTime);
              const endMin     = toMin(task.endTime);
              const leftPct    = Math.max(0, ((startMin - DAY_START) / RANGE)) * 100;
              const widthPct   = Math.max(2, ((endMin - startMin) / RANGE)) * 100;
              const inConflict = conflictIds.has(task.id);
              const cfg        = getStatusConfig(task, inConflict);

              const isHighPriority = task.priority === 'critical' || task.priority === 'high';
              const titlePrefix    = isHighPriority && !cfg.badgeLabel ? '⚡ ' : '';

              return (
                <div
                  key={task.id}
                  title={`${task.title}\n${task.startTime}–${task.endTime}${cfg.badgeLabel ? `\n${cfg.badgeLabel}` : ''}`}
                  className={cfg.className}
                  style={{
                    position: 'absolute',
                    top: 0,
                    height: 90,
                    left: leftPct + '%',
                    width: Math.min(widthPct, 100 - leftPct) + '%',
                    minWidth: 54,
                    borderRadius: 8,
                    border: `1px ${cfg.borderStyle || 'solid'} ${cfg.border}`,
                    borderLeft: cfg.borderLeft,
                    background: cfg.bg,
                    color: cfg.color,
                    padding: '7px 9px',
                    fontSize: 9,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'left 0.4s ease, width 0.4s ease, opacity 0.3s ease',
                    opacity: cfg.isDimmed ? 0.5 : 1,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Title row */}
                  <div style={{
                    fontFamily: 'Orbitron',
                    fontWeight: 700,
                    fontSize: 7.5,
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {titlePrefix}{task.title}
                  </div>

                  {/* Bottom row: time + badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                    marginTop: 4,
                    flexWrap: 'nowrap',
                  }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: 7.5,
                      opacity: cfg.isDimmed ? 0.7 : 0.65,
                      whiteSpace: 'nowrap',
                    }}>
                      {task.startTime}–{task.endTime}
                    </div>
                    {cfg.badgeLabel && (
                      <span style={{
                        fontFamily: 'JetBrains Mono',
                        fontSize: 7,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: cfg.badgeBg,
                        color: cfg.badgeColor,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>
                        {cfg.badgeLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spine */}
          <div style={{
            position: 'relative',
            height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 10%, rgba(255,255,255,0.06) 90%, transparent)',
            marginTop: 8,
          }}>
            <div
              className="spine-glow"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent, var(--cyan) 50%, transparent)',
              }}
            />
          </div>
        </>
      ) : (
        allDayEvents.length === 0 && (
          <div style={{
            fontFamily: 'JetBrains Mono',
            fontSize: 10,
            color: 'var(--dim)',
            textAlign: 'center',
            padding: '24px 0',
          }}>
            No timed events for this day
          </div>
        )
      )}
    </div>
  );
}
