'use client';
import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  CheckCheck,
  Settings,
  CalendarDays,
  MessageSquare,
  Paperclip,
  Link2,
  Trash2,
  Archive,
  Users,
  ArrowDown,
  Activity,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { type State, type Workspace, type Project, type Task } from '@/lib/types';
import { icons, date, inputDate, iso } from '@/lib/presentation';
import { type Mutate, type Confirm } from '@/lib/ui-types';
import { Avatar, Modal, Submit, Priority } from './ui';
import ReactMarkdown from 'react-markdown';
export function ProjectModal({
  workspace,
  project,
  onClose,
  mutate,
  onCreated,
  confirm,
}: {
  workspace: Workspace;
  project?: Project;
  onClose: () => void;
  mutate: Mutate;
  onCreated: (id: string) => void;
  confirm: Confirm;
}) {
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<string[]>(
    project?.members.map((m) => m.membershipId) || workspace.memberships.map((m) => m.id),
  );
  return (
    <Modal
      title={project ? 'A little fine-tuning.' : 'Make room for your next big idea.'}
      onClose={onClose}
    >
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            const r = await mutate<{ id: string }>({
              action: project ? 'editProject' : 'createProject',
              id: project?.id,
              name: f.get('name'),
              description: f.get('description'),
              color: f.get('color'),
              icon: f.get('icon'),
              status: f.get('status'),
              startDate: iso(f.get('startDate')),
              dueDate: iso(f.get('dueDate')),
              memberIds: members,
            });
            toast.success(project ? 'Project updated.' : 'A new project. A fresh possibility.');
            onCreated(r.id);
            onClose();
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Project name
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={project?.name}
            placeholder="What are we making happen?"
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            maxLength={3000}
            defaultValue={project?.description}
            rows={3}
            placeholder="Give your team a little context…"
          />
        </label>
        <div className="form-row">
          <label>
            Icon
            <select name="icon" defaultValue={project?.icon || 'Layers'}>
              {Object.keys(icons).map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
          <label>
            Color
            <input name="color" type="color" defaultValue={project?.color || '#a498ff'} />
          </label>
          <label>
            Status
            <select name="status" defaultValue={project?.status}>
              {['Planning', 'In progress', 'On hold', 'Completed'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Start date
            <input
              name="startDate"
              type="date"
              defaultValue={inputDate(project?.startDate || null)}
            />
          </label>
          <label>
            Target date
            <input name="dueDate" type="date" defaultValue={inputDate(project?.dueDate || null)} />
          </label>
        </div>
        <fieldset>
          <legend>Project members</legend>
          <div className="checkbox-grid">
            {workspace.memberships.map((m) => (
              <label key={m.id} className="check-label">
                <input
                  type="checkbox"
                  checked={members.includes(m.id)}
                  onChange={(e) =>
                    setMembers(
                      e.target.checked ? [...members, m.id] : members.filter((id) => id !== m.id),
                    )
                  }
                />
                <Avatar person={m.user} />
                {m.user.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-actions">
          {project && (
            <>
              <button
                type="button"
                className="icon-button"
                aria-label={project.archived ? 'Restore project' : 'Archive project'}
                onClick={async () => {
                  await mutate({
                    action: 'archiveProject',
                    id: project.id,
                    archived: !project.archived,
                  });
                  onClose();
                }}
              >
                <Archive size={18} />
              </button>
              <button
                type="button"
                className="icon-button red"
                aria-label="Delete project"
                onClick={() => {
                  onClose();
                  confirm({
                    title: 'Delete this project?',
                    description: `“${project.name}” and all its tasks, comments, and checklist items will be permanently deleted.`,
                    run: () => mutate({ action: 'deleteProject', id: project.id }),
                  });
                }}
              >
                <Trash2 size={17} />
              </button>
            </>
          )}
          <button type="button" className="button outline" onClick={onClose}>
            Cancel
          </button>
          <Submit busy={busy}>
            {project ? 'Save changes' : 'Create project'}
            <ArrowRight size={16} />
          </Submit>
        </div>
      </form>
    </Modal>
  );
}

export function TaskModal({
  task,
  columnId,
  project,
  workspace,
  canManage,
  mutate,
  onClose,
  confirm,
}: {
  canManage: boolean;
  task?: Task;
  columnId: string;
  project: Project;
  workspace: Workspace;
  mutate: Mutate;
  onClose: () => void;
  confirm: Confirm;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!task);
  const [assignees, setAssignees] = useState(task?.assignments.map((a) => a.userId) || []);
  const [labels, setLabels] = useState(task?.labels.map((l) => l.labelId) || []);
  const [comment, setComment] = useState('');
  const [subtask, setSubtask] = useState('');
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState(task?.version);
  const [labelName, setLabelName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const commentRequest = useRef<{ body: string; id: string } | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await mutate({
        action: task ? 'editTask' : 'createTask',
        id: task?.id,
        projectId: project.id,
        version,
        title: f.get('title'),
        description: f.get('description'),
        columnId: f.get('columnId'),
        priority: f.get('priority'),
        dueDate: iso(f.get('dueDate')),
        assigneeIds: assignees,
        labelIds: labels,
      });
      toast.success(task ? 'Task updated.' : 'A little step forward. Task created.');
      onClose();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        task
          ? `FT–${task.id.slice(-4).toUpperCase()} · ${project.name}`
          : 'A little step toward something great.'
      }
      onClose={onClose}
      wide
    >
      {task && task.version !== version && editing && (
        <div role="alert" className="conflict-banner">
          This task changed in another session.{' '}
          <button
            onClick={() => {
              setEditing(false);
              setVersion(task.version);
            }}
          >
            Reload latest version
          </button>
        </div>
      )}
      {editing ? (
        <form className="form" onSubmit={save}>
          <label>
            Task title
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={task?.title}
              placeholder="What’s the next step?"
            />
          </label>
          <label>
            Description <small>Markdown supported. HTML is disabled.</small>
            <textarea
              name="description"
              rows={5}
              maxLength={20000}
              defaultValue={task?.description}
              placeholder="Add a little context, a clear goal, or a useful link…"
            />
          </label>
          <div className="form-row">
            <label>
              Status
              <select name="columnId" defaultValue={task?.columnId || columnId}>
                {project.columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                name="priority"
                aria-label="Priority"
                defaultValue={task?.priority || 'Medium'}
              >
                {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input name="dueDate" type="date" defaultValue={inputDate(task?.dueDate || null)} />
            </label>
          </div>
          <fieldset>
            <legend>Assignees</legend>
            <div className="checkbox-grid">
              {workspace.memberships.map((m) => (
                <label className="check-label" key={m.id}>
                  <input
                    type="checkbox"
                    checked={assignees.includes(m.userId)}
                    onChange={(e) =>
                      setAssignees(
                        e.target.checked
                          ? [...assignees, m.userId]
                          : assignees.filter((id) => id !== m.userId),
                      )
                    }
                  />
                  <Avatar person={m.user} />
                  {m.user.name}
                </label>
              ))}
            </div>
          </fieldset>
          {project.labels.length > 0 && (
            <fieldset>
              <legend>Labels</legend>
              <div className="checkbox-grid">
                {project.labels.map((l) => (
                  <label key={l.id} className="check-label">
                    <input
                      type="checkbox"
                      checked={labels.includes(l.id)}
                      onChange={(e) =>
                        setLabels(
                          e.target.checked ? [...labels, l.id] : labels.filter((id) => id !== l.id),
                        )
                      }
                    />
                    <span className="column-dot" style={{ background: l.color }} />
                    {l.name}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="button outline"
              onClick={() => (task ? setEditing(false) : onClose())}
            >
              Cancel
            </button>
            <Submit busy={busy}>
              {task ? 'Save changes' : 'Create task'}
              <ArrowRight size={16} />
            </Submit>
          </div>
        </form>
      ) : (
        task && (
          <div className="task-detail">
            <div className="detail-title">
              <h1>{task.title}</h1>
              <button
                className="button outline"
                onClick={() => {
                  setVersion(task.version);
                  setAssignees(task.assignments.map((a) => a.userId));
                  setLabels(task.labels.map((l) => l.labelId));
                  setEditing(true);
                }}
              >
                Edit task
              </button>
            </div>
            <div className="detail-properties">
              <span className="badge">
                <span className="status-dot" />
                {project.columns.find((c) => c.id === task.columnId)?.name}
              </span>
              <Priority value={task.priority} />
              <span>
                <CalendarDays size={14} />
                {date(task.dueDate) || 'No due date'}
              </span>
              {task.assignments.map((a) => {
                const p = workspace.memberships.find((m) => m.userId === a.userId)?.user;
                return p ? (
                  <span key={p.id}>
                    <Avatar person={p} />
                    {p.name}
                  </span>
                ) : null;
              })}
            </div>
            <div className="markdown">
              <ReactMarkdown>
                {task.description ||
                  'No description yet. Add a little context to help your team get started.'}
              </ReactMarkdown>
            </div>
            <section className="detail-section">
              <h3>
                <CheckCheck size={16} />
                Checklist{' '}
                <span className="count">
                  {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
                </span>
              </h3>
              {task.subtasks.map((s) => (
                <ChecklistItem
                  key={s.id}
                  item={s}
                  toggle={(done) => mutate({ action: 'subtask', taskId: task.id, id: s.id, done })}
                />
              ))}
              <form
                className="inline-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!subtask.trim()) return;
                  setBusy(true);
                  try {
                    await mutate({ action: 'subtask', taskId: task.id, title: subtask });
                    setSubtask('');
                  } catch {
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <input
                  aria-label="New checklist item"
                  value={subtask}
                  onChange={(e) => setSubtask(e.target.value)}
                  maxLength={160}
                  placeholder="Add a small step…"
                />
                <button
                  className="icon-button"
                  disabled={busy || !subtask.trim()}
                  aria-label="Add checklist item"
                >
                  <Plus size={16} />
                </button>
              </form>
            </section>
            <section className="detail-section">
              <h3>
                <Paperclip size={16} />
                Attachments <span className="count">{task.attachments.length}</span>
              </h3>
              {task.attachments.map((a) => (
                <a className="attachment" href={`/api/files/${a.id}`} key={a.id}>
                  <Paperclip size={15} />
                  {a.name}
                  <span>{Math.ceil(a.size / 1024)} KB</span>
                  <ArrowDown size={14} />
                </a>
              ))}
              <input
                ref={fileRef}
                type="file"
                hidden
                accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const f = new FormData();
                    f.append('file', file);
                    f.append('taskId', task.id);
                    f.append('workspaceId', workspace.id);
                    const r = await fetch('/api/files/upload', { method: 'POST', body: f });
                    const body = await r.json();
                    if (!r.ok) throw new Error(body.error);
                    await mutate({ action: 'readNotifications' });
                    toast.success('File attached securely.');
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setUploading(false);
                    if (fileRef.current) fileRef.current.value = '';
                  }
                }}
              />
              <button
                className="text-button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Plus size={14} />
                {uploading ? 'Uploading…' : 'Attach a file'}
                <small>Private · PDF, text, images · up to 5 MB</small>
              </button>
            </section>
            <section className="detail-section">
              <h3>
                <MessageSquare size={16} />
                Conversation <span className="count">{task.comments.length}</span>
              </h3>
              {task.comments.map((c) => (
                <div className="comment" key={c.id}>
                  <Avatar person={c.author} />
                  <div>
                    <div>
                      <strong>{c.author.name}</strong>
                      <small>
                        {date(c.createdAt)} ·{' '}
                        {new Date(c.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </small>
                    </div>
                    <p>{c.body}</p>
                  </div>
                </div>
              ))}
              <form
                className="comment-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    if (!commentRequest.current || commentRequest.current.body !== comment)
                      commentRequest.current = { body: comment, id: crypto.randomUUID() };
                    await mutate({
                      action: 'comment',
                      taskId: task.id,
                      body: comment,
                      requestId: commentRequest.current.id,
                    });
                    setComment('');
                    commentRequest.current = null;
                  } catch {
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <textarea
                  aria-label="Comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={5000}
                  required
                  placeholder="Add to the conversation…"
                  rows={2}
                />
                <Submit busy={busy}>
                  Comment <ArrowUpRight size={14} />
                </Submit>
              </form>
            </section>
            <section className="detail-section">
              <h3>
                <Activity size={16} />
                Task history
              </h3>
              {workspace.activities.filter((a) => a.taskId === task.id).length ? (
                workspace.activities
                  .filter((a) => a.taskId === task.id)
                  .map((a) => (
                    <p className="task-history" key={a.id}>
                      <strong>{a.actor.name}</strong> {a.text}
                      <small>{date(a.createdAt)}</small>
                    </p>
                  ))
              ) : (
                <p className="muted">New updates will appear here.</p>
              )}
            </section>
            <div className="detail-footer">
              <button
                className="text-button"
                onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/?task=${task.id}`);
                  toast.success('Task link copied. Workspace access is required.');
                }}
              >
                <Link2 size={15} />
                Copy task link
              </button>
              <button
                className="text-button red"
                onClick={() => {
                  onClose();
                  confirm({
                    title: 'Delete this task?',
                    description: `“${task.title}” and its comments, checklist, and attachment records will be permanently deleted.`,
                    run: () => mutate({ action: 'deleteTask', id: task.id, version: task.version }),
                  });
                }}
              >
                <Trash2 size={15} />
                Delete task
              </button>
            </div>
          </div>
        )
      )}
      {editing && canManage && (
        <div className="label-create">
          <input
            value={labelName}
            aria-label="New label name"
            onChange={(e) => setLabelName(e.target.value)}
            placeholder="New project label (admin)"
            maxLength={160}
          />
          <button
            className="text-button"
            disabled={!labelName.trim() || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await mutate({
                  action: 'label',
                  projectId: project.id,
                  name: labelName,
                  color: '#b7a6ff',
                });
                setLabelName('');
              } catch {
              } finally {
                setBusy(false);
              }
            }}
          >
            Add label
          </button>
        </div>
      )}
    </Modal>
  );
}

export function SettingsPanel({
  state,
  canManage,
  mutate,
  confirm,
}: {
  state: State;
  canManage: boolean;
  mutate: Mutate;
  confirm: Confirm;
}) {
  const w = state.workspace!;
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState('');
  const [team, setTeam] = useState<Workspace['teams'][number] | 'new' | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const owner = w.memberships.find((m) => m.userId === state.user.id)?.role === 'OWNER';
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GOOD TEAMS START WITH A GOOD SPACE</span>
          <h1>
            A space that feels like yours<span>.</span>
          </h1>
          <p>Your people, your settings, your way of working.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Workspace details</h2>
            <Settings size={17} />
          </div>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await mutate({
                  action: 'workspace',
                  name: new FormData(e.currentTarget).get('name'),
                });
                toast.success('Workspace updated.');
              } catch {
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Workspace name
              <input
                name="name"
                required
                maxLength={160}
                defaultValue={w.name}
                disabled={!canManage}
              />
            </label>
            <p className="fine">
              {w.demo
                ? 'This is a private demo workspace with fictional data.'
                : 'Only workspace owners and admins can change these settings.'}
            </p>
            {canManage && <Submit busy={busy}>Save changes</Submit>}
          </form>
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Invite your people</h2>
            <Users size={17} />
          </div>
          <div className="form">
            <p className="muted">
              Make good things happen together. Invitations expire after 7 days and can be used
              once.
            </p>
            {canManage ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    const r = await mutate<{ url: string }>({
                      action: 'invite',
                      role: new FormData(e.currentTarget).get('role'),
                    });
                    setInvite(r.url);
                  } catch {
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="inline-form">
                  <select name="role" aria-label="Invitation role">
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <Submit busy={busy}>
                    Create invite link <ArrowUpRight size={15} />
                  </Submit>
                </div>
              </form>
            ) : (
              <p className="fine">Ask an owner or admin for an invitation link.</p>
            )}
            {invite && (
              <div className="invite-result">
                <input aria-label="Invitation link" readOnly value={invite} />
                <button
                  className="icon-button"
                  aria-label="Copy invitation link"
                  onClick={async () => {
                    await navigator.clipboard.writeText(invite);
                    toast.success('Invitation copied.');
                  }}
                >
                  <Copy size={16} />
                </button>
              </div>
            )}
            <small className="fine">
              Local demo delivery: copy and share this secure link. No email provider is connected.
              Localhost links only work on this computer.
            </small>
          </div>
        </section>
      </div>
      <section className="panel members-panel">
        <div className="section-heading">
          <h2>
            Your people <span>{w.memberships.length}</span>
          </h2>
          <span className="fine">Workspace-wide project visibility</span>
        </div>
        {w.memberships.map((m) => (
          <div className="member-row" key={m.id}>
            <Avatar person={m.user} />
            <div>
              <strong>
                {m.user.name}
                {m.userId === state.user.id && <small> (you)</small>}
              </strong>
              <small>{m.user.email}</small>
            </div>
            {owner && m.role !== 'OWNER' ? (
              <select
                aria-label={`Role for ${m.user.name}`}
                value={m.role}
                onChange={(e) => {
                  const role = e.target.value;
                  confirm({
                    title: 'Change this teammate’s role?',
                    description: `${m.user.name} will become a ${role.toLowerCase()}. Admins can manage projects, teams, and invitations.`,
                    run: () => mutate({ action: 'role', id: m.id, role }),
                  });
                }}
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            ) : (
              <span className="badge">{m.role.toLowerCase()}</span>
            )}
          </div>
        ))}
      </section>
      <section className="panel members-panel">
        <div className="section-heading">
          <h2>
            Teams <span>{w.teams.length}</span>
          </h2>
          {canManage && (
            <button
              className="text-button"
              onClick={() => {
                setTeam('new');
                setMembers([]);
              }}
            >
              <Plus size={15} />
              New team
            </button>
          )}
        </div>
        {w.teams.map((t) => (
          <div className="member-row" key={t.id}>
            <span className="workspace-icon">
              <Users size={17} />
            </span>
            <div>
              <strong>{t.name}</strong>
              <small>{t.members.length} members</small>
            </div>
            {canManage && (
              <button
                className="button outline"
                onClick={() => {
                  setTeam(t);
                  setMembers(t.members.map((m) => m.membershipId));
                }}
              >
                Edit team
              </button>
            )}
          </div>
        ))}
      </section>
      {canManage && (
        <section className="panel members-panel">
          <div className="section-heading">
            <h2>Invitation links</h2>
            <Link2 size={17} />
          </div>
          {w.invitations.length ? (
            w.invitations.map((i) => (
              <div className="member-row" key={i.id}>
                <span className="workspace-icon">
                  <Link2 size={16} />
                </span>
                <div>
                  <strong>{i.role.toLowerCase()} invitation</strong>
                  <small>
                    {i.revoked
                      ? 'Revoked'
                      : i.usedAt
                        ? 'Accepted'
                        : new Date(i.expiresAt) < new Date()
                          ? 'Expired'
                          : `Expires ${date(i.expiresAt)}`}
                  </small>
                </div>
                {!i.revoked && !i.usedAt && (
                  <button
                    className="text-button red"
                    onClick={() =>
                      confirm({
                        title: 'Revoke this invitation?',
                        description: 'This link will stop working immediately.',
                        run: () => mutate({ action: 'revokeInvite', id: i.id }),
                      })
                    }
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="muted settings-empty">
              No invitations yet. Create one to welcome someone new.
            </p>
          )}
        </section>
      )}
      {team && (
        <Modal
          title={team === 'new' ? 'A new team. A shared direction.' : 'Fine-tune your team.'}
          onClose={() => setTeam(null)}
        >
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await mutate({
                  action: 'team',
                  id: team === 'new' ? undefined : team.id,
                  name: new FormData(e.currentTarget).get('name'),
                  memberIds: members,
                });
                setTeam(null);
              } catch {
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Team name
              <input
                name="name"
                required
                maxLength={160}
                defaultValue={team === 'new' ? '' : team.name}
              />
            </label>
            <fieldset>
              <legend>Team members</legend>
              {w.memberships.map((m) => (
                <label key={m.id} className="check-label">
                  <input
                    type="checkbox"
                    checked={members.includes(m.id)}
                    onChange={(e) =>
                      setMembers(
                        e.target.checked ? [...members, m.id] : members.filter((id) => id !== m.id),
                      )
                    }
                  />
                  <Avatar person={m.user} />
                  {m.user.name}
                </label>
              ))}
            </fieldset>
            <Submit busy={busy}>Save team</Submit>
          </form>
        </Modal>
      )}
    </>
  );
}

export function ChecklistItem({
  item,
  toggle,
}: {
  item: Task['subtasks'][number];
  toggle: (done: boolean) => Promise<unknown>;
}) {
  const [done, setDone] = useState(item.done);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDone(item.done));
    return () => cancelAnimationFrame(frame);
  }, [item.done]);
  return (
    <label className={`checklist-item ${done ? 'checked' : ''}`}>
      <input
        type="checkbox"
        checked={done}
        disabled={pending}
        onChange={async (e) => {
          const next = e.target.checked;
          setDone(next);
          setPending(true);
          try {
            await toggle(next);
          } catch {
            setDone(!next);
          } finally {
            setPending(false);
          }
        }}
      />
      <span>{item.title}</span>
    </label>
  );
}
