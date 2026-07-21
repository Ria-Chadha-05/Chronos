/**
 * Tasks.jsx
 *
 * Chronos Task Command screen.
 *
 * Tabs:
 *   ◈ Tasks         — Manual task CRUD with all commitment fields
 *   ⬡ Projects      — Ongoing project management with progress tracking
 *   ⬟ Anchors       — Life anchor management
 *   ⬡ Simulate      — Consequence simulator
 *   📦 Prep Pack    — AI prep checklist generator
 */

import React, { useEffect, useState } from 'react';
import { useChronos } from '../context/ChronosContext.jsx';
import { useCalendar } from '../context/CalendarContext.jsx';
import { useCommitments } from '../context/CommitmentContext.jsx';
import {
  Card,
  CardHeader,
  Button,
  Chip,
  EmptyState,
  ScreenHeader,
  Grid2,
  SectionLabel,
} from '../components/ui/index.jsx';

// ─── Color palettes ───────────────────────────────────────────────────────────

const FLEX_COLORS = { fixed: '#00D4FF', negotiable: '#FF8C00', flexible: '#00FF88' };
const PRIORITY_COLORS = { critical: '#FF3366', high: '#FF8C00', medium: '#00D4FF', low: '#9B59FF' };
const STATUS_COLORS = { pending: '#9B59FF', in_progress: '#00D4FF', completed: '#00FF88', cancelled: '#444' };
const STATUS_LABELS = { pending: '○ Pending', in_progress: '◌ In Progress', completed: '✓ Done', cancelled: '✕ Cancelled' };

// ─── Shared label style ───────────────────────────────────────────────────────

const LABEL = {
  display: 'block',
  fontFamily: 'JetBrains Mono',
  fontSize: 9,
  color: 'var(--muted)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 5,
};

// ─── TaskForm ─────────────────────────────────────────────────────────────────

const EMPTY_TASK = {
  title: '',
  description: '',
  startTime: '09:00',
  endTime: '10:00',
  flexibility: 'flexible',
  priority: 'medium',
  estimatedDuration: 60,
  effortLevel: 'medium',
  status: 'pending',
  deadline: '',
  notes: '',
};

function TaskForm({ onAdd, initial = null, onCancel = null }) {
  const [form, setForm] = useState(initial ? { ...EMPTY_TASK, ...initial } : { ...EMPTY_TASK });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = Boolean(initial);

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onAdd({
      ...form,
      title: form.title.trim(),
      id: initial?.id || ('task_' + Date.now()),
      deadline: form.deadline || null,
    });
    if (!isEdit) setForm({ ...EMPTY_TASK });
  };

  return (
    <Card>
      <CardHeader title={isEdit ? '✎ Edit Task' : '＋ New Task'} />

      {/* Title */}
      <div style={{ marginBottom: 14 }}>
        <label style={LABEL}>Title *</label>
        <input
          value={form.title}
          onChange={e => set('title', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="e.g. DS Exam, Interview at Stripe, Submit ML Assignment"
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 14 }}>
        <label style={LABEL}>Description</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Context, links, notes..."
          rows={2}
        />
      </div>

      {/* Start / End time */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
        <div>
          <label style={LABEL}>Start Time</label>
          <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>End Time</label>
          <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
        </div>
      </div>

      {/* Deadline */}
      <div style={{ marginBottom: 14 }}>
        <label style={LABEL}>Deadline (optional)</label>
        <input
          type="date"
          value={form.deadline || ''}
          onChange={e => set('deadline', e.target.value)}
        />
      </div>

      {/* Priority / Flexibility / Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 11, marginBottom: 14 }}>
        <div>
          <label style={LABEL}>Priority</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>Flexibility</label>
          <select value={form.flexibility} onChange={e => set('flexibility', e.target.value)}>
            <option value="fixed">Fixed</option>
            <option value="negotiable">Negotiable</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Effort Level / Estimated Duration */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
        <div>
          <label style={LABEL}>Effort Level</label>
          <select value={form.effortLevel} onChange={e => set('effortLevel', e.target.value)}>
            <option value="high">High (Deep Focus)</option>
            <option value="medium">Medium</option>
            <option value="low">Low (Light)</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>Est. Duration (min)</label>
          <input
            type="number"
            value={form.estimatedDuration}
            onChange={e => set('estimatedDuration', Math.max(5, +e.target.value))}
            min={5}
            max={480}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" onClick={handleSubmit}>
          {isEdit ? '✓ Save Changes' : '＋ Add Task'}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </Card>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onDelete, onComplete, onEdit, onPrep }) {
  const isDone = task.manualStatus === 'completed' || task.status === 'completed';
  const isCancelled = task.manualStatus === 'cancelled' || task.cancelled;
  const status = task.manualStatus || (isDone ? 'completed' : 'pending');
  const statusColor = STATUS_COLORS[status] || '#9B59FF';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '13px 14px',
      background: 'var(--deep)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      marginBottom: 8,
      opacity: isCancelled ? 0.45 : isDone ? 0.65 : 1,
      transition: 'all 0.2s',
    }}>
      {/* Flexibility stripe */}
      <div style={{
        width: 3,
        borderRadius: 3,
        alignSelf: 'stretch',
        flexShrink: 0,
        background: FLEX_COLORS[task.flexibility] || '#444',
        boxShadow: `0 0 6px ${FLEX_COLORS[task.flexibility] || '#444'}`,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <div style={{
          fontWeight: 600,
          fontSize: 13,
          marginBottom: 3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textDecoration: isDone ? 'line-through' : 'none',
          color: isDone ? 'var(--muted)' : 'var(--text)',
        }}>
          {task.title}
        </div>

        {/* Chips row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip variant={task.flexibility}>{task.flexibility}</Chip>
          <Chip variant={task.priority}>{task.priority}</Chip>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: statusColor }}>
            {STATUS_LABELS[status] || status}
          </span>
          {task.startTime && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)' }}>
              🕐 {task.startTime}{task.endTime ? `–${task.endTime}` : ''}
            </span>
          )}
          {task.estimatedDuration && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)' }}>
              ⏱ {task.estimatedDuration}m
            </span>
          )}
          {task.deadline && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#FF8C00' }}>
              📅 {task.deadline}
            </span>
          )}
          {task.effortLevel && (
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)' }}>
              ⚡ {task.effortLevel}
            </span>
          )}
        </div>

        {/* Description snippet */}
        {task.description && (
          <div style={{
            fontSize: 11,
            color: 'var(--dim)',
            marginTop: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {task.description}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {!isDone && !isCancelled && (
          <button
            title="Mark complete"
            onClick={() => onComplete(task.id)}
            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #00FF8840', background: 'transparent', color: '#00FF88', cursor: 'pointer', fontSize: 13 }}
          >✓</button>
        )}
        <button
          title="Edit"
          onClick={() => onEdit(task)}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 11 }}
        >✎</button>
        <button
          title="Prep Pack"
          onClick={() => onPrep(task)}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}
        >📦</button>
        <button
          title="Delete"
          onClick={() => onDelete(task.id)}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 11 }}
        >✕</button>
      </div>
    </div>
  );
}

// ─── TaskList ─────────────────────────────────────────────────────────────────

function TaskList({ tasks, onDelete, onClear, onComplete, onEdit, onPrep, onPlan }) {
  const manualTasks = tasks.filter(t => t.source === 'manual' && t.type !== 'ongoing_project');
  const calendarTasks = tasks.filter(t => t.source === 'google_calendar');
  const gmailTasks = tasks.filter(t => t.source === 'gmail');

  return (
    <Card>
      <CardHeader title={`◈ Commitments (${tasks.length})`}>
        <Button variant="ghost" size="sm" onClick={onClear}>Clear Manual</Button>
      </CardHeader>

      {/* Source summary */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)' }}>
          ✍ {manualTasks.length} manual
        </span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#00D4FF' }}>
          📅 {calendarTasks.length} calendar
        </span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#9B59FF' }}>
          ✉ {gmailTasks.length} gmail
        </span>
      </div>

      {!tasks.length
        ? <EmptyState icon="◈" title="No commitments yet" sub="Add your first task or connect Google Calendar." />
        : tasks
            .filter(t => t.type !== 'ongoing_project')
            .map((t, idx) => (
              <div key={t.id} className="cos-stagger-item" style={{ '--stagger': idx + 1 }}>
                <TaskRow
                  task={t}
                  onDelete={onDelete}
                  onComplete={onComplete}
                  onEdit={onEdit}
                  onPrep={onPrep}
                />
              </div>
            ))
      }

      {tasks.length > 0 && (
        <Button variant="primary" onClick={onPlan} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
          ⬡ Generate AI Plan →
        </Button>
      )}
    </Card>
  );
}

// ─── TasksTab ─────────────────────────────────────────────────────────────────

function TasksTab({ tasks, onAdd, onDelete, onClear, onComplete, onEdit, onPrep, onPlan }) {
  const [editingTask, setEditingTask] = useState(null);

  const handleEdit = (task) => {
    setEditingTask(task);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdate = (updates) => {
    onEdit(editingTask.id, updates);
    setEditingTask(null);
  };

  return (
    <Grid2>
      {editingTask ? (
        <TaskForm
          initial={{
            ...editingTask,
            status: editingTask.manualStatus || editingTask.status,
          }}
          onAdd={handleUpdate}
          onCancel={() => setEditingTask(null)}
        />
      ) : (
        <TaskForm onAdd={onAdd} />
      )}
      <TaskList
        tasks={tasks}
        onDelete={onDelete}
        onClear={onClear}
        onComplete={onComplete}
        onEdit={handleEdit}
        onPrep={onPrep}
        onPlan={onPlan}
      />
    </Grid2>
  );
}

// ─── ProjectForm (Part 3) ─────────────────────────────────────────────────────

const PROJECT_TEMPLATES = [
  { label: 'Hackathon', estimatedTotalHours: 24, dailyTarget: 8, minimumFocusBlock: 60, energyLoad: 'deep' },
  { label: 'Research Paper', estimatedTotalHours: 40, dailyTarget: 2, minimumFocusBlock: 45, energyLoad: 'deep' },
  { label: 'Exam Preparation', estimatedTotalHours: 30, dailyTarget: 3, minimumFocusBlock: 30, energyLoad: 'deep' },
  { label: 'DSA Practice', estimatedTotalHours: 20, dailyTarget: 2, minimumFocusBlock: 30, energyLoad: 'medium' },
  { label: 'ML Assignment', estimatedTotalHours: 15, dailyTarget: 2, minimumFocusBlock: 60, energyLoad: 'deep' },
  { label: 'Portfolio Development', estimatedTotalHours: 25, dailyTarget: 1.5, minimumFocusBlock: 30, energyLoad: 'medium' },
  { label: 'Custom Project', estimatedTotalHours: 10, dailyTarget: 2, minimumFocusBlock: 30, energyLoad: 'medium' },
];

const EMPTY_PROJECT = {
  title: '',
  description: '',
  estimatedTotalHours: 10,
  dailyTarget: 2,
  minimumFocusBlock: 30,
  deadline: '',
  preferredWorkWindow: 'any',
  priority: 'high',
  energyLoad: 'deep',
  completionPercentage: 0,
};

function ProjectForm({ onAdd, initial = null, onCancel = null }) {
  const [form, setForm] = useState(initial ? { ...EMPTY_PROJECT, ...initial } : { ...EMPTY_PROJECT });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isEdit = Boolean(initial);

  const applyTemplate = (tpl) => {
    setForm(f => ({
      ...f,
      title: tpl.label === 'Custom Project' ? f.title : tpl.label,
      estimatedTotalHours: tpl.estimatedTotalHours,
      dailyTarget: tpl.dailyTarget,
      minimumFocusBlock: tpl.minimumFocusBlock,
      energyLoad: tpl.energyLoad,
    }));
  };

  const sessions = form.dailyTarget > 0
    ? Math.ceil(form.estimatedTotalHours / form.dailyTarget)
    : '—';

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    onAdd({
      ...form,
      title: form.title.trim(),
      id: initial?.id || ('proj_' + Date.now()),
      deadline: form.deadline || null,
    });
    if (!isEdit) setForm({ ...EMPTY_PROJECT });
  };

  return (
    <Card>
      <CardHeader title={isEdit ? '✎ Edit Project' : '⬡ New Project'} />

      {/* Templates */}
      {!isEdit && (
        <div style={{ marginBottom: 16 }}>
          <label style={LABEL}>Quick Template</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PROJECT_TEMPLATES.map(tpl => (
              <button
                key={tpl.label}
                onClick={() => applyTemplate(tpl)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: form.title === tpl.label ? 'rgba(0,212,255,0.15)' : 'transparent',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono',
                }}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: 14 }}>
        <label style={LABEL}>Project Title *</label>
        <input
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. ML Assignment, Exam Prep, Portfolio"
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 14 }}>
        <label style={LABEL}>Description</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Scope, goals, resources..."
          rows={2}
        />
      </div>

      {/* Hours / Daily Target */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
        <div>
          <label style={LABEL}>Total Hours</label>
          <input
            type="number"
            value={form.estimatedTotalHours}
            onChange={e => set('estimatedTotalHours', Math.max(1, +e.target.value))}
            min={1}
          />
        </div>
        <div>
          <label style={LABEL}>Daily Target (hrs)</label>
          <input
            type="number"
            value={form.dailyTarget}
            onChange={e => set('dailyTarget', Math.max(0.5, +e.target.value))}
            min={0.5}
            step={0.5}
          />
        </div>
      </div>

      {/* Min Focus Block / Deadline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
        <div>
          <label style={LABEL}>Min Focus Block (min)</label>
          <input
            type="number"
            value={form.minimumFocusBlock}
            onChange={e => set('minimumFocusBlock', Math.max(15, +e.target.value))}
            min={15}
            step={15}
          />
        </div>
        <div>
          <label style={LABEL}>Deadline (optional)</label>
          <input
            type="date"
            value={form.deadline || ''}
            onChange={e => set('deadline', e.target.value)}
          />
        </div>
      </div>

      {/* Work window / Priority */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 14 }}>
        <div>
          <label style={LABEL}>Preferred Window</label>
          <select value={form.preferredWorkWindow} onChange={e => set('preferredWorkWindow', e.target.value)}>
            <option value="any">Any Time</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>Priority</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Session estimate preview */}
      <div style={{
        padding: '10px 13px',
        background: 'rgba(0,212,255,0.06)',
        border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: 10,
        marginBottom: 16,
      }}>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--cyan)', marginBottom: 4 }}>
          SESSION ESTIMATE
        </div>
        <div style={{ fontSize: 12, color: 'var(--text)' }}>
          ~{sessions} sessions × {form.dailyTarget}h/day = {form.estimatedTotalHours}h total
          {form.minimumFocusBlock ? ` · min block ${form.minimumFocusBlock}min` : ''}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" onClick={handleSubmit}>
          {isEdit ? '✓ Save Project' : '⬡ Add Project'}
        </Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </Card>
  );
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────

function ProjectCard({ project, onDelete, onEdit, onUpdateProgress }) {
  const [showProgressEdit, setShowProgressEdit] = useState(false);
  const [draftPct, setDraftPct] = useState('');
  const op = project.ongoingProject || {};
  const pct = op.completionPercentage ?? 0;
  const remaining = op.remainingDuration ?? op.effectiveDuration ?? 0;
  const totalHours = op.estimatedTotalHours ?? 0;
  const remainingHours = (remaining / 60).toFixed(1);
  const priorityColor = PRIORITY_COLORS[project.priority] || '#9B59FF';

  const daysLeft = project.deadline
    ? Math.max(0, Math.ceil((new Date(project.deadline) - new Date()) / 86400000))
    : null;

  const handleProgressSave = () => {
    const val = Math.max(0, Math.min(100, Number(draftPct)));
    onUpdateProgress(project.id, val);
    setShowProgressEdit(false);
    setDraftPct('');
  };

  return (
    <div style={{
      padding: '16px 16px 14px',
      background: 'var(--deep)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: priorityColor,
              boxShadow: `0 0 6px ${priorityColor}`,
              flexShrink: 0,
            }} />
            <span style={{ fontWeight: 700, fontSize: 13 }}>{project.title}</span>
          </div>
          {project.description && (
            <div style={{ fontSize: 11, color: 'var(--dim)', marginLeft: 16 }}>
              {project.description}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button
            title="Edit project"
            onClick={() => onEdit(project)}
            style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 11 }}
          >✎</button>
          <button
            title="Delete project"
            onClick={() => onDelete(project.id)}
            style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 11 }}
          >✕</button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <div style={LABEL}>Total</div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: 'var(--cyan)' }}>{totalHours}h</div>
        </div>
        <div>
          <div style={LABEL}>Remaining</div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: '#FF8C00' }}>{remainingHours}h</div>
        </div>
        <div>
          <div style={LABEL}>Daily Target</div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: '#9B59FF' }}>{op.dailyTarget ?? op.effortHoursPerDay ?? 2}h</div>
        </div>
        {op.estimatedSessions && (
          <div>
            <div style={LABEL}>Sessions</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: 'var(--text)' }}>~{op.estimatedSessions}</div>
          </div>
        )}
        {op.minimumFocusBlock && (
          <div>
            <div style={LABEL}>Min Block</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: 'var(--muted)' }}>{op.minimumFocusBlock}m</div>
          </div>
        )}
        {daysLeft !== null && (
          <div>
            <div style={LABEL}>Deadline</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: daysLeft < 3 ? '#FF3366' : daysLeft < 7 ? '#FF8C00' : '#00FF88' }}>
              {daysLeft === 0 ? 'Today' : `${daysLeft}d`}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <label style={{ ...LABEL, marginBottom: 0 }}>Progress</label>
          <span style={{ fontFamily: 'Orbitron', fontSize: 10, color: pct >= 100 ? '#00FF88' : 'var(--cyan)' }}>
            {pct}%
          </span>
        </div>
        <div style={{
          height: 6,
          background: 'var(--border)',
          borderRadius: 999,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: pct >= 100 ? '#00FF88' : pct >= 70 ? '#00D4FF' : pct >= 40 ? '#FF8C00' : '#FF3366',
            borderRadius: 999,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 8px ${pct >= 100 ? '#00FF88' : '#00D4FF'}`,
          }} />
        </div>
      </div>

      {/* Update progress */}
      {showProgressEdit ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
          <input
            type="number"
            value={draftPct}
            onChange={e => setDraftPct(e.target.value)}
            placeholder={String(pct)}
            min={0}
            max={100}
            style={{ width: 70 }}
          />
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>%</span>
          <Button variant="primary" size="sm" onClick={handleProgressSave}>Save</Button>
          <Button variant="ghost" size="sm" onClick={() => { setShowProgressEdit(false); setDraftPct(''); }}>Cancel</Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setShowProgressEdit(true); setDraftPct(String(pct)); }}
          style={{ marginTop: 6 }}
        >
          ◌ Update Progress
        </Button>
      )}
    </div>
  );
}

// ─── ProjectsTab (Part 3) ─────────────────────────────────────────────────────

function ProjectsTab() {
  const { commitments } = useCommitments();
  const { addOngoingProject, updateOngoingProject, updateProjectCompletion, deleteOngoingProject } = useCommitments();
  const [editingProject, setEditingProject] = useState(null);

  const projects = commitments.filter(c => c.type === 'ongoing_project' || c.commitmentType === 'ONGOING_PROJECT');

  const handleAdd = (data) => {
    addOngoingProject(data);
  };

  const handleEdit = (project) => {
    const op = project.ongoingProject || {};
    setEditingProject({
      id: project.id,
      title: project.title,
      description: project.description || '',
      estimatedTotalHours: op.estimatedTotalHours ?? 10,
      dailyTarget: op.dailyTarget ?? op.effortHoursPerDay ?? 2,
      minimumFocusBlock: op.minimumFocusBlock ?? 30,
      deadline: op.deadline || project.deadline || '',
      preferredWorkWindow: op.preferredWorkWindow || 'any',
      priority: project.priority || 'high',
      energyLoad: project.energyLoad || 'deep',
      completionPercentage: op.completionPercentage ?? 0,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEdit = (updates) => {
    updateOngoingProject(editingProject.id, { ...updates, id: editingProject.id });
    setEditingProject(null);
  };

  return (
    <Grid2>
      {editingProject ? (
        <ProjectForm
          initial={editingProject}
          onAdd={handleSaveEdit}
          onCancel={() => setEditingProject(null)}
        />
      ) : (
        <ProjectForm onAdd={handleAdd} />
      )}

      <div>
        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
          Active Projects ({projects.length})
        </div>

        {!projects.length
          ? <EmptyState
              icon="⬡"
              title="No ongoing projects"
              sub="Add a hackathon, research paper, or any multi-session project."
            />
          : projects.map((p, idx) => (
              <div key={p.id} className="cos-stagger-item" style={{ '--stagger': idx + 1 }}>
                <ProjectCard
                  project={p}
                  onDelete={deleteOngoingProject}
                  onEdit={handleEdit}
                  onUpdateProgress={updateProjectCompletion}
                />
              </div>
            ))
        }
      </div>
    </Grid2>
  );
}

// ─── AnchorsTab ────────────────────────────────────────────────────────────────

function AnchorsTab({ anchors, onAdd, onDelete }) {
  const strengthColors = { sacred: '#FF3366', protected: '#FF8C00', flexible: '#00FF88' };
  return (
    <Grid2>
      <Card>
        <CardHeader title="⬟ Life Anchors">
          <Button variant="primary" size="sm" onClick={onAdd}>＋ Add</Button>
        </CardHeader>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          Sacred commitments — sleep, relationships, health. Chronos warns before touching them.
        </p>
        {!anchors.length
          ? <EmptyState icon="⬟" title="No anchors" sub="Protect what matters most." />
          : anchors.map((a, idx) => (
            <div key={a.id} className="cos-stagger-item" style={{ '--stagger': idx + 1, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 7 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#9B59FF', boxShadow: '0 0 8px #9B59FF', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)' }}>
                  {a.time} · <span style={{ color: strengthColors[a.strength] }}>{a.strength}</span>
                </div>
              </div>
              <button onClick={() => onDelete(a.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 11 }}>✕</button>
            </div>
          ))
        }
      </Card>
      <Card>
        <CardHeader title="Strength Guide" />
        {[
          ['sacred', '#FF3366', 'Never moved. Treated like a fixed commitment.'],
          ['protected', '#FF8C00', 'Moved only after your explicit approval.'],
          ['flexible', '#00FF88', 'Can move but Chronos warns you first.'],
        ].map(([s, c, d]) => (
          <div key={s} style={{ padding: '12px 14px', background: 'var(--deep)', border: `1px solid ${c}40`, borderRadius: 10, marginBottom: 8 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, color: c, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{s}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{d}</div>
          </div>
        ))}
      </Card>
    </Grid2>
  );
}

// ─── SimulateTab ──────────────────────────────────────────────────────────────

function SimulateTab({ onSimulate, simResult, onClear }) {
  const [form, setForm] = useState({ title: '', startTime: '10:00', duration: 60 });
  const VERDICT_COLORS = { safe: '#00FF88', tight: '#00D4FF', risky: '#FF8C00', impossible: '#FF3366' };

  return (
    <Grid2>
      <Card>
        <CardHeader title="⬡ Consequence Simulator" />
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          About to say yes to something new? See what breaks before you commit.
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL}>New item</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Extra project review meeting" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginBottom: 16 }}>
          <div><label style={LABEL}>Start time</label><input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
          <div><label style={LABEL}>Duration (min)</label><input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} min={15} /></div>
        </div>
        <Button variant="primary" onClick={() => onSimulate(form)} disabled={!form.title.trim()}>⬡ Simulate Impact</Button>
      </Card>

      {simResult && (
        <Card>
          <CardHeader title="Simulation Result">
            <Button variant="ghost" size="xs" onClick={onClear}>Clear</Button>
          </CardHeader>
          <div style={{ padding: 16, borderRadius: 10, border: `1px solid ${VERDICT_COLORS[simResult.verdict]}40`, background: `${VERDICT_COLORS[simResult.verdict]}10`, textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 18, fontWeight: 900, color: VERDICT_COLORS[simResult.verdict], marginBottom: 6 }}>{simResult.verdict?.toUpperCase()}</div>
            <div style={{ fontSize: 13 }}>{simResult.verdictReason}</div>
          </div>
          <div style={{ padding: '10px 13px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 14 }}>
            <span style={{ color: 'var(--cyan)', fontFamily: 'Orbitron', fontSize: 10 }}>{simResult.recommendation?.toUpperCase()}</span>
            <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 8 }}>— {simResult.recommendationReason}</span>
          </div>
          {simResult.whatGetsSqueezed?.length > 0 && (
            <div>
              <SectionLabel>What Gets Squeezed</SectionLabel>
              {simResult.whatGetsSqueezed.map((s, i) => (
                <div key={i} style={{ padding: '10px 13px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <b style={{ fontSize: 13 }}>{s.taskTitle}</b>
                    <Chip variant={s.severity}>{s.severity}</Chip>
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>{s.impact}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </Grid2>
  );
}

// ─── PrepTab ──────────────────────────────────────────────────────────────────

function PrepTab({ tasks, onPrep, prepResult }) {
  const CAT_COLORS = { materials: '#00D4FF', mental: '#9B59FF', logistics: '#FF8C00', review: '#00FF88', communication: '#FF3366' };
  const manualTasks = tasks.filter(t => t.source === 'manual');

  return (
    <div>
      <Card style={{ marginBottom: 18 }}>
        <CardHeader title="📦 Prep Pack Generator" />
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
          Select a task to auto-generate a preparation checklist. Chronos builds it from the task type, priority, and notes.
        </p>
        {!manualTasks.length
          ? <EmptyState icon="📦" title="No manual tasks" sub="Add tasks first." />
          : manualTasks.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 7 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)' }}>{t.flexibility} · {t.priority}</div>
              </div>
              <Button variant="primary" size="sm" onClick={() => onPrep(t)}>📦 Generate</Button>
            </div>
          ))
        }
      </Card>

      {prepResult && (
        <Card>
          <CardHeader title={`📦 Prep Pack — ${tasks.find(t => t.id === prepResult.taskId)?.title || 'Task'}`}>
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: 'var(--muted)' }}>~{prepResult.totalPrepMinutes}min total</span>
          </CardHeader>
          <div style={{ padding: '10px 13px', background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 10, marginBottom: 14 }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--cyan)', letterSpacing: '0.1em', marginBottom: 3 }}>KEY FOCUS</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{prepResult.keyFocus}</div>
          </div>
          {['must', 'should', 'nice'].map(prio => {
            const items = prepResult.prepItems?.filter(p => p.priority === prio) || [];
            if (!items.length) return null;
            return (
              <div key={prio}>
                <SectionLabel>{prio === 'must' ? '⚠ Must Do' : prio === 'should' ? '→ Should Do' : '✦ Nice to Have'}</SectionLabel>
                {items.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 13px', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: CAT_COLORS[p.category] || 'var(--muted)', width: 80, flexShrink: 0, paddingTop: 2 }}>{p.category}</span>
                    <span style={{ fontSize: 12, flex: 1 }}>{p.item}</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{p.timeNeeded}m</span>
                  </div>
                ))}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

// ─── Tasks Screen ─────────────────────────────────────────────────────────────

const TABS = [
  { id: 'tasks',    label: '◈ Tasks' },
  { id: 'projects', label: '⬡ Projects' },
  { id: 'anchors',  label: '⬟ Anchors' },
  { id: 'simulate', label: '⬡ Simulate' },
  { id: 'prep',     label: '📦 Prep Pack' },
];

export default function Tasks() {
  const [activeTab, setActiveTab] = useState('tasks');
  const { tasks, setTasks, anchors, setAnchors, runPlan, runSimulate, simResult, setSimResult, runPrep, prepResult } = useChronos();
  const { addManualTask, updateManualTask, deleteManualTask, completeManualTask } = useCommitments();
  const { selectedDate, today } = useCalendar();

  useEffect(() => {
    console.info('[Chronos Pipeline] Tasks screen consuming ChronosContext commitments', {
      commitmentCount: tasks.length,
      calendarCommitmentCount: tasks.filter(task => task.source === 'google_calendar').length,
      gmailCommitmentCount: tasks.filter(task => task.source === 'gmail').length,
      manualCommitmentCount: tasks.filter(task => task.source === 'manual').length,
    });
  }, [tasks]);

  // Manual task add: delegate to CommitmentContext so the task is transformed
  // and flows into the shared Commitment Store.
  const handleAddTask = (taskData) => {
    addManualTask(taskData, { date: selectedDate || today });
  };

  const handleEditTask = (id, updates) => {
    updateManualTask(id, updates);
  };

  const handleDeleteTask = (id) => {
    deleteManualTask(id);
  };

  const handleCompleteTask = (id) => {
    completeManualTask(id);
  };

  const handleClearManual = () => {
    if (confirm('Clear all manual tasks?')) {
      setTasks(ts => ts.filter(t => t.source !== 'manual' || t.type === 'ongoing_project'));
    }
  };

  const addAnchor = () => {
    const name = prompt('Anchor name (e.g. Sleep, Gym, Partner time):');
    if (!name) return;
    const time = prompt('Time block (e.g. 22:00–07:00):') || '';
    const strength = prompt('Strength: sacred, protected, or flexible:') || 'protected';
    setAnchors(a => [...a, { id: 'a_' + Date.now(), name, time, strength }]);
  };

  const deleteAnchor = (id) => setAnchors(a => a.filter(x => x.id !== id));

  return (
    <div>
      <ScreenHeader
        eyebrow="AI Chief of Staff"
        title="Manage my commitments"
        highlight=""
        sub="Add your tasks and project anchors so I can structure your days around what matters most."
      />

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <Button
            key={t.id}
            variant={activeTab === t.id ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {activeTab === 'tasks' && (
        <TasksTab
          tasks={tasks}
          onAdd={handleAddTask}
          onDelete={handleDeleteTask}
          onClear={handleClearManual}
          onComplete={handleCompleteTask}
          onEdit={handleEditTask}
          onPrep={runPrep}
          onPlan={runPlan}
        />
      )}

      {activeTab === 'projects' && <ProjectsTab />}

      {activeTab === 'anchors' && (
        <AnchorsTab anchors={anchors} onAdd={addAnchor} onDelete={deleteAnchor} />
      )}

      {activeTab === 'simulate' && (
        <SimulateTab onSimulate={runSimulate} simResult={simResult} onClear={() => setSimResult(null)} />
      )}

      {activeTab === 'prep' && (
        <PrepTab tasks={tasks} onPrep={runPrep} prepResult={prepResult} />
      )}
    </div>
  );
}
