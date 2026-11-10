import { eq } from 'drizzle-orm';
import { db, orgDocuments } from '@/db';
import { currentUser, ownsOrg, can } from '@/lib/auth';
import { readFile } from '@/lib/storage';

/** تنزيل مستند جهة: لأعضاء الجهة أو لموظفي الإدارة المخولين فقط */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await currentUser();
  const d = (await db.select().from(orgDocuments).where(eq(orgDocuments.id, id)).limit(1))[0];
  if (!u || !d) return new Response('غير موجود', { status: 404 });
  const staff = u.role === 'SUPER_ADMIN' || (u.role === 'ACCOUNT_MANAGER' && (can(u, 'orgs.view') || can(u, 'orgs.verify')));
  if (!staff && !(u.role === 'ORG_USER' && ownsOrg(u, d.orgId))) return new Response('غير مصرح', { status: 403 });
  const buf = await readFile(d.storedPath);
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': d.mimeType, 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(d.fileName)}`, 'Cache-Control': 'private, no-store' } });
}
