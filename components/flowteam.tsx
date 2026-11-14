'use client';
import { useState, useEffect, useRef, type FormEvent } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  ChevronRight,
  LayoutDashboard,
  Layers,
  CheckCheck,
  Inbox,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  LogOut,
  SlidersHorizontal,
  LayoutGrid,
  List,
  CalendarDays,
  MoreHorizontal,
  LoaderCircle,
  CheckCircle2,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { authClient, request } from '@/lib/client';
import { type State, type Project, type Task, type Column } from '@/lib/types';
import { icons, short, date } from '@/lib/presentation';
import {} from '@/lib/ui-types';
import { Mark, Avatar, Modal, Submit, Empty } from './ui';
import { BoardColumn } from './board';
import { Dashboard, ProjectGrid, ActivityList, TaskList, Calendar } from './views';
import { ProjectModal, TaskModal, SettingsPanel } from './forms';
import Link from 'next/link';
export default function FlowTeam({ inviteToken }: { inviteToken?: string }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 1000 }, mutations: { retry: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <App inviteToken={inviteToken} />
      <Toaster richColors position="bottom-right" />
    </QueryClientProvider>
  );
}

function App({ inviteToken }: { inviteToken?: string }) {
  const { data: session, isPending } = authClient.useSession();
  const [workspaceId, setWorkspaceId] = useState('');
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const t = localStorage.getItem('flowteam-theme') || 'dark';
    document.documentElement.dataset.theme = t;
    const frame = requestAnimationFrame(() => setTheme(t));
    return () => cancelAnimationFrame(frame);
  }, []);
  function toggleTheme() {
    const t = theme === 'dark' ? 'light' : 'dark';
    setTheme(t);
    document.documentElement.dataset.theme = t;
    localStorage.setItem('flowteam-theme', t);
  }
  const query = useQuery<State>({
    queryKey: ['state', workspaceId],
    queryFn: async () => {
      const r = await fetch(
        `/api/data${workspaceId ? '?workspace=' + encodeURIComponent(workspaceId) : ''}`,
      );
      if (!r.ok) throw new Error('Unable to load workspace. Please retry.');
      return r.json();
    },
    enabled: !!session,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
  if (isPending)
    return (
      <div className="boot">
        <Mark />
        <p>Finding your flow…</p>
      </div>
    );
  if (!session) return <Welcome invite={!!inviteToken} />;
  if (query.isPending)
    return (
      <div className="loading-shell">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    );
  if (query.isError)
    return (
      <main className="error-page">
        <h1>Your workspace is taking a moment.</h1>
        <p>{query.error.message}</p>
        <button className="button primary" onClick={() => query.refetch()}>
          Try again
        </button>
      </main>
    );
  const state = query.data;
  if (inviteToken)
    return (
      <Invite
        token={inviteToken}
        onDone={(id) => {
          setWorkspaceId(id);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  if (!state.workspace)
    return (
      <Onboarding
        onDone={(id) => {
          setWorkspaceId(id);
          query.refetch();
        }}
      />
    );
  return (
    <WorkspaceApp
      state={state}
      theme={theme}
      toggleTheme={toggleTheme}
      setWorkspaceId={setWorkspaceId}
      syncing={query.isFetching}
    />
  );
}

function Welcome({ invite }: { invite: boolean }) {
  const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function demo() {
    setBusy(true);
    setError('');
    try {
      const result = await authClient.signUp.email({
        name: 'Jordan Davis',
        email: `demo.${crypto.randomUUID()}@demo.invalid`,
        password: crypto.randomUUID() + crypto.randomUUID(),
      });
      if (result.error) throw new Error(result.error.message);
      await request({ action: 'bootstrap', name: 'Orbit Studio', demo: true });
      window.location.assign(new URL('/', window.location.origin).href);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    const result =
      mode === 'register'
        ? await authClient.signUp.email({
            name: String(f.get('name')),
            email: String(f.get('email')),
            password: String(f.get('password')),
          })
        : await authClient.signIn.email({
            email: String(f.get('email')),
            password: String(f.get('password')),
          });
    if (result.error) {
      setError(result.error.message || 'Unable to sign in.');
      setBusy(false);
    } else window.location.reload();
  }
  return (
    <div className="welcome">
      <nav>
        <Link className="brand" href="/">
          <Mark />
          FlowTeam<span className="brand-dot">®</span>
        </Link>
        <span className="welcome-nav">A little more clarity. A lot more flow.</span>
        <button className="button subtle" onClick={() => setMode('login')}>
          Log in <ArrowUpRight size={15} />
        </button>
      </nav>
      <div className="welcome-grid">
        <section>
          <div className="eyebrow">
            <span className="status-dot" /> MADE FOR THE WAY YOU WORK
          </div>
          <h1>
            Great work.
            <br />
            Better <span>together.</span>
          </h1>
          <p className="welcome-description">
            Bring your people, projects, and next big ideas into one beautifully focused space. Less
            busywork. More momentum.
          </p>
          <div className="welcome-actions">
            <button className="button primary large" onClick={() => setMode('register')}>
              Start your workspace <ArrowRight size={17} />
            </button>
            <button className="button large outline" onClick={demo} disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={17} /> : null}Explorar demo{' '}
              <ArrowUpRight size={17} />
            </button>
          </div>
          <p className="fine">No credit card. No setup. Just a little more flow.</p>
          <div className="welcome-proof">
            <div className="avatar-stack">
              {['Sofia Chen', 'Alex Morgan', 'James Wilson'].map((name, i) => (
                <Avatar key={name} person={{ id: String(i), name }} />
              ))}
            </div>
            <span>One team. A world of possibilities.</span>
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
        </section>
        <section className="product-preview">
          <div className="preview-top">
            <Mark />
            <span>Website redesign</span>
            <span className="live-pill">
              <span className="status-dot" /> In sync
            </span>
          </div>
          <div className="preview-heading">
            <span>BIG IDEAS, SMALL STEPS</span>
            <h2>
              Make room for
              <br />
              your best work.
            </h2>
          </div>
          <div className="preview-board">
            {['To explore', 'In the flow', 'Made it'].map((c, i) => (
              <div key={c}>
                <p>
                  <span className={`column-dot dot-${i % 4}`} />
                  {c}
                  <span className="count">{i === 0 ? 2 : 1}</span>
                </p>
                {(i === 0
                  ? ['Find the next big idea', 'Connect the dots']
                  : i === 1
                    ? ['Design something meaningful']
                    : ['Build a little momentum']
                ).map((t, j) => (
                  <div className={`preview-card pc-${i}`} key={t}>
                    <span className="tag">{['Research', 'Design', 'Milestone'][i]}</span>
                    <strong>{t}</strong>
                    <div>
                      <span>FT–{12 + i + j}</span>
                      <Avatar
                        person={{
                          id: String(i),
                          name: ['Alex Morgan', 'Sofia Chen', 'Jordan Davis'][i],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="preview-note">
            <CheckCircle2 size={18} />
            <div>
              <strong>A good day to move things forward.</strong>
              <span>Your team’s next chapter starts here.</span>
            </div>
            <span>↗</span>
          </div>
          <div className="preview-decoration" />
        </section>
      </div>
      <footer>
        <span>DESIGNED FOR FOCUS. BUILT FOR PEOPLE.</span>
        <span>Plan with intention. Create with confidence.</span>
      </footer>
      {mode !== 'welcome' && (
        <Modal
          title={mode === 'register' ? 'Your next chapter starts here.' : 'Welcome back.'}
          onClose={() => {
            setMode('welcome');
            setError('');
          }}
        >
          <form onSubmit={submit} className="form">
            <p className="muted">
              {invite
                ? 'Sign in or create an account to accept your invitation.'
                : 'A focused space for the work that matters.'}
            </p>
            {mode === 'register' && (
              <label>
                Your name
                <input
                  name="name"
                  required
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Jordan Davis"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@studio.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                aria-label="Password"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
              <small>At least 10 characters.</small>
            </label>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <Submit busy={busy}>
              {mode === 'register' ? 'Create account' : 'Log in'}
              <ArrowRight size={16} />
            </Submit>
            <button
              type="button"
              className="text-button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Invite({ token, onDone }: { token: string; onDone: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="onboarding">
      <Mark />
      <h1>Good work starts with good people.</h1>
      <p>You’ve been invited to a FlowTeam workspace.</p>
      <button
        className="button primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await request<{ id: string }>({ action: 'acceptInvite', token });
            onDone(r.id);
            window.location.assign(new URL('/', window.location.origin).href);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        Join workspace <ArrowRight size={17} />
      </button>
      {error && <p role="alert">{error}</p>}
      <Link href="/">Back to your workspaces</Link>
    </div>
  );
}

function Onboarding({ onDone }: { onDone: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <main className="onboarding">
      <Mark />
      <span className="eyebrow">YOUR SPACE TO DO GREAT THINGS</span>
      <h1>Let’s bring your team together.</h1>
      <p>Give your workspace a name. You can always change it later.</p>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await request<{ id: string }>({
              action: 'bootstrap',
              name: new FormData(e.currentTarget).get('name'),
              demo: false,
            });
            onDone(r.id);
          } catch (e) {
            toast.error((e as Error).message);
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
            placeholder="Your studio, team, or big idea"
          />
        </label>
        <Submit busy={busy}>
          Create workspace <ArrowRight size={16} />
        </Submit>
      </form>
    </main>
  );
}

function WorkspaceApp({
  state,
  theme,
  toggleTheme,
  setWorkspaceId,
  syncing,
}: {
  state: State;
  theme: string;
  toggleTheme: () => void;
  setWorkspaceId: (s: string) => void;
  syncing: boolean;
}) {
  const w = state.workspace!;
  const qc = useQueryClient();
  const [view, setView] = useState('dashboard');
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState('board');
  const [sidebar, setSidebar] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState(false);
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('');
  const [label, setLabel] = useState('');
  const [due, setDue] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [newTaskCol, setNewTaskCol] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState<Project | 'new' | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    run: () => Promise<unknown>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newColumn, setNewColumn] = useState<Column | 'new' | null>(null);
  const [newWorkspace, setNewWorkspace] = useState(false);
  const project = w.projects.find((p) => p.id === projectId) || w.projects.find((p) => !p.archived);
  const allTasks = w.projects.filter((p) => !p.archived).flatMap((p) => p.tasks);
  const currentTask = w.projects.flatMap((p) => p.tasks).find((t) => t.id === taskId);
  const taskProject = w.projects.find((p) => p.id === currentTask?.projectId);
  const role = w.memberships.find((m) => m.userId === state.user.id)?.role;
  const canManage = role === 'OWNER' || role === 'ADMIN';
  const mutate = async <T,>(body: Record<string, unknown>): Promise<T> => {
    try {
      const r = await request<T>({ ...body, workspaceId: w.id });
      await qc.invalidateQueries({ queryKey: ['state'] });
      return r;
    } catch (e) {
      toast.error((e as Error).message);
      throw e;
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    const id = new URLSearchParams(window.location.search).get('task');
    const frame = requestAnimationFrame(() => {
      if (id) setTaskId(id);
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handler);
    };
  }, []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const filtered = (tasks: Task[]) =>
    tasks.filter(
      (t) =>
        (!search || `${t.title} ${t.description}`.toLowerCase().includes(search.toLowerCase())) &&
        (!priority || t.priority === priority) &&
        (!assignee ||
          (assignee === 'unassigned'
            ? t.assignments.length === 0
            : t.assignments.some((a) => a.userId === assignee))) &&
        (!status || t.columnId === status) &&
        (!label || t.labels.some((l) => l.labelId === label)) &&
        (!due ||
          (due === 'none'
            ? !t.dueDate
            : due === 'overdue'
              ? !!t.dueDate &&
                new Date(t.dueDate) < new Date() &&
                !w.projects
                  .find((p) => p.id === t.projectId)
                  ?.columns.find((c) => c.id === t.columnId)?.done
              : !!t.dueDate && new Date(t.dueDate) <= new Date(Date.now() + 7 * 86400000))),
    );
  function navigate(v: string, id?: string) {
    setView(v);
    if (id) setProjectId(id);
    setSidebar(false);
    setSearch('');
    setStatus('');
    setLabel('');
  }
  async function dragEnd(e: DragEndEvent) {
    if (!e.over || !project) return;
    const task = project.tasks.find((t) => t.id === e.active.id);
    if (!task) return;
    const target = project.tasks.find((t) => t.id === e.over!.id);
    const columnId = target?.columnId || String(e.over.id);
    if (task.id === target?.id) return;
    const beforeId = target?.id;
    await qc.cancelQueries({ queryKey: ['state'] });
    const cache = qc.getQueriesData<State>({ queryKey: ['state'] });
    qc.setQueriesData<State>({ queryKey: ['state'] }, (old) => {
      if (!old?.workspace) return old;
      const columns = project.tasks.filter((t) => t.columnId === columnId && t.id !== task.id);
      const pos = target
        ? target.position - 0.1
        : Math.max(0, ...columns.map((t) => t.position)) + 1024;
      return {
        ...old,
        workspace: {
          ...old.workspace,
          projects: old.workspace.projects.map((p) =>
            p.id !== project.id
              ? p
              : {
                  ...p,
                  tasks: p.tasks
                    .map((t) => (t.id === task.id ? { ...t, columnId, position: pos } : t))
                    .sort((a, b) => a.position - b.position),
                },
          ),
        },
      };
    });
    try {
      await mutate({ action: 'moveTask', id: task.id, columnId, beforeId, version: task.version });
    } catch {
      for (const [key, value] of cache) qc.setQueryData(key, value);
      await qc.invalidateQueries({ queryKey: ['state'] });
    }
  }
  const navigation = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    {
      id: 'my-work',
      icon: CheckCheck,
      label: 'My work',
      count: allTasks.filter((t) => t.assignments.some((a) => a.userId === state.user.id)).length,
    },
    {
      id: 'inbox',
      icon: Inbox,
      label: 'Inbox',
      count: state.notifications?.filter((n) => !n.read).length,
    },
    { id: 'projects', icon: Layers, label: 'Projects' },
  ];
  const currentTitle =
    view === 'project'
      ? project?.name
      : view === 'my-work'
        ? 'My work'
        : view === 'inbox'
          ? 'Inbox'
          : view === 'settings'
            ? 'Workspace settings'
            : view === 'activity'
              ? 'Activity'
              : view === 'projects'
                ? 'All projects'
                : 'Workspace overview';
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {sidebar && <div className="sidebar-scrim" onClick={() => setSidebar(false)} />}
      <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
        <Link className="brand" href="/">
          <Mark />
          FlowTeam<span className="brand-dot">®</span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-icon">{short(w.name)}</span>
          <div>
            <select
              aria-label="Switch workspace"
              value={w.id}
              onChange={(e) => {
                setWorkspaceId(e.target.value);
                setProjectId('');
                setView('dashboard');
              }}
            >
              {state.workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
            <small>{w.demo ? 'Private demo workspace' : 'Your workspace'}</small>
          </div>
          <button
            className="icon-button"
            aria-label="Create workspace"
            onClick={() => setNewWorkspace(true)}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav">
          {navigation.map((n) => (
            <button
              key={n.id}
              className={view === n.id ? 'active' : ''}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={18} />
              {n.label}
              {!!n.count && <span className="nav-count">{n.count}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label projects-label">
          YOUR PROJECTS
          {canManage && (
            <button
              className="icon-button"
              aria-label="Create project"
              onClick={() => setProjectModal('new')}
            >
              <Plus size={15} />
            </button>
          )}
        </div>
        <nav className="project-nav">
          {w.projects
            .filter((p) => !p.archived)
            .map((p) => {
              const Icon = icons[p.icon] || Layers;
              return (
                <button
                  key={p.id}
                  className={view === 'project' && project?.id === p.id ? 'active' : ''}
                  onClick={() => navigate('project', p.id)}
                >
                  <Icon size={16} style={{ color: p.color }} />
                  <span>{p.name}</span>
                </button>
              );
            })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-spark">✧</span>
            <strong>A little space. A lot of potential.</strong>
            <p>
              {w.demo
                ? 'Make yourself at home. This demo is just for you.'
                : 'Turn your next big idea into your team’s best work.'}
            </p>
            <button onClick={() => (canManage ? setProjectModal('new') : navigate('my-work'))}>
              {canManage ? 'Create something new' : 'Find your next task'}
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className={`sidebar-setting ${view === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
          >
            <Settings size={17} />
            Settings & members
          </button>
          <div className="profile">
            <Avatar person={state.user} />
            <div>
              <strong>{state.user.name}</strong>
              <small>{role?.toLowerCase()}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Log out"
              onClick={async () => {
                await authClient.signOut();
                qc.clear();
                window.location.assign(new URL('/', window.location.origin).href);
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setSidebar(!sidebar)}
            >
              {sidebar ? <PanelLeftClose size={19} /> : <PanelLeft size={19} />}
            </button>
            <span>{w.name}</span>
            <ChevronRight size={14} />
            <strong>{currentTitle}</strong>
          </div>
          <div className="topbar-actions">
            <span className="sync">
              <span className={`status-dot ${syncing ? 'syncing' : ''}`} />
              {syncing ? 'Syncing' : 'All changes saved'}
            </span>
            <button className="icon-button" aria-label="Toggle color theme" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button notification-button"
              aria-label="View notifications"
              onClick={() => navigate('inbox')}
            >
              <Inbox size={18} />
              {state.notifications?.some((n) => !n.read) && <i />}
            </button>
            <Avatar person={state.user} />
          </div>
        </header>
        {w.demo && (
          <div className="demo-bar">
            <span>
              <span className="demo-badge">DEMO</span>Your own little corner of FlowTeam. Explore
              freely — these fictional data are private to your session.
            </span>
            <span>
              No signup. No limits on curiosity. <ArrowUpRight size={13} />
            </span>
          </div>
        )}
        <main id="main" className="main-content">
          {view === 'dashboard' && (
            <Dashboard
              state={state}
              navigate={navigate}
              openTask={setTaskId}
              newProject={() => setProjectModal('new')}
              canManage={canManage}
            />
          )}
          {view === 'projects' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">THE BIG PICTURE</span>
                  <h1>
                    Space for your next big idea<span>.</span>
                  </h1>
                  <p>Every project, moving in the right direction.</p>
                </div>
                {canManage && (
                  <button className="button primary" onClick={() => setProjectModal('new')}>
                    <Plus size={16} />
                    New project
                  </button>
                )}
              </div>
              <ProjectGrid workspace={w} navigate={navigate} includeArchived />
            </>
          )}
          {view === 'project' && project && (
            <>
              <div className="project-heading">
                <div
                  className="project-icon"
                  style={{ color: project.color, background: project.color + '18' }}
                >
                  {(() => {
                    const Icon = icons[project.icon] || Layers;
                    return <Icon size={26} />;
                  })()}
                </div>
                <div>
                  <div className="heading-with-badge">
                    <h1>{project.name}</h1>
                    <span className="badge">
                      <span className="status-dot" />
                      {project.archived ? 'Archived' : project.status}
                    </span>
                  </div>
                  <p>{project.description || 'A space for your team’s next big idea.'}</p>
                </div>
                {canManage && (
                  <button
                    className="icon-button"
                    aria-label="Edit project"
                    onClick={() => setProjectModal(project)}
                  >
                    <MoreHorizontal size={22} />
                  </button>
                )}
              </div>
              <div className="project-meta">
                <div className="avatar-stack">
                  {w.memberships
                    .filter((m) => project.members.some((pm) => pm.membershipId === m.id))
                    .slice(0, 5)
                    .map((m) => (
                      <Avatar key={m.id} person={m.user} />
                    ))}
                </div>
                <span>{project.members.length} members</span>
                <span className="meta-divider" />
                <CalendarDays size={14} />
                <span>
                  {project.dueDate ? `Target ${date(project.dueDate)}` : 'No target date'}
                </span>
                <div className="project-meta-right">
                  <span className="status-dot" />
                  {
                    project.tasks.filter(
                      (t) => project.columns.find((c) => c.id === t.columnId)?.done,
                    ).length
                  }{' '}
                  of {project.tasks.length} completed
                </div>
              </div>
              <div className="board-toolbar">
                <div className="view-tabs">
                  <button
                    className={mode === 'board' ? 'active' : ''}
                    onClick={() => setMode('board')}
                  >
                    <LayoutGrid size={15} />
                    Board
                  </button>
                  <button
                    className={mode === 'list' ? 'active' : ''}
                    onClick={() => setMode('list')}
                  >
                    <List size={16} />
                    List
                  </button>
                  <button
                    className={mode === 'calendar' ? 'active' : ''}
                    onClick={() => setMode('calendar')}
                  >
                    <CalendarDays size={15} />
                    Calendar
                  </button>
                </div>
                <div className="board-controls">
                  <label className="search">
                    <Search size={15} />
                    <input
                      ref={searchRef}
                      aria-label="Search tasks"
                      placeholder="Search tasks…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <kbd>⌘ K</kbd>
                  </label>
                  <button
                    className={`button subtle ${filters ? 'selected' : ''}`}
                    onClick={() => setFilters(!filters)}
                  >
                    <SlidersHorizontal size={15} />
                    Filter
                    {[priority, assignee, status, label, due].filter(Boolean).length > 0 && (
                      <span className="count">
                        {[priority, assignee, status, label, due].filter(Boolean).length}
                      </span>
                    )}
                  </button>
                  <button
                    className="button primary"
                    onClick={() => setNewTaskCol(project.columns[0]?.id || null)}
                    disabled={!project.columns.length}
                  >
                    <Plus size={16} />
                    New task
                  </button>
                </div>
              </div>
              {filters && (
                <div className="filters">
                  <select
                    aria-label="Filter priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="">All priorities</option>
                    {['Urgent', 'High', 'Medium', 'Low'].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter assignee"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">All assignees</option>
                    <option value="unassigned">Unassigned</option>
                    {w.memberships.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {project.columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  >
                    <option value="">All labels</option>
                    {project.labels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter due date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  >
                    <option value="">Any date</option>
                    <option value="overdue">Overdue</option>
                    <option value="week">Due within 7 days</option>
                    <option value="none">No due date</option>
                  </select>
                  <button
                    className="text-button"
                    onClick={() => {
                      setPriority('');
                      setAssignee('');
                      setStatus('');
                      setLabel('');
                      setDue('');
                      setSearch('');
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              {mode === 'board' ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={(args) => {
                    const hits = pointerWithin(args);
                    return hits.length ? hits : closestCorners(args);
                  }}
                  onDragEnd={dragEnd}
                >
                  <div className="kanban">
                    {project.columns.map((c, i) => (
                      <BoardColumn
                        key={c.id}
                        column={c}
                        index={i}
                        tasks={filtered(project.tasks).filter((t) => t.columnId === c.id)}
                        project={project}
                        workspace={w}
                        openTask={setTaskId}
                        addTask={() => setNewTaskCol(c.id)}
                        editColumn={canManage ? () => setNewColumn(c) : undefined}
                      />
                    ))}
                    {canManage && (
                      <button className="add-column" onClick={() => setNewColumn('new')}>
                        <Plus size={17} />
                        Add column
                      </button>
                    )}
                  </div>
                </DndContext>
              ) : mode === 'list' ? (
                <TaskList tasks={filtered(project.tasks)} workspace={w} openTask={setTaskId} />
              ) : (
                <Calendar tasks={filtered(project.tasks)} openTask={setTaskId} />
              )}
              <div className="board-footer">
                <span>
                  <span className="status-dot" /> Live sync every 3 seconds
                </span>
                <span>{filtered(project.tasks).length} tasks · Drag to find your flow</span>
              </div>
            </>
          )}
          {view === 'project' && !project && (
            <Empty
              icon={Layers}
              title="Your first project starts here."
              text="Create a project to give your ideas a little direction."
            />
          )}
          {view === 'my-work' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A LITTLE FOCUS GOES A LONG WAY</span>
                  <h1>
                    Your work, in one place<span>.</span>
                  </h1>
                  <p>A clear view of what’s next for you.</p>
                </div>
                <Avatar person={state.user} size="large" />
              </div>
              <TaskList
                tasks={allTasks.filter((t) =>
                  t.assignments.some((a) => a.userId === state.user.id),
                )}
                workspace={w}
                openTask={setTaskId}
              />
            </>
          )}
          {view === 'inbox' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOU’RE IN THE LOOP</span>
                  <h1>
                    A little heads-up<span>.</span>
                  </h1>
                  <p>Updates that matter, without the noise.</p>
                </div>
                <button
                  className="button outline"
                  onClick={() => void mutate({ action: 'readNotifications' }).catch(() => {})}
                >
                  <CheckCheck size={16} />
                  Mark all as read
                </button>
              </div>
              <div className="notification-list">
                {state.notifications?.length ? (
                  state.notifications.map((n) => (
                    <div className={`notification ${n.read ? '' : 'unread'}`} key={n.id}>
                      <span className="notification-icon">
                        <Inbox size={18} />
                      </span>
                      <div>
                        <p>{n.text}</p>
                        <small>{date(n.createdAt)}</small>
                      </div>
                      {!n.read && <span className="status-dot" />}
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={Inbox}
                    title="All caught up."
                    text="You’ll find mentions, assignments, and team updates here."
                  />
                )}
              </div>
            </>
          )}
          {view === 'activity' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">MOMENTUM, AS IT HAPPENS</span>
                  <h1>
                    The team’s latest moves<span>.</span>
                  </h1>
                </div>
              </div>
              <ActivityList workspace={w} openTask={setTaskId} />
            </>
          )}
          {view === 'settings' && (
            <SettingsPanel
              state={state}
              canManage={canManage}
              mutate={mutate}
              confirm={setConfirm}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>
            <Mark />A little more flow.
          </span>
          <span>
            Made for meaningful work <span className="footer-star">✧</span>
          </span>
        </footer>
      </div>
      {projectModal && (
        <ProjectModal
          workspace={w}
          project={projectModal === 'new' ? undefined : projectModal}
          onClose={() => setProjectModal(null)}
          mutate={mutate}
          onCreated={(id) => {
            setProjectId(id);
            setView('project');
          }}
          confirm={setConfirm}
        />
      )}
      {(newTaskCol || currentTask) && (currentTask ? taskProject : project) && (
        <TaskModal
          key={currentTask?.id || 'new'}
          task={currentTask}
          columnId={newTaskCol || currentTask!.columnId}
          project={(currentTask ? taskProject : project)!}
          workspace={w}
          canManage={canManage}
          mutate={mutate}
          onClose={() => {
            setTaskId(null);
            setNewTaskCol(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('task');
            window.history.replaceState({}, '', url);
          }}
          confirm={setConfirm}
        />
      )}
      {confirm && (
        <Modal title={confirm.title} onClose={() => !busy && setConfirm(null)}>
          <div className="form">
            <p className="muted">{confirm.description}</p>
            <div className="form-actions">
              <button className="button outline" disabled={busy} onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await confirm.run();
                    setConfirm(null);
                    toast.success('Done.');
                  } catch {
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {newColumn && project && (
        <Modal
          title={newColumn === 'new' ? 'A new stage for your work.' : 'Fine-tune this stage.'}
          onClose={() => setNewColumn(null)}
        >
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              try {
                await mutate({
                  action: newColumn === 'new' ? 'createColumn' : 'editColumn',
                  id: newColumn === 'new' ? undefined : newColumn.id,
                  projectId: project.id,
                  name: f.get('name'),
                  done: f.get('done') === 'on',
                });
                setNewColumn(null);
              } catch {
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Column name
              <input
                name="name"
                required
                maxLength={160}
                defaultValue={newColumn === 'new' ? '' : newColumn.name}
                placeholder="e.g. Ready for launch"
              />
            </label>
            {newColumn !== 'new' && (
              <label className="check-label">
                <input type="checkbox" name="done" defaultChecked={newColumn.done} />
                Tasks in this column count as completed
              </label>
            )}
            <Submit busy={busy}>{newColumn === 'new' ? 'Add column' : 'Save column'}</Submit>
          </form>
        </Modal>
      )}
      {newWorkspace && (
        <Modal title="Make room for something new." onClose={() => setNewWorkspace(false)}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const r = await mutate<{ id: string }>({
                  action: 'bootstrap',
                  name: new FormData(e.currentTarget).get('name'),
                  demo: false,
                });
                setWorkspaceId(r.id);
                setNewWorkspace(false);
                navigate('dashboard');
              } catch {
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Workspace name
              <input name="name" required maxLength={160} />
            </label>
            <Submit busy={busy}>Create workspace</Submit>
          </form>
        </Modal>
      )}
    </div>
  );
}
