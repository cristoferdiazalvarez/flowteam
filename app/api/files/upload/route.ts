import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { taskAccess, limit } from '@/lib/service';
import { ApiError } from '@/lib/validation';
import { storageAdapter, safeFile, MAX_FILE_BYTES, WORKSPACE_FILE_BYTES } from '@/lib/storage';
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('origin') !== new URL(process.env.BETTER_AUTH_URL || req.url).origin)
      throw new ApiError(403, 'Invalid origin.');
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) throw new ApiError(401, 'Please sign in.');
    await limit(`upload:${session.user.id}`, 20, 3600000);
    if (Number(req.headers.get('content-length')) > MAX_FILE_BYTES + 65536)
      throw new ApiError(413, 'Maximum file size is 1 MiB.');
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_FILE_BYTES)
      throw new ApiError(400, 'Choose a file between 1 byte and 1 MiB.');
    const t = await taskAccess(
      session.user.id,
      String(form.get('workspaceId')),
      String(form.get('taskId')),
    );
    const data = Buffer.from(await file.arrayBuffer());
    if (!safeFile(file.name, data))
      throw new ApiError(400, 'Only valid PDF, text, PNG, JPEG and WebP files are supported.');
    const total = await db.attachment.aggregate({
      where: { task: { project: { workspaceId: String(form.get('workspaceId')) } } },
      _sum: { size: true },
    });
    if ((total._sum.size || 0) + data.length > WORKSPACE_FILE_BYTES)
      throw new ApiError(413, 'This workspace has reached its 5 MiB attachment limit.');
    const storage = storageAdapter();
    const key = await storage.put(data, String(form.get('workspaceId')));
    try {
      const attachment = await db.attachment.create({
        data: {
          taskId: t.id,
          key,
          size: data.length,
          name: file.name.replace(/[\x00-\x1f/\\]/g, '_').slice(0, 150),
        },
      });
      return NextResponse.json({ id: attachment.id });
    } catch (e) {
      await storage.remove(key);
      throw e;
    }
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: 'Unable to upload file.' }, { status: 500 });
  }
}
