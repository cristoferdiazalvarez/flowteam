'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Layers,
  CheckCheck,
  LayoutGrid,
  CalendarDays,
  Check,
  Users,
  Activity,
  CheckCircle2,
  Clock3,
  Circle,
} from 'lucide-react';
import { type State, type Workspace, type Task } from '@/lib/types';
import { icons, date } from '@/lib/presentation';
import { Mark, Avatar, Empty, Priority } from './ui';
export function Dashboard({
  state,
  navigate,
  openTask,
  newProject,
  canManage,
}: {
  state: State;
  navigate: (v: string, id?: string) => void;
  openTask: (id: string) => void;
  newProject: () => void;
  canManage: boolean;
}) {
  const w = state.workspace!;
  const tasks = w.projects.filter((p) => !p.archived).flatMap((p) => p.tasks);
  const done = (t: Task) =>
    !!w.projects.find((p) => p.id === t.projectId)?.columns.find((c) => c.id === t.columnId)?.done;
  const completed = tasks.filter(done).length;
  const overdue = tasks.filter(
    (t) => !done(t) && t.dueDate && new Date(t.dueDate) < new Date(),
  ).length;
  const mine = tasks.filter(
    (t) => t.assignments.some((a) => a.userId === state.user.id) && !done(t),
  );
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">LET’S MAKE GOOD THINGS HAPPEN</span>
          <h1>
            A little clarity. A lot of possibility<span>.</span>
          </h1>
          <p>Welcome back, {state.user.name.split(' ')[0]}. Here’s where things stand.</p>
        </div>
        <div className="date-label">
          <CalendarDays size={15} />
          {new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </div>
      <div className="overview-banner">
        <div>
          <span className="eyebrow">YOUR TEAM, IN FLOW</span>
          <h2>
            Big ideas move forward.
            <br />
            <span>One thoughtful step at a time.</span>
          </h2>
          <p>Keep your people aligned and your next move clear.</p>
          <button className="text-button" onClick={() => navigate('projects')}>
            Explore your projects <ArrowRight size={16} />
          </button>
        </div>
        <div className="orbit-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="orbit-center">
            <Mark />
          </div>
          <span className="orbit-node node-a">
            <Check size={22} />
          </span>
          <span className="orbit-node node-b">
            <Layers size={21} />
          </span>
          <span className="orbit-node node-c">✧</span>
          <div className="orbit-chip">
            <span className="status-dot" /> A little more momentum
          </div>
        </div>
      </div>
      <div className="metric-grid">
        {[
          {
            label: 'Active projects',
            value: w.projects.filter((p) => !p.archived && p.status !== 'Completed').length,
            icon: Layers,
            note: 'Ideas taking shape',
            color: 'violet',
          },
          {
            label: 'Tasks completed',
            value: completed,
            icon: CheckCircle2,
            note: `${tasks.length ? Math.round((completed / tasks.length) * 100) : 0}% of all tasks`,
            color: 'green',
          },
          {
            label: 'In progress',
            value: tasks.filter(
              (t) =>
                !done(t) &&
                w.projects
                  .find((p) => p.id === t.projectId)
                  ?.columns.find((c) => c.id === t.columnId)?.position === 1,
            ).length,
            icon: Activity,
            note: 'Finding their flow',
            color: 'blue',
          },
          {
            label: 'Overdue tasks',
            value: overdue,
            icon: Clock3,
            note: overdue ? 'A little attention needed' : 'Right on track',
            color: 'orange',
          },
        ].map((m) => (
          <div className="metric-card" key={m.label}>
            <div>
              <span>{m.label}</span>
              <m.icon size={17} className={m.color} />
            </div>
            <strong>{m.value.toString().padStart(2, '0')}</strong>
            <small>
              <span className={`tiny-dot ${m.color}`} />
              {m.note}
            </small>
          </div>
        ))}
      </div>
      <div className="section-heading">
        <h2>
          Your projects <span>{w.projects.filter((p) => !p.archived).length}</span>
        </h2>
        <button
          className="text-button"
          onClick={canManage ? newProject : () => navigate('projects')}
        >
          {canManage ? 'New project' : 'View all'}
          <Plus size={15} />
        </button>
      </div>
      <ProjectGrid workspace={w} navigate={navigate} />
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="section-heading">
            <h2>
              Your next moves <span>{mine.length}</span>
            </h2>
            <button className="text-button" onClick={() => navigate('my-work')}>
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          {mine.length ? (
            mine.slice(0, 4).map((t) => (
              <button className="next-task" key={t.id} onClick={() => openTask(t.id)}>
                <Circle size={16} />
                <div>
                  <strong>{t.title}</strong>
                  <small>{w.projects.find((p) => p.id === t.projectId)?.name}</small>
                </div>
                <Priority value={t.priority} />
                <span>{date(t.dueDate)}</span>
              </button>
            ))
          ) : (
            <Empty
              icon={CheckCheck}
              title="A little breathing room."
              text="Tasks assigned to you will appear here."
            />
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Team activity</h2>
            <button className="text-button" onClick={() => navigate('activity')}>
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          <ActivityList workspace={w} openTask={openTask} limit={4} />
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="section-heading">
            <h2>Workload by teammate</h2>
            <Users size={17} />
          </div>
          <div className="workload">
            {w.memberships.map((m) => {
              const count = tasks.filter(
                (t) => t.assignments.some((a) => a.userId === m.userId) && !done(t),
              ).length;
              return (
                <div key={m.id}>
                  <Avatar person={m.user} />
                  <span>{m.user.name}</span>
                  <div className="bar-track">
                    <i style={{ width: `${tasks.length ? (count / tasks.length) * 100 : 0}%` }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Work at a glance</h2>
            <LayoutGrid size={16} />
          </div>
          <div className="status-chart">
            {Array.from(
              new Set(
                w.projects.filter((p) => !p.archived).flatMap((p) => p.columns.map((c) => c.name)),
              ),
            ).map((name, i) => {
              const count = tasks.filter(
                (t) =>
                  w.projects
                    .find((p) => p.id === t.projectId)
                    ?.columns.find((c) => c.id === t.columnId)?.name === name,
              ).length;
              return (
                <div key={name}>
                  <span>
                    <i className={`column-dot dot-${i % 4}`} />
                    {name}
                  </span>
                  <div className="bar-track">
                    <i
                      className={`chart-${i % 4}`}
                      style={{ width: `${tasks.length ? (count / tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

export function ProjectGrid({
  workspace: w,
  navigate,
  includeArchived = false,
}: {
  workspace: Workspace;
  navigate: (v: string, id?: string) => void;
  includeArchived?: boolean;
}) {
  return (
    <div className="project-grid">
      {w.projects
        .filter((p) => includeArchived || !p.archived)
        .map((p) => {
          const Icon = icons[p.icon] || Layers;
          const completed = p.tasks.filter(
            (t) => p.columns.find((c) => c.id === t.columnId)?.done,
          ).length;
          const percent = p.tasks.length ? Math.round((completed / p.tasks.length) * 100) : 0;
          return (
            <button className="project-card" key={p.id} onClick={() => navigate('project', p.id)}>
              <div className="project-card-top">
                <span
                  className="project-icon"
                  style={{ color: p.color, background: p.color + '15' }}
                >
                  <Icon size={21} />
                </span>
                <span className="badge">
                  <span className="status-dot" />
                  {p.archived ? 'Archived' : p.status}
                </span>
                <ArrowUpRight size={17} />
              </div>
              <h3>{p.name}</h3>
              <p>{p.description || 'Make room for your next big idea.'}</p>
              <div className="project-progress">
                <span>Progress</span>
                <strong>{percent}%</strong>
              </div>
              <div className="bar-track">
                <i style={{ width: percent + '%', background: p.color }} />
              </div>
              <div className="project-card-footer">
                <div className="avatar-stack">
                  {w.memberships
                    .filter((m) => p.members.some((pm) => pm.membershipId === m.id))
                    .slice(0, 4)
                    .map((m) => (
                      <Avatar key={m.id} person={m.user} />
                    ))}
                </div>
                <span>
                  <CheckCheck size={13} />
                  {completed}/{p.tasks.length} tasks
                </span>
              </div>
            </button>
          );
        })}
      {!w.projects.length && (
        <Empty
          icon={Layers}
          title="A fresh start."
          text="Create your first project and give your ideas a home."
        />
      )}
    </div>
  );
}

export function ActivityList({
  workspace: w,
  openTask,
  limit = 40,
}: {
  workspace: Workspace;
  openTask: (id: string) => void;
  limit?: number;
}) {
  return (
    <div className="activity-list">
      {w.activities.length ? (
        w.activities.slice(0, limit).map((a) => (
          <div className="activity-item" key={a.id}>
            <Avatar person={a.actor} />
            <div>
              <p>
                <strong>{a.actor.name}</strong> {a.text}
              </p>
              <small>
                {new Date(a.createdAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
                · {date(a.createdAt)}
                {a.taskId && w.projects.some((p) => p.tasks.some((t) => t.id === a.taskId)) && (
                  <button className="text-button" onClick={() => openTask(a.taskId!)}>
                    View task <ArrowUpRight size={11} />
                  </button>
                )}
              </small>
            </div>
          </div>
        ))
      ) : (
        <Empty
          icon={Activity}
          title="Your story starts here."
          text="Your team’s progress will appear as it happens."
        />
      )}
    </div>
  );
}

export function TaskList({
  tasks,
  workspace,
  openTask,
}: {
  tasks: Task[];
  workspace: Workspace;
  openTask: (id: string) => void;
}) {
  return (
    <div className="task-list">
      {tasks.length ? (
        <>
          <div className="list-header">
            <span>Task</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Due date</span>
          </div>
          {tasks.map((t) => (
            <button className="list-row" key={t.id} onClick={() => openTask(t.id)}>
              <span>
                <Circle size={15} />
                <span>
                  <strong>{t.title}</strong>
                  <small>{workspace.projects.find((p) => p.id === t.projectId)?.name}</small>
                </span>
              </span>
              <span className="badge">
                {
                  workspace.projects
                    .find((p) => p.id === t.projectId)
                    ?.columns.find((c) => c.id === t.columnId)?.name
                }
              </span>
              <Priority value={t.priority} />
              <span>{date(t.dueDate) || '—'}</span>
            </button>
          ))}
        </>
      ) : (
        <Empty
          icon={CheckCheck}
          title="A little room for what’s next."
          text="No tasks match this view. Try adjusting your filters."
        />
      )}
    </div>
  );
}

export function Calendar({ tasks, openTask }: { tasks: Task[]; openTask: (id: string) => void }) {
  const [offset, setOffset] = useState(0);
  const month = new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return (
    <section className="calendar-panel">
      <div className="section-heading">
        <h2>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <div>
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() => setOffset(offset - 1)}
          >
            ←
          </button>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() => setOffset(offset + 1)}
          >
            →
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div className="day-label" key={d}>
            {d}
          </div>
        ))}
        {Array.from({ length: month.getDay() }, (_, i) => (
          <div key={`empty${i}`} className="calendar-day blank" />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(month.getFullYear(), month.getMonth(), i + 1);
          return (
            <div
              className={`calendar-day ${d.toDateString() === new Date().toDateString() ? 'today' : ''}`}
              key={i}
            >
              <span>{i + 1}</span>
              {tasks
                .filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === d.toDateString())
                .map((t) => (
                  <button key={t.id} onClick={() => openTask(t.id)}>
                    {t.title}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
      <p className="fine">Tasks without a due date appear in Board and List views.</p>
    </section>
  );
}
