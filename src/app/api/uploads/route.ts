import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, documents, documentRequirements, assessments } from '@/db';
import { currentUser } from '@/lib/auth';
import { saveFile, isAllowed, MAX_UPLOAD_MB } from '@/lib/storage';
import { analyzeDocument } from '@/lib/ai';
import { recomputeProgress, canAccess } from '@/lib/workflow';
import { logActivity } from '@/lib/notify';

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'سجّل الدخول' }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get('file') as File | null; const assessmentId = String(fd.get('assessmentId') ?? ''); const requirementId = String(fd.get('requirementId') ?? '') || null;
  const a = (await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1))[0];
  if (!a || !canAccess(u, a)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  if (u.role === 'ORG_USER' && !['DATA_COLLECTION', 'INFO_REQUESTED'].includes(a.status)) return NextResponse.json({ error: 'لا يمكن رفع ملفات في حالة الطلب الحالية' }, { status: 400 });
  if (!file || !file.size) return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });
  if (file.size > MAX_UPLOAD_MB * 1048576) return NextResponse.json({ error: `الحد الأقصى ${MAX_UPLOAD_MB} م.ب` }, { status: 400 });
  if (!isAllowed(file)) return NextResponse.json({ error: 'نوع الملف غير مدعوم: PDF أو Word أو Excel أو صورة' }, { status: 400 });
  const req0 = requirementId ? (await db.select().from(documentRequirements).where(eq(documentRequirements.id, requirementId)).limit(1))[0] : undefined;
  const saved = await saveFile(assessmentId, file);
  const [res] = await db.insert(documents).values({ assessmentId, uploadedById: u.id, requirementId: req0?.id ?? null, factorIds: (req0?.factorIds as string[]) ?? null, fileName: file.name.slice(0, 250), ...saved }).$returningId();
  await recomputeProgress(assessmentId);
  await logActivity('document.uploaded', { assessmentId, userId: u.id, details: { file: file.name, requirement: req0?.code } });
  // الفحص الأولي للملف يجري في الخلفية لصالح المراجعين، ولا ينتظره رافع الملف
  void analyzeDocument(res.id).then(() => recomputeProgress(assessmentId)).catch(e => console.error('doc analysis failed', e));
  return NextResponse.json({ id: res.id });
}
