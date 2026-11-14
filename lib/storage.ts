import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { db } from './db';
import { ApiError } from './validation';
const root = resolve('.storage');
export interface StorageAdapter {
  put(data: Buffer, workspaceId: string): Promise<string>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
export const localStorageAdapter: StorageAdapter = {
  async put(data) {
    if (process.env.VERCEL)
      throw new Error('Private uploads require a durable storage adapter on this host.');
    await mkdir(root, { recursive: true, mode: 0o700 });
    const key = randomUUID();
    await writeFile(resolve(root, key), data, { mode: 0o600 });
    return key;
  },
  async get(key) {
    if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error('Invalid storage key');
    return readFile(resolve(root, key));
  },
  async remove(key) {
    if (/^[a-f0-9-]{36}$/.test(key)) await unlink(resolve(root, key)).catch(() => {});
  },
};
export const MAX_FILE_BYTES = 1024 * 1024;
export const WORKSPACE_FILE_BYTES = 5 * 1024 * 1024;
export const DATABASE_FILE_BYTES = 100 * 1024 * 1024;
export const databaseStorageAdapter: StorageAdapter = {
  async put(data, workspaceId) {
    if (!data.length || data.length > MAX_FILE_BYTES)
      throw new ApiError(413, 'Maximum file size is 1 MiB.');
    return db.$transaction(async (tx) => {
      // Serialize quota reservations across function instances; never rely on process memory.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(749362811)::text`;
      const [global, tenant] = await Promise.all([
        tx.storageBlob.aggregate({ _sum: { size: true } }),
        tx.storageBlob.aggregate({ where: { workspaceId }, _sum: { size: true } }),
      ]);
      if ((global._sum.size ?? 0) + data.length > DATABASE_FILE_BYTES)
        throw new ApiError(
          413,
          'Demo attachment storage is full. Please try again after maintenance.',
        );
      if ((tenant._sum.size ?? 0) + data.length > WORKSPACE_FILE_BYTES)
        throw new ApiError(413, 'This workspace has reached its 5 MiB attachment limit.');
      return (
        await tx.storageBlob.create({
          data: { workspaceId, content: new Uint8Array(data), size: data.length },
          select: { key: true },
        })
      ).key;
    });
  },
  async get(key) {
    if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error('Invalid storage key');
    const blob = await db.storageBlob.findUniqueOrThrow({
      where: { key },
      select: { content: true },
    });
    return Buffer.from(blob.content);
  },
  async remove(key) {
    await db.storageBlob.deleteMany({ where: { key } });
  },
};
export function storageAdapter() {
  return process.env.VERCEL || process.env.STORAGE_BACKEND === 'database'
    ? databaseStorageAdapter
    : localStorageAdapter;
}
export function safeFile(name: string, data: Buffer) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return !data.includes(0);
  if (ext === 'pdf') return data.subarray(0, 5).toString() === '%PDF-';
  if (ext === 'png')
    return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (ext === 'jpg' || ext === 'jpeg') return data[0] === 255 && data[1] === 216 && data[2] === 255;
  if (ext === 'webp')
    return data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
  return false;
}
