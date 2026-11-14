export type Person = { id: string; name: string; email: string };
export type Member = {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: Person;
};
export type Task = {
  id: string;
  title: string;
  description: string;
  priority: string;
  columnId: string;
  projectId: string;
  position: number;
  version: number;
  dueDate: string | null;
  assignments: { userId: string }[];
  labels: { labelId: string }[];
  comments: { id: string; body: string; createdAt: string; author: { id: string; name: string } }[];
  subtasks: { id: string; title: string; done: boolean }[];
  attachments: { id: string; name: string; size: number }[];
};
export type Column = { id: string; name: string; position: number; done: boolean };
export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  status: string;
  archived: boolean;
  startDate: string | null;
  dueDate: string | null;
  columns: Column[];
  tasks: Task[];
  labels: { id: string; name: string; color: string }[];
  members: { membershipId: string }[];
};
export type Workspace = {
  id: string;
  name: string;
  demo: boolean;
  memberships: Member[];
  projects: Project[];
  teams: { id: string; name: string; members: { membershipId: string }[] }[];
  invitations: {
    id: string;
    role: string;
    expiresAt: string;
    revoked: boolean;
    usedAt: string | null;
  }[];
  activities: {
    id: string;
    text: string;
    taskId: string | null;
    createdAt: string;
    actor: { id: string; name: string };
  }[];
};
export type State = {
  user: Person;
  workspace: Workspace | null;
  workspaces: { id: string; name: string; demo: boolean; role: string }[];
  notifications: { id: string; text: string; read: boolean; createdAt: string }[];
};
