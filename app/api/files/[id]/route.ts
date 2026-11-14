import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { localStorageAdapter as storage } from '@/lib/storage';
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;
  const attachment = await db.attachment.findFirst({
    where: {
      id,
      task: { project: { workspace: { memberships: { some: { userId: session.user.id } } } } },
    },
  });
  if (!attachment) return new NextResponse('Not found', { status: 404 });
  try {
    const file = await storage.get(attachment.key);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('File unavailable', { status: 404 });
  }
}
