'use client';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  CheckCheck,
  CalendarDays,
  MessageSquare,
  Paperclip,
  MoreHorizontal,
} from 'lucide-react';
import { type Workspace, type Project, type Task, type Column } from '@/lib/types';
import { date } from '@/lib/presentation';
import { Avatar, Priority } from './ui';
export function BoardColumn({
  column,
  index,
  tasks,
  project,
  workspace,
  openTask,
  addTask,
  editColumn,
}: {
  column: Column;
  index: number;
  tasks: Task[];
  project: Project;
  workspace: Workspace;
  openTask: (id: string) => void;
  addTask: () => void;
  editColumn?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <section
      ref={setNodeRef}
      className={`board-column ${isOver ? 'drag-over' : ''}`}
      aria-label={column.name}
    >
      <div className="column-heading">
        <span className={`column-dot dot-${column.done ? 3 : index % 4}`} />
        <h2>{column.name}</h2>
        <span className="count">{tasks.length}</span>
        <div>
          {editColumn && (
            <button
              className="icon-button"
              aria-label={`Edit ${column.name} column`}
              onClick={editColumn}
            >
              <MoreHorizontal size={16} />
            </button>
          )}
          <button
            className="icon-button"
            aria-label={`Add task to ${column.name}`}
            onClick={addTask}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="column-cards">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              project={project}
              workspace={workspace}
              open={() => openTask(t.id)}
            />
          ))}
          {!tasks.length && <div className="column-empty">A little room for what’s next.</div>}
        </div>
      </SortableContext>
      <button className="add-task" onClick={addTask}>
        <Plus size={15} />
        Add task
      </button>
    </section>
  );
}

export function TaskCard({
  task: t,
  project,
  workspace,
  open,
}: {
  task: Task;
  project: Project;
  workspace: Workspace;
  open: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: t.id,
  });
  const completed = t.subtasks.filter((s) => s.done).length;
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
    >
      <div className="card-top">
        <span className="task-ref">FT–{t.id.slice(-4).toUpperCase()}</span>
        <button
          className="drag-handle icon-button"
          aria-label={`Move ${t.title}`}
          {...attributes}
          {...listeners}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
      <button className="task-title" onClick={open}>
        {t.title}
      </button>
      <div className="task-tags">
        {t.labels.map((l) => {
          const label = project.labels.find((p) => p.id === l.labelId);
          return label ? (
            <span
              key={l.labelId}
              className="tag"
              style={{ color: label.color, background: label.color + '16' }}
            >
              {label.name}
            </span>
          ) : null;
        })}
        <Priority value={t.priority} />
      </div>
      {t.subtasks.length > 0 && (
        <div className="checklist-progress">
          <span>
            <CheckCheck size={13} />
            {completed}/{t.subtasks.length}
          </span>
          <div>
            <i style={{ width: `${(completed / t.subtasks.length) * 100}%` }} />
          </div>
        </div>
      )}
      <div className="card-footer">
        <span
          className={
            t.dueDate &&
            new Date(t.dueDate) < new Date() &&
            !project.columns.find((c) => c.id === t.columnId)?.done
              ? 'overdue'
              : ''
          }
        >
          <CalendarDays size={12} />
          {date(t.dueDate) || 'No date'}
        </span>
        <div>
          {t.comments.length > 0 && (
            <span>
              <MessageSquare size={12} />
              {t.comments.length}
            </span>
          )}
          {t.attachments.length > 0 && (
            <span>
              <Paperclip size={12} />
              {t.attachments.length}
            </span>
          )}
          <div className="avatar-stack">
            {t.assignments.slice(0, 2).map((a) => {
              const p = workspace.memberships.find((m) => m.userId === a.userId)?.user;
              return p ? <Avatar key={p.id} person={p} /> : null;
            })}
          </div>
        </div>
      </div>
    </article>
  );
}
