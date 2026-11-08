import { eq } from 'drizzle-orm';
import { db, documents, assessments } from '@/db';
import { currentUser } from '@/lib/auth';
import { readFile } from '@/lib/storage';
import { canAccess } from '@/lib/workflow';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await currentUser();
  if (!u) return new Response('غير مصرح', { status: 401 });
  const d = (await db.select().from(documents).where(eq(documents.id, id)).limit(1))[0];
  if (!d) return new Response('غير موجود', { status: 404 });
  const a = (await db.select().from(assessments).where(eq(assessments.id, d.assessmentId)).limit(1))[0];
  if (!canAccess(u, a)) return new Response('غير مصرح', { status: 403 });
  const buf = await readFile(d.storedPath);
  const inline = new URL(req.url).searchParams.get('download') ? 'attachment' : 'inline';
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': d.mimeType === 'text/plain' ? 'text/plain; charset=utf-8' : d.mimeType, 'Content-Disposition': `${inline}; filename*=UTF-8''${encodeURIComponent(d.fileName)}`, 'Cache-Control': 'private, max-age=60' } });
}
