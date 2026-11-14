import { db } from './db';
import { ApiError, canManage } from './validation';
import { createHash } from 'node:crypto';
export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export async function membership(userId: string, workspaceId: string) {
  const m = await db.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!m) throw new ApiError(404, 'Workspace not found.');
  return m;
}
export async function manage(userId: string, workspaceId: string) {
  const m = await membership(userId, workspaceId);
  if (!canManage(m.role)) throw new ApiError(403, 'An owner or admin role is required.');
  return m;
}
export async function projectAccess(userId: string, workspaceId: string, projectId: string) {
  await membership(userId, workspaceId);
  const p = await db.project.findFirst({ where: { id: projectId, workspaceId } });
  if (!p) throw new ApiError(404, 'Project not found.');
  return p;
}
export async function taskAccess(userId: string, workspaceId: string, id: string) {
  await membership(userId, workspaceId);
  const t = await db.task.findFirst({ where: { id, project: { workspaceId } } });
  if (!t) throw new ApiError(404, 'Task not found.');
  return t;
}
export async function limit(key: string, max = 80, window = 60000) {
  const now = new Date();
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" ("key","count","resetAt") VALUES (${key},1,${new Date(now.getTime() + window)}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count"+1 END, "resetAt"=CASE WHEN "RateLimit"."resetAt" < ${now} THEN ${new Date(now.getTime() + window)} ELSE "RateLimit"."resetAt" END RETURNING "count"`;
  if (rows[0].count > max) throw new ApiError(429, 'Too many requests. Please try again shortly.');
}
