import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
const root = resolve('.storage');
export interface StorageAdapter {
  put(data: Buffer): Promise<string>;
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
