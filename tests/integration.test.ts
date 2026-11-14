import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
process.loadEnvFile('.env');
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const base = process.env.BETTER_AUTH_URL || 'http://127.0.0.1:3000';
const users: string[] = [];
const workspaces: string[] = [];
async function account() {
  const email = `integration.${randomUUID()}@test.invalid`;
  const r = await fetch(base + '/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({
      name: 'Integration User',
      email,
      password: randomUUID() + randomUUID(),
    }),
  });
  const body = await r.json();
  expect(r.status, JSON.stringify(body)).toBe(200);
  users.push(body.user.id);
  const cookie = r.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  return { cookie, id: body.user.id };
}
async function call(cookie: string, body: Record<string, unknown>) {
  const r = await fetch(base + '/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, Cookie: cookie },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
}
async function state(cookie: string, w: string) {
  const r = await fetch(base + '/api/data?workspace=' + w, { headers: { Cookie: cookie } });
  return { status: r.status, data: await r.json() };
}
let a: Awaited<ReturnType<typeof account>>,
  b: Awaited<ReturnType<typeof account>>,
  wa: string,
  wb: string,
  projectId: string,
  columns: { id: string }[],
  taskId: string;
beforeAll(async () => {
  a = await account();
  b = await account();
  for (const u of [a, b]) {
    const r = await call(u.cookie, {
      action: 'bootstrap',
      name: 'Integration workspace',
      demo: false,
    });
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    workspaces.push(r.data.id);
  }
  [wa, wb] = workspaces;
  const p = await call(a.cookie, {
    action: 'createProject',
    workspaceId: wa,
    name: 'Integration project',
  });
  expect(p.status, JSON.stringify(p.data)).toBe(200);
  projectId = p.data.id;
  const s = await state(a.cookie, wa);
  columns = s.data.workspace.projects[0].columns;
  const t = await call(a.cookie, {
    action: 'createTask',
    workspaceId: wa,
    projectId,
    columnId: columns[0].id,
    title: 'Persistent task',
  });
  expect(t.status, JSON.stringify(t.data)).toBe(200);
  taskId = t.data.id;
});
afterAll(async () => {
  await db.workspace.deleteMany({ where: { id: { in: workspaces } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});
describe.sequential('PostgreSQL API boundaries and consistency', () => {
  it('rejects anonymous access and cross-origin mutations', async () => {
    expect((await fetch(base + '/api/data')).status).toBe(401);
    expect(
      (
        await fetch(base + '/api/data', {
          method: 'POST',
          headers: {
            Cookie: a.cookie,
            Origin: 'https://evil.invalid',
            'Content-Type': 'application/json',
          },
          body: '{}',
        })
      ).status,
    ).toBe(403);
  });
  it('isolates queries and all task, project and comment writes', async () => {
    expect((await state(b.cookie, wa)).status).toBe(404);
    for (const action of ['deleteTask', 'moveTask', 'editTask', 'comment']) {
      const r = await call(b.cookie, {
        action,
        workspaceId: wb,
        id: taskId,
        taskId,
        version: 1,
        columnId: columns[0].id,
        title: 'attack',
        body: 'attack',
        requestId: randomUUID(),
      });
      expect(r.status).toBe(404);
    }
    expect(
      (await call(b.cookie, { action: 'deleteProject', workspaceId: wb, id: projectId })).status,
    ).toBe(404);
    expect(await db.task.findUnique({ where: { id: taskId } })).not.toBeNull();
  });
  it('rejects cross-project columns, assignees and labels', async () => {
    const p = await call(a.cookie, {
      action: 'createProject',
      workspaceId: wa,
      name: 'Other project',
    });
    const other = await db.column.findFirstOrThrow({ where: { projectId: p.data.id } });
    expect(
      (
        await call(a.cookie, {
          action: 'createTask',
          workspaceId: wa,
          projectId,
          columnId: other.id,
          title: 'attack',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await call(a.cookie, {
          action: 'createTask',
          workspaceId: wa,
          projectId,
          columnId: columns[0].id,
          title: 'attack',
          assigneeIds: [b.id],
        })
      ).status,
    ).toBe(400);
  });
  it('atomically resolves concurrent task edits with one conflict', async () => {
    const body = {
      action: 'editTask',
      workspaceId: wa,
      id: taskId,
      columnId: columns[0].id,
      title: 'Concurrent edit',
      version: 1,
    };
    const responses = await Promise.all([call(a.cookie, body), call(a.cookie, body)]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await db.task.findUniqueOrThrow({ where: { id: taskId } })).version).toBe(2);
  });
  it('persists card ordering and rejects stale moves', async () => {
    const second = await call(a.cookie, {
      action: 'createTask',
      workspaceId: wa,
      projectId,
      columnId: columns[1].id,
      title: 'Second task',
    });
    const r = await call(a.cookie, {
      action: 'moveTask',
      workspaceId: wa,
      id: taskId,
      columnId: columns[1].id,
      beforeId: second.data.id,
      version: 2,
    });
    expect(r.status, JSON.stringify(r.data)).toBe(200);
    const cards = await db.task.findMany({
      where: { columnId: columns[1].id },
      orderBy: { position: 'asc' },
    });
    expect(cards.map((t) => t.id)).toEqual([taskId, second.data.id]);
    expect(cards.map((t) => t.position)).toEqual([1024, 2048]);
    expect(
      (
        await call(a.cookie, {
          action: 'moveTask',
          workspaceId: wa,
          id: taskId,
          columnId: columns[0].id,
          version: 2,
        })
      ).status,
    ).toBe(409);
  });
  it('stores comments exactly once when a completed request is retried', async () => {
    const body = {
      action: 'comment',
      workspaceId: wa,
      taskId,
      body: 'Persist this comment',
      requestId: randomUUID(),
    };
    expect((await call(a.cookie, body)).status).toBe(200);
    expect((await call(a.cookie, body)).status).toBe(200);
    expect(await db.comment.count({ where: { id: body.requestId } })).toBe(1);
    const s = await state(a.cookie, wa);
    expect(
      s.data.workspace.projects[0].tasks.find((t: { id: string }) => t.id === taskId).comments[0]
        .body,
    ).toBe(body.body);
  });
  it('accepts one invitation, applies member permissions, rejects reuse', async () => {
    const inv = await call(a.cookie, { action: 'invite', workspaceId: wa, role: 'MEMBER' });
    expect(inv.status).toBe(200);
    const token = inv.data.url.split('/').pop();
    expect((await call(b.cookie, { action: 'acceptInvite', token })).status).toBe(200);
    expect((await call(b.cookie, { action: 'acceptInvite', token })).status).toBe(410);
    expect((await state(b.cookie, wa)).status).toBe(200);
    for (const body of [
      { action: 'createProject', name: 'forbidden' },
      { action: 'invite', role: 'ADMIN' },
      { action: 'workspace', name: 'forbidden' },
      { action: 'team', name: 'forbidden', memberIds: [] },
    ])
      expect((await call(b.cookie, { ...body, workspaceId: wa })).status).toBe(403);
    expect(
      (
        await call(b.cookie, {
          action: 'comment',
          workspaceId: wa,
          taskId,
          body: 'Members collaborate',
          requestId: randomUUID(),
        })
      ).status,
    ).toBe(200);
  });
  it('rejects revoked and expired invitation tokens', async () => {
    for (const expired of [false, true]) {
      const inv = await call(a.cookie, { action: 'invite', workspaceId: wa, role: 'MEMBER' });
      if (expired)
        await db.invitation.update({
          where: { id: inv.data.id },
          data: { expiresAt: new Date(0) },
        });
      else
        expect(
          (await call(a.cookie, { action: 'revokeInvite', workspaceId: wa, id: inv.data.id }))
            .status,
        ).toBe(200);
      expect(
        (await call(b.cookie, { action: 'acceptInvite', token: inv.data.url.split('/').pop() }))
          .status,
      ).toBe(410);
    }
  });
  it('protects owner role and allows owner promotion to admin', async () => {
    const own = await db.membership.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: wa, userId: a.id } },
    });
    expect(
      (await call(a.cookie, { action: 'role', workspaceId: wa, id: own.id, role: 'MEMBER' }))
        .status,
    ).toBe(400);
    const member = await db.membership.findUniqueOrThrow({
      where: { workspaceId_userId: { workspaceId: wa, userId: b.id } },
    });
    expect(
      (await call(a.cookie, { action: 'role', workspaceId: wa, id: member.id, role: 'ADMIN' }))
        .status,
    ).toBe(200);
    expect(
      (await call(b.cookie, { action: 'createProject', workspaceId: wa, name: 'Admin project' }))
        .status,
    ).toBe(200);
  });
  it('persists checklist items and archive state', async () => {
    const item = await call(b.cookie, {
      action: 'subtask',
      workspaceId: wa,
      taskId,
      title: 'Test persistence',
    });
    expect(item.status).toBe(200);
    expect(
      (
        await call(b.cookie, {
          action: 'subtask',
          workspaceId: wa,
          taskId,
          id: item.data.id,
          done: true,
        })
      ).status,
    ).toBe(200);
    expect((await db.subtask.findUniqueOrThrow({ where: { id: item.data.id } })).done).toBe(true);
    expect(
      (
        await call(a.cookie, {
          action: 'archiveProject',
          workspaceId: wa,
          id: projectId,
          archived: true,
        })
      ).status,
    ).toBe(200);
    expect((await db.project.findUniqueOrThrow({ where: { id: projectId } })).archived).toBe(true);
  });
});
