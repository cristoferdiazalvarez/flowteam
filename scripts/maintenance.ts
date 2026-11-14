import 'dotenv/config';
import { readdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { db } from '../lib/db';
const apply = process.argv.includes('--apply');
const now = new Date();
const cutoff = new Date(Date.now() - 14 * 86400000);
try {
  const workspaces = await db.workspace.findMany({
    where: {
      demo: true,
      createdAt: { lt: cutoff },
      memberships: {
        every: {
          user: {
            email: { endsWith: '@demo.invalid' },
            sessions: { none: { expiresAt: { gt: now } } },
          },
        },
      },
    },
    select: { id: true, memberships: { select: { userId: true } } },
  });
  const expired = await db.rateLimit.count({ where: { resetAt: { lt: cutoff } } });
  const keys = new Set((await db.attachment.findMany({ select: { key: true } })).map((a) => a.key));
  const orphanBlobs = await db.storageBlob.findMany({
    where: { createdAt: { lt: cutoff }, key: { notIn: [...keys] } },
    select: { key: true },
  });
  const orphans = (await readdir('.storage').catch(() => [])).filter(
    (key) => /^[a-f0-9-]{36}$/.test(key) && !keys.has(key),
  );
  console.log(
    `${apply ? 'APPLY' : 'DRY RUN'}: ${workspaces.length} inactive demo workspaces, ${orphans.length} orphan files, ${orphanBlobs.length} expired orphan blobs, ${expired} old rate counters.`,
  );
  if (apply) {
    for (const w of workspaces) {
      await db.workspace.delete({ where: { id: w.id } });
      for (const m of w.memberships)
        await db.user.deleteMany({
          where: { id: m.userId, email: { endsWith: '@demo.invalid' }, memberships: { none: {} } },
        });
    }
    await db.storageBlob.deleteMany({ where: { key: { in: orphanBlobs.map((b) => b.key) } } });
    for (const key of orphans) await unlink(resolve('.storage', key));
    await db.rateLimit.deleteMany({ where: { resetAt: { lt: cutoff } } });
    await db.session.deleteMany({ where: { expiresAt: { lt: cutoff } } });
    await db.verification.deleteMany({ where: { expiresAt: { lt: cutoff } } });
    console.log(
      'Maintenance complete. Files orphaned by deleted demos are collected on the next run.',
    );
  }
} finally {
  await db.$disconnect();
}
