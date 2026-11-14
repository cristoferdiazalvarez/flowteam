import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ApiError, taskInput, projectInput, title, midpoint } from '@/lib/validation';
import { membership, manage, projectAccess, taskAccess, limit, tokenHash } from '@/lib/service';
import { bootstrap } from '@/lib/demo';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
export const dynamic = 'force-dynamic';
async function user(req: NextRequest) {
  const s = await auth.api.getSession({ headers: req.headers });
  if (!s) throw new ApiError(401, 'Please sign in.');
  return s.user;
}
function fail(e: unknown) {
  if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof z.ZodError)
    return NextResponse.json({ error: e.issues.map((i) => i.message).join('. ') }, { status: 400 });
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2034')
      return NextResponse.json(
        { error: 'Another teammate changed this item. Refresh and retry.' },
        { status: 409 },
      );
    if (e.code === 'P2002')
      return NextResponse.json({ error: 'This item already exists.' }, { status: 409 });
  }
  console.error(e);
  return NextResponse.json({ error: 'Something went wrong. Please retry.' }, { status: 500 });
}
export async function GET(req: NextRequest) {
  try {
    const u = await user(req);
    const memberships = await db.membership.findMany({
      where: { userId: u.id },
      include: { workspace: true },
    });
    const w = req.nextUrl.searchParams.get('workspace') || memberships[0]?.workspaceId;
    if (!w) return NextResponse.json({ user: u, workspaces: [], workspace: null });
    await membership(u.id, w);
    const workspace = await db.workspace.findUnique({
      where: { id: w },
      include: {
        memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
        teams: { include: { members: true } },
        invitations: {
          select: { id: true, role: true, expiresAt: true, revoked: true, usedAt: true },
        },
        projects: {
          orderBy: { createdAt: 'asc' },
          include: {
            members: true,
            columns: { orderBy: { position: 'asc' } },
            labels: true,
            tasks: {
              orderBy: [{ position: 'asc' }, { id: 'asc' }],
              include: {
                assignments: true,
                labels: true,
                subtasks: true,
                attachments: { select: { id: true, name: true, size: true } },
                comments: {
                  orderBy: { createdAt: 'asc' },
                  include: { author: { select: { id: true, name: true } } },
                },
              },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 40,
          include: { actor: { select: { id: true, name: true } } },
        },
      },
    });
    const notifications = await db.notification.findMany({
      where: { workspaceId: w, userId: u.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return NextResponse.json(
      {
        user: u,
        workspaces: memberships.map((m) => ({ ...m.workspace, role: m.role })),
        workspace,
        notifications,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    if (origin !== new URL(process.env.BETTER_AUTH_URL || req.url).origin)
      throw new ApiError(403, 'Invalid request origin.');
    const u = await user(req);
    await limit(`mutation:${u.id}`);
    const b = await req.json();
    const action = z.string().parse(b.action);
    if (action === 'bootstrap') {
      await limit(`bootstrap:${u.id}`, 5, 86400000);
      const w = await bootstrap(u.id, title.parse(b.name), z.boolean().parse(b.demo ?? false));
      return NextResponse.json(w);
    }
    if (action === 'acceptInvite') {
      const hash = tokenHash(z.string().min(32).max(128).parse(b.token));
      const result = await db.$transaction(async (tx) => {
        const inv = await tx.invitation.findUnique({ where: { tokenHash: hash } });
        if (!inv || inv.revoked || inv.usedAt || inv.expiresAt < new Date())
          throw new ApiError(410, 'This invitation has expired or has already been used.');
        const claimed = await tx.invitation.updateMany({
          where: { id: inv.id, revoked: false, usedAt: null, expiresAt: { gt: new Date() } },
          data: { usedAt: new Date() },
        });
        if (!claimed.count) throw new ApiError(409, 'Invitation was already used.');
        await tx.membership.upsert({
          where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId: u.id } },
          create: { workspaceId: inv.workspaceId, userId: u.id, role: inv.role },
          update: {},
        });
        return { id: inv.workspaceId };
      });
      return NextResponse.json(result);
    }
    const w = z.string().min(1).parse(b.workspaceId);
    await membership(u.id, w);
    const result = await (async () => {
      if (action === 'createProject') {
        await manage(u.id, w);
        const p = projectInput.parse(b);
        const members = await db.membership.findMany({
          where: { id: { in: p.memberIds }, workspaceId: w },
        });
        if (members.length !== p.memberIds.length)
          throw new ApiError(400, 'Invalid project member.');
        const { memberIds, ...data } = p;
        void memberIds;
        return db.project.create({
          data: {
            ...data,
            workspaceId: w,
            members: { create: members.map((m) => ({ membershipId: m.id })) },
            columns: {
              create: [
                { name: 'Backlog', position: 0 },
                { name: 'In progress', position: 1 },
                { name: 'In review', position: 2 },
                { name: 'Done', position: 3, done: true },
              ],
            },
          },
        });
      }
      if (action === 'editProject' || action === 'deleteProject' || action === 'archiveProject') {
        await manage(u.id, w);
        await projectAccess(u.id, w, z.string().parse(b.id));
        if (action === 'deleteProject')
          return db.$transaction(async (tx) => {
            await tx.task.deleteMany({ where: { projectId: b.id } });
            return tx.project.delete({ where: { id: b.id } });
          });
        if (action === 'archiveProject')
          return db.project.update({
            where: { id: b.id },
            data: { archived: z.boolean().parse(b.archived) },
          });
        const p = projectInput.parse(b);
        const members = await db.membership.findMany({
          where: { id: { in: p.memberIds }, workspaceId: w },
        });
        if (members.length !== p.memberIds.length)
          throw new ApiError(400, 'Invalid project member.');
        const { memberIds, ...data } = p;
        void memberIds;
        return db.project.update({
          where: { id: b.id },
          data: {
            ...data,
            members: { deleteMany: {}, create: members.map((m) => ({ membershipId: m.id })) },
          },
        });
      }
      if (action === 'createColumn' || action === 'editColumn') {
        await manage(u.id, w);
        await projectAccess(u.id, w, z.string().parse(b.projectId));
        const name = title.parse(b.name);
        if (action === 'editColumn') {
          const c = await db.column.findFirst({ where: { id: b.id, projectId: b.projectId } });
          if (!c) throw new ApiError(404, 'Column not found.');
          return db.column.update({
            where: { id: c.id },
            data: { name, done: z.boolean().parse(b.done) },
          });
        }
        return db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Project" WHERE id=${b.projectId} FOR UPDATE`;
          const last = await tx.column.aggregate({
            where: { projectId: b.projectId },
            _max: { position: true },
          });
          return tx.column.create({
            data: {
              projectId: b.projectId,
              name,
              done: false,
              position: (last._max.position ?? -1) + 1,
            },
          });
        });
      }
      if (action === 'createTask' || action === 'editTask') {
        const p = taskInput.parse(b);
        let projectId: string;
        if (action === 'createTask') {
          projectId = z.string().parse(b.projectId);
          await projectAccess(u.id, w, projectId);
        } else {
          projectId = (await taskAccess(u.id, w, z.string().parse(b.id))).projectId;
        }
        const col = await db.column.findFirst({ where: { id: p.columnId, projectId } });
        if (!col) throw new ApiError(400, 'Invalid column.');
        const assigned = await db.membership.findMany({
          where: { workspaceId: w, userId: { in: p.assigneeIds } },
        });
        const labels = await db.label.findMany({ where: { projectId, id: { in: p.labelIds } } });
        if (assigned.length !== p.assigneeIds.length || labels.length !== p.labelIds.length)
          throw new ApiError(400, 'Invalid assignee or label.');
        return db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Project" WHERE id=${projectId} FOR UPDATE`;
          const { assigneeIds, labelIds, ...data } = p;
          let id = b.id as string;
          if (action === 'editTask') {
            const version = z.number().int().positive().parse(b.version);
            const updated = await tx.task.updateMany({
              where: { id, version },
              data: { ...data, version: { increment: 1 } },
            });
            if (!updated.count)
              throw new ApiError(
                409,
                'This task changed in another session. Reload the task before saving.',
              );
            await tx.assignment.deleteMany({ where: { taskId: id } });
            await tx.taskLabel.deleteMany({ where: { taskId: id } });
          } else {
            const max = await tx.task.aggregate({
              where: { columnId: p.columnId },
              _max: { position: true },
            });
            id = (
              await tx.task.create({
                data: {
                  ...data,
                  projectId,
                  createdById: u.id,
                  position: (max._max.position ?? 0) + 1024,
                },
              })
            ).id;
          }
          await tx.assignment.createMany({
            data: assigneeIds.map((userId) => ({ taskId: id, userId })),
          });
          await tx.taskLabel.createMany({
            data: labelIds.map((labelId) => ({ taskId: id, labelId })),
          });
          await tx.activity.create({
            data: {
              workspaceId: w,
              actorId: u.id,
              taskId: id,
              text: `${action === 'createTask' ? 'created' : 'updated'} “${p.title}”`,
            },
          });
          await tx.notification.createMany({
            data: assigneeIds
              .filter((a) => a !== u.id)
              .map((userId) => ({
                workspaceId: w,
                userId,
                text: `${u.name} updated “${p.title}”`,
              })),
          });
          return { id };
        });
      }
      if (action === 'moveTask') {
        const t = await taskAccess(u.id, w, z.string().parse(b.id));
        const col = await db.column.findFirst({
          where: { id: z.string().parse(b.columnId), projectId: t.projectId },
        });
        if (!col) throw new ApiError(400, 'Invalid target column.');
        const version = z.number().int().positive().parse(b.version);
        return db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Project" WHERE id=${t.projectId} FOR UPDATE`;
          const ordered = await tx.task.findMany({
            where: { columnId: col.id, id: { not: t.id } },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
          });
          const index = b.beforeId ? ordered.findIndex((x) => x.id === b.beforeId) : ordered.length;
          if (index < 0) throw new ApiError(409, 'Board order changed. Retry.');
          const pos = midpoint(ordered[index - 1]?.position, ordered[index]?.position);
          const r = await tx.task.updateMany({
            where: { id: t.id, version },
            data: { columnId: col.id, position: pos, version: { increment: 1 } },
          });
          if (!r.count) throw new ApiError(409, 'Task changed. Board refreshed; please retry.');
          // Rebase under the same project lock, retaining deterministic order and numeric precision.
          const all = await tx.task.findMany({
            where: { columnId: col.id },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
          });
          for (const [i, card] of all.entries())
            await tx.task.update({ where: { id: card.id }, data: { position: (i + 1) * 1024 } });
          await tx.activity.create({
            data: {
              workspaceId: w,
              actorId: u.id,
              taskId: t.id,
              text: `moved “${t.title}” to ${col.name}`,
            },
          });
          return { id: t.id };
        });
      }
      if (action === 'deleteTask') {
        const t = await taskAccess(u.id, w, z.string().parse(b.id));
        return db.$transaction(async (tx) => {
          const r = await tx.task.deleteMany({
            where: { id: t.id, version: z.number().int().positive().parse(b.version) },
          });
          if (!r.count) throw new ApiError(409, 'Task changed. Reload before deleting.');
          await tx.activity.create({
            data: { workspaceId: w, actorId: u.id, text: `deleted “${t.title}”` },
          });
          return { ok: true };
        });
      }
      if (action === 'comment') {
        const t = await taskAccess(u.id, w, z.string().parse(b.taskId));
        const body = z.string().trim().min(1).max(5000).parse(b.body);
        const id = z.string().uuid().parse(b.requestId);
        return db.$transaction(async (tx) => {
          const existing = await tx.comment.findUnique({ where: { id } });
          if (existing) {
            if (existing.taskId !== t.id || existing.authorId !== u.id)
              throw new ApiError(409, 'Invalid request key.');
            return existing;
          }
          const c = await tx.comment.create({ data: { id, taskId: t.id, authorId: u.id, body } });
          await tx.activity.create({
            data: {
              workspaceId: w,
              actorId: u.id,
              taskId: t.id,
              text: `commented on “${t.title}”`,
            },
          });
          const assigned = await tx.assignment.findMany({
            where: { taskId: t.id, userId: { not: u.id } },
          });
          await tx.notification.createMany({
            data: assigned.map((a) => ({
              userId: a.userId,
              workspaceId: w,
              text: `${u.name} commented on “${t.title}”`,
            })),
          });
          return c;
        });
      }
      if (action === 'subtask') {
        await taskAccess(u.id, w, z.string().parse(b.taskId));
        if (b.id) {
          const s = await db.subtask.findFirst({ where: { id: b.id, taskId: b.taskId } });
          if (!s) throw new ApiError(404, 'Checklist item not found.');
          return db.subtask.update({
            where: { id: s.id },
            data: { done: z.boolean().parse(b.done) },
          });
        }
        return db.subtask.create({ data: { taskId: b.taskId, title: title.parse(b.title) } });
      }
      if (action === 'label') {
        await manage(u.id, w);
        await projectAccess(u.id, w, z.string().parse(b.projectId));
        return db.label.create({
          data: {
            projectId: b.projectId,
            name: title.parse(b.name),
            color: z
              .string()
              .regex(/^#[0-9a-fA-F]{6}$/)
              .parse(b.color),
          },
        });
      }
      if (action === 'invite') {
        await manage(u.id, w);
        const token = randomBytes(32).toString('hex');
        const invite = await db.invitation.create({
          data: {
            workspaceId: w,
            tokenHash: tokenHash(token),
            role: z.enum(['ADMIN', 'MEMBER']).parse(b.role),
            expiresAt: new Date(Date.now() + 7 * 86400000),
          },
        });
        return { id: invite.id, url: `${process.env.BETTER_AUTH_URL}/invite/${token}` };
      }
      if (action === 'revokeInvite') {
        await manage(u.id, w);
        return db.invitation.updateMany({
          where: { id: z.string().parse(b.id), workspaceId: w },
          data: { revoked: true },
        });
      }
      if (action === 'role') {
        const actor = await manage(u.id, w);
        if (actor.role !== 'OWNER') throw new ApiError(403, 'Only the owner can change roles.');
        const target = await db.membership.findFirst({
          where: { id: b.id, workspaceId: w, role: { not: 'OWNER' } },
        });
        if (!target) throw new ApiError(400, 'Owner role cannot be changed.');
        return db.membership.update({
          where: { id: target.id },
          data: { role: z.enum(['ADMIN', 'MEMBER']).parse(b.role) },
        });
      }
      if (action === 'workspace') {
        await manage(u.id, w);
        return db.workspace.update({ where: { id: w }, data: { name: title.parse(b.name) } });
      }
      if (action === 'team') {
        await manage(u.id, w);
        const ids = z.array(z.string()).parse(b.memberIds);
        const members = await db.membership.findMany({
          where: { id: { in: ids }, workspaceId: w },
        });
        if (members.length !== ids.length) throw new ApiError(400, 'Invalid members.');
        if (b.id) {
          const team = await db.team.findFirst({ where: { id: b.id, workspaceId: w } });
          if (!team) throw new ApiError(404, 'Team not found.');
          return db.team.update({
            where: { id: team.id },
            data: {
              name: title.parse(b.name),
              members: { deleteMany: {}, create: ids.map((membershipId) => ({ membershipId })) },
            },
          });
        }
        return db.team.create({
          data: {
            workspaceId: w,
            name: title.parse(b.name),
            members: { create: ids.map((membershipId) => ({ membershipId })) },
          },
        });
      }
      if (action === 'readNotifications')
        return db.notification.updateMany({
          where: { userId: u.id, workspaceId: w },
          data: { read: true },
        });
      throw new ApiError(400, 'Unknown action.');
    })();
    return NextResponse.json(result);
  } catch (e) {
    return fail(e);
  }
}
