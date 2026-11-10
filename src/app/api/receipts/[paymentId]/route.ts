import { eq } from 'drizzle-orm';
import { db, payments } from '@/db';
import { currentUser, can, ownsOrg } from '@/lib/auth';
import { readFile } from '@/lib/storage';

export async function GET(_: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const u = await currentUser();
  const p = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0];
  if (!u || !p?.receiptPath || !(ownsOrg(u, p.orgId) || can(u, 'payments.view'))) return new Response('غير مصرح', { status: 403 });
  const buf = await readFile(p.receiptPath);
  const ext = p.receiptPath.split('.').pop();
  return new Response(new Uint8Array(buf), { headers: { 'Content-Type': ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg' } });
}
