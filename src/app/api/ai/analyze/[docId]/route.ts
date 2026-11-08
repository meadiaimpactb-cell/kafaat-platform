import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, documents, assessments } from '@/db';
import { currentUser } from '@/lib/auth';
import { canAccess, recomputeProgress } from '@/lib/workflow';
import { analyzeDocument } from '@/lib/ai';

export const maxDuration = 120;
export async function POST(_: Request, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'سجّل الدخول' }, { status: 401 });
  const d = (await db.select().from(documents).where(eq(documents.id, docId)).limit(1))[0];
  if (!d) return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
  const a = (await db.select().from(assessments).where(eq(assessments.id, d.assessmentId)).limit(1))[0];
  if (!canAccess(u, a)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  try { const r = await analyzeDocument(docId); await recomputeProgress(d.assessmentId); return NextResponse.json({ ok: true, result: r }); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }); }
}
